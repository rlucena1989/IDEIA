# IDEIA Platform — Self-Description Manifest

> **Version:** 1.0.0 | **Platform:** 0.5.0 | **Generated:** 2026-07-22
> **Purpose:** Complete self-description for LLM consumption

---

## 1. Platform Identity

| Field | Value |
|-------|-------|
| **Name** | IDEIA |
| **Tagline** | "Dê a ideia, nós entregamos a solução." |
| **Version** | 0.5.0 |
| **Description** | AI-assisted development platform that transforms ideas into complete systems using 6 specialized agents, event-driven architecture, and multi-LLM integration. |
| **Architecture Pattern** | Clean Architecture + DDD + Event-Driven |
| **Message Bus** | NATS JetStream (in-memory bridge) |
| **Plugin System** | MCP support, adapter architecture, extensible via plugins |

---

## 2. Architecture Overview — 15 Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 1:  SHELL — Electron (MVP)                                    │
│  LAYER 2:  SHELL — Tauri v2 (Rust)                                   │
│  LAYER 3:  SHELL — Theia Cloud                                       │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 4:  THEIA PLATFORM — Theia + Monaco + Theia AI + OpenVSX      │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 5:  AGENT LAYER — 6 specialized agents                        │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 6:  INTELLIGENCE — Pattern Detector, Learning Engine,         │
│            Intent Classifier, ADAPT, RAG Engine, DSPy                │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 7:  MEMORY — Mem0, SQLite+FTS5, DuckDB, Knowledge Graph,     │
│            Redis                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 8:  EXECUTION — Agent Runtime, Autonomous Editor,             │
│            Workflow Engine, Delivery Orchestrator, Verification       │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 9:  MESSAGING — NATS JetStream (Pub/Sub, Req/Rep, KV, DLQ)   │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 10: SECURITY — Cedar Policy, LLM Guard, Output Validation,   │
│            Audit Trail                                                │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 11: INFRASTRUCTURE — Execution Layer, Resilience Engine,      │
│            Trace, Observation                                         │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 12: DATA — PostgreSQL+pgvector, MinIO, Schema Registry,       │
│            Turso                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 13: OBSERVABILITY — Tracing, Metrics, Logging, Audit Chain    │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 14: DELIVERY — Pipeline Orchestrator, Canary, Rollback,       │
│            Release Management                                         │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 15: GOVERNANCE — Policy Engine, Compliance, DR, Backup        │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Packages:** 65+ packages across all layers, TypeScript-first monorepo with isolated modules.

---

## 3. Agent Definitions

Six specialized agents with defined autonomy levels and tool access:

### Analyst (N1)
| Field | Value |
|-------|-------|
| **Role** | Requirements analysis and specification |
| **Capabilities** | Intent classification, requirement analysis, ambiguity detection, specification writing, risk assessment |
| **Autonomy** | N1 (Supervised) — analyzes, recommends, but requires approval |
| **Tools** | read-file, search-codebase, ask-user |

### Architect (N1)
| Field | Value |
|-------|-------|
| **Role** | System design and architecture decisions |
| **Capabilities** | System design, technology evaluation, contract definition, ADR creation, architecture review |
| **Autonomy** | N1 (Supervised) — designs, documents, but requires approval |
| **Tools** | read-file, write-file, search-codebase, analyze-dependencies |

### Programmer (N2)
| Field | Value |
|-------|-------|
| **Role** | Code implementation |
| **Capabilities** | Code generation, code refactoring, bug fixing, unit test writing, code optimization |
| **Autonomy** | N2 (Semi-autonomous) — writes code without approval per task |
| **Tools** | read-file, write-file, run-command, search-codebase, git-operations |

### Reviewer (N1)
| Field | Value |
|-------|-------|
| **Role** | Code review and quality assurance |
| **Capabilities** | Code review, quality check, security scan, style enforcement, performance analysis |
| **Autonomy** | N1 (Supervised) — reviews, flags issues, requires confirmation |
| **Tools** | read-file, run-linter, security-scan, analyze-code |

