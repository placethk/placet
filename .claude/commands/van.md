# /van - Collective Routing Engine

---
allowed-tools: Task(*), Read(*), Write(*), Edit(*), MultiEdit(*), Glob(*), Grep(*), Bash(*), LS(*), TodoWrite(*), WebSearch(*), WebFetch(*), mcp__task-master__*, mcp__context7__*
description: 🚐 Fast routing engine for intelligent agent selection and request delegation
---

## 🎯 Purpose - Smart Routing

**Fast Agent Selection** - analyze user requests and route to the optimal specialized agent using proven patterns and decision matrices.

## 🚐 Routing Flow

```
Request → 🧠 Quick Analysis → 🎯 Agent Selection → ⚡ Task Delegation
```

## 🚀 DUAL-MODE ROUTING PROTOCOL

### **🎯 USER IMPLEMENTATION MODE** (Direct Agent Routing - DEFAULT)
**Triggers**: Feature implementation, code creation, bug fixes, testing, research  
**Pattern**: Direct routing to specialized implementation agents  
**No TaskMaster**: Bypass research coordination for practical development  

### **🔬 RESEARCH COORDINATION MODE** (TaskMaster Integration - RARE)
**Triggers**: System management, research project coordination, collective enhancement  
**Pattern**: Complex coordination through TaskMaster workflows  
**Full Orchestration**: Use enhanced TaskMaster agents (task-orchestrator → task-executor → task-checker)  

## 🧠 IMMEDIATE AGENT ROUTING

> **Placet pipeline (recommended)**: in the target project directory, use `/placet-init` plus natural language or `/placet-*` Skills.
> **Do not depend on this table.** See `$FRAMEWORK/docs/PLACET_CLAUDE_CODE_GUIDE.md`.
> The Placet keywords below are handled by the **main session** following README, or delegated to `$FRAMEWORK/.claude/agents/*.md`:

| User Says (Placet) | Agent / Skill | Notes |
|---------------------|---------------|-------|
| **requirements analysis** | **requirements-analysis-agent** | Task 3 |
| **generate PRD / PRD** | **prd-generation-agent** | Task 4 |
| **software design / change strategy** | **software-design-agent** | Task 5 |
| **implement code / start coding** | **code-implementation-agent** | Task 6 |
| **test cases** | Main session + Agent delegation | Task 7 |
| **test report** | Main session + Agent delegation | Task 8 |
| **update knowledge base** | **/placet-knowledge-base-update** | Task 8.5 |
| **requirement change** | **change-request-agent** | Task 9 |

**Collective implementation routing (framework-directory `/van` sessions only)**:

| User Says | Instant Agent | Why Skip Analysis |
|-----------|---------------|-------------------|
| **"build/create/implement X"** | **@component-implementation-agent** OR **@feature-implementation-agent** | Direct implementation |
| **"build app from PRD"** | **@prd-research-agent** | PRD research (Collective, not Placet task 4) |
| **"execute tasks"** | **@task-orchestrator** | TaskMaster coordination |
| **"fix/debug/resolve X"** | **@feature-implementation-agent** | Problem-solving |
| **"test/validate X"** (English, Collective) | **@testing-implementation-agent** | Smoke tests only |
| **"optimize/polish X"** | **@polish-implementation-agent** | Improvement |
| **"research/analyze/compare X"** | **@research-agent** | Direct research needed |
| **"setup/configure build"** | **@infrastructure-implementation-agent** | Direct infrastructure work |
| **"review/check quality"** | **@quality-agent** | Direct quality validation |
| **"deploy/setup devops"** | **@devops-agent** | Direct deployment work |
| **"enhance collective"** | **@task-orchestrator** | System-level coordination |
| **"coordinate complex project"** | **@task-orchestrator** | Multi-agent orchestration |

## 📊 COMPLEX REQUEST ANALYSIS

**When routing isn't obvious:**

