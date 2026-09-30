# Historical Project Analysis Method & Prompt Templates

> Use when onboarding a historical project: quickly build a project knowledge base and extract reusable assets
>
> **Runtime note**: this file is a methodology reference, not the main flow. When running `placet-knowledge-base`, `SKILL.md` is authoritative; this file MUST NOT override `SKILL.md` preflight, CodeGraph user confirmation, output paths, BASE/DETAIL layering, or validation rules.

---

## Contents

- [1. Standard analysis steps](#1-standard-analysis-steps)
- [2. Full prompt template (for the AI)](#2-full-prompt-template-for-the-ai)
- [3. Short prompt template](#3-short-prompt-template)
- [4. Prompt key points](#4-prompt-key-points)

---

## 1. Standard analysis steps

### Step 1: Macro understanding

1. **Scan the repo root** → get overall structure, identify top-level modules
2. **Read the primary build file** → pom.xml / build.gradle, learn stack, versions, dependencies
3. **Identify architecture** → Maven multi-module vs single-module, layering
4. **Determine domain** → what kind of project this is (AIOPS / CRM / ERP, etc.)

### Step 2: Module mapping

1. **Classify modules** → aggregation entry / business / foundation / build
2. **Label business meaning** → for each module: business meaning, core functions, priority
3. **Learn naming conventions** → how this repo organizes code

### Step 3: Asset extraction

1. **Search globally for utility classes** → by language convention:
   - Java/Kotlin: `*Util*` / `*Helper*` / `*Utils`
   - Go: `*util*` / `*helper*` packages
   - JavaScript/TypeScript: under `utils/` / `helpers/`
   - Python: `utils.py` / `helpers.py` / `*_utils.py`
   - C#: `*Helper` / `*Utility`
2. **Group by function** → crypto, notify, file, network, log, date, convert, validate, ...
3. **Assess reuse value** → mark which are generic tools that can be reused in a new project
4. **Read core code** → verify that key utilities actually do what they claim

### Step 4: Integration

1. **Integrate existing assets** → bring in flow diagrams and docs already in the project
2. **Understand the main business flow** → map the core business path
3. **Identify technical debt** → find duplicated code and poor design, then suggest fixes

### Step 5: Output

Output a structured `PROJECT_KNOWLEDGE_BASE.md` containing:
- Table of contents
- Project overview
- Business flow diagrams
- Module dictionary (tables)
- Utility index (tables)
- Tech-stack inventory
- Architecture notes
- Refactoring suggestions

---

## 2. Full prompt template (for the AI)

Copy and paste:

```markdown
I just inherited a historical project and need you to analyze it and build a project knowledge base. Follow these steps:

### Task requirements:
1. First explore the overall directory structure, auto-detect the build system, and identify primary module splits
2. If README.md exists, auto-integrate the project intro; if git info exists, extract the remote URL
3. Read the primary build file (pom.xml / build.gradle / package.json / go.mod, etc.) to learn the tech stack
4. Analyze module by module: business meaning and core functions of each module
5. Globally search all utility classes/functions (by language convention: Java *Util*/Helper, JS utils/ dirs, Python utils.py, etc.) and build a reusable index
6. If the project already has flow diagrams (puml/png/jpg/svg, etc.), integrate them
7. Output a structured PROJECT_KNOWLEDGE_BASE.md knowledge-base document

### Output MUST include:
- Project overview (positioning, architecture, module stats)
- Business flow diagrams (integrate existing ones if present)
- Module business-dictionary table (module name, business meaning, priority)
- Reusable utility index (by function category, mark high-reuse tools)
- Tech-stack version notes (MUST include evidence sources)
- Architecture design notes
- Code issues and refactoring suggestions (evidence-backed only)
- Analysis-boundary notes (which directories could not be scanned, which assumptions hold)

### Format requirements:
- Use Markdown
- Prefer tables for lookup
- For each utility class, describe function and usage scenario
- Mark a "high-reuse TOP 10" so later development can pick them up quickly

Start analysis now, then generate PROJECT_KNOWLEDGE_BASE.md at the project root.
```

---

## 3. Short prompt template

```
Please use the project-knowledge-base Skill to analyze the historical project in the current directory and build a project knowledge base:

Project root: {fill in your project absolute path}
Output English, full read allowed, generate PROJECT_KNOWLEDGE_BASE.md at the project root.
```

### Minimal (current directory):

```
Please use the project-knowledge-base Skill to analyze the current directory, full read allowed, generate PROJECT_KNOWLEDGE_BASE.md.
```

---

## 4. Prompt key points

The prompt MUST include these points for useful results:

| Point | Why |
|------|------|
| `Explain business meaning by module` | Stops the AI from dumping structure without explaining the business |
| `Extract all utility classes` | Tells the AI to look for reusable assets |
| `Mark high-reuse tools` | The AI filters for you instead of you hunting one by one |
| `Output PROJECT_KNOWLEDGE_BASE.md` | Makes output location and filename explicit |
| `Prefer tables` | Results stay readable and easy to search |

---

## Install

### For Cursor:
```bash
# Create directory (Windows PowerShell)
mkdir -p $env:USERPROFILE\.cursor\skills\project-knowledge-base

# Copy files
cp project-knowledge-base-skill/* $env:USERPROFILE\.cursor\skills\project-knowledge-base/
```

After install, call it in any project:
```
Please use the project-knowledge-base Skill to analyze the current project and generate PROJECT_KNOWLEDGE_BASE.md
```

### For Claude Code:
No special install. In chat:
```
Please first read ./placet-knowledge-base-skill/SKILL.md, then analyze the current project following this Skill's flow and generate PROJECT_KNOWLEDGE_BASE.md
```

For a global install:
```bash
# Create directory
mkdir -p ~/.claude/skills/placet-knowledge-base

# Copy files
cp project-knowledge-base-skill/* ~/.claude/skills/placet-knowledge-base/
```

When using:
```
Please read ~/.claude/skills/placet-knowledge-base/SKILL.md, then analyze the current project and generate PROJECT_KNOWLEDGE_BASE.md
```

---

## Usage example

On this JIT-AIOPS-Operation project, the AI produced:

- `PROJECT_KNOWLEDGE_BASE.md` → project knowledge base
- 16-module business dictionary
- 80+ utility-class index
- TOP 10 high-reuse tools marked
- Existing puml monitoring flow diagrams integrated

---

**EOF**
