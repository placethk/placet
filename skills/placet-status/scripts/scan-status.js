#!/usr/bin/env node
/**
 * Placet project status scanner
 * Usage: node scan-status.js <target-project-path>
 * Output: Markdown status overview (all requirements)
 */
const fs = require("fs");
const path = require("path");

const projectRoot = process.argv[2];
if (!projectRoot) {
  console.error("Usage: node scan-status.js <target-project-path>");
  process.exit(1);
}

const docsDir = path.join(projectRoot, "docs");
const testsDir = path.join(projectRoot, "tests");

const STAGE_FILES = {
  "00": "00-original-requirements.md",
  "01": "01-requirements-analysis.md",
  "02": "02-prd.md",
  "02a": "02a-interface-contract.md",
  "03": "03-software-design.md",
  "03a": "03a-change-strategy.md",
  "04": "04-test-cases.md",
  "04a": "04a-regression-checklist.md",
  "05": "05-test-report.md",
};

function exists(p) {
  return fs.existsSync(p);
}

function readHead(filePath, lines = 40) {
  if (!exists(filePath)) return "";
  return fs.readFileSync(filePath, "utf8").split("\n").slice(0, lines).join("\n");
}

function detectLevel(text) {
  if (!text) return null;
  const patterns = [
    /(?:suggested\s*level|change\s*level|level|建议级别|变更级别|级别)\s*\|\s*(S|M|L)/i,
    /(?:suggested\s*level|change\s*level|level|建议级别|变更级别|级别)[:：\s|]*\**\s*(S|M|L)\s*\**/i,
    /(?:suggested\s*level|change\s*level|level|建议级别|变更级别|级别)[:：\s|]*(S|M|L)\s*(?:level|[级（(])/i,
    /\b(S|M|L)\s*(?:-?\s*level|级)\b/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

function parseChangelogStatus(changelog) {
  if (!changelog) return { status: null, note: "" };
  if (/(?:paused|on hold|pause|暂停|暂缓|hold)/i.test(changelog) && !/(?:resumed|restored|恢复)/i.test(changelog)) {
    return { status: "paused", note: "CHANGELOG has a pause marker" };
  }
  if (/(?:changing|in change|变更中|🔄|in progress.*change|进行中.*变更)/i.test(changelog)) {
    return { status: "changing", note: "CHANGELOG has an open change" };
  }
  if (/(?:change.*(?:done|completed|已完成|完成)|变更.*(?:已完成|✅✅|完成))/i.test(changelog) || /✅✅/.test(changelog)) {
    return { status: "changed", note: "CHANGELOG has a closed change" };
  }
  return { status: null, note: "" };
}

function requiredForLevel(level) {
  switch (level) {
    case "S":
      return ["00", "01", "05"];
    case "M":
      return ["00", "01", "02", "03", "04", "05"];
    case "L":
      return ["00", "01", "02", "03", "03a", "04", "04a", "05"];
    default:
      return ["00", "01"];
  }
}

function listRequirementDirs() {
  if (!exists(docsDir)) return [];
  return fs.readdirSync(docsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "knowledge-base" && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

function isIndexHeaderCell(cell) {
  return /^(requirement\s*id|id|需求标识)$/i.test(cell);
}

function getKbIndexRows() {
  const detailPath = path.join(docsDir, "knowledge-base", "PROJECT_KNOWLEDGE_DETAIL.md");
  if (!exists(detailPath)) return [];
  const content = fs.readFileSync(detailPath, "utf8");
  const heading = "## Requirement Index";
  const idx = content.indexOf(heading);
  if (idx < 0) return [];
  const after = content.slice(idx + heading.length);
  const nextSection = after.search(/\n## /);
  const section = nextSection >= 0 ? after.slice(0, nextSection) : after;
  const rows = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("|") || line.includes("---")) continue;
    const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length >= 2 && !isIndexHeaderCell(cols[0])) {
      const lv = (cols[2] || "").replace(/(?:-?\s*level|级)/gi, "").trim().toUpperCase();
      rows.push({ id: cols[0], name: cols[1], level: /^[SML]$/.test(lv) ? lv : null });
    }
  }
  return rows;
}

function currentStage(reqDir, level, has05) {
  if (has05) return "Done";
  if (level === "?") {
    if (exists(path.join(reqDir, STAGE_FILES["01"]))) return "In progress → next: Task 3 confirm level";
    if (exists(path.join(reqDir, STAGE_FILES["00"]))) return "In progress → next: Task 3 requirements analysis";
    return "Not started";
  }
  const order = level === "L"
    ? ["04a", "04", "03a", "03", "02a", "02", "01", "00"]
    : level === "M"
      ? ["04", "03", "02a", "02", "01", "00"]
      : ["05", "01", "00"];
  for (const key of order) {
    const f = STAGE_FILES[key];
    if (f && exists(path.join(reqDir, f))) {
      const next = {
        "00": "Task 3 requirements analysis",
        "01": level === "S" ? "Task 6 coding (S-level skips PRD/design/test-case docs)" : "Task 4 PRD",
        "02": "Task 4.5 interface contract (if needed) or Task 5 design",
        "02a": "Task 5 design",
        "03": "Task 6 coding",
        "03a": "Task 6 coding (batched)",
        "04": "Task 7 test cases",
        "04a": "Task 7 regression checklist",
      };
      return `In progress → next: ${next[key] || key}`;
    }
  }
  return "Not started";
}

function scanRequirement(reqId, kbLevelMap) {
  const reqDir = path.join(docsDir, reqId);
  const changelogExists = exists(path.join(reqDir, "CHANGELOG.md"));
  const changelog = changelogExists
    ? fs.readFileSync(path.join(reqDir, "CHANGELOG.md"), "utf8") : "";
  const analysisHead = readHead(path.join(reqDir, STAGE_FILES["01"]));
  const originHead = readHead(path.join(reqDir, STAGE_FILES["00"]));
  const level = detectLevel(analysisHead) || detectLevel(originHead) || kbLevelMap[reqId] || "?";
  const chg = parseChangelogStatus(changelog);

  const required = requiredForLevel(level);
  const missing = required.filter((k) => !exists(path.join(reqDir, STAGE_FILES[k])));
  if (!changelogExists) {
    missing.push("CHANGELOG.md");
  } else if (!/##\s+Knowledge Base Anchor/.test(changelog)) {
    missing.push("kb-anchor");
  }

  const testDir = path.join(testsDir, reqId);
  const hasTests = exists(testDir);
  const has05 = exists(path.join(reqDir, STAGE_FILES["05"]));

  let status = "🔄 In progress";
  if (chg.status === "paused") status = "⏸️ Paused";
  else if (chg.status === "changing") status = "🔁 Changing";
  else if (level === "?") status = "⚠️ Level pending";
  else if (missing.length === 0 && has05) status = chg.status === "changed" ? "✅✅ Change done" : "✅ Done";
  else if (!exists(path.join(reqDir, STAGE_FILES["00"])) && !exists(path.join(reqDir, STAGE_FILES["01"]))) status = "⏳ Not started";

  const stage = currentStage(reqDir, level, has05);

  return {
    id: reqId,
    level,
    status,
    stage,
    missing: missing.map((k) => k === "kb-anchor" ? "CHANGELOG-Knowledge Base Anchor" : (STAGE_FILES[k] || k)),
    tests: hasTests ? "✅ yes" : "—",
    chgNote: chg.note,
  };
}

const reqDirs = listRequirementDirs();
const kbIndex = getKbIndexRows();
const kbLevelMap = Object.fromEntries(kbIndex.filter((r) => r.level).map((r) => [r.id, r.level]));
const kbIds = new Set(kbIndex.map((r) => r.id));
const allIds = [...new Set([...reqDirs, ...kbIndex.map((r) => r.id)])].sort();

const kbBase = path.join(docsDir, "knowledge-base", "PROJECT_KNOWLEDGE_BASE.md");
const kbDetail = path.join(docsDir, "knowledge-base", "PROJECT_KNOWLEDGE_DETAIL.md");
const codegraphDir = path.join(projectRoot, ".codegraph");

console.log("# 📊 Placet Project Status\n");
console.log(`Project path: \`${projectRoot}\``);
console.log(`Scanned at: ${new Date().toISOString()}\n`);

console.log("## Knowledge Base\n");
console.log(`| File | Status |`);
console.log(`|------|--------|`);
console.log(`| PROJECT_KNOWLEDGE_BASE.md | ${exists(kbBase) ? "✅" : "❌ missing"} |`);
console.log(`| PROJECT_KNOWLEDGE_DETAIL.md | ${exists(kbDetail) ? "✅" : "❌ missing"} |`);
console.log(`| Requirement Index | ${kbIndex.length ? `✅ ${kbIndex.length} row(s)` : "⚠️ DETAIL has no index table"} |`);
console.log(`| CodeGraph | ${exists(codegraphDir) ? "✅ .codegraph exists" : "⚠️ .codegraph not found (large projects should run codegraph build first)"} |\n`);

console.log("## Requirements (all)\n");
console.log(`${allIds.length} requirement id(s)\n`);

if (allIds.length === 0) {
  console.log("_No requirement directories under docs/. Enter `requirements analysis: ...` to start a new requirement._\n");
} else {
  console.log("| Id | Level | Status | Current stage | Missing docs | Tests |");
  console.log("|----|:-----:|:------:|---------------|--------------|-------|");
  for (const id of allIds) {
    const r = scanRequirement(id, kbLevelMap);
    const inDocs = reqDirs.includes(id);
    const inKbOnly = !inDocs && kbIds.has(id);
    const miss = r.missing.length ? r.missing.join(", ") : (inKbOnly ? "⚠️ KB index only, no docs directory" : "—");
    console.log(`| ${id} | ${r.level} | ${r.status} | ${r.stage} | ${miss} | ${r.tests} |`);
  }
  console.log("");
}

const orphanKb = kbIndex.filter((r) => !reqDirs.includes(r.id));
if (orphanKb.length) {
  console.log("## ⚠️ In knowledge-base index but missing docs directory\n");
  for (const r of orphanKb) {
    console.log(`- \`${r.id}\` (${r.name})`);
  }
  console.log("");
}

const orphanDocs = reqDirs.filter((id) => !kbIds.has(id));
if (orphanDocs.length && kbIndex.length) {
  console.log("## ⚠️ docs exist but not registered in the knowledge-base index\n");
  for (const id of orphanDocs) {
    console.log(`- \`${id}\` — suggest Task 8.5 to update DETAIL Requirement Index`);
  }
  console.log("");
}

console.log("## Next steps\n");
const inProgress = allIds.map((id) => scanRequirement(id, kbLevelMap)).filter((r) =>
  r.status.includes("In progress") || r.status.includes("Changing") || r.status.includes("进行中") || r.status.includes("变更")
);
if (inProgress.length) {
  for (const r of inProgress) {
    console.log(`- **${r.id}** [${r.level}-level]: ${r.stage}`);
  }
} else if (allIds.length) {
  console.log("- All requirement document stages are done, or refresh with `/placet-status`");
} else {
  console.log("- `generate knowledge base, target project: <path>` or `requirements analysis: ...`");
}
console.log("\n---\nTrigger: `/placet-status` or `view status, target project: <path>`\n");