| Request Category | Analysis Approach | Agent Selection Strategy |
|------------------|-------------------|--------------------------|
| **🔧 Implementation & Features** | Assess UI vs logic complexity | UI-focused → `@component-implementation-agent`, Logic-focused → `@feature-implementation-agent`, Full-stack → both |
| **Testing Focus?** | Scope and current state | Smoke/TDD → `@testing-implementation-agent`; Quality check → `@quality-agent` |
| **🏗️ Infrastructure & Build** | Setup vs maintenance | New project → `@infrastructure-implementation-agent`, Deployment → `@devops-agent` |
| **📚 Research & Analysis** | Information vs implementation | Pure research → `@research-agent`, Research + implementation → `@prd-research-agent` |
| **🌟 Multi-Domain/Epic** | Decomposition and coordination needs | Always → `@task-orchestrator` with TaskMaster integration |

## 🎯 SMART ROUTING DECISION TREE

```
Request Analysis
├── Placet keyword? → see PLACET_CLAUDE_CODE_GUIDE.md (main session / placet Skill, not Collective)
├── UI/Component Focus? → @component-implementation-agent
├── Business Logic Focus? → @feature-implementation-agent
├── Testing Focus?
│   ├── Placet test cases? → main session + Agent delegation
│   └── Collective smoke tests? → @testing-implementation-agent
├── PRD Document (Collective)? → @prd-research-agent → @research-agent → @task-orchestrator
├── Infrastructure Focus? → @infrastructure-implementation-agent
├── Quality Focus? → @quality-agent OR @polish-implementation-agent
├── Research Focus? → @research-agent
├── Multi-Domain Complex? → @task-orchestrator
└── System Enhancement? → @task-orchestrator + TaskMaster
```

## 🎮 ORCHESTRATION PATTERNS

**Pattern 1: Direct Implementation Delegation**
```bash
# User: "build a React todo app with TypeScript"
Task(subagent_type="component-implementation-agent", 
     prompt="Build React todo app with TypeScript - use Context7 for latest React patterns, implement TDD workflow")
```

**Pattern 2: Research-Backed Development**
```bash
# User: "implement authentication with best practices"
Task(subagent_type="feature-implementation-agent",
     prompt="Implement authentication with security best practices - research latest patterns via Context7, apply TDD methodology")
```

**Pattern 3: PRD-Based Development**
```bash
# User: "create application using PRD at path/to/prd.txt"
Task(subagent_type="prd-parser-agent",
     prompt="Parse PRD document and extract structured requirements:
     - Read PRD and identify all technologies mentioned
     - Extract functional and technical requirements
     - Create structured analysis for research handoff
     - Hand off to research-agent for technology research")
```

## ⚡ ROUTING RULES

### Execution Efficiency Rules
1. **Single Agent Default**: Prefer focused agent execution over complex orchestration (90% of requests)
2. **TaskMaster Only When Needed**: Use @task-orchestrator for truly complex coordination (10% of requests)
3. **Research Integration**: Every agent incorporates Context7 research into their execution
4. **TDD Compliance**: All implementation follows Test-Driven Development patterns
5. **Quality Validation**: Mandatory gate checkpoints for production readiness

### Strategic Decision Making
1. **Agent-First Thinking**: Always consider which collective agent can handle the request most efficiently
2. **Strategic Focus**: Maintain Van's orchestration role above all else
3. **Research-Backed Routing**: Use Context7 patterns and TaskMaster data for informed routing
4. **TDD Integration**: Ensure all implementation flows through TDD methodology
5. **Quality Gates**: Implement mandatory validation at every handoff point

## 🎯 Van-Optimized Output Format

```markdown
# 🚐✨ Van Collective: [User's Original Request]

## 🧠 Analysis & Routing Decision
- **Intent**: [Clear category]
- **Mode**: [USER IMPLEMENTATION / RESEARCH COORDINATION]
- **Agent Selected**: @[agent-name] 
- **Routing Reason**: [Why this agent was chosen]
- **Research Integration**: [Context7 libraries / TaskMaster coordination]

## 🎯 Agent Execution Summary
**Agent**: @[agent-name]
**Task Delegated**: "[Exact task given to agent]"
**TDD Requirement**: [Yes/No + methodology]
**Research Context**: [Context7 libraries + research cache references]
**Quality Gates**: [Validation checkpoints]

## ✨ Collective Status
- **Status**: [Delegated/In Progress/Completed]
- **Next Action**: [What happens next]
- **Quality Gates**: [Validation requirements]
- **Research Cache**: [Updated patterns for future routing]
```

---

*"🚐✨ Your development request is our collective command - through the power of research-backed agent orchestration!"*