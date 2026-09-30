#!/usr/bin/env node
/**
 * Placet knowledge-base fact gate (code oracle).
 *
 * Extracts falsifiable claims (path / symbol / module / route / env)
 * from the knowledge base and scores them pass/fail against current source.
 * Agents may only use pass claims when injecting context.
 *
 * Usage:
 *   node verify-kb-facts.js <project-root> [--query "keywords"] [--limit 60] [--json]
 *
 * Outputs (target project):
 *   docs/knowledge-base/.verified/claims.json
 *   docs/knowledge-base/.verified/report.md
 *   docs/knowledge-base/.verified/query-admit.md   (--query only)
 *   docs/knowledge-base/PROJECT_KNOWLEDGE_ADMITTED.md
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set([
  ".git", "node_modules", "vendor", "dist", "build", ".codegraph",
  ".verified", ".idea", ".vscode", "__pycache__", "coverage", "target",
  ".next", ".nuxt", "out", "bin", "obj",
]);

const SOURCE_EXT = new Set([
  ".c", ".cc", ".cpp", ".cs", ".go", ".h", ".hpp", ".java", ".js", ".jsx",
  ".kt", ".kts", ".lua", ".py", ".rs", ".sh", ".ts", ".tsx", ".vue", ".mjs",
  ".cjs", ".ps1", ".xml", ".yml", ".yaml", ".json", ".properties", ".conf",
  ".toml", ".gradle", ".proto", ".sql", ".cfg", ".ini",
]);

const PATH_EXT_RE =
  "(?:java|kt|kts|py|js|mjs|cjs|ts|tsx|jsx|go|rs|c|cc|cpp|h|hpp|cs|vue|lua|sh|bash|ps1|xml|yml|yaml|json|properties|conf|toml|gradle|proto|sql|puml|md|txt|cfg|ini)";

const DECL_RE = new RegExp(
  String.raw`\b(?:(?:export|public|private|protected|internal|static|async|abstract|open|final)\s+)*(?:class|interface|enum|object|struct|type|fun|fn|func|function|def|trait|record)\s+([A-Za-z_][\w]*)`,
  "g",
);
const METHOD_RE = new RegExp(
  String.raw`(?:public|private|protected|internal|static|async|fun|fn|func|function|def)\s+(?:[\w.<>,\[\]?]+\s+)?([A-Za-z_][\w]*)\s*\(`,
  "g",
);
const ASSIGN_FN_RE = new RegExp(
  String.raw`(?:exports\.|module\.exports\.|this\.)([A-Za-z_][\w]*)\s*=`,
  "g",
);
const ENV_DECL_RE = new RegExp(
  String.raw`(?:process\.env\.|os\.getenv\(|os\.environ(?:\.get)?\(|System\.getenv\(|getenv\(|ENV\[|os\.Getenv\()\s*["']?([A-Z][A-Z0-9_]{2,})`,
  "g",
);

const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
let query = "";
let limit = 60;
let projectRootArg = "";
for (let i = 0; i < args.length; i += 1) {
  const token = args[i];
  if (token === "--query") {
    query = String(args[i + 1] || "");
    i += 1;
    continue;
  }
  if (token === "--limit") {
    limit = Math.max(1, parseInt(args[i + 1], 10) || 60);
    i += 1;
    continue;
  }
  if (token === "--json" || token === "-h" || token === "--help") continue;
  if (!token.startsWith("-") && !projectRootArg) projectRootArg = token;
}
const projectRoot = projectRootArg ? path.resolve(projectRootArg) : "";

if (!projectRoot || args.includes("-h") || args.includes("--help")) {
  console.error("Usage: node verify-kb-facts.js <project-root> [--query \"...\"] [--limit 60] [--json]");
  process.exit(2);
}

const kbDir = path.join(projectRoot, "docs", "knowledge-base");
const verifiedDir = path.join(kbDir, ".verified");

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function posixRel(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

function normalizeClaimPath(raw) {
  if (!raw) return "";
  let value = String(raw).trim().replace(/\\/g, "/").replace(/^["'`]+|["'`]+$/g, "");
  value = value.replace(/^\.\//, "");
  if (value.startsWith("/") && !value.startsWith("//")) {
    // HTTP route, not a filesystem path
    return value;
  }
  return value.replace(/^\/+/, "");
}

function looksLikeFsPath(value) {
  if (!value || value.length < 3 || value.length > 260) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (/^\/[A-Za-z]/.test(value) && !/[\\.]/.test(value.slice(1))) return false;
  const normalized = normalizeClaimPath(value);
  if (new RegExp(String.raw`(?:^|/)[^/\s]+\.${PATH_EXT_RE}$`, "i").test(normalized)) return true;
  if ((normalized.includes("/") || normalized.includes("\\")) && /[A-Za-z0-9]/.test(normalized)) return true;
  return false;
}

function looksLikeRoute(value) {
  return /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]{1,180}$/.test(String(value).trim());
}

function looksLikeEnv(value) {
  return /^[A-Z][A-Z0-9_]{2,}$/.test(String(value).trim());
}

function looksLikeSymbol(value) {
  const text = String(value || "").trim();
  if (!text || text.length < 2 || text.length > 180) return false;
  if (looksLikeFsPath(text) || looksLikeRoute(text)) return false;
  return /^[A-Za-z_@][\w.$:-]*$/.test(text) || /^[A-Za-z][\w]*(\.[A-Za-z][\w]*)+$/.test(text);
}

function walk(dir, predicate) {
  if (!exists(dir)) return [];
  const results = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".git")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath, predicate));
    } else if (!predicate || predicate(fullPath, entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseTable(lines, startIdx) {
  const rows = [];
  let i = startIdx;
  while (i < lines.length && /^\s*\|/.test(lines[i])) {
    const cells = lines[i]
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    rows.push({ line: i + 1, cells });
    i += 1;
  }
  if (rows.length < 2) return { headers: [], body: [], next: startIdx + 1 };
  const headers = rows[0].cells.map((h) => h.replace(/\s+/g, ""));
  const body = rows.slice(1).filter((row) => !row.cells.every((c) => /^:?-+:?$/.test(c)));
  return { headers, body, next: i };
}

function headerKind(header) {
  const h = String(header || "").toLowerCase();
  // Keep Chinese headings as compatibility fallbacks for existing target-project KBs.
  if (/路径|path|filepath|相对路径|证据来源|sourceevidence|relativepath|evidencesource/.test(h) && !/路径前缀|prefix|pathprefix/.test(h)) return "path";
  if (/符号|类名|classname|主类|函数|接口(?!变更)|symbol|endpoint|方法|function|method|mainclass/.test(h)) return "symbol";
  if (/模块名|^模块$|module|modulename/.test(h)) return "module";
  if (/路径前缀|端点|路由|url|uri|route|pathprefix/.test(h)) return "route";
  if (/环境变量|env|configkey|配置键|environmentvariable/.test(h)) return "env";
  return "other";
}

function addClaim(bucket, claim) {
  const pathKey = normalizeClaimPath(claim.path || "");
  const key = [claim.type, pathKey, claim.symbol || claim.module || claim.env || claim.route || "", claim.text || ""].join("|");
  if (bucket.has(key)) return;
  bucket.set(key, {
    id: `c${String(bucket.size + 1).padStart(4, "0")}`,
    type: claim.type,
    text: claim.text || "",
    path: pathKey,
    symbol: claim.symbol || "",
    module: claim.module || "",
    route: claim.route || "",
    env: claim.env || "",
    sourceFile: claim.sourceFile,
    sourceLine: claim.sourceLine,
    status: "pending",
    reason: "",
    evidence: "",
  });
}

function extractFromMarkdown(filePath, relativeName) {
  const content = readText(filePath);
  const lines = content.split(/\r?\n/);
  const bucket = new Map();

  const pushPath = (raw, line, extra) => {
    const normalized = normalizeClaimPath(raw);
    if (!looksLikeFsPath(normalized)) return;
    addClaim(bucket, {
      type: "path",
      path: normalized,
      text: raw,
      sourceFile: relativeName,
      sourceLine: line,
      ...extra,
    });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*\|/.test(line)) {
      const table = parseTable(lines, i);
      const kinds = table.headers.map(headerKind);
      const pathCols = kinds.map((k, idx) => (k === "path" ? idx : -1)).filter((idx) => idx >= 0);
      const symbolCols = kinds.map((k, idx) => (k === "symbol" ? idx : -1)).filter((idx) => idx >= 0);
      const moduleCols = kinds.map((k, idx) => (k === "module" ? idx : -1)).filter((idx) => idx >= 0);
      const routeCols = kinds.map((k, idx) => (k === "route" ? idx : -1)).filter((idx) => idx >= 0);
      const envCols = kinds.map((k, idx) => (k === "env" ? idx : -1)).filter((idx) => idx >= 0);

      for (const row of table.body) {
        const cells = row.cells;
        for (const idx of pathCols) {
          const raw = (cells[idx] || "").replace(/`/g, "").trim();
          if (looksLikeFsPath(raw)) pushPath(raw, row.line);
          else if (looksLikeRoute(raw)) {
            addClaim(bucket, {
              type: "route",
              route: raw.trim(),
              text: raw,
              sourceFile: relativeName,
              sourceLine: row.line,
            });
          }
        }
        for (const idx of symbolCols) {
          const raw = (cells[idx] || "").replace(/`/g, "").trim();
          const fileCell = pathCols.length ? (cells[pathCols[0]] || "").replace(/`/g, "").trim() : "";
          if (looksLikeSymbol(raw) && looksLikeFsPath(fileCell)) {
            addClaim(bucket, {
              type: "symbol_in_file",
              symbol: raw,
              path: fileCell,
              text: `${raw} @ ${fileCell}`,
              sourceFile: relativeName,
              sourceLine: row.line,
            });
          } else if (looksLikeSymbol(raw)) {
            addClaim(bucket, {
              type: "symbol",
              symbol: raw,
              text: raw,
              sourceFile: relativeName,
              sourceLine: row.line,
            });
          } else if (looksLikeRoute(raw)) {
            addClaim(bucket, {
              type: "route",
              route: raw,
              text: raw,
              sourceFile: relativeName,
              sourceLine: row.line,
            });
          }
        }
        for (const idx of moduleCols) {
          const raw = (cells[idx] || "").replace(/`/g, "").trim();
          if (raw && raw.length >= 2 && raw.length <= 80 && !/^[-:]+$/.test(raw)) {
            addClaim(bucket, {
              type: "module",
              module: raw,
              text: raw,
              sourceFile: relativeName,
              sourceLine: row.line,
            });
          }
        }
        for (const idx of routeCols) {
          const raw = (cells[idx] || "").replace(/`/g, "").trim();
          for (const part of raw.split(/[、,，;；\s]+/)) {
            if (looksLikeRoute(part)) {
              addClaim(bucket, {
                type: "route",
                route: part,
                text: part,
                sourceFile: relativeName,
                sourceLine: row.line,
              });
            }
          }
        }
        for (const idx of envCols) {
          const raw = (cells[idx] || "").replace(/`/g, "").trim();
          if (looksLikeEnv(raw)) {
            addClaim(bucket, {
              type: "env",
              env: raw,
              text: raw,
              sourceFile: relativeName,
              sourceLine: row.line,
            });
          }
        }
      }
      i = table.next - 1;
      continue;
    }

    const codeRe = /`([^`]+)`/g;
    let match;
    while ((match = codeRe.exec(line))) {
      const raw = match[1].trim();
      if (looksLikeFsPath(raw)) pushPath(raw, i + 1);
      else if (looksLikeEnv(raw)) {
        addClaim(bucket, {
          type: "env",
          env: raw,
          text: raw,
          sourceFile: relativeName,
          sourceLine: i + 1,
        });
      }
    }

    const mdLinkRe = /\[[^\]]*\]\(([^)]+)\)/g;
    while ((match = mdLinkRe.exec(line))) {
      const raw = match[1].trim();
      if (looksLikeFsPath(raw)) pushPath(raw, i + 1);
    }

    const envUse = line.match(/process\.env\.([A-Z][A-Z0-9_]+)|os\.getenv\(\s*["']([A-Z][A-Z0-9_]+)/g);
    if (envUse) {
      for (const item of envUse) {
        const envName = item.replace(/.*(?:env\.|getenv\(\s*["'])/, "").replace(/["']$/, "");
        if (looksLikeEnv(envName)) {
          addClaim(bucket, {
            type: "env",
            env: envName,
            text: envName,
            sourceFile: relativeName,
            sourceLine: i + 1,
          });
        }
      }
    }
  }

  return [...bucket.values()];
}

function extractFromPuml(filePath, relativeName) {
  const claims = [];
  const lines = readText(filePath).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const codeRe = /`([^`]+)`|"([^"]+\.[A-Za-z0-9]+)"/g;
    let match;
    while ((match = codeRe.exec(lines[i]))) {
      const raw = (match[1] || match[2] || "").trim();
      if (looksLikeFsPath(raw)) {
        claims.push({
          id: "",
          type: "path",
          path: normalizeClaimPath(raw),
          text: raw,
          symbol: "",
          module: "",
          route: "",
          env: "",
          sourceFile: relativeName,
          sourceLine: i + 1,
          status: "pending",
          reason: "",
          evidence: "",
        });
      }
    }
  }
  return claims;
}

function collectKbFiles() {
  if (!exists(kbDir)) return [];
  return walk(kbDir, (filePath, name) => {
    const rel = posixRel(filePath);
    if (rel.includes("/.verified/") || name === "PROJECT_KNOWLEDGE_ADMITTED.md") return false;
    return /\.(md|puml)$/i.test(name);
  });
}

function indexSource() {
  const files = walk(projectRoot, (filePath) => SOURCE_EXT.has(path.extname(filePath).toLowerCase()));
  const relFiles = new Set();
  const byBase = new Map();
  const dirs = new Set();
  const symbolsByFile = new Map();
  const symbolFiles = new Map();
  const envHits = new Set();
  const contents = [];

  for (const filePath of files) {
    const rel = posixRel(filePath);
    relFiles.add(rel);
    const base = path.basename(filePath);
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(rel);
    rel.split("/").slice(0, -1).forEach((seg) => {
      if (seg) dirs.add(seg.toLowerCase());
    });
    const parent = path.dirname(rel);
    if (parent && parent !== ".") dirs.add(parent.toLowerCase());
    const first = rel.split("/")[0];
    if (first) dirs.add(first.toLowerCase());

    let statSize = 0;
    try {
      statSize = fs.statSync(filePath).size;
    } catch {
      continue;
    }
    if (statSize > 1_500_000) continue;
    const text = readText(filePath);
    const idSet = new Set();
    for (const re of [DECL_RE, METHOD_RE, ASSIGN_FN_RE]) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(text))) {
        idSet.add(match[1]);
        if (!symbolFiles.has(match[1])) symbolFiles.set(match[1], new Set());
        symbolFiles.get(match[1]).add(rel);
      }
    }
    const stem = base.replace(/\.[^.]+$/, "");
    if (/^[A-Za-z_][\w]*$/.test(stem)) {
      idSet.add(stem);
      if (!symbolFiles.has(stem)) symbolFiles.set(stem, new Set());
      symbolFiles.get(stem).add(rel);
    }
    ENV_DECL_RE.lastIndex = 0;
    let envMatch;
    while ((envMatch = ENV_DECL_RE.exec(text))) envHits.add(envMatch[1]);
    symbolsByFile.set(rel, idSet);
    contents.push({ rel, text });
  }

  function collectDirs(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
      dirs.add(entry.name.toLowerCase());
      collectDirs(path.join(dir, entry.name));
    }
  }
  collectDirs(projectRoot);

  return { relFiles, byBase, dirs, symbolsByFile, symbolFiles, envHits, contents, fileCount: files.length };
}

function resolvePath(index, claimPath) {
  const normalized = normalizeClaimPath(claimPath);
  if (!normalized) return null;
  if (index.relFiles.has(normalized)) return normalized;
  const alt = normalized.replace(/^\/+/, "");
  if (index.relFiles.has(alt)) return alt;
  const underDocs = `docs/knowledge-base/${path.posix.basename(normalized)}`;
  if (index.relFiles.has(underDocs) || exists(path.join(projectRoot, "docs", "knowledge-base", path.basename(normalized)))) {
    const full = path.join(projectRoot, "docs", "knowledge-base", path.basename(normalized));
    if (exists(full)) return posixRel(full);
  }
  if (exists(path.join(projectRoot, normalized))) return normalized;
  const base = path.posix.basename(normalized);
  const hits = index.byBase.get(base) || [];
  if (hits.length === 1) return hits[0];
  return null;
}

function wordIn(text, token) {
  if (!token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(String.raw`(?:^|[^A-Za-z0-9_])${escaped}(?:$|[^A-Za-z0-9_])`).test(text);
}

function verifyClaim(claim, index) {
  if (claim.type === "path") {
    const resolved = resolvePath(index, claim.path);
    if (resolved) {
      claim.status = "pass";
      claim.reason = "path_exists";
      claim.evidence = resolved;
      return;
    }
    const baseHits = index.byBase.get(path.posix.basename(claim.path)) || [];
    claim.status = "fail";
    claim.reason = "path_missing";
    claim.evidence = baseHits.length ? `basename_hits=${baseHits.slice(0, 5).join(",")}` : "";
    return;
  }

  if (claim.type === "symbol_in_file") {
    const resolved = resolvePath(index, claim.path);
    if (!resolved) {
      claim.status = "fail";
      claim.reason = "path_missing";
      return;
    }
    const ids = index.symbolsByFile.get(resolved);
    const fileText = (index.contents.find((c) => c.rel === resolved) || {}).text || "";
    const simple = claim.symbol.split(".").pop();
    if ((ids && (ids.has(claim.symbol) || ids.has(simple))) || wordIn(fileText, simple)) {
      claim.status = "pass";
      claim.reason = "symbol_in_file";
      claim.evidence = resolved;
      return;
    }
    claim.status = "fail";
    claim.reason = "symbol_not_in_file";
    claim.evidence = resolved;
    return;
  }

  if (claim.type === "symbol") {
    const files = index.symbolFiles.get(claim.symbol) || index.symbolFiles.get(claim.symbol.split(".").pop());
    if (files && files.size) {
      claim.status = "pass";
      claim.reason = "symbol_found";
      claim.evidence = [...files].slice(0, 5).join(",");
      return;
    }
    const hit = index.contents.find((c) => wordIn(c.text, claim.symbol) || wordIn(c.text, claim.symbol.split(".").pop()));
    if (hit) {
      claim.status = "pass";
      claim.reason = "symbol_text_hit";
      claim.evidence = hit.rel;
      return;
    }
    claim.status = "fail";
    claim.reason = "symbol_missing";
    return;
  }

  if (claim.type === "module") {
    const name = claim.module.toLowerCase();
    const hitDir = index.dirs.has(name);
    const hitPath = [...index.relFiles].some((rel) => rel.split("/").some((seg) => seg.toLowerCase() === name));
    if (hitDir || hitPath) {
      claim.status = "pass";
      claim.reason = "module_dir_exists";
      claim.evidence = claim.module;
      return;
    }
    claim.status = "fail";
    claim.reason = "module_missing";
    return;
  }

  if (claim.type === "route") {
    const hit = index.contents.find((c) => c.text.includes(claim.route));
    if (hit) {
      claim.status = "pass";
      claim.reason = "route_in_source";
      claim.evidence = hit.rel;
      return;
    }
    claim.status = "fail";
    claim.reason = "route_missing";
    return;
  }

  if (claim.type === "env") {
    if (index.envHits.has(claim.env)) {
      claim.status = "pass";
      claim.reason = "env_declared";
      return;
    }
    const hit = index.contents.find((c) => wordIn(c.text, claim.env) || c.text.includes(claim.env));
    if (hit) {
      claim.status = "pass";
      claim.reason = "env_text_hit";
      claim.evidence = hit.rel;
      return;
    }
    claim.status = "fail";
    claim.reason = "env_missing";
    return;
  }

  claim.status = "skip";
  claim.reason = "unhandled_type";
}

function queryTokens(q) {
  if (!q) return [];
  const tokens = new Set();
  String(q)
    .split(/[\s,;:|，。、/\\]+/)
    .forEach((t) => {
      const s = t.trim();
      if (s.length >= 2) tokens.add(s.toLowerCase());
    });
  String(q)
    .match(/[A-Za-z][A-Za-z0-9_-]{1,}/g)
    ?.forEach((t) => tokens.add(t.toLowerCase()));
  String(q)
    .match(/[\u4e00-\u9fff]{2,}/g)
    ?.forEach((t) => tokens.add(t));
  return [...tokens];
}

function claimBlob(claim) {
  return [claim.type, claim.path, claim.symbol, claim.module, claim.route, claim.env, claim.text, claim.sourceFile]
    .join(" ")
    .toLowerCase();
}

function matchesQuery(claim, tokens) {
  if (!tokens.length) return true;
  const blob = claimBlob(claim);
  return tokens.some((t) => blob.includes(t));
}

function renderClaimLine(claim) {
  const loc = `${claim.sourceFile}:${claim.sourceLine}`;
  const core = claim.type === "symbol_in_file"
    ? `${claim.symbol} @ ${claim.path}`
    : claim.path || claim.symbol || claim.module || claim.route || claim.env || claim.text;
  const extra = claim.evidence ? `  evidence=${claim.evidence}` : "";
  return `- [${claim.status}] (${claim.type}) \`${core}\` ← ${loc}  ${claim.reason}${extra}`;
}

function writeOutputs(allClaims, admitted, rejected, queryHits) {
  fs.mkdirSync(verifiedDir, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    query: query || null,
    counts: {
      total: allClaims.length,
      pass: allClaims.filter((c) => c.status === "pass").length,
      fail: allClaims.filter((c) => c.status === "fail").length,
      skip: allClaims.filter((c) => c.status === "skip").length,
    },
    claims: allClaims,
  };
  fs.writeFileSync(path.join(verifiedDir, "claims.json"), JSON.stringify(summary, null, 2), "utf8");

  const report = [
    "# Knowledge Base Fact-Gate Report",
    "",
    `- Project: \`${projectRoot}\``,
    `- Generated at: ${summary.generatedAt}`,
    `- Total claims: ${summary.counts.total}`,
    `- pass: ${summary.counts.pass}`,
    `- fail: ${summary.counts.fail}`,
    `- skip: ${summary.counts.skip}`,
    "",
    "## Rejected claims (do not treat as current facts)",
    "",
    ...(rejected.length ? rejected.map(renderClaimLine) : ["- (none)"]),
    "",
    "## Admitted claims",
    "",
    ...(admitted.length ? admitted.map(renderClaimLine) : ["- (none)"]),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(verifiedDir, "report.md"), report, "utf8");

  const admittedMd = [
    "# Admitted knowledge (code oracle)",
    "",
    "> Generated by `verify-kb-facts.js`. When injecting the knowledge base into analysis context, agents **may only cite pass claims listed here**.",
    "> fail claims have been falsified against source; do not treat them as current facts. Drill into source when needed; do not quote stale sentences.",
    "> Narrative paragraphs (that cannot be extracted as path/symbol/module/route/env) are not proof, only clues.",
    "",
    `- Generated at: ${summary.generatedAt}`,
    `- pass: ${summary.counts.pass} / fail: ${summary.counts.fail} / total: ${summary.counts.total}`,
    "",
    "## Admitted claims",
    "",
    ...(admitted.length ? admitted.map(renderClaimLine) : ["- (no falsifiable claims that passed)"]),
    "",
    "## Rejected claims",
    "",
    ...(rejected.length ? rejected.map(renderClaimLine) : ["- (none)"]),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(kbDir, "PROJECT_KNOWLEDGE_ADMITTED.md"), admittedMd, "utf8");

  if (query) {
    const passHits = queryHits.filter((c) => c.status === "pass").slice(0, limit);
    const failHits = queryHits.filter((c) => c.status === "fail").slice(0, limit);
    const qmd = [
      `# Admitted context (query)`,
      "",
      `- query: ${query}`,
      `- pass hits: ${passHits.length}`,
      `- fail hits (do not cite as facts): ${failHits.length}`,
      "",
      "## Injectable context (pass)",
      "",
      ...(passHits.length ? passHits.map(renderClaimLine) : ["- (no matching verified facts; drill into source)"]),
      "",
      "## Related but falsified (fail; do not treat as facts)",
      "",
      ...(failHits.length ? failHits.map(renderClaimLine) : ["- (none)"]),
      "",
    ].join("\n");
    fs.writeFileSync(path.join(verifiedDir, "query-admit.md"), qmd, "utf8");
    return qmd;
  }
  return admittedMd;
}

function main() {
  if (!exists(kbDir)) {
    const payload = {
      kbStatus: "missing",
      message: "docs/knowledge-base does not exist; skipping fact gate.",
      projectRoot,
    };
    if (jsonOut) console.log(JSON.stringify(payload, null, 2));
    else console.log("KB_STATUS=missing\n" + payload.message);
    process.exit(0);
  }

  const kbFiles = collectKbFiles();
  if (!kbFiles.length) {
    const payload = {
      kbStatus: "empty",
      message: "Knowledge-base directory has no md/puml files; skipping fact gate.",
      projectRoot,
    };
    if (jsonOut) console.log(JSON.stringify(payload, null, 2));
    else console.log("KB_STATUS=empty\n" + payload.message);
    process.exit(0);
  }

  const extracted = [];
  for (const filePath of kbFiles) {
    const rel = posixRel(filePath);
    if (/\.puml$/i.test(filePath)) extracted.push(...extractFromPuml(filePath, rel));
    else extracted.push(...extractFromMarkdown(filePath, rel));
  }

  const dedup = new Map();
  for (const claim of extracted) {
    const key = [claim.type, claim.path, claim.symbol, claim.module, claim.route, claim.env].join("|");
    if (!dedup.has(key)) dedup.set(key, claim);
  }
  const claims = [...dedup.values()].map((c, i) => ({ ...c, id: `c${String(i + 1).padStart(4, "0")}` }));

  const index = indexSource();
  for (const claim of claims) verifyClaim(claim, index);

  const admitted = claims.filter((c) => c.status === "pass");
  const rejected = claims.filter((c) => c.status === "fail");
  const tokens = queryTokens(query);
  const queryHits = query ? claims.filter((c) => matchesQuery(c, tokens)) : claims;
  const injection = writeOutputs(claims, admitted, rejected, queryHits);

  const result = {
    kbStatus: "verified",
    projectRoot,
    sourceFilesIndexed: index.fileCount,
    counts: {
      total: claims.length,
      pass: admitted.length,
      fail: rejected.length,
    },
    query: query || null,
    outputs: {
      claims: path.join(verifiedDir, "claims.json"),
      report: path.join(verifiedDir, "report.md"),
      admitted: path.join(kbDir, "PROJECT_KNOWLEDGE_ADMITTED.md"),
      queryAdmit: query ? path.join(verifiedDir, "query-admit.md") : null,
    },
  };

  if (jsonOut) {
    console.log(JSON.stringify({ ...result, injectionMarkdown: injection }, null, 2));
  } else {
    console.log(`KB_STATUS=verified`);
    console.log(`INDEXED_SOURCE=${index.fileCount}`);
    console.log(`CLAIMS_TOTAL=${claims.length}`);
    console.log(`CLAIMS_PASS=${admitted.length}`);
    console.log(`CLAIMS_FAIL=${rejected.length}`);
    console.log(`ADMITTED=${result.outputs.admitted}`);
    console.log(`REPORT=${result.outputs.report}`);
    if (query) console.log(`QUERY_ADMIT=${result.outputs.queryAdmit}`);
    console.log("");
    console.log(injection);
  }
}

main();
