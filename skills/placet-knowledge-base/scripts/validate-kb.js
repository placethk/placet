#!/usr/bin/env node
/**
 * Placet knowledge-base validator.
 *
 * Usage:
 *   node validate-kb.js <project-root> [--strict]
 *
 * --strict  Large projects (>500 source files) without .codegraph/ become errors
 *           (use when preflight reported BUILD_OK/CACHED_OK).
 *
 * Checks the minimum structure required by Placet:
 * - docs/knowledge-base/PROJECT_KNOWLEDGE_BASE.md
 * - docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md
 * - DETAIL sections for requirement index, function/API change index, update records
 * - requirement docs with CHANGELOG.md containing a Knowledge Base Anchor section
 * - large projects should have a .codegraph directory
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const projectRoot = args.find((a) => !a.startsWith("-"));
if (!projectRoot) {
  console.error("Usage: node validate-kb.js <project-root> [--strict]");
  process.exit(2);
}

const docsDir = path.join(projectRoot, "docs");
const kbDir = path.join(docsDir, "knowledge-base");
const basePath = path.join(kbDir, "PROJECT_KNOWLEDGE_BASE.md");
const detailPath = path.join(kbDir, "PROJECT_KNOWLEDGE_DETAIL.md");
const codegraphDir = path.join(projectRoot, ".codegraph");

const errors = [];
const warnings = [];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readText(filePath) {
  return exists(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function walk(dir, predicate, skip = new Set([".git", "node_modules", "vendor", "dist", "build", ".codegraph"])) {
  if (!exists(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath, predicate, skip));
    } else if (!predicate || predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function hasSection(content, title) {
  return new RegExp(`^##\\s+${title}\\s*$`, "m").test(content);
}

function listRequirementDirs() {
  if (!exists(docsDir)) return [];
  return fs.readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "knowledge-base" && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

if (!exists(kbDir)) {
  errors.push("Missing docs/knowledge-base directory.");
}
if (!exists(basePath)) {
  errors.push("Missing docs/knowledge-base/PROJECT_KNOWLEDGE_BASE.md.");
}
if (!exists(detailPath)) {
  errors.push("Missing docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md.");
}

const detail = readText(detailPath);
if (detail) {
  const requiredDetailSections = [
    ["Requirement Index", "需求索引表"],
    ["Function and API Change Index", "函数与接口变更索引"],
    ["Update History", "更新记录"],
  ];
  for (const aliases of requiredDetailSections) {
    if (!aliases.some((title) => hasSection(detail, title))) {
      errors.push(`PROJECT_KNOWLEDGE_DETAIL.md missing section: ## ${aliases[0]}`);
    }
  }
}

for (const reqId of listRequirementDirs()) {
  const changelogPath = path.join(docsDir, reqId, "CHANGELOG.md");
  if (!exists(changelogPath)) {
    warnings.push(`Requirement ${reqId} missing CHANGELOG.md.`);
    continue;
  }
  const changelog = readText(changelogPath);
  if (!/##\s+Knowledge Base Anchor/.test(changelog)) {
    warnings.push(`Requirement ${reqId} missing Knowledge Base Anchor section in CHANGELOG.md.`);
  }
}

const sourceExtensions = new Set([
  ".c", ".cc", ".cpp", ".cs", ".go", ".h", ".hpp", ".java", ".js", ".jsx",
  ".kt", ".lua", ".py", ".rs", ".sh", ".ts", ".tsx", ".vue",
]);
const sourceFiles = walk(projectRoot, (filePath) => sourceExtensions.has(path.extname(filePath).toLowerCase()));
const largeProject = sourceFiles.length > 500;
const codegraphMissingMsg = `Large project detected (${sourceFiles.length} source files) but .codegraph is missing. Run preflight-kb.sh and codegraph build before full KB generation.`;
if (largeProject && !exists(codegraphDir)) {
  if (strict) {
    errors.push(codegraphMissingMsg);
  } else {
    warnings.push(codegraphMissingMsg);
  }
}

const baseContent = readText(basePath);
if (baseContent && !/##\s+CodeGraph\s+(?:Status|状态)/.test(baseContent)) {
  warnings.push("PROJECT_KNOWLEDGE_BASE.md missing section: ## CodeGraph Status");
}

console.log("# Placet Knowledge Base Validation\n");
console.log(`Project: ${projectRoot}`);
console.log(`Source files counted: ${sourceFiles.length}`);
console.log(`Strict mode: ${strict ? "on" : "off"}`);
console.log(`CodeGraph: ${exists(codegraphDir) ? "present" : "missing"}\n`);

if (errors.length) {
  console.log("## Errors\n");
  for (const error of errors) console.log(`- ${error}`);
  console.log("");
}

if (warnings.length) {
  console.log("## Warnings\n");
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log("");
}

if (!errors.length && !warnings.length) {
  console.log("Validation passed.");
}

process.exit(errors.length ? 1 : 0);
