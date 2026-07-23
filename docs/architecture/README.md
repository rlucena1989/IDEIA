# Arquitetura — IDEIA

## Diagrama C4 - Nível 1 (Contexto)

```
┌──────────────────────────────────────────────────────────────────┐
│                    USUÁRIO (Dev/Team)                             │
│         ╱           │            ╲          ╲                    │
│    Desktop        Web          CLI       VS Code                 │
│    (Electron)  (Theia Cloud)  (Terminal)  (Extension)            │
└──────────────────────────────────────────────────────────────────┘
                            │
┌──────────────────────────────────────────────────────────────────┐
│                      IDEIA Platform                               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Theia Platform | Monaco | Theia AI | OpenVSX | DI     │     │
│  └─────────────────────────────────────────────────────────┘     │
│         │                    │                   │               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐        │
│  │  Chat Service │  │  Agent       │  │  Policy Engine   │        │
│  │  3 providers  │  │  Runtime     │  │  Cedar Adapter   │        │
│  │  SSE/WS       │  │  LangGraph   │  │  Compliance      │        │
│  └──────────────┘  └──────────────┘  └──────────────────┘        │
│         │                    │                   │               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐        │
│  │  Event Bus   │  │  Memory Store│  │  Audit Trail     │        │
│  │  NATS JetStr.│  │  SQLite+FTS5 │  │  SHA-256 Chain   │        │
│  │  DLQ/KV/Obj  │  │  DuckDB      │  │  verifyChain()   │        │
│  └──────────────┘  └──────────────┘  └──────────────────┘        │
│         │                    │                   │               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐        │
│  │  Cache Layer │  │  Telemetry   │  │  AI Safety       │        │
│  │  MemoryCache │  │  OTel Tracing│  │  Jailbreak Det.  │        │
│  │  NATS KV     │  │  Prometheus  │  │  Content Filter  │        │
│  └──────────────┘  └──────────────┘  └──────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

## Diagrama C4 - Nível 2 (Container)

```
┌─────────────────────────────────────────────────────────────┐
│  Web App (Theia Cloud)                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ Chat │ │ Dash │ │ Diff │ │Appro-│ │Files │ │Studies│    │
│  │Widget│ │Widget│ │Widget│ │valWid│ │Widget│ │Widget │    │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │
│  ┌──────┐ ┌──────┐ ┌──────────┐ ┌──────────────────┐       │
│  │Sugges│ │Search│ │Security  │ │ Audit Log        │       │
│  │tions │ │Overlay│ │Widget    │ │ Widget           │       │
│  └──────┘ └──────┘ └──────────┘ └──────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│  Backend Services                                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │ Chat   │ │ Task   │ │ Agent  │ │ Memory │ │ Dashboard│   │
│  │Service │ │Service │ │Service │ │Service │ │ Service  │   │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────────┐      │
│  │Provider│ │Output  │ │Security│ │ DAP Setup        │      │
│  │Router  │ │Valida. │ │Service │ │ (Debug Panel)    │      │
│  └────────┘ └────────┘ └────────┘ └──────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│  Infraestrutura                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │ NATS     │ │ PostgreSQL│ │ Prometheus│ │ Grafana      │    │
│  │ JetStream│ │ +pgvector│ │ +Alertmgr│ │ +Dashboards  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Diagrama C4 - Nível 3 (Component — Agent Runtime)

```
┌─────────────────────────────────────────────────────┐
│  Agent Runtime                                       │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  LangGraph StateGraph                           │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │ Analyst │→│Architect│→│Programr│→│          │ │
│  │  └─────────┘ └─────────┘ └─────────┘          │ │
│  │      │            │            │               │ │
│  │      ▼            ▼            ▼               │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │Superv. │←│Reviewer │←│  Tester │           │ │
│  │  └─────────┘ └─────────┘ └─────────┘          │ │
│  │      │                                          │ │
│  │      ▼                                          │ │
│  │  ┌─────────┐                                    │ │
│  │  │  DevOps │                                    │ │
│  │  └─────────┘                                    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐      │
│  │ Checkpt  │ │ Timeout  │ │ HumanLoop        │      │
│  │ State    │ │ /Retry   │ │ Approval 3 níveis │      │
│  └──────────┘ └──────────┘ └──────────────────┘      │
└─────────────────────────────────────────────────────┘
```

## Decisões Arquiteturais (ADRs)

| ADR | Decisão | Status |
|-----|---------|--------|
| 001 | Theia Platform como base da IDE | ✅ |
| 002 | NATS JetStream para mensageria | ✅ |
| 003 | Clean Architecture + DDD | ✅ |
| 004 | TypeScript strict mode | ✅ |
| 005 | LangGraph para orquestração multiagente | ✅ |
| 006 | PostgreSQL+pgvector para dados | 🔶 Em avaliação |
| 007 | Electron para desktop | ✅ |
| 008 | SHA-256 chain para audit trail | ✅ |

## Pacotes (90+)

```
@ideia/agent-runtime    @ideia/event-bus        @ideia/policy-engine
@ideia/audit-trail      @ideia/memory-store     @ideia/telemetry
@ideia/cache            @ideia/llm-provider     @ideia/cli
@ideia/logger           @ideia/delivery-orch.   @ideia/verification-layer
@ideia/browser-agent    @ideia/multi-surface    @ideia/prompt-security
@ideia/ideia-plugin     @ideia/adapter-* (13)   @ideia/workflow-engine
```

## Qualidade

- TypeScript strict com `no-explicit-any: error`
- ESLint + Prettier + Husky + commitlint
- Jest (unit + integration + contract + mutation)
- 7 dimensões de qualidade com gates automáticos
