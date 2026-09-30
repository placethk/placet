#!/usr/bin/env node
/**
 * Placet skill evaluator
 * Usage:
 *   node eval-skill.js <skill-name-or-path> --collect            # static checks, JSON stdout, no files
 *   node eval-skill.js <skill-name-or-path> --quick              # static minimum, write HTML report
 *   node eval-skill.js <skill-name-or-path> --smoke '<smoke-json>'  # merge AI smoke results, write final HTML
 *
 * Report: <FRAMEWORK>/docs/skill-eval/<skill>-YYYYMMDD.html
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function resolveFramework() {
  if (process.env.PLACET_FRAMEWORK) return process.env.PLACET_FRAMEWORK;
  const pathFile = path.join(
    process.env.HOME || process.env.USERPROFILE || "",
    ".claude",
    "placet-framework-path"
  );
  if (fs.existsSync(pathFile)) {
    const p = fs.readFileSync(pathFile, "utf8").trim();
    if (p && fs.existsSync(p)) return p;
  }
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "skills")) && fs.existsSync(path.join(cwd, "PLACET.md"))) {
    return cwd;
  }
  return null;
}

function resolveSkillDir(arg, framework) {
  if (!arg) return null;
  const asPath = path.resolve(arg);
  if (fs.existsSync(asPath)) {
    if (fs.existsSync(path.join(asPath, "SKILL.md"))) return asPath;
    if (arg.endsWith("SKILL.md")) return path.dirname(asPath);
  }
  if (framework) {
    const candidate = path.join(framework, "skills", arg);
    if (fs.existsSync(path.join(candidate, "SKILL.md"))) return candidate;
  }
  return null;
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readFirst(files) {
  for (const f of files) {
    if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  }
  return "";
}

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

function runChecks(skillDir, framework) {
  const skillName = path.basename(skillDir);
  const skillMd = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
  const checks = [];

  const fm = parseFrontmatter(skillMd);
  const fmNameOk = fm && fm.name && fm.name.trim().length > 0;
  const fmDescOk = fm && fm.description && fm.description.trim().length > 0;
  const fmTriggerOk = fm && fm.description && /(?:trigger|natural language|触发|自然语言)/i.test(fm.description);
  checks.push({
    id: 1,
    name: "Frontmatter completeness",
    passed: fmNameOk && fmDescOk,
    detail: fm
      ? `name=${fm.name || "missing"} · description=${fmDescOk ? "present" : "missing"} · trigger wording=${fmTriggerOk ? "yes" : "no"}`
      : "SKILL.md has no YAML frontmatter",
  });

  const requiredSections = [
    { key: "Trigger", re: /(?:^#+\s*)?(?:Trigger|When to use|触发)/im },
    { key: "Execution", re: /(?:^#+\s*)?(?:Execution|How to|Steps|执行)/im },
    { key: "Outputs", re: /(?:^#+\s*)?(?:Outputs?|Produce|产出|输出)/im },
  ];
  const missingSections = requiredSections.filter((s) => !s.re.test(skillMd)).map((s) => s.key);
  checks.push({
    id: 2,
    name: "Required sections",
    passed: missingSections.length === 0,
    detail: missingSections.length ? `missing: ${missingSections.join("/")}` : "Trigger / Execution / Outputs present",
  });

  const allScriptRefs = [...skillMd.matchAll(/scripts\/([A-Za-z0-9._-]+\.js)/g)].map((m) => m[1]);
  const crossSkillRefs = [
    ...skillMd.matchAll(/skills\/[A-Za-z0-9_-]+\/scripts\/([A-Za-z0-9._-]+\.js)/g),
  ].map((m) => m[1]);
  const scriptRefs = [...new Set(allScriptRefs.filter((f) => !crossSkillRefs.includes(f)))];
  const missingScripts = scriptRefs.filter((s) => !fs.existsSync(path.join(skillDir, "scripts", s)));
  const scriptsDir = path.join(skillDir, "scripts");
  const allScripts = fs.existsSync(scriptsDir)
    ? fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".js"))
    : [];
  checks.push({
    id: 3,
    name: "Script references exist",
    passed: missingScripts.length === 0,
    detail: `referenced ${scriptRefs.length} · missing ${missingScripts.length} · directory has ${allScripts.length} .js`,
  });

  const syntaxErrors = [];
  for (const f of allScripts) {
    const full = path.join(scriptsDir, f);
    try {
      execSync(`node --check "${full}"`, { stdio: "pipe" });
    } catch (e) {
      const msg = String(e.stderr || e.message).split("\n")[0];
      syntaxErrors.push(`${f}: ${msg}`);
    }
  }
  checks.push({
    id: 4,
    name: "Script syntax (node --check)",
    passed: syntaxErrors.length === 0,
    detail: syntaxErrors.length ? syntaxErrors.join(" | ") : `all ${allScripts.length} script(s) passed syntax check`,
  });

  const claudeMd = framework ? readFirst([path.join(framework, "CLAUDE.md")]) : "";
  const source = fm && fm.description ? fm.description : skillMd;
  const chineseWords = (source.match(/[\u4e00-\u9fff]{2,12}/g) || []).filter(
    (w) => !/技能|能力|用法|触发|命令|评估|压缩|自然|语言|知识库|项目|当前|阶段|开发/.test(w)
  );
  const englishTokens = (source.match(/\b(?:placet-[a-z0-9-]+|\/placet-[a-z0-9-]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g) || [])
    .filter((w) => !/^(Skill|Claude|Markdown|YAML|HTML|JSON)$/i.test(w));
  const uniqueWords = [...new Set([...chineseWords, ...englishTokens])].slice(0, 6);
  const foundWords = uniqueWords.filter((w) => claudeMd.includes(w));
  checks.push({
    id: 5,
    name: "Trigger words align with CLAUDE.md",
    passed: claudeMd === "" || uniqueWords.length === 0 || foundWords.length > 0,
    detail: claudeMd === ""
      ? "CLAUDE.md not found (skipped)"
      : uniqueWords.length
        ? `extracted ${uniqueWords.join("/")} · CLAUDE.md hits ${foundWords.length}`
        : "description has no obvious trigger words (consider adding some)",
  });

  const badRefs = [];
  for (const m of skillMd.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const ref = m[1];
    if (/^(https?:|#|\$|~)/.test(ref) || ref.includes("$FRAMEWORK") || ref.includes("<")) continue;
    const target = path.resolve(skillDir, ref);
    if (!fs.existsSync(target)) badRefs.push(ref);
  }
  checks.push({
    id: 6,
    name: "Relative path references resolve",
    passed: badRefs.length === 0,
    detail: badRefs.length ? `unresolved: ${badRefs.join(", ")}` : "all relative references resolve",
  });

  const passed = checks.filter((c) => c.passed).length;
  return {
    skill: skillName,
    skillPath: skillDir,
    checks,
    rubric: {
      passed,
      total: checks.length,
      score: Math.round((passed / checks.length) * 1000) / 10,
    },
  };
}

function smokeSuggestion(skillName, skillDir) {
  const map = {
    "placet-knowledge-fact-gate": (s) =>
      `node "${s}/scripts/verify-kb-facts.js" <target-project> --query "smoke"`,
    "placet-status": (s) => `node "${s}/scripts/scan-status.js" <target-project>`,
    "placet-knowledge-base": (s) => `node "${s}/scripts/preflight-kb.js" <target-project>`,
  };
  if (map[skillName]) return map[skillName](skillDir);
  const scriptsDir = path.join(skillDir, "scripts");
  const scripts = fs.existsSync(scriptsDir)
    ? fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".js"))
    : [];
  if (scripts.length)
    return `node "${path.join(scriptsDir, scripts[0])}" --help (verify the script runs with exit code 0)`;
  return `No scripts/ directory: check that SKILL.md itself is a valid AI-instruction-only skill`;
}

function renderHtml(result, smoke) {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const rows = result.checks
    .map(
      (c) => `<tr>
        <td>${c.id}</td>
        <td>${escapeHtml(c.name)}</td>
        <td class="${c.passed ? "pass" : "fail"}">${c.passed ? "✅ PASS" : "❌ FAIL"}</td>
        <td class="detail">${escapeHtml(c.detail)}</td>
      </tr>`
    )
    .join("\n        ");

  const smokeHtml = smoke
    ? `<h2>LLM smoke result</h2>
      <table class="smoke">
        <tr><td class="${smoke.passed ? "pass" : "fail"}">${smoke.passed ? "✅ passed" : "❌ failed"}</td></tr>
        <tr><td><b>Command:</b> <code>${escapeHtml(smoke.command || "")}</code></td></tr>
        <tr><td><b>Duration:</b> ${smoke.duration_ms != null ? smoke.duration_ms + " ms" : "—"}</td></tr>
        <tr><td><b>Output highlights:</b><pre>${escapeHtml(smoke.output_head || "—")}</pre></td></tr>
      </table>`
    : `<p class="hint">LLM smoke not run. Complete with the <code>--full</code> flow: <code>${escapeHtml(
        result.smokeSuggestion || ""
      )}</code></p>`;

  const advice = result.checks
    .filter((c) => !c.passed)
    .map((c) => `<li>${escapeHtml(c.name)}: ${escapeHtml(c.detail)}</li>`)
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Skill evaluation report — ${escapeHtml(result.skill)}</title>
<style>
  body { font-family: "Segoe UI", sans-serif; max-width: 960px; margin: 24px auto; padding: 0 16px; color: #24292f; }
  h1 { font-size: 22px; border-bottom: 2px solid #eaecef; padding-bottom: 8px; }
  h2 { font-size: 18px; margin-top: 28px; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th, td { border: 1px solid #d0d7de; padding: 8px 10px; text-align: left; font-size: 14px; }
  th { background: #f6f8fa; }
  td.detail { color: #57606a; font-size: 13px; }
  .pass { color: #1a7f37; font-weight: 600; }
  .fail { color: #cf222e; font-weight: 600; }
  .score { font-size: 40px; font-weight: 700; color: #0969da; }
  .score-sub { color: #57606a; font-size: 14px; }
  .hint { color: #57606a; font-size: 13px; }
  pre { background: #f6f8fa; padding: 10px; border-radius: 6px; font-size: 12px; overflow-x: auto; }
  code { background: #f6f8fa; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
  ul { font-size: 14px; }
</style>
</head>
<body>
  <h1>Skill evaluation report</h1>
  <p>Skill: <code>${escapeHtml(result.skill)}</code> · Path: <code>${escapeHtml(result.skillPath)}</code> · Date: ${date}</p>
  <p>Rubric score: <span class="score">${result.rubric.score}%</span>
     <span class="score-sub">(${result.rubric.passed}/${result.rubric.total} checks passed; deterministic static checks, zero LLM cost)</span></p>

  <h2>Static check details</h2>
  <table>
    <tr><th>#</th><th>Check</th><th>Status</th><th>Detail</th></tr>
        ${rows}
  </table>

  ${smokeHtml}

  <h2>Fix suggestions</h2>
  ${
    advice
      ? `<ul>
        ${advice}
      </ul>`
      : `<p class="pass">All checks passed; nothing to fix.</p>`
  }
</body>
</html>
`;
}

function main() {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith("--"));
  const mode = modeArg ? modeArg.slice(2) : "collect";
  const skillArg = args.find((a) => !a.startsWith("--"));
  if (!skillArg) {
    console.error("Usage: node eval-skill.js <skill-name-or-path> --collect|--quick|--smoke '<json>'");
    process.exit(1);
  }

  const framework = resolveFramework();
  const skillDir = resolveSkillDir(skillArg, framework);
  if (!skillDir) {
    console.error(`Skill not found: ${skillArg}`);
    console.error(framework ? `Tried: ${path.join(framework, "skills", skillArg)}` : "Framework path not resolved");
    process.exit(1);
  }

  const result = runChecks(skillDir, framework);
  result.smokeSuggestion = smokeSuggestion(result.skill, skillDir);

  if (mode === "collect") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (mode === "quick") {
    const html = renderHtml(result, null);
    writeReport(result.skill, html);
    return;
  }

  if (mode === "smoke") {
    const smokeJson = args[args.indexOf("--smoke") + 1];
    let smoke = null;
    if (smokeJson) {
      try {
        smoke = JSON.parse(smokeJson);
      } catch (e) {
        console.error("--smoke argument is not valid JSON:", smokeJson);
        process.exit(1);
      }
    }
    const html = renderHtml(result, smoke);
    writeReport(result.skill, html);
    return;
  }

  console.error(`Unknown mode: --${mode}`);
  process.exit(1);
}

function writeReport(skillName, html) {
  const framework = resolveFramework();
  if (!framework) {
    console.error("Framework path not resolved; report not written");
    process.exit(1);
  }
  const outDir = path.join(framework, "docs", "skill-eval");
  fs.mkdirSync(outDir, { recursive: true });
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const outFile = path.join(outDir, `${skillName}-${date}.html`);
  fs.writeFileSync(outFile, html, "utf8");
  console.log(`Report written: ${outFile}`);
}

main();
