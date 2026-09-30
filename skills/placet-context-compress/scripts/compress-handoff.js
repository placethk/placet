#!/usr/bin/env node
/**
 * Placet inter-stage context compressor
 * Usage:
 *   node compress-handoff.js <target-project-path> <requirement-id> <target-stage>
 *
 * Target stage ∈ {prd, design, build, test, report, kb}
 * Output: <target-project>/docs/<requirement-id>/.handoff/<target-stage>.context.md
 * Purpose: replace full prior docs with a pack of section skeleton + key points + path + SHA256 to save tokens.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STAGE_PREFIX = {
  prd: 2,
  design: 3,
  build: 4,
  test: 5,
  report: 6,
  kb: 6,
};

const PREFIX_LABEL = {
  "00": "Original requirements",
  "01": "Requirements analysis",
  "02": "PRD",
  "02a": "Interface contract",
  "03": "Software design",
  "03a": "Change strategy",
  "04": "Test cases",
  "04a": "Regression checklist",
  "05": "Test report",
};

function filePrefix(name) {
  const m = name.match(/^(\d{2}[a-z]?)-/);
  return m ? m[1] : null;
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function extractSections(md) {
  const lines = md.split(/\r?\n/);
  const sections = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim(), points: [], startLine: i + 1 };
      continue;
    }
    if (current) {
      const t = lines[i].trim().replace(/^[#>*\-\s]+/, "");
      if (t && current.points.length < 2) current.points.push(t.slice(0, 80));
    }
  }
  if (current) sections.push(current);
  return sections;
}

function main() {
  const [projectRoot, reqId, stage] = process.argv.slice(2);
  if (!projectRoot || !reqId || !stage) {
    console.error("Usage: node compress-handoff.js <target-project-path> <requirement-id> <target-stage>");
    console.error("Target stage: prd | design | build | test | report | kb");
    process.exit(1);
  }
  if (!STAGE_PREFIX[stage]) {
    console.error(`Unknown target stage: ${stage}`);
    process.exit(1);
  }

  const reqDir = path.join(projectRoot, "docs", reqId);
  if (!fs.existsSync(reqDir)) {
    console.error(`Requirement directory does not exist: ${reqDir}`);
    process.exit(1);
  }

  const maxPrefix = STAGE_PREFIX[stage];
  const files = fs
    .readdirSync(reqDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ name: f, full: path.join(reqDir, f) }))
    .filter((f) => {
      const p = filePrefix(f.name);
      if (!p) return false;
      const base = parseInt(p.slice(0, 2), 10);
      return base < maxPrefix;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (files.length === 0) {
    console.error(`No completed docs before target stage ${stage}; cannot generate a pack`);
    process.exit(1);
  }

  const entries = [];
  const fingerprintParts = [];
  for (const f of files) {
    const content = fs.readFileSync(f.full, "utf8");
    const hash = sha256(content);
    fingerprintParts.push(`${f.name}:${hash}`);
    const lines = content.split(/\r?\n/).length;
    const sections = extractSections(content);
    entries.push({
      name: f.name,
      hash,
      lines,
      sections,
    });
  }
  const fingerprint = sha256(fingerprintParts.join("|"));

  const handoffDir = path.join(reqDir, ".handoff");
  const outFile = path.join(handoffDir, `${stage}.context.md`);
  if (fs.existsSync(outFile)) {
    const old = fs.readFileSync(outFile, "utf8");
    const oldFp = old.match(/fingerprint:\s*([a-f0-9]{64})/);
    if (oldFp && oldFp[1] === fingerprint) {
      console.log(`✅ Prior docs unchanged; reusing existing pack: ${outFile}`);
      return;
    }
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(
    2,
    "0"
  )}`;

  const md = [];
  md.push(`# Stage handoff context pack (${reqId} → ${stage})`);
  md.push(`> Generated: ${timestamp} · fingerprint: ${fingerprint}`);
  md.push(`> Usage: restore context from this pack only. For details, follow "Drill-down suggestions" and read original docs. Do not re-read prior docs in full.`);
  md.push("");
  md.push("## Prior document list");
  for (const e of entries) {
    const prefix = filePrefix(e.name);
    const label = PREFIX_LABEL[prefix] || prefix;
    md.push(`- **${label}** — \`${e.name}\` (sha256: ${e.hash.slice(0, 8)}…) · ${e.lines} lines`);
    if (e.sections.length) {
      const titles = e.sections.map((s) => s.title).join(" / ");
      md.push(`  - Sections: ${titles}`);
      for (const s of e.sections.slice(0, 3)) {
        if (s.points.length) md.push(`  - "${s.title}" key points: ${s.points.join("; ")}`);
      }
    } else {
      md.push(`  - No ## sections (plain-text doc; read original as needed)`);
    }
  }
  md.push("");
  md.push("## Drill-down suggestions");
  for (const e of entries) {
    for (const s of e.sections) {
      md.push(`- For "${s.title}" details → read \`${e.name}\` around line ${s.startLine}`);
    }
  }
  md.push("");
  md.push("## Change history");
  md.push(`| Version | Time | Notes |`);
  md.push(`|--------|------|-------|`);
  md.push(`| ${timestamp} | generated | based on prior-doc hash ${fingerprint.slice(0, 12)}… |`);

  fs.mkdirSync(handoffDir, { recursive: true });
  fs.writeFileSync(outFile, md.join("\n"), "utf8");
  console.log(`✅ Generated compressed context pack: ${outFile}`);
  console.log(`   Covers ${entries.length} prior doc(s) (${fingerprint.slice(0, 12)}…)`);
}

main();