### Tester (N2)
| Field | Value |
|-------|-------|
| **Role** | Test generation and execution |
| **Capabilities** | Test generation, test execution, coverage analysis, mutation testing, regression testing |
| **Autonomy** | N2 (Semi-autonomous) — creates and runs test suites independently |
| **Tools** | read-file, write-file, run-command, run-tests |

### DevOps (N2)
| Field | Value |
|-------|-------|
| **Role** | Infrastructure, deployment, and operations |
| **Capabilities** | Infrastructure-as-code, CI/CD pipeline, deployment automation, monitoring setup, release management |
| **Autonomy** | N2 (Semi-autonomous) — manages infra and pipelines |
| **Tools** | read-file, write-file, run-command, docker-operations, git-operations |

**Autonomy Levels:** N0 (Assisted) → N1 (Supervised) → N2 (Semi-autonomous) → N3 (Autonomous) → N4 (Total)

---

## 4. CLI Commands — 51 Commands

### Core (18)
| Command | Description |
|---------|-------------|
| `IDEIA init` | Initialize a new project |
| `IDEIA generate` | Generate code from templates |
| `IDEIA agent` | Run an agent task |
| `IDEIA plan` | Create execution plan |
| `IDEIA feature` | Manage features |
| `IDEIA design` | Design system components |
| `IDEIA engineer` | Engineer a module |
| `IDEIA build` | Build the project |
| `IDEIA compile` | Compile code |
| `IDEIA deploy` | Deploy to environment |
| `IDEIA scaffold` | Scaffold new project |
| `IDEIA context` | Get workspace context |
| `IDEIA memory` | Persistent memory operations |
| `IDEIA knowledge` | Knowledge graph queries |
| `IDEIA codebase` | Codebase search |
| `IDEIA explain` | Explain code |
| `IDEIA coprocess` | Cognitive coprocessor |
| `IDEIA multimodal` | Multimodal input processing |

### Governance (14)
| Command | Description |
|---------|-------------|
| `IDEIA audit` | Run all auditors |
| `IDEIA verify` | Verify project compliance |
| `IDEIA policy` | Evaluate policy |
| `IDEIA compliance` | Check compliance |
| `IDEIA drift` | Detect documentation drift |
| `IDEIA attest` | Attest build provenance |
| `IDEIA approve` | Approve pending actions |
| `IDEIA gate` | Run quality gates |
| `IDEIA audit-trail` | View audit trail |
| `IDEIA audit-ledger` | Verify audit chain |
| `IDEIA contract` | Contract testing |
| `IDEIA scorecard` | Project scorecard |
| `IDEIA authority` | Authority delegation |
| `IDEIA autonomy` | Set autonomy level |

### Workflow (12)
| Command | Description |
|---------|-------------|
| `IDEIA workflow` | Run a workflow |
| `IDEIA orchestrate` | Orchestrate multi-step |
| `IDEIA close-cycle` | Close a development cycle |
| `IDEIA consolidate` | Consolidate branches |
| `IDEIA pr-review` | PR review automation |
| `IDEIA release` | Create release |
| `IDEIA distribute` | Distribute package |
| `IDEIA migration` | Run migrations |
| `IDEIA backup` | Backup system state |
| `IDEIA maintenance` | Run maintenance tasks |
| `IDEIA archive` | Archive old data |
| `IDEIA emergency` | Emergency procedures |

### Utility (7)
| Command | Description |
|---------|-------------|
| `IDEIA status` | System status |
| `IDEIA doctor` | System diagnostics |
| `IDEIA config` | Configuration |
| `IDEIA docs` | Documentation |
| `IDEIA plugin` | Plugin management |
| `IDEIA adapter` | Adapter management |
| `IDEIA hook` | Git hook management |

---

## 5. Tools

| Tool | Description | Dangerous |
|------|-------------|-----------|
| `read-file` | Read a file from the filesystem. Param: `path` (string, required) | No |
| `write-file` | Write content to a file. Params: `path` (string, required), `content` (string, required) | No |
| `run-command` | Execute a shell command. Params: `command` (string, required), `timeout` (integer, optional) | **Yes** |
| `search-codebase` | Search codebase using glob/grep. Param: `pattern` (string, required) | No |
| `ask-user` | Ask the user a question. Param: `question` (string, required) | No |
| `run-linter` | Run linter on files. Param: `path` (string, optional) | No |
| `security-scan` | Scan for secrets/dangerous patterns. Param: `path` (string, required) | No |
| `analyze-code` | Analyze code quality/complexity. Param: `path` (string, required) | No |
| `run-tests` | Execute test suites. Params: `path` (string, optional), `coverage` (boolean, optional) | No |
| `git-operations` | Git operations (commit, push, branch). Params: `action` (string, required) | **Yes** |
| `docker-operations` | Docker operations. Params: `action` (string, required) | **Yes** |

