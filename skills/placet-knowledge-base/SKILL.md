---
name: placet-knowledge-base
description: Scan existing project code and generate PROJECT_KNOWLEDGE_BASE.md. Before generating, run a lightweight self-check of file count / project size / CodeGraph status; for large projects MUST ask the user whether to use CodeGraph and only build after confirmation; if unavailable or declined, warn about time/context risk and degrade the scan. Natural language: generate knowledge base.
---

# Project Knowledge Base Builder

Turn a historical project into structured docs `PROJECT_KNOWLEDGE_BASE.md` for reuse, review, and onboarding.

---

## Trigger

```
/placet-knowledge-base
generate knowledge base, target project: <path>
```

Natural language: `generate knowledge base` / `project knowledge base` / `PROJECT_KNOWLEDGE_BASE`

---

## Prerequisites

Before running this Skill, the AI MUST read these sibling files (via the AI's read tools; the user does not open them by hand):

1. `reference.md` → field standards for the module dictionary, util index, tech stack, diagram assets, etc.
2. `examples.md` → output-structure examples that decide how BASE / DETAIL look
3. `HISTORY_PROJECT_ANALYSIS_GUIDE.md` → historical-project analysis method: macro understanding, module mapping, asset extraction, quality checkpoints

Companion-file priority:
- `SKILL.md` is the only runtime main flow; if companions conflict, `SKILL.md` wins
- Field definitions in `reference.md` outrank example text
- `HISTORY_PROJECT_ANALYSIS_GUIDE.md` only supplies method and quality checks; it MUST NOT override Phase 0.0–0.2 preflight / user confirmation / CodeGraph rules
- `USAGE.md` is for users and teams; it is not a runtime must-read. Read it only when the user asks "how to use / how to trigger / install location / chat templates"

Strictly follow `reference.md` field definitions in the output.

---

## Preconditions (MUST)

Before starting, confirm/obtain from the user:

1. Absolute path of the project root (**after getting the path, MUST immediately run Phase 0.0 lightweight self-check, then read source**)
2. Allowed read scope / whether full search is allowed
3. Output language (default English)
4. Output file path (default: `docs/knowledge-base/PROJECT_KNOWLEDGE_BASE.md` + `docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md` under the project root; the user may specify other paths under `docs/knowledge-base/`)
5. **Desired depth** (pick one; default: standard full):
   - `quick skeleton` → BASE slim only, no DETAIL; for huge projects that need a fast start
   - `standard full` → **two-file structure** (recommended default):
     - BASE: slim onboarding (overview + slim modules + TOP 10 utils + PUML index + tech stack + architecture + suggestions)
     - DETAIL: deep lookup (all modules + all utils + protocol formats + config analysis + all deep content)
   - `as exhaustive as possible` → two-file structure plus extra deep-analysis chapters (algorithms / models / data layer / security, etc.)
6. Optional: domain background (e.g. AIOPS)
7. Optional: what you care about most (architecture / reuse / APIs / data / security)

If any key item is missing → ask first, then execute.

---

## Execution (fixed order, Mandatory Order)

### Phase 0.0 - Lightweight preflight before generation (MUST, first step)

**Before reading any source, running wide grep, or full analysis**, the AI MUST auto-run preflight via tools and show results to the user. Phase 0.0 may only do lightweight metadata: file count, project size, number of build files, whether `.codegraph/` exists, CodeGraph CLI status; it MUST NOT read source bodies.

Execution requirements:
- This is an internal AI tool step, not a command for the user to copy
- In Cursor/Claude Code, the AI MUST use the Shell/PowerShell tool to run the commands below
- If the command fails, the AI MUST show the failure reason and follow Phase 0.1 degrade/repair branches

```bash
# Git Bash / macOS / Linux
bash "$FRAMEWORK/skills/placet-knowledge-base/scripts/preflight-kb.sh" "<target-project-absolute-path>"

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File "$FRAMEWORK/skills/placet-knowledge-base/scripts/preflight-kb.ps1" "<target-project-absolute-path>"
```

`$FRAMEWORK` comes from `~/.claude/placet-framework-path`.

**Default preflight only detects; it does not run `codegraph build`.**

**Preflight output fields (MUST explain to the user)**:

| Field | Meaning |
|------|------|
| `SOURCE_FILE_COUNT` | Lightweight source-file count |
| `PROJECT_SIZE_MB` | Lightweight project size |
| `IS_LARGE_PROJECT` | Whether the large-project rule hit |
| `LARGE_PROJECT_REASON` | Why: file count / size / multiple build files |
| `CODEGRAPH_STATUS` | `CLI_READY` / `NOT_INSTALLED` / `BROKEN_INSTALL` |
| `CODEGRAPH_CACHE_STATUS` | `.codegraph/` cache: `CACHED_OK` / `MISSING` / `STALE` / `UNKNOWN_STALE` |
| `RECOMMENDED_ACTION` | Next-step suggestion: ask about CodeGraph, scan directly, install, or repair |
| `MESSAGE` | User-facing hint |

---

### Phase 0.1 - Large-project judgment and user confirmation (MUST)

Decide the path from Phase 0.0 output:

| Condition | MUST tell the user | Next action |
|------|----------|----------|
| `IS_LARGE_PROJECT=false` | "Detected N source files; the project is not large; the knowledge base can be generated directly." | Continue Phase 0.3 / Phase 1 |
| `IS_LARGE_PROJECT=true` and `CODEGRAPH_STATUS=CLI_READY` | "Detected N source files; this is a large project. Recommend CodeGraph, otherwise it will be slow and may hit context limits." | **MUST ask whether to use CodeGraph** |
| `IS_LARGE_PROJECT=true` and `CODEGRAPH_STATUS=NOT_INSTALLED` | "The project is large and CodeGraph is not installed. Direct scan will be slow and may be incomplete." | Ask: install then retry / degrade scan now / generate a quick skeleton first |
| `IS_LARGE_PROJECT=true` and `CODEGRAPH_STATUS=BROKEN_INSTALL` | "CodeGraph install is broken; a direct large-project scan is high risk." | Ask: repair then retry / degrade scan now / quick skeleton |

Large-project ask format:

```markdown
Detected a large project:
- Source files: {SOURCE_FILE_COUNT}
- Project size: {PROJECT_SIZE_MB} MB
- CodeGraph status: {CODEGRAPH_STATUS}
- Cache status: {CODEGRAPH_CACHE_STATUS}

Recommend generating a dependency graph with CodeGraph before building the knowledge base, to lower context pressure and miss-scan risk.
Please choose:
1. Use CodeGraph (recommended; after confirm, run preflight-kb --build)
2. Do not use; degrade to a direct scan (slower, may be incomplete)
3. Pause; install/repair CodeGraph first
```

**Hard rules**:
- For large projects, do not run `codegraph build` before user confirmation
- For large projects, do not full-read source or wide-grep before user confirmation
- Small projects MUST still show file count and CodeGraph status, but need not force-ask
- If the user chooses a direct scan, MUST record the degrade reason in the BASE "CodeGraph status" section

---

### Phase 0.2 - CodeGraph build or degrade (after user confirmation)

After the user confirms CodeGraph:

```bash
bash "$FRAMEWORK/skills/placet-knowledge-base/scripts/preflight-kb.sh" "<target-project-absolute-path>" --build
# or Windows PowerShell
powershell -ExecutionPolicy Bypass -File "$FRAMEWORK/skills/placet-knowledge-base/scripts/preflight-kb.ps1" "<target-project-absolute-path>" -Build
```

**`--build` vs `--rebuild`**:

| Flag | Behavior | When |
|------|------|---------|
| `--build` | Reuse cache when valid (`CACHED_OK`); build only if missing or stale | Default recommended; avoid needless rebuilds |
| `--rebuild` | Ignore existing cache, force rebuild | After large source changes, CodeGraph upgrades, or suspected cache corruption |

| PREFLIGHT_STATUS | Meaning | Next action |
|------------------|------|----------|
| `BUILD_OK` | Build just succeeded | Phases 1–2 **MUST** prefer `.codegraph/` |
| `CACHED_OK` | `.codegraph/` exists and is not stale | Same |
| `NOT_INSTALLED` | CodeGraph not installed | Per user choice: install then retry, or degrade scan |
| `BUILD_FAILED` | CLI available but build failed | Print failure notes, ask repair-then-retry or degrade scan |
| `BROKEN_INSTALL` | Leftover broken install | Point to `docs/CodeGraph-install-guide.md`, ask repair-then-retry or degrade scan |

**Hard rules**:
- Detection is **`codegraph build` success** (not merely `codegraph --version`)
- `BUILD_FAILED` MUST be treated as a build failure, not written as `CLI_ONLY`
- The knowledge-base BASE document MUST include a "CodeGraph status" section (status + user choice + degrade reason, if any)

---

### Phase 0.3 - Scope, boundaries, and project-feature tags

- Estimate project size and desired depth (from Phase 0.0 output; do not repeat a full scan)
- **Large-project rule (MUST)**: if any of these hold, default to "large-project mode": owned source files > 500, repo size > 100MB, multi-module/monorepo, or the user chose "standard full / as exhaustive as possible"
- **CodeGraph first in large-project mode**: when the user chose CodeGraph and preflight is `BUILD_OK`/`CACHED_OK`, Phases 1–2 **MUST** take `.codegraph/` as preferred input; otherwise MUST record the degrade strategy
- **Auto-detect the build system**:
  - Found `pom.xml` → Maven project (Java/Kotlin)
  - Found `build.gradle` / `build.gradle.kts` → Gradle project (Java/Kotlin)
  - Found `package.json` → Node.js project (JavaScript/TypeScript)
  - Found `go.mod` → Go project
  - Found `CMakeLists.txt` → C/C++ project (CMake)
  - Found `Cargo.toml` → Rust project
  - Found `*.rockspec` → Lua project (LuaRocks)
  - Multiple build files → confirm the primary build file with the user
- Judge architecture style (monolith / multi-module / monorepo / microservice aggregation)
- Record assumptions and limits (could not build, missing evidence, insufficient permissions, some directories unscannable, etc.)

#### Project-feature tags (lightweight detect + user multi-select)

> **Core idea**: do not force the project into one category. Use a **multi-dimensional tag combo**. Different combos decide later analysis emphasis.
> This phase may lightly scan file names, directory names, build files, and a few entry-file keywords; still MUST NOT full-read all source. Full source reads are allowed only in Phase 1.1.

**Step 1 — Auto-detect and recommend tags**

Scan the project file tree and **auto-match** recommended tags (multiple hits allowed; mark with ✅):

| Detect rule | Recommended tag | Notes |
|----------|----------|------|
| `*.lua` + `nginx.conf` / `openresty` | `🌐 OpenResty Gateway` | Lua/OpenResty gateway app |
| `SpringBootApplication` / `@RestController` / `@Controller` | `☕ Spring Backend` | Java Spring family |
| `app.py` / `flask` / `django` / `fastapi` | `🐍 Python Backend` | Python web backend |
| `go.mod` + `net/http` / `gin` / `echo` | `🐹 Go Backend` | Go web service |
| `package.json` + `next.config` / `vite.config` / `vue` / `react` / `angular` | `🖥️ Frontend SPA` | Single-page frontend |
| `Dockerfile` / `docker-compose.yml` | `🐳 Containerized Deploy` | Docker containers |
| `k8s/` / `*.yaml` containing `apiVersion: apps` | `☸️ K8s Orchestration` | Kubernetes deploy |
| `*.proto` / `gRPC` / `grpc` | `📡 gRPC/Protobuf` | Protobuf RPC |
| Custom binary protocol header (e.g. fixed magic number) | `🔌 Custom Protocol` | Non-standard protocol I/O |
| `kafka` / `rabbitmq` / `rocketmq` / `MQ` references | `📨 Message-Queue Driven` | MQ-driven architecture |
| `*.sql` / `migration` / `mybatis` / `hibernate` / `sequelize` / `sqlalchemy` | `🗄️ Database-Heavy` | ORM/SQL data layer |
| `skf` / `hsm` / `pkcs11` / `crypto` / `GM` / `sm2`/`sm3`/`sm4` | `🔐 Crypto/GM` | Cryptography / GM algorithms |
| FFI / JNI / ctypes / cgo calls | `⚙️ Hardware/FFI` | Cross-language / hardware calls |
| `auth` / `jwt` / `oauth` / `casbin` / `shiro` / `spring-security` | `🛡️ AuthN/AuthZ` | Security auth system |
| `cron` / `schedule` / `celery` / `quartz` / `timer` | `⏰ Scheduled Jobs` | Scheduling |
| `ota` / `hot reload` / `hot-update` / `upgrade` | `🔄 OTA/Hot Reload` | Remote upgrade |
| `guard` / `supervisor` / `systemd` / `daemon` / `watchdog` | `🛡️ Process Daemon` | Process monitor / self-heal |
| `*.puml` / `*.plantuml` / `docs/` visual assets | `📊 Existing Docs` | Existing docs to integrate |
| `Jenkinsfile` / `.gitlab-ci.yml` / `GitHub Actions` / `Jenkins` | `🚀 CI/CD Pipeline` | Existing build pipeline |
| `pytest` / `junit` / `jest` / `mocha` / `test` directories | `🧪 Existing Tests` | Existing test code |
| `Dockerfile` with target arch `arm` / `mips` | `🔲 Embedded/Edge` | Non-x86 deploy target |
| `tensorflow` / `pytorch` / `sklearn` / `model` / `inference` | `🤖 AI/ML` | Machine learning |
| `mqtt` / `coap` / `iot` / `device` / `sensor` | `📡 IoT/Device Access` | IoT device integration |
| README mentions `microservice` or independently deployed multi-modules | `🏛️ Microservices` | Service split |
| `pnpm workspace` / `turborepo` / `nx.json` / `lerna.json` | `📦 Monorepo` | Multi-package repo |
| `webpack` / `vite` / `rollup` / `esbuild` config | `🔧 Frontend Toolchain` | Frontend engineering |
| `audit` / `compliance` / `audit log` | `📋 Audit/Compliance` | Compliance/audit needs |
| `redis` / `memcached` / `cache` | `💾 Cache Layer` | Cache middleware |
| `nginx` / `envoy` / `traefik` / `gateway` | `🌐 API Gateway/Proxy` | Gateway / reverse proxy |
| `Makefile` with cross compile / `cross` / `toolchain` | `🔨 Cross Compile` | Cross-platform compile |
| `swag` / `swagger` / `openapi` / `apidoc` | `📖 API Docs Generation` | Existing API-doc convention |

**Step 2 — Show the tag combo and confirm with the user**

Show auto-detected recommended tags ✅ together with all optional tags, **in this format**:

```
📌 Project-feature tags (multi-select combo)

Auto-detected recommendations (✅ = detected):
  ✅ 🌐 OpenResty Gateway    ✅ 🔌 Custom Protocol    ✅ 🔐 Crypto/GM
  ✅ ⚙️ Hardware/FFI         ✅ 🔄 OTA/Hot Reload     ✅ 🛡️ Process Daemon

Optional extras (check from your knowledge):
  ☐ ☕ Spring Backend      ☐ 🐍 Python Backend      ☐ 🖥️ Frontend SPA
  ☐ 🐳 Containerized Deploy ☐ ☸️ K8s Orchestration  ☐ 📡 gRPC/Protobuf
  ☐ 📨 Message-Queue Driven ☐ 🗄️ Database-Heavy     ☐ 🛡️ AuthN/AuthZ
  ☐ ⏰ Scheduled Jobs      ☐ 📊 Existing Docs        ☐ 🚀 CI/CD Pipeline
  ☐ 🧪 Existing Tests      ☐ 🔲 Embedded/Edge        ☐ 🤖 AI/ML
  ☐ 📡 IoT/Device Access   ☐ 🏛️ Microservices        ☐ 📦 Monorepo
  ☐ 🔧 Frontend Toolchain  ☐ 📋 Audit/Compliance     ☐ 💾 Cache Layer
  ☐ 🌐 API Gateway/Proxy   ☐ 🔨 Cross Compile        ☐ 📖 API Docs Generation
  ☐ 🐹 Go Backend

Please confirm or adjust the tag combo (add/remove allowed):
```

**Step 3 — Decide analysis emphasis from the tag combo**

Tag combos **activate extra analysis chapters or depth** on top of the standard flow:

| Tag | Extra analysis activated |
|------|---------------|
| 🌐 OpenResty Gateway | nginx.conf parse, Lua module call chains, shared-dict analysis, request phases (rewrite/access/content/log) |
| ☕ Spring Backend | Bean dependency graph, AOP aspects, Spring Security filter chain, auto-config conditions |
| 🖥️ Frontend SPA | Component tree, route table, state management (Redux/Vuex/Pinia), API layer, build config |
| 🔌 Custom Protocol | Packet format (magic/type/body), codec logic, state-machine flow, protocol-version compat |
| 🔐 Crypto/GM | Algorithm analysis (SM2/SM3/SM4/AES/RSA), key lifecycle, PKI cert chain, key derivation |
| ⚙️ Hardware/FFI | FFI/JNI/cgo interface defs, C-lib signatures, hardware op sequences, error codes and retry |
| 🔄 OTA/Hot Reload | Upgrade-package format and signature verify, rollback, version management, hot-reload triggers |
| 🛡️ Process Daemon | Daemon logic (poll/event), restart policy, log rotate, resource monitor |
| 📨 Message-Queue Driven | Producers/consumers, Topic/Queue topology, message format, consume idempotency, DLQ |
| 🗄️ Database-Heavy | ER diagram, migration version chain, index strategy, DAO/Repository inventory, slow-query risk |
| 🛡️ AuthN/AuthZ | Auth flow (OAuth/JWT/Session), permission model (RBAC/ABAC), token lifecycle |
| ⏰ Scheduled Jobs | Cron expressions, job dependencies, idempotency, failure retry, distributed lock |
| 📡 IoT/Device Access | Device protocols (MQTT/CoAP/custom), device lifecycle, collect→store→analyze path |
| 🤖 AI/ML | Model structure, training pipeline, feature engineering, inference APIs, eval metrics |
| 📋 Audit/Compliance | Audit-log format, compliance checks, data masking, operation trace chain |
| 📦 Monorepo | Package dependency graph, shared config, build order, publish strategy |
| 🌐 API Gateway/Proxy | Routing rules, load-balance policy, rate-limit/circuit-break, upstream topology |
| 💾 Cache Layer | Cache policy (TTL/LRU), consistency, penetration/avalanche protection, hot keys |
| 🏛️ Microservices | Service discovery, call chains, inter-service communication, distributed transactions |
| 📖 API Docs Generation | Existing API-doc coverage, docs-vs-code consistency |
| 🐳 Containerized Deploy | Dockerfile analysis, image-layer optimization, env injection, health checks |
| ☸️ K8s Orchestration | Deployment/Service/ConfigMap analysis, HPA policy, network policy |

**Tag-combo examples**:
- `🌐 OpenResty Gateway` + `🔌 Custom Protocol` + `🔐 Crypto/GM` + `⚙️ Hardware/FFI` → typical security gateway; emphasize protocol parse, crypto flow, hardware accel
- `☕ Spring Backend` + `🗄️ Database-Heavy` + `🛡️ AuthN/AuthZ` + `🐳 Containerized Deploy` → typical enterprise backend; emphasize data model, security path, deploy config
- `🖥️ Frontend SPA` + `🔧 Frontend Toolchain` + `📦 Monorepo` → frontend engineering; emphasize component reuse, build optimization, package management
- `🐍 Python Backend` + `🤖 AI/ML` + `📨 Message-Queue Driven` → AI data platform; emphasize model pipeline, data flow, scheduling

**Step 4 — Record the tag combo in the analysis-boundary notes**

The confirmed tag combo is written into Phase 0 output and guides all later phases.

Output: analysis-boundary notes + project-feature tag combo

### Phase 1 - Macro exploration

1. Scan the repo root; identify top-level modules / directory layers
2. **Recursively scan every subdirectory** (exclude `.git`, `node_modules`, `vendor`, third-party `bundle`, etc.) to get a full tree (at least 3 levels deep); **MUST NOT skip based on top-level names only**
3. **If `README.md` exists** → auto-read and fold the intro into the overview
4. **If git info exists** → auto-extract the remote URL and recent change trend
5. Read the primary build file for project info
6. Judge architecture style (monolith / multi-module / layered)
7. Summarize project type / domain positioning

Output: project overview, module stats, architecture conclusion

### Phase 1.1 - Deep content probe (mandatory, full read)

> **Core principle: do not infer function from directory names. MUST read each source file to give accurate analysis.**
> **Hard constraint: do not read only "key files" then "infer" the rest. MUST full-read all first-party source files.**

For **every first-party module** identified in Phase 1 (not third-party deps), MUST:

1. **Recursively list all source files** (filter by language suffix: `*.lua`, `*.c`, `*.h`, `*.cs`, `*.java`, `*.py`, `*.go`, `*.js`, `*.ts`, `*.sh`, etc.)
2. **Read every first-party source file** (full set; do not read only "key" files then infer the rest):
   - Entry files (`main.*`, `app.*`, `index.*`, `*_init.lua`, `nginx.conf`, etc.)
   - Config files (`*.conf`, `*.properties`, `*.yml`, `*.yaml`, `*.json`, etc.)
   - All business files (not only handler/controller/service/router; all first-party `*.lua`, `*.py`, `*.go`, `*.java`, etc. MUST be read)
   - Headers / interface defs (`*.h`, `interface.*`, `*.proto`, etc.)
   - Utils / helpers (`*utils*`, `*helper*`, `*store*`, `*config*`, etc.)
   - Tests (`*test*`, `*spec*`, etc.)
3. **For C/C++ projects**: read `Makefile`, `CMakeLists.txt`, all headers (`.h`), all sources (`.c`/`.cpp`)
4. **For C# projects**: read `.csproj`, `.sln`, and all `.cs` files
5. **For Lua/OpenResty projects**: read `nginx.conf` and all `*.lua` files (including subdirectories)
6. **For each file output**:
   - File path
   - Function summary (1-3 sentences based on actually-read code, including core function/method names and duties)
   - Exported functions/methods/classes
   - Other modules depended on (from require/import/include)
7. **Full-read verification**:
   - First-party source-file read rate MUST be 100% (no sampling, no skip)
   - Every file MUST have a summary based on actual content; "inferred from file name" is forbidden
   - If a file is too large to read fully, MUST at least read core function defs and module exports

Output: complete source-file list per module + per-file function summary + inter-module call relations

### Phase 2 - Module business dictionary (mandatory)

Classify modules as:
- Aggregation entry
- Business module
- Foundation / shared module
- Build / deploy module

**Important: each module's analysis MUST be based on source actually read in Phase 1.1, not directory-name inference.**

For each module extract:
- Business meaning (one sentence, based on actual code)
- Core functions (2-5 points, based on actually-read functions/classes/methods)
- Key source-file list (core file paths in the module)
- Dependencies (upstream/downstream, from require/import/include)
- Priority (High / Medium / Low)

Output: module business-dictionary table (MUST be tabular), and each module MUST include a key source-file list

### Phase 3 - Reusable asset extraction (Util/Helper, strict)

1. Globally search all utility classes/functions, by language convention:
   | Language | Search pattern |
   |------|----------|
   | Java/Kotlin | `*Util*`, `*Helper*`, `*Utils` |
   | Go | `*util*` packages, `*helper*` packages |
   | JavaScript/TypeScript | `*/utils/*.ts`, `*/helpers/*.ts`, `*Utils.ts` |
   | Python | `utils.py`, `helpers.py`, `*_utils.py` |
   | C# | `*Helper`, `*Utility` |
   | C/C++ | `*utils.h`, `*helper.h` |
   | Lua | `*utils*.lua`, `*util*.lua`, `*helper*.lua` |

2. Categorize by function (security / file / network / log / datetime / convert / validate / general, etc.)
3. Assess reuse value and risk
4. **MUST recursively search all subdirectories**, not only the top level. For each util file found, MUST read it and extract:
   - Exported function/method names
   - Brief function of each
   - Parameters and return values (if identifiable)

Output hard constraints:
- Util/Helper **full index** (no sampling/truncation)
- Category summary stats (count per category)
- Each util marked with reuse level (High/Medium/Low or synonym)
- "High-reuse TOP 10" is only an entry (optional)

### Phase 4 - Visual-asset integration and PUML generation (mandatory)

> ⚠️ **Team members MUST follow this section. Generating only 1 diagram is not allowed.**

#### Step 1 — Search existing visual assets

Search:
- `*.puml`, `*.plantuml`, `*.png`, `*.jpg`, `*.svg`

If existing flow diagrams exist:
- Build an index (file path + content summary)
- Give a prose flow explanation (trigger / main path / exceptions / outputs)

#### Step 2 — Generate PUML flow diagrams from code analysis (MUST as independent files)

> 🚫 **Forbidden (rewrite if violated)**:
> ❌ Do not only embed plantuml code blocks in markdown without independent .puml files
> ❌ Do not generate one "kitchen-sink" diagram of everything
> ❌ Do not invent flows that do not exist in the project (e.g. no crypto card → no hardware diagram)
> ❌ Do not omit source-file path annotations
> ❌ Do not use casual names (MUST use canonical names such as main_flow.puml)

> ✅ **Correct**: each meaningful business flow **gets its own .puml file**, not embedded in MD, not merged into one big diagram.

From Phase 1.1 actually-read code + Phase 2 module dependencies, identify **all independent business flows** and generate one PUML file per flow.

**Required diagram types (activated by project-feature tags; P0 = mandatory):**

| Priority | Diagram type | Filename | Activating tag | Content |
|--------|-----------|--------|---------|---------|
| P0 | Main business flow | `main_flow.puml` | **All projects** | End-to-end main path: entry to output, covering core module call order |
| P0 | Module dependencies | `module_dependency.puml` | **All projects** | Inter-module require/import/call graph |
| P1 | Protocol packet handling | `protocol_flow.puml` | Custom Protocol | Receive→parse→route→handle→respond |
| P1 | Crypto/security flow | `security_flow.puml` | Crypto/GM | Key agreement, encrypt/decrypt call chain, cert load |
| P1 | Hardware interaction | `hardware_flow.puml` | Hardware/FFI | FFI call sequence, hardware-op lifecycle |
| P1 | AuthN/AuthZ flow | `auth_flow.puml` | AuthN/AuthZ | Login→verify→token issue→authorize→refresh |
| P1 | Data-model relations | `data_model.puml` | Database-Heavy | ER: entities, relations, cardinality |
| P1 | API call chain | `api_flow.puml` | Spring Backend / Python Backend / Go Backend | Request→route→Controller→Service→DAO→response |
| P1 | Deploy architecture | `deployment.puml` | Containerized Deploy / K8s Orchestration | Component→container→service→network topology |
| P1 | Microservice call chain | `microservice_flow.puml` | Microservices | Inter-service calls, sync/async communication |
| P1 | Message flow | `message_flow.puml` | Message-Queue Driven | Producer→Topic/Queue→consumer→handle→result |
| P1 | OTA/upgrade flow | `ota_flow.puml` | OTA/Hot Reload | Version check→download→verify→install→rollback |
| P1 | Scheduler flow | `scheduler_flow.puml` | Scheduled Jobs | Trigger→execute→idempotency check→result→retry |
| P1 | Frontend component tree | `component_tree.puml` | Frontend SPA | Page→layout→component→child hierarchy |
| P1 | Cache strategy | `cache_flow.puml` | Cache Layer | Request→cache lookup→hit/miss→origin→update cache |
| P1 | IoT device lifecycle | `iot_lifecycle.puml` | IoT/Device Access | Register→connect→report data→command down→offline/reconnect |
| P1 | Audit-log flow | `audit_flow.puml` | Audit/Compliance | Action→collect→mask→store→query→alert |
| P1 | Process daemon | `daemon_flow.puml` | Process Daemon | Detect→decide→restart→verify→alert |
| P1 | Cross-compile flow | `cross_build_flow.puml` | Cross Compile | Source→toolchain select→compile→link→package→sign |

**Generation rules (mandatory):**

1. **Each PUML file MUST be independently complete**: own `@startuml` / `@enduml`, renderable alone
2. **Only generate diagrams with code evidence**: no tag → no diagram; do not invent
3. **Multiple independent flows → multiple files**: do not stuff all flows into one diagram
4. **Naming**: `{flow-type}.puml`, under `docs/knowledge-base/` (create if missing)
5. **All PUML uses PlantUML syntax**, compatible with online renderers (e.g. plantuml.com/plantuml)
6. **MUST annotate source-file paths on the diagram**: next to each processing node, the implementing source filename (e.g. `packet_handler.lua`)
7. **Each file header MUST include metadata**: project name, diagram type, generated-at, activating tag
8. **[MUST] PUML language rule**: **all PUML labels, titles, comments, and node descriptions MUST use English**. Code file names and class names stay as in source. skinparam metadata comments may use English. title MUST be English. This rule outranks template examples

---

#### ⚠️ [MUST] PlantUML syntax compatibility (MUST follow)

> 🚫 **Violating this rule makes diagrams fail to render.** The following syntax has already broken PUML in multiple projects.
>
> **Core principle: use only the most basic, highest-compatibility 1990s PlantUML syntax. Do not chase new features.**

##### 1. Skin config (absolutely no type-specific skinparam)

| Forbidden skinparam ❌ | Compatible skinparam ✅ | Why |
|------------------|----------------------|------|
| `skinparam rectangleBackgroundColor` | `skinparam BackgroundColor` | Old versions do not support per-element-type background |
| `skinparam rectangleBorderColor` | `skinparam BorderColor` | Per-element-type border has poor compatibility |
| `skinparam participantBackgroundColor` | `skinparam BackgroundColor` | participant-specific config is not universal |
| `skinparam databaseBackgroundColor` | Remove; use default | database-specific config is not universal |
| `skinparam componentBackgroundColor` | `skinparam BackgroundColor` | component-specific config is not universal |
| `skinparam xxx { ... }` block syntax | All skinparam single-line | Block syntax 100% fails on old renderers |

**[The only correct] standard skin (identical on every diagram; no customizing):**
```plantuml
skinparam backgroundColor #FEFEFE
skinparam BackgroundColor #E8F4FD
skinparam BorderColor #2196F3
skinparam NoteBackgroundColor #FFF9C4
skinparam NoteBorderColor #FBC02D
skinparam ArrowColor #555555
```

---

##### 2. Absolute syntax blacklist (rewrite if found)

| Forbidden ❌ | Replacement ✅ | Pitfall record |
|------------------|-----------|---------|
| `box "xxx" #color` / `end box` | Remove box; write participant directly; use note for grouping | Sequence `box` fails on ~90% of old versions |
| `participant "xxx\nyyy" as z` | `participant "xxx_yyy" as z` or single-line text | Newlines inside participant names often fail parse |
| `hexagon` / `cloud` / `database` special shapes | Only basic `note` or `rectangle` | Special shapes have terrible support |
| `fork` / `fork again` / `split` / `split again` | Ordinary `if/then/else` or sequential steps | Nested branch syntax is almost 100% incompatible |
| `group xxx` / `end group` | Remove group; use note for grouping | group syntax support is very poor |
| `partition "xxx" { ... }` | Remove partition; use package or plain-text note | partition interiors often fail parse |
| `-[hidden]->` / `-[thickness]->` / `-[dashed]->` | Only basic `-->` arrows | Arrow modifiers unsupported by most renderers |
| Nested `state xxx { ... }` | Flatten states; no nesting | Nested State often crashes the parser |
| Activity steps `:xxx;` inside State diagrams | State labels as plain text only, no colon | State/Activity syntaxes are independent; mixing always crashes |

---

##### 3. Special-character blacklist (rewrite if found)

**These characters MUST NOT appear anywhere in a PUML file:**

| Forbidden | Replacement | Notes |
|-----------|-----------|------|
| All emoji | Plain English description | Emoji become mojibake in 50%+ of renderers |
| Box-drawing chars | Ordinary `-` hyphen + plain text | Box-drawing becomes unknown chars under some encodings |
| Full-width symbols | Half-width counterparts | Full-width punctuation often truncates the parser |
| 3+ consecutive special characters | Simplify to plain text | Complex symbol combos easily trigger parse bugs |
| **Parentheses `()` in Activity nodes** | **Remove or space-separate** | `()` inside `:text;` is misparsed as a function call |
| **Square brackets `[]` in Activity nodes** | **Use words such as "list"** | `[]` is misparsed as style or link syntax |
| **Equals `=` in Activity nodes** | **Use "equals" or ": "** | `=` triggers key=value parsing in some parsers |
| **`/` path separators in Activity nodes** | **Use `_` or space** | Slashes trigger special parse in some renderers |

---

##### 4. Safe syntax subset by diagram type

| Diagram type | Allowed safe syntax only |
|--------|-------------------|
| **Activity** | `start` / `:xxx;` / `if/then/else` / `note left/right` / `stop` |
| **State** | `[*] --> state` / `state "plain-text label" as name` / `state1 --> state2` / `note left/right` |
| **Component** | `package "xxx" {` / `component "xxx"` / `component1 --> component2` / `note left/right` |
| **Sequence** | `participant "xxx" as y` / `->` / `note left/right` / `alt/else/end` (use alt sparingly) |

---

##### 5. Quick checklist (check every item after generation; do not deliver if any fail)

- [ ] No `skinparam xxx { ... }` block syntax
- [ ] Only the standard 6 skinparam lines; no element-type-specific config
- [ ] No `box ... end box`
- [ ] No `\n` inside participant/component/state names
- [ ] No `hexagon`/`fork`/`split`/`group`/`partition` or other advanced syntax
- [ ] No `-[hidden]->` or other arrow modifiers
- [ ] No `:xxx;` Activity syntax inside State diagrams
- [ ] No emoji or box-drawing characters in the file
- [ ] Every file fully wrapped in `@startuml` / `@enduml`
- [ ] All labels are plain text with no special formatting

---

##### 6. Standard template for every PUML file (copy as-is; do not add/remove skinparam)

```
@startuml
' Project: [project name, ASCII, no special chars]
' Diagram type: [main business flow / module dependency / ...]
' Generated at: YYYY-MM-DD
' Activating tag: [corresponding tag, plain text, no emoji]
'
' Change log (newest first, plain text):
' vX.X - YYYY-MM-DD - [change description]

' Important: use only the most universal plantuml syntax for all-version compatibility
skinparam backgroundColor #FEFEFE
skinparam BackgroundColor #E8F4FD
skinparam BorderColor #2196F3
skinparam NoteBackgroundColor #FFF9C4
skinparam NoteBorderColor #FBC02D
skinparam ArrowColor #555555

title [diagram title, MUST be English, no special chars]

' [diagram body - all labels, node descriptions, comments MUST be English]
' NEVER mix State and Activity syntax!
' - Activity safe subset: start / :xxx; / if/then/else / stop
' - State safe subset: [*] --> state / state "xxx" as s1 / note

@enduml
```

**Example output directory:**
```
docs/knowledge-base/
├── main_flow.puml              # main business flow
├── module_dependency.puml       # module dependencies
├── protocol_flow.puml           # protocol packet handling (Custom Protocol)
├── security_flow.puml           # crypto/security flow (Crypto/GM)
├── hardware_flow.puml           # hardware interaction (Hardware/FFI)
├── ota_flow.puml                # OTA upgrade (OTA/Hot Reload)
└── ... other diagrams for activated tags
```

#### Step 3 — Build a PUML index in the knowledge-base MD

Add a standalone chapter **"PUML Flow Diagram Index"** in `PROJECT_KNOWLEDGE_BASE.md`:

1. **PUML file index table**: filename, flow type, activating tag, short description (table)
2. **Prose notes per diagram**: trigger conditions, main path, key branches, exception path, outputs
3. **How to render**: tell the user how to render these .puml files (online renderer, VS Code plugin, local Java command)
4. **Prose and PUML MUST correspond 1:1**; no diagrams without prose, and no prose without diagrams

### Phase 4.1 - Script and config asset analysis (mixed-language projects)

For projects with mixed assets (Java + scripts + config), add this phase:

Search and organize these file types (**MUST recursively search all nested subdirectories**):
- **Scripts**: `*.py`, `*.sh`, `*.bat`, `*.lua` — function notes, where they run, runtime deps
- **Config**: `*.properties`, `*.json`, `*.yml`, `*.yaml`, `*.conf`, `*.ini` — classify key config roles
- **Deploy assets**: `Dockerfile`, `docker-compose.yml`, `k8s/*.yaml`, `k8s/*.yml` — Kubernetes/Docker deploy notes
- **Archives**: `*.tar`, `*.zip`, `*.gz` — what the archive contains (probe packs, dependency packs, etc.)

Output requirements:
- Index tables by file type
- Each file annotated with path, function, execution context
- **MUST read script/config contents** and describe function from actual content, not file-name guesswork
- Key scripts: document inputs, outputs, dependencies

**Exhaustive-mode extra**: read script bodies, extract core logic, summarize script function.

#### Phase 4.1.1 - Config cross-reference resolution (mandatory; historical misses of key config)

> ⚠️ **This section is a hard MUST, not a suggestion.** Historically, config files were listed but never actually read, so key data (service registries, API address lists, etc.) was missed.
>
> **Core principle: config files often reference each other. Reading only the entry config without following the chain = looking at the hallway without entering the rooms.**

**Step 1 - Identify references between config files**

When reading each config file, identify these patterns:

| Pattern | Example | Notes |
|----------|------|------|
| File-path reference | `path=file:config/cube-service.json` | Directly references another config file |
| Spring reference | `spring.config.location`, `spring.config.import` | Spring Boot config chain |
| Include/Import | `include=xxx.properties`, `@PropertySource` | Properties include |
| Resource path | `classpath:xxx.yml`, `file:conf/xxx.json` | Classpath or filesystem reference |
| XML reference | `<import resource="xxx.xml"/>` | Spring XML import |
| Env-var pointer | `${VAR:default}` pointing at an external file | File referenced via variable |

**Step 2 - Recursively read every referenced file (mandatory)**

For each reference found in Step 1, **MUST**:

1. **Resolve the path**: turn relative paths into absolute (relative to the current config file's directory or the project root)
2. **Actually read the referenced file**: use the Read tool; do not only record "this file is referenced"
3. **Extract core data**: e.g. service lists in JSON, route tables in YAML, connection params in Properties
4. **Write core data into the knowledge base**: do not stop at one table row like "Cube service-registry config"; expand the core content
5. **Keep checking whether the referenced file itself references others**: recurse until the chain ends

**Step 3 - Config-read verification list (every config file MUST pass)**

For every config file found in Phase 4.1, check one by one:

```
Config-file read verification table:
| File path | Content read? | Core data extracted into KB? | Files it references | Referenced files read? |
|---------|:---:|:---:|---|:---:|
| platform.properties | ✅ | ✅ | cube-service.json, jdbc.properties | ? |
| cube-service.json   | ?   | ?   | - | - |
| ... |
```

**Any row whose "Referenced files read?" is ❌ MUST go back and read; skipping is forbidden.**

**Typical miss scenarios (anti-patterns)**:
- ❌ `platform.properties` has `cube.lookupservice.path=file:config/cube-service.json`, but only records one sentence "Cube service-registry config" and never reads the JSON to extract 70+ registry entries
- ❌ `application.properties` has `spring.config.name=application,additional`, but `additional.properties` is never read
- ❌ `redis.properties` lists cluster nodes, but node roles are never expanded
- ✅ **Correct**: see a reference → follow and read → extract core data → write into KB → check for nested references

### Phase 5 - Tech stack and architecture notes

- Extract from code/config/build files: languages, frameworks, middleware, databases, cache, MQ
- Versions ONLY from "traceable evidence" (build file/config)
- Explain layer boundaries and call paths (who calls whom, where it lands)

### Phase 6 - Findings and refactoring suggestions (evidence-backed only)

Each suggestion MUST include at least:
- Evidence location (path/symbol reference)
- Risk (impact, maintainability, performance, security, etc.)
- Recommended action (how to change)
- Expected benefit (why it is worth changing)

---

### Phase 7 - Deep analysis (only `as exhaustive as possible` mode)

When desired depth is "as exhaustive as possible", add:

#### 7.1 Entry-point analysis
- Find project start entries (`main` / `SpringBootApplication` / root route file, etc.)
- Map startup load flow
- Mark key config locations

#### 7.2 API analysis (web projects)
- Extract all Controllers / route handlers
- List all paths, HTTP methods, short function notes
- Organize as an API inventory table

#### 7.3 Config-file analysis
- Find the primary config (`application.yml` / `application.properties` / `config.*`, etc.)
- Extract key items (DB connection, ports, secrets, third-party API URLs, etc.)
- Explain each item's role

#### 7.4 Data-layer analysis (if a database exists)
- Identify entity models / DO / Entity
- Extract core table relations
- Map DAO / Repository duties

#### 7.5 Scheduled-job analysis
- Find all scheduled jobs
- List cron expressions and job functions

#### 7.6 Security-mechanism analysis
- Identify AuthN/AuthZ entries
- Map security filter chains
- Explain permission-control approach

#### 7.7 Algorithm analysis (algorithm / ML projects)
- Identify core algorithm modules and model files
- Extract algorithm type (classification / regression / clustering / RL, etc.)
- Map feature-engineering flow and feature-selection logic
- Organize model structure, hyperparams, and training approach
- Annotate inference API input/output formats
- Note eval metrics and performance results

---

### Phase 8 - Knowledge-base structure validation (MUST after generation)

After knowledge-base docs are written:

```bash
node "$FRAMEWORK/skills/placet-knowledge-base/scripts/validate-kb.js" "<target-project-absolute-path>"
# For large projects where the user chose CodeGraph or preflight was BUILD_OK/CACHED_OK, prefer --strict
node "$FRAMEWORK/skills/placet-knowledge-base/scripts/validate-kb.js" "<target-project-absolute-path>" --strict
```

Validation results MUST go into the delivery notes. If there is Error, the knowledge base is not complete; under `--strict`, a large project missing `.codegraph/` is Error (unless the user explicitly chose a degrade scan and BASE already records the degrade reason).

After structure validation passes, MUST run the fact gate to refresh the admitted-facts list (`--query` optional):

```bash
node "$FRAMEWORK/skills/placet-knowledge-fact-gate/scripts/verify-kb-facts.js" "<target-project-absolute-path>"
```

fail claims may be recorded in the delivery notes and do not block knowledge-base generation; later tasks citing knowledge-base facts may only use pass.

---

## Outputs (Final Deliverable)

> 📦 **Standard delivery = layered file structure + multiple independent PUML files**
>
> **Layering principle: by information dimension, not a hard line-count cap**
> - Layer 1: `PROJECT_KNOWLEDGE_BASE.md` = core index (10-minute onboarding)
> - Layer 2: `PROJECT_KNOWLEDGE_DETAIL.md` = deep lookup (developer handbook)
> - Layer 3: `PROJECT_KNOWLEDGE_DETAIL-{module-domain}.md` = huge-project volumes (auto-split when >50 modules)
> - PUML files: multiple independent flow-diagram files, one file per flow

---

### Layer 1: PROJECT_KNOWLEDGE_BASE.md (core index)

**Positioning**: newcomer onboarding, architecture review, fast whole-project picture
**Design goal**: finish in 10 minutes, answering 3 core questions:
1. "What does this project do?"
2. "What is the core architecture and what are the dependencies?"
3. "If I change feature X, which file do I go to?"

**MUST include (content-driven, not line-count-driven)**:
1. TOC
2. Project overview: positioning, core capabilities (≤5), architecture style
3. **PUML flow-diagram index**: standalone chapter, table of all .puml files + how to render
4. Module business dictionary (slim): only Top 20% core modules; one sentence + key file path + reference count each
5. High-reuse TOP 10 utils: only the 10 most used, one sentence of usage each
6. Tech-stack panorama table: language/framework/middleware/version in one table
7. Key architecture decisions (≤5): the most important design choices and trade-offs
8. Refactoring TOP 5: the 5 issues most worth fixing first
9. Analysis boundaries and assumptions: what was not covered, which premises were used
10. Footer jump link: "📚 For deep analysis see PROJECT_KNOWLEDGE_DETAIL.md"
11. **(Huge projects) volume index table**: filenames and content scope of all DETAIL volumes

---

### Layer 2: PROJECT_KNOWLEDGE_DETAIL.md (deep lookup)

**Positioning**: developer handbook, deep troubleshooting, code-reuse reference
**Design goal**: every detail a developer needs is here without hunting source

**MUST include (content-driven, not line-count-driven)**:
1. TOC
2. Header jump link: "📖 For a quick start see PROJECT_KNOWLEDGE_BASE.md"
3. **Protocol packet formats** (if 🔌 Custom Protocol tag): magic check, type_val routing table, codec logic, error codes
4. **Full inter-module call graph** (ASCII or Mermaid)
5. **Module business dictionary (full)**: all exported functions of all modules + full dependency chain + I/O notes
6. **Reusable-util full index**: all Util/Helper, category stats, each function's params/returns/function
7. **Script and config asset full index**: path, function, params, execution context of all scripts/configs
8. **Core tech/algorithm detail** (if 🔐 Crypto/GM / 🤖 AI/ML tags)
9. **Hardware/FFI interface analysis** (if ⚙️ Hardware/FFI tag): params, returns, error handling of all interfaces
10. **Startup-entry analysis**: full startup flow, key config locations, init order
11. **API inventory** (web projects): path, method, params, returns, permission of all APIs
12. **Key config-item notes**: default, role, legal-value range of all config items
13. **Security mechanisms and key hierarchy** (if 🔐 Crypto/GM / 🛡️ AuthN/AuthZ tags)
14. **Error-code system**: meaning, trigger scenario, troubleshooting of all error codes
15. **State-machine detail** (if 🔄 OTA/Hot Reload / ⏰ Scheduled Jobs tags)
16. **Process daemon** (if 🛡️ Process Daemon tag)
17. **Pack-and-release flow**
18. **Requirement Index**: MUST create an empty table on first generation; later Task 8.5 appends/updates
19. **Function and API Change Index**: create an empty table on first generation; later maintain incrementally per requirement
20. **Update records**: first generation writes a `v1.0` full-create record

Init template:

```markdown
## Requirement Index

| Requirement ID | Display Name | Level | Related Modules | Completed Version | Status | Notes |
|---------|-------|:--:|---------|:--:|------|------|

## Function and API Change Index

| Module | Symbol/Endpoint | File Path | Change Type | Summary | Called By/Consumers | Risk | Requirement ID | Version |
|------|----------|----------|----------|------|---------------|------|----------|------|

## Update Records

| Version | Date | Requirement ID | Change Scope | Summary | Updated Files |
|------|------|----------|----------|------|----------|
| v1.0 | YYYY-MM-DD | initial | Full create | Initial knowledge base | BASE, DETAIL |
```

---

### Layer 3: Huge-project volumes (auto when >50 modules)

**Trigger conditions**:
- Module count > 50
- Or estimated DETAIL.md > 2000 lines

**Volume rules**:
1. **Always keep one BASE**: the core index is always a single file
2. **Shared parts stay in main DETAIL**: protocol formats, util full index, config analysis, startup flow, etc.
3. **One DETAIL volume per business domain**, e.g.:
   - `PROJECT_KNOWLEDGE_DETAIL-comms.md`
   - `PROJECT_KNOWLEDGE_DETAIL-crypto.md`
   - `PROJECT_KNOWLEDGE_DETAIL-upgrade.md`
4. **Each volume stays under 1000 lines**
5. **BASE gains a "volume index table"**: filenames and content scope of all DETAIL volumes
6. **Each volume starts with a jump link**: "📖 Back to the index: PROJECT_KNOWLEDGE_BASE.md"

---

### PUML flow-diagram files (MUST deliver separately)

MUST also deliver these independent files under `docs/knowledge-base/`:
- **P0 mandatory 2**: `main_flow.puml`, `module_dependency.puml`
- **P1 N files by tags**: e.g. crypto tag → `security_flow.puml`; protocol tag → `protocol_flow.puml`

**Every PUML file MUST**:
- Have complete `@startuml` / `@enduml`, independently renderable
- Have header metadata comments (project name, diagram type, generated-at, activating tag)
- Annotate key nodes with corresponding source-file paths
- Use the unified skinparam template

---

## Quality Checklist

> ⚠️ **After execution MUST self-check every item. A knowledge base that fails MUST be reworked.**
> ⚠️ **Failing any item means not done.**

---

### 1. Layered-structure checks (all depth modes MUST pass)
- [ ] `PROJECT_KNOWLEDGE_BASE.md` exists and is the **core index**
- [ ] `PROJECT_KNOWLEDGE_DETAIL.md` exists and is the **deep lookup**
- [ ] **BASE has TOP 10 utils only, not the full index** (core index does not dump details)
- [ ] **DETAIL has the full util index**, not only TOP 10
- [ ] **BASE has the slim module dictionary** (Top 20% core modules, one sentence each)
- [ ] **DETAIL has the full module dictionary**, including all exported functions of all modules
- [ ] BASE footer has the jump link: "📚 For deep analysis see PROJECT_KNOWLEDGE_DETAIL.md"
- [ ] DETAIL header has the reverse link: "📖 For a quick start see PROJECT_KNOWLEDGE_BASE.md"
- [ ] **(Huge projects) DETAIL is split by business domain, and BASE has a volume index table**

---

### 2. Basic-content checks (all depths)
- [ ] Build files parsed with tech-stack version evidence
- [ ] **Phase 1.1 deep content probe executed** (every first-party module had inner source files read; not directory names only)
- [ ] BASE has the slim module dictionary (each module with a key source-file list)
- [ ] DETAIL has the full Util/Helper index (recursive search of all subdirectories)
- [ ] DETAIL has the full script-and-config asset index (described from actual file content)
- [ ] DETAIL initialized `## Requirement Index`
- [ ] DETAIL initialized `## Function and API Change Index`
- [ ] DETAIL initialized `## Update Records` including a `v1.0` full-create record
- [ ] **Phase 4.1.1 config cross-reference resolution executed** (every referenced config file actually read, core data extracted into the KB; not one-sentence table rows)
- [ ] **Config-read verification table filled and all passed** (every "Referenced files read?" cell is ✅)
- [ ] BASE has refactoring suggestions (evidence-backed, actionable)
- [ ] BASE has analysis-boundary and assumption notes

---

### 3. PUML special checks (all projects MUST pass; **fail = rework**)

> 🚨 **Highest-priority check.** History: over 60% of delivery complaints come from PUML render failure.
>
> Suggestion: after generating all PUML, **first paste into plantuml.com/plantuml for a trial render**, then deliver.

| Check | Status | Notes |
|--------|------|------|
| Basic completeness | - | |
| - [ ] | At least 2 independent .puml files | main_flow.puml + module_dependency.puml is the floor |
| - [ ] | Every file has complete @startuml / @enduml | Independently renderable; no missing wrappers |
| - [ ] | Header has standard metadata comments | Project name, diagram type, generated-at, activating tag, change log |
| - [ ] | All .puml live under `docs/knowledge-base/` | Correct path |
| | | |
| **Skinparam syntax** | - | **Most common render-failure cause** |
| - [ ] | Only the standard 6 skinparam lines | Do not add, delete, or change any skinparam |
| - [ ] | No `skinparam xxx { ... }` block syntax | Rewrite if found |
| - [ ] | No type-specific skinparam | e.g. rectangleBackgroundColor, participantBackgroundColor; replace with generic |
| | | |
| **Advanced-syntax blacklist** | - | **Second most common render-failure cause** |
| - [ ] | No `box ... end box` | Sequence grouping MUST NOT use box |
| - [ ] | No `\n` inside participant/component names | All names MUST be single-line |
| - [ ] | No `hexagon` / `fork` / `split` / `group` / `partition` | All such advanced syntax is banned |
| - [ ] | No `-[hidden]->` or other arrow modifiers | Only basic `-->` |
| - [ ] | No `:xxx;` Activity syntax inside State diagrams | NEVER mix State/Activity syntax |
| - [ ] | No nested State | All states MUST be flat |
| | | |
| **Special-character checks** | - | **Third most common render-failure cause** |
| - [ ] | No emoji characters | 🔄🔌🔐⚙️🛡️★ and similar MUST all be removed |
| - [ ] | No box-drawing (├ └ ─ │ etc.) | All lists use ordinary `-` hyphens |
| - [ ] | No full-width punctuation (、 。 ： ；) | All half-width |
| | | |
| Content-quality checks | - | |
| - [ ] | All flow diagrams generated by tag-activation rules | Generate what the tags imply; do not invent |
| - [ ] | Key nodes annotated with corresponding source-file paths | So users can locate code |
| - [ ] | BASE has a standalone "PUML Flow Diagram Index" chapter | |
| - [ ] | Index chapter has a complete file table | Filename, flow type, activating tag, short description |
| - [ ] | ❌ Did not stuff all flows into one "kitchen-sink" diagram | Each flow MUST be an independent file |
| - [ ] | ❌ Did not only embed code blocks in markdown without delivering independent .puml | MUST deliver independently renderable files |

**Optional quick self-check commands:**
```bash
# Check for block syntax
grep -l "skinparam.*{" *.puml
# Check for special characters
grep -P "[\x{1F300}-\x{1F9FF}]" *.puml
# Check for box syntax
grep -l "^box" *.puml
```

---

### 4. Deep-analysis checks (all depths)
- [ ] DETAIL has startup-entry analysis
- [ ] DETAIL has a complete call graph
- [ ] DETAIL has an API inventory (web projects)
- [ ] DETAIL has notes for all key config items
- [ ] DETAIL has security-mechanism notes (if related tags)
- [ ] DETAIL has error-code-system notes
- [ ] DETAIL has state-machine detail (if related tags)

---

## Output Style

- Markdown only
- Prefer tables for index chapters
- Conclusion first, evidence after
- Do not dump large raw code (noise)

---

## Failure Handling

### Normal flow (default)
- All projects (standard full / as exhaustive as possible) default to the **layered file structure**; split is not only for overflow
- BASE + DETAIL two files is standard, not optional

### Project-size tiers

| Size | Criteria | Delivery |
|---------|---------|---------|
| **Small** | < 10 modules | BASE + DETAIL (single files) |
| **Medium** | 10-50 modules | BASE + DETAIL (single files) |
| **Large** | > 50 modules or estimated DETAIL > 2000 lines | BASE + DETAIL (shared parts) + DETAIL-{module-domain}.md (volumes by business domain) |
| **Huge** | > 100 modules or > 2000 files | Phase 1: BASE + PUML + module catalog first; Phase 2: incrementally generate DETAIL volumes by domain |

### Special cases
- **Insufficient permission to read some directories**: in BASE "analysis boundaries", explicitly mark "could not scan directory X, results may be incomplete", then continue with accessible parts
- **Missing build files/evidence**: mark "missing-evidence items" instead of guessing versions
- **No utility classes found**: in DETAIL explicitly write "no independent utility classes found"; an empty table is worse than a clear note
- **No flow-diagram assets**: auto-generate at least 2 base diagrams (main_flow + module_dependency); do not omit the chapter
- **PUML render error**: immediately check syntax (missing @enduml, other syntax errors), fix, regenerate
- **User interrupt**: keep already-generated content; next time continue remaining parts from the breakpoint
