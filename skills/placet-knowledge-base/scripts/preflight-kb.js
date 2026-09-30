#!/usr/bin/env node
/**
 * Placet knowledge-base preflight.
 *
 * Default mode is detect-only: it never runs codegraph build unless --build is
 * provided. This keeps the "large project, ask before CodeGraph" gate explicit.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SOURCE_EXTENSIONS = new Set([
  ".c", ".cc", ".cpp", ".cs", ".go", ".h", ".hpp", ".java", ".js", ".jsx",
  ".kt", ".lua", ".py", ".rs", ".sh", ".ts", ".tsx", ".vue",
]);
const SKIP_DIRS = new Set([
  ".git", ".hg", ".svn", "node_modules", "vendor", "dist", "build",
  "out", "target", ".next", ".nuxt", ".codegraph",
]);
const LARGE_SOURCE_FILE_THRESHOLD = 500;
const LARGE_SIZE_MB_THRESHOLD = 100;
const MANIFEST_NAME = "placet-preflight.json";

const args = process.argv.slice(2);
const options = {
  build: args.includes("--build"),
  rebuild: args.includes("--rebuild"),
  json: args.includes("--json"),
  help: args.includes("-h") || args.includes("--help"),
};
const projectRootArg = args.find((arg) => !arg.startsWith("-"));

if (options.help) {
  console.log("Usage: node preflight-kb.js <project-root> [--build] [--rebuild] [--json]");
  process.exit(0);
}

function normalizeProjectRoot(input) {
  if (!input) return "";
  return path.resolve(input);
}

const projectRoot = normalizeProjectRoot(projectRootArg);
if (!projectRoot || !fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
  emitAndExit({
    preflightStatus: "ERROR",
    projectRoot: projectRoot || "",
    message: `Project directory does not exist: ${projectRoot || "(missing)"}`,
  }, 2);
}

const codegraphDir = path.join(projectRoot, ".codegraph");
const manifestPath = path.join(codegraphDir, MANIFEST_NAME);
const projectStats = collectProjectStats(projectRoot);
const gitHead = getGitHead(projectRoot);
const codegraph = detectCodeGraph(projectRoot);
const cache = inspectCodegraphCache(codegraphDir, manifestPath, {
  gitHead,
  sourceFileCount: projectStats.sourceFileCount,
  codegraphVersion: codegraph.version,
});
const isLargeProject = (
  projectStats.sourceFileCount > LARGE_SOURCE_FILE_THRESHOLD ||
  projectStats.sizeMb > LARGE_SIZE_MB_THRESHOLD ||
  projectStats.hasMonorepoHints
);

if (options.build || options.rebuild) {
  runBuildFlow();
} else {
  runProbeFlow();
}

function runProbeFlow() {
  const recommendedAction = decideRecommendedAction({
    isLargeProject,
    codegraphStatus: codegraph.status,
    cacheStatus: cache.status,
  });

  emitAndExit({
    preflightStatus: "PROBE_OK",
    projectRoot,
    sourceFileCount: projectStats.sourceFileCount,
    projectSizeMb: projectStats.sizeMb,
    isLargeProject,
    largeProjectReason: getLargeProjectReason(projectStats),
    buildFileCount: projectStats.buildFileCount,
    codegraphDir,
    codegraphStatus: codegraph.status,
    codegraphVersion: codegraph.version || "",
    codegraphCacheStatus: cache.status,
    recommendedAction,
    message: buildProbeMessage({ recommendedAction, isLargeProject, projectStats, codegraph, cache }),
  }, 0);
}

function runBuildFlow() {
  if (codegraph.status === "NOT_INSTALLED") {
    emitAndExit({
      preflightStatus: "NOT_INSTALLED",
      projectRoot,
      sourceFileCount: projectStats.sourceFileCount,
      projectSizeMb: projectStats.sizeMb,
      isLargeProject,
      codegraphDir,
      codegraphStatus: codegraph.status,
      recommendedAction: isLargeProject ? "INSTALL_OR_DIRECT_SCAN" : "DIRECT_SCAN",
      message: "CodeGraph is not installed. Direct scan on a large project is slow and may hit context limits; install CodeGraph and retry, or choose a degraded scan.",
    }, 0);
  }

  if (codegraph.status === "BROKEN_INSTALL") {
    emitAndExit({
      preflightStatus: "BROKEN_INSTALL",
      projectRoot,
      sourceFileCount: projectStats.sourceFileCount,
      projectSizeMb: projectStats.sizeMb,
      isLargeProject,
      codegraphDir,
      codegraphStatus: codegraph.status,
      recommendedAction: "FIX_CODEGRAPH_OR_DIRECT_SCAN",
      message: "CodeGraph install is incomplete or the CLI is unavailable. See docs/CodeGraph-install-guide.md to repair, or choose a degraded scan.",
    }, 1);
  }

  if (!options.rebuild && cache.status === "CACHED_OK") {
    emitAndExit({
      preflightStatus: "CACHED_OK",
      projectRoot,
      sourceFileCount: projectStats.sourceFileCount,
      projectSizeMb: projectStats.sizeMb,
      isLargeProject,
      codegraphDir,
      codegraphStatus: codegraph.status,
      codegraphVersion: codegraph.version || "",
      codegraphCacheStatus: cache.status,
      recommendedAction: "USE_CACHED_CODEGRAPH",
      message: "CodeGraph cache is available. Knowledge-base generation should read .codegraph/ first.",
    }, 0);
  }

  const started = Date.now();
  const build = spawnCommand(codegraph.command, ["build"], { cwd: projectRoot, timeoutMs: 30 * 60 * 1000 });
  const elapsedSec = Math.round((Date.now() - started) / 1000);

  if (build.status !== 0) {
    emitAndExit({
      preflightStatus: "BUILD_FAILED",
      projectRoot,
      sourceFileCount: projectStats.sourceFileCount,
      projectSizeMb: projectStats.sizeMb,
      isLargeProject,
      codegraphDir,
      codegraphStatus: codegraph.status,
      codegraphVersion: codegraph.version || "",
      buildExitCode: build.status,
      buildElapsedSec: elapsedSec,
      recommendedAction: "DIRECT_SCAN_WITH_WARNING",
      message: "CodeGraph CLI is available but build failed. Degraded scan on a large project is slower and may hit context limits; repair CodeGraph and retry.",
    }, 1);
  }

  if (!dirHasFiles(codegraphDir)) {
    emitAndExit({
      preflightStatus: "BUILD_FAILED",
      projectRoot,
      sourceFileCount: projectStats.sourceFileCount,
      projectSizeMb: projectStats.sizeMb,
      isLargeProject,
      codegraphDir,
      codegraphStatus: codegraph.status,
      codegraphVersion: codegraph.version || "",
      buildElapsedSec: elapsedSec,
      recommendedAction: "DIRECT_SCAN_WITH_WARNING",
      message: "codegraph build exited successfully, but no .codegraph/ output was found. Check CodeGraph config or fall back to a degraded scan.",
    }, 1);
  }

  writeManifest(manifestPath, {
    generatedAt: new Date().toISOString(),
    gitHead,
    sourceFileCount: projectStats.sourceFileCount,
    projectSizeMb: projectStats.sizeMb,
    codegraphVersion: codegraph.version || "",
    buildElapsedSec: elapsedSec,
  });

  emitAndExit({
    preflightStatus: "BUILD_OK",
    projectRoot,
    sourceFileCount: projectStats.sourceFileCount,
    projectSizeMb: projectStats.sizeMb,
    isLargeProject,
    codegraphDir,
    codegraphStatus: codegraph.status,
    codegraphVersion: codegraph.version || "",
    codegraphCacheStatus: "CACHED_OK",
    buildElapsedSec: elapsedSec,
    recommendedAction: "USE_CODEGRAPH",
    message: "codegraph build succeeded. Knowledge-base generation must read .codegraph/ first and record CodeGraph Status in BASE.",
  }, 0);
}

function collectProjectStats(root) {
  let sourceFileCount = 0;
  let totalBytes = 0;
  let buildFileCount = 0;
  let packageLikeCount = 0;
  const stack = [root];

  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const isDotEntry = entry.name.startsWith(".");
      const isWhitelistedDot = entry.name === ".github" || entry.name === ".vscode";
      if (isDotEntry && !isWhitelistedDot) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (SOURCE_EXTENSIONS.has(ext)) sourceFileCount += 1;
      if (isBuildFile(entry.name)) {
        buildFileCount += 1;
        if (entry.name === "package.json" || entry.name === "pom.xml" || entry.name.startsWith("build.gradle")) {
          packageLikeCount += 1;
        }
      }
      try {
        totalBytes += fs.statSync(fullPath).size;
      } catch {
        // ignore files that disappear during traversal
      }
    }
  }

  return {
    sourceFileCount,
    sizeMb: Math.round((totalBytes / 1024 / 1024) * 10) / 10,
    buildFileCount,
    hasMonorepoHints: packageLikeCount >= 3,
  };
}

function isBuildFile(name) {
  return [
    "package.json", "pom.xml", "go.mod", "Cargo.toml", "CMakeLists.txt",
    "build.gradle", "build.gradle.kts", "docker-compose.yml", "Dockerfile",
  ].includes(name) || name.endsWith(".sln") || name.endsWith(".csproj");
}

function detectCodeGraph(cwd) {
  const command = resolveCommand("codegraph", cwd);
  if (!command) {
    return { status: "NOT_INSTALLED", command: "", version: "" };
  }

  const version = spawnCommand(command, ["--version"], { cwd, timeoutMs: 15000 });
  if (version.status !== 0) {
    return { status: "BROKEN_INSTALL", command, version: "" };
  }

  return {
    status: "CLI_READY",
    command,
    version: (version.stdout || version.stderr || "").trim().split(/\r?\n/)[0],
  };
}

function resolveCommand(command, cwd) {
  if (process.platform === "win32") {
    const cmdResult = spawnCommand("where.exe", [`${command}.cmd`], { cwd, timeoutMs: 10000 });
    if (cmdResult.status === 0) {
      const first = cmdResult.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
      if (first) return first;
    }
  }

  const probe = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnCommand(probe, [command], { cwd, timeoutMs: 10000 });
  if (result.status === 0) {
    const first = result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (first) return first;
  }
  return "";
}

function spawnCommand(command, commandArgs, { cwd, timeoutMs }) {
  const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  const result = spawnSync(command, commandArgs, {
    cwd,
    timeout: timeoutMs,
    encoding: "utf8",
    shell: useShell,
    windowsHide: true,
  });
  return {
    status: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout || "",
    stderr: result.stderr || (result.error ? result.error.message : ""),
  };
}

function inspectCodegraphCache(dir, filePath, current) {
  if (!dirHasFiles(dir)) return { status: "MISSING" };
  const manifest = readJson(filePath);
  if (!manifest) return { status: "UNKNOWN_STALE", reason: "manifest_missing" };
  if (current.gitHead && manifest.gitHead && current.gitHead !== manifest.gitHead) {
    return { status: "STALE", reason: "git_head_changed" };
  }
  if (manifest.sourceFileCount !== current.sourceFileCount) {
    return { status: "STALE", reason: "source_file_count_changed" };
  }
  if (current.codegraphVersion && manifest.codegraphVersion && current.codegraphVersion !== manifest.codegraphVersion) {
    return { status: "STALE", reason: "codegraph_version_changed" };
  }
  return { status: "CACHED_OK" };
}

function dirHasFiles(dir) {
  try {
    return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeManifest(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getGitHead(cwd) {
  const result = spawnCommand("git", ["rev-parse", "HEAD"], { cwd, timeoutMs: 10000 });
  return result.status === 0 ? result.stdout.trim() : "";
}

function getLargeProjectReason(stats) {
  const reasons = [];
  if (stats.sourceFileCount > LARGE_SOURCE_FILE_THRESHOLD) {
    reasons.push(`source_files>${LARGE_SOURCE_FILE_THRESHOLD}`);
  }
  if (stats.sizeMb > LARGE_SIZE_MB_THRESHOLD) {
    reasons.push(`size_mb>${LARGE_SIZE_MB_THRESHOLD}`);
  }
  if (stats.hasMonorepoHints) {
    reasons.push("multi_build_files");
  }
  return reasons.join(",") || "small_project";
}

function decideRecommendedAction({ isLargeProject: large, codegraphStatus, cacheStatus }) {
  if (!large) return "DIRECT_SCAN";
  if (cacheStatus === "CACHED_OK") return "ASK_USE_CACHED_CODEGRAPH";
  if (codegraphStatus === "CLI_READY") return "ASK_USE_CODEGRAPH";
  if (codegraphStatus === "NOT_INSTALLED") return "ASK_INSTALL_OR_DIRECT_SCAN";
  return "ASK_FIX_CODEGRAPH_OR_DIRECT_SCAN";
}

function buildProbeMessage({ recommendedAction, isLargeProject: large, projectStats: stats, codegraph, cache }) {
  const scale = `Detected ${stats.sourceFileCount} source files, about ${stats.sizeMb} MB`;
  if (!large) {
    return `${scale}; project is not large, knowledge base can be generated directly; CodeGraph status: ${codegraph.status}.`;
  }
  if (recommendedAction === "ASK_USE_CACHED_CODEGRAPH") {
    return `${scale}; this is a large project. A usable .codegraph/ cache was found; ask the user whether to generate the knowledge base from cache.`;
  }
  if (recommendedAction === "ASK_USE_CODEGRAPH") {
    return `${scale}; this is a large project. Ask the user whether to use CodeGraph first; after confirmation, run --build to reduce context pressure and miss risk.`;
  }
  if (recommendedAction === "ASK_INSTALL_OR_DIRECT_SCAN") {
    return `${scale}; this is a large project, but CodeGraph is not installed. Tell the user: direct scan is slow and may hit context limits; install CodeGraph first, or confirm a degraded scan.`;
  }
  return `${scale}; this is a large project, CodeGraph status ${codegraph.status}, cache status ${cache.status}. Ask the user to repair CodeGraph or confirm a degraded scan.`;
}

function emitAndExit(payload, code) {
  const normalized = {
    PREFLIGHT_STATUS: payload.preflightStatus,
    PROJECT_ROOT: payload.projectRoot || "",
    SOURCE_FILE_COUNT: payload.sourceFileCount,
    PROJECT_SIZE_MB: payload.projectSizeMb,
    IS_LARGE_PROJECT: payload.isLargeProject,
    LARGE_PROJECT_REASON: payload.largeProjectReason || "",
    BUILD_FILE_COUNT: payload.buildFileCount,
    CODEGRAPH_DIR: payload.codegraphDir || "",
    CODEGRAPH_STATUS: payload.codegraphStatus || "",
    CODEGRAPH_VERSION: payload.codegraphVersion || "",
    CODEGRAPH_CACHE_STATUS: payload.codegraphCacheStatus || "",
    BUILD_EXIT_CODE: payload.buildExitCode,
    BUILD_ELAPSED_SEC: payload.buildElapsedSec,
    RECOMMENDED_ACTION: payload.recommendedAction || "",
    MESSAGE: payload.message || "",
  };

  const compact = Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined && value !== "")
  );

  if (options.json) {
    console.log(JSON.stringify(compact, null, 2));
  } else {
    for (const [key, value] of Object.entries(compact)) {
      console.log(`${key}=${value}`);
    }
  }
  process.exit(code);
}