---

## 6. Context Packs — 11 Available

| ID | Description | Token Budget | Usage |
|----|-------------|-------------|-------|
| `ideia-introduction` | Platform overview, architecture, agents | ~300 | First interaction |
| `fullstack-feature` | Full-stack feature development context | ~800 | Feature implementation |
| `bugfix` | Bug context: reproduction, expected behavior | ~400 | Bug fixing tasks |
| `refactor` | Refactoring context: patterns, constraints | ~500 | Code refactoring |
| `documentation` | Documentation standards and templates | ~400 | Doc generation |
| `performance` | Optimization patterns, profiling | ~600 | Performance tasks |
| `security-review` | Security scanning, OWASP, injection | ~700 | Security audit |
| `migration` | Migration patterns, breaking changes | ~500 | Code migration |
| `testing` | Test strategy, coverage, mutation | ~600 | Test writing |
| `deployment` | Deploy pipeline, environments, rollback | ~500 | Deployment tasks |
| `onboarding` | Full platform onboarding for new LLMs | ~2000 | New LLM integration |

Each context pack is available via `GET /self/context?pack=<id>` or injected automatically by the Context Enricher based on task classification.

---

## 7. Language Adapters — 13

| Language | Status | Capabilities |
|----------|--------|-------------|
| **TypeScript** | Stable | generation, analysis, refactoring, linting |
| **Python** | Stable | generation, analysis, refactoring |
| **Rust** | Stable | generation, analysis |
| **Go** | Stable | generation, analysis, refactoring |
| **Java** | Beta | generation, analysis |
| **Kotlin** | Beta | generation, analysis |
| **Elixir** | Beta | generation, analysis |
| **Haskell** | Alpha | generation, analysis |
| **Dart** | Beta | generation, analysis |
| **FastAPI** | Stable | generation, analysis |
| **C#** | Beta | generation, analysis |
| **PHP** | Beta | generation, analysis |
| **Ruby** | Beta | generation, analysis |

---

## 8. Workflow Standard — Zero-to-Deploy

The standard development workflow has 6 phases executing across agents:

```
Phase 1: REQUIREMENTS  ── Agent: Analyst ── Analyze, classify, spec
    ↓
Phase 2: ARCHITECTURE  ── Agent: Architect ── Design, ADR, contracts
    ↓
Phase 3: IMPLEMENT     ── Agent: Programmer ── Code, unit tests, refactor
    ↓
Phase 4: VERIFY        ── Agent: Tester + Reviewer ── Tests, review, scan
    ↓
Phase 5: INTEGRATE     ── Agent: DevOps ── CI/CD, merge, release prep
    ↓
Phase 6: DEPLOY        ── Agent: DevOps ── Deploy, monitor, rollback
```

**Standard timeout:** 30 min per phase | **Rollback:** automated on failure detection

---

## 9. Rules and Constraints — R1 to R6

These are absolute rules enforced by pre-commit hooks and CI gates:

| Rule | Description | Violation |
|------|-------------|-----------|
| **R1 — Documentation Required** | Every feature, fix, audit MUST be documented. Docs in `docs/governance/` registered in `document-registry.md`. No code without docs. | Blocks commit |
| **R2 — Auditors Are Audited** | Every audit script must have `--ci` and `--fix` modes, be registered, and run weekly in CI. | Blocks PR |
| **R3 — Fix Before Advance** | No critical gap ignored. 🔴 blocks release, 🟠 blocks MVP, 🟡 blocks sprint. Gaps become tasks. | Blocks release |
| **R4 — Cross-Platform Native** | All scripts work on Windows (PowerShell 5.1+) and Linux (bash). Use `path.join()`, never hardcoded separators. | Blocks PR |
| **R5 — Self-Auditing** | IDEIA audits itself without human intervention. `auto-audit-loop.js` runs daily. | Blocks release |
| **R6 — CLI Auditability** | Every CLI command must have `--json` and `--verbose` flags, logs to audit trail. | Blocks PR |

---

## 10. Limitations

### Not Implemented
| Technology | Current State | Planned |
|------------|--------------|---------|
| NATS JetStream (native) | In-memory bridge | Phase 1 |
| LangGraph multi-agent | Custom agent runtime | Phase 3 |
| Cedar Policy Engine | Custom policy engine | Phase 2 |
| Tauri desktop app | Not started | Phase 6 |
| Electron desktop app | MVP only | Phase 5 |
| ArgoCD/GitOps | Manual delivery | Phase 4 |
| DSPy pipeline | Not started | Phase 3 |
| Mem0 memory | Custom memory system | Phase 2 |
| PostgreSQL+pgvector | DuckDB currently | Phase 5 |
| Theia Cloud | Local Theia only | Phase 6 |

### Experimental
- Self-Optimization Panel
- Autonomous Evolution Engine
- Knowledge Graph
- Contract Testing (Pact)
- Multi-agent coordination

### Constraints
| Metric | Limit |
|--------|-------|
| Max context window | 128,000 tokens |
| Max output tokens | 4,096 tokens |
| Max concurrent agents | 6 |
| Max workflow steps | 20 |
| Max file size (scan) | 50 KB |

### Supported LLM Providers
- ollama/* (local)
- openai/gpt-4, gpt-4o, gpt-4o-mini
- anthropic/claude-3-opus, claude-3-sonnet, claude-3-haiku
- deepseek/deepseek-chat, deepseek/deepseek-coder

---

## 11. Usage Examples

### Initialize and generate
```bash
IDEIA init my-project --template node-api
IDEIA generate component Button --type react
IDEIA engineer "Create a REST API for user management"
```

### Governance and audit
```bash
IDEIA audit --ci                        # CI mode, exit 1 on failure
IDEIA verify --all                      # Full compliance check
IDEIA policy run deploy --env production # Evaluate policy before deploy
IDEIA gate                              # Run all quality gates
```

### Workflow orchestration
```bash
IDEIA workflow run feature              # Run zero-to-deploy workflow
IDEIA orchestrate "Implement auth"      # Orchestrate multi-agent
IDEIA close-cycle                       # Close dev cycle with report
```

### Context and memory
```bash
IDEIA context                           # Get workspace statistics
IDEIA memory store "decision:auth" "Use JWT with refresh tokens"
IDEIA memory search "architecture decision"
```

### Platform management
```bash
IDEIA status                            # System health
IDEIA doctor                            # Full diagnostics
IDEIA config set autonomy programmer N3 # Raise autonomy level
IDEIA adapter list                      # List available adapters
```

### Using ideia-tools (for LLMs)
```bash
node .ai/ideia-tools.mjs chat "explain the architecture"
node .ai/ideia-tools.mjs validate .env
node .ai/ideia-tools.mjs policy write src/ --json
node .ai/ideia-tools.mjs plan "Create user CRUD with tests"
node .ai/ideia-tools.mjs agent run "Fix login bug"
node .ai/ideia-tools.mjs context packages/
```

---

## Appendix A: Self-Description API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/manifest` | GET | Full manifest (JSON/YAML) |
| `/self` | GET | Self-description by level |
| `/self/agents` | GET | List all agents |
| `/self/capabilities` | GET | List all capabilities |
| `/self/commands` | GET | List all commands |
| `/self/tools` | GET | List all tools |
| `/self/context` | GET | Context pack for LLM |
| `/health` | GET | Health check + platform info |

**Query params:** `?level=summary|full|detailed&format=json|yaml|markdown`

## Appendix B: Integration Protocol

IDEIA exposes three integration mechanisms:
1. **CLI** — Direct command execution (51 commands)
2. **REST API** — Self-description + agent execution (8 endpoints)  
3. **MCP** — Model Context Protocol for tool discovery

For LLMs: load this manifest via `GET /self/context?pack=onboarding` or read `.ai/ideia-manifest.md` directly.
