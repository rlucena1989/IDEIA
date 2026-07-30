# DOSSIÊ COMPLETO — IDEIA

> **Plataforma:** IDEIA v0.5.0
> **Tagline:** "Dê a ideia, nós entregamos a solução."
> **Data de Geração:** 2026-07-27
> **LOC Total:** ~284.600 (947 src .ts + 1.556 .test.ts) | **Packages:** 292 | **Testes:** 4.391

---

## Sumário

1. [Visão Geral e Identidade](#1-visão-geral-e-identidade)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Arquitetura em 15 Camadas](#3-arquitetura-em-15-camadas)
4. [Ecossistema de Packages (292)](#4-ecossistema-de-packages-292)
5. [Sistema Multiagente](#5-sistema-multiagente)
6. [CLI — 160+ Comandos](#6-cli--160-comandos)
7. [Interface Theia — Widgets e Serviços](#7-interface-theia--widgets-e-serviços)
8. [Camada de Mensageria (NATS JetStream)](#8-camada-de-mensageria-nats-jetstream)
9. [Camada de Segurança](#9-camada-de-segurança)
10. [Sistema de Memória e Armazenamento](#10-sistema-de-memória-e-armazenamento)
11. [Inteligência e IA](#11-inteligência-e-ia)
12. [Observabilidade e Métricas](#12-observabilidade-e-métricas)
13. [Delivery e Deploy](#13-delivery-e-deploy)
14. [Prompt Economy](#14-prompt-economy)
15. [Self-Awareness](#15-self-awareness)
16. [G0-G9 Cycle Orchestrator](#16-g0-g9-cycle-orchestrator)
17. [Ciclo Autônomo Padrão (CAP)](#17-ciclo-autônomo-padrão-cap)
18. [Qualidade — 7 Dimensões](#18-qualidade--7-dimensões)
19. [Quality Gates](#19-quality-gates)
20. [Segurança e Compliance](#20-segurança-e-compliance)
21. [Adapters Multi-linguagem (13)](#21-adapters-multi-linguagem-13)
22. [Especificação Técnica de Packages](#22-especificação-técnica-de-packages)
23. [Scripts de Automação](#23-scripts-de-automação)
24. [Documentação e Estudos](#24-documentação-e-estudos)
25. [Diferencias Competitivos](#25-diferencias-competitivos)
26. [Roadmap e Pendências](#26-roadmap-e-pendências)
27. [Comandos Rápidos](#27-comandos-rápidos)

---

## 1. Visão Geral e Identidade

IDEIA é uma **IDE inteligente** que transforma ideias em sistemas completos. É uma plataforma de desenvolvimento assistida por IA que combina 6 agentes especializados, arquitetura orientada a eventos, integração multi-LLM e uma IDE baseada em Eclipse Theia.

| Atributo | Valor |
|----------|-------|
| **Nome** | IDEIA |
| **Versão** | 0.5.0 |
| **Propósito** | Transformar ideias em sistemas completos |
| **Arquitetura** | Clean Architecture + DDD + Event-Driven |
| **Message Bus** | NATS JetStream (com fallback in-memory) |
| **Sistema de Plugins** | MCP + Adapter Architecture |
| **Interface Principal** | Eclipse Theia (web + desktop) |
| **Linguagem Principal** | TypeScript 5.x |
| **Runtime** | Node.js >= 20 |
| **Licença** | MIT |

## 2. Stack Tecnológica

| Tecnologia | Versão | Função |
|------------|--------|--------|
| TypeScript | 5.x | Linguagem principal |
| Node.js | >=20.0.0 | Runtime |
| Eclipse Theia | 1.73.1 | Plataforma IDE |
| React | 18 | Widgets da interface |
| NATS JetStream | via @nats-io | Mensageria persistente |
| LangGraph | via @langchain | Orquestração multiagente |
| Ollama | via @theia/ai-ollama | LLM local |
| LangChain | Core | Framework de agentes |
| Inversify | 6.x | DI / IoC |
| Monaco Editor | via Theia | Editor de código |
| PostgreSQL | via pgvector | Dados + vetores |
| SQLite | via better-sqlite3 | Fallback local |
| DuckDB | via duckdb | Analytics embarcado |
| Fastify | via @fastify | Servidor HTTP |
| Jest | 29 | Testes unitários |
| Playwright | via @playwright | E2E / automação |
| Commander | via commander | CLI Framework |
| Electron | via electron | Desktop wrapper |

## 3. Arquitetura em 15 Camadas

```
┌────────────────────────────────────────────────────────────────────────────┐
│  L1: SHELL ─── Electron (MVP)                                              │
│  L2: SHELL ─── Tauri v2 (Rust)                                             │
│  L3: SHELL ─── Theia Cloud                                                  │
├────────────────────────────────────────────────────────────────────────────┤
│  L4: THEIA PLATFORM ─── Theia + Monaco + Theia AI + OpenVSX                 │
├────────────────────────────────────────────────────────────────────────────┤
│  L5: AGENT LAYER ─── 6 agentes especializados + Supervisor                  │
├────────────────────────────────────────────────────────────────────────────┤
│  L6: INTELLIGENCE ─── Pattern Detector, Learning Engine, Intent Classifier, │
│                      ADAPT, RAG Engine, DSPy                                │
├────────────────────────────────────────────────────────────────────────────┤
│  L7: MEMORY ─── Mem0 (custom), SQLite+FTS5, DuckDB, Knowledge Graph, Redis  │
├────────────────────────────────────────────────────────────────────────────┤
│  L8: EXECUTION ─── Agent Runtime, Autonomous Editor, Workflow Engine,       │
│                   Delivery Orchestrator, Verification Layer, Z-2-Deploy     │
├────────────────────────────────────────────────────────────────────────────┤
│  L9: MESSAGING ─── NATS JetStream (Pub/Sub, Req/Rep, KV, Object Store, DLQ) │
├────────────────────────────────────────────────────────────────────────────┤
│  L10: SECURITY ─── Policy Engine (27 patterns), Output Validation (31 PII), │
│                    Audit Trail SHA-256, Safety Circuit, Trusted Context      │
├────────────────────────────────────────────────────────────────────────────┤
│  L11: INFRASTRUCTURE ─── Execution Layer, Resilience Engine, Trace, Obser-   │
│                         vation Engine, SLO Monitor                          │
├────────────────────────────────────────────────────────────────────────────┤
│  L12: DATA ─── PostgreSQL+pgvector, MinIO, Schema Registry, Turso           │
├────────────────────────────────────────────────────────────────────────────┤
│  L13: OBSERVABILITY ─── Tracing, Metrics, Logging, Audit Chain, Telemetry    │
├────────────────────────────────────────────────────────────────────────────┤
│  L14: DELIVERY ─── Pipeline Orchestrator, Canary, Rollback, Release Mgmt    │
├────────────────────────────────────────────────────────────────────────────┤
│  L15: GOVERNANCE ─── Policy Engine, Compliance (LGPD/GDPR/EU AI Act),      │
│                      BCP/DR, Backup                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

## 4. Ecossistema de Packages (292)

O monorepo possui **292 packages** em `packages/`, todos com `src/` e `package.json`. A organização segue domínios funcionais:

### 🔊 Mensageria & Eventos
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/event-bus` | ~4.579 | 8 | NATS JetStream + in-memory fallback, IEventBus |
| `@ideia/mcp` | ~873 | 6 | Model Context Protocol server |
| `@ideia/mcp-server` | ~316 | 1 | MCP server endpoint |
| `@ideia/mcp-marketplace` | ~993 | 1 | Marketplace de servidores MCP |
| `@ideia/notification-system` | ~1.321 | 8 | Notificações nativas + EventBus |
| `@ideia/cqrs-bus` | ~1.221 | 9 | CQRS command/query bus |
| `@ideia/cqrs-projections` | ~1.415 | 1 | Projeções CQRS |
| `@ideia/rpc-messaging` | ~289 | 2 | RPC entre processos |

### 🤖 Agentes & IA
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/agent-runtime` | ~4.822 | 9 | Core: LangGraph, Step Executor, 8 nós |
| `@ideia/agent-graph` | ~481 | 2 | Grafo de agentes |
| `@ideia/agent-router` | ~467 | 6 | Roteamento entre agentes |
| `@ideia/agent-registry` | ~1.361 | 1 | Registro de agentes |
| `@ideia/agent-protocols` | ~1.042 | 1 | Protocolos de comunicação |
| `@ideia/agent-identity` | ~167 | 1 | Identidade de agentes |
| `@ideia/agent-memory` | ~1.020 | 1 | Memória de agentes |
| `@ideia/agent-coordinator` | ~319 | 1 | Coordenação entre agentes |
| `@ideia/agent-benchmark` | ~1.035 | 10 | Benchmark de agentes |
| `@ideia/agent-specialization` | ~542 | 1 | Especialização de agentes |

### 🧠 Memória & Armazenamento
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/memory-store` | ~4.174 | 10 | Persistência, atomic writes, backup |
| `@ideia/memory-hierarchy` | ~776 | 7 | Hierarquia de memória |
| `@ideia/memory-graph` | ~673 | 3 | Knowledge Graph |
| `@ideia/memory-continuous-learning` | ~718 | 1 | Aprendizado contínuo |
| `@ideia/synthetic-memory` | ~2.209 | 1 | Geração de memória sintética |
| `@ideia/vector-store` | ~608 | 2 | Busca vetorial (pgvector) |
| `@ideia/data-layer` | ~5.421 | 17 | PostgreSQL + SQLite + pgvector |
| `@ideia/schema-registry` | ~866 | 6 | Registro de schemas |
| `@ideia/cache` | ~881 | 7 | Cache layer |

### 🔒 Segurança & Compliance
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/policy-engine` | ~1.579 | 3 | 27 patterns de segurança |
| `@ideia/policy-gateway` | ~223 | 2 | Gateway de políticas |
| `@ideia/audit-trail` | ~1.431 | 5 | SHA-256 chain verificável |
| `@ideia/safety-circuit` | ~2.018 | 7 | Circuito de segurança |
| `@ideia/prompt-security` | ~4.836 | 10 | 31 regras PII, jailbreak, bias |
| `@ideia/scope-isolation` | ~1.050 | 8 | Isolamento de escopo |
| `@ideia/trusted-context` | ~56 | 2 | Contexto confiável |
| `@ideia/terminal-sandbox` | ~459 | 2 | Sandbox de terminal |
| `@ideia/encryption` | ~506 | 2 | Criptografia |
| `@ideia/privacy` | ~1.640 | 9 | Privacidade (LGPD/GDPR) |
| `@ideia/compliance` | ~723 | 1 | Compliance framework |
| `@ideia/compliance-checker` | ~1.310 | 1 | Verificador de compliance |
| `@ideia/enterprise-compliance` | ~2.285 | 1 | Compliance enterprise |
| `@ideia/risk-approval` | ~220 | 5 | Fluxo de aprovação 3 níveis |
| `@ideia/code-signing` | ~505 | 1 | Assinatura de código |

### ⚙️ Execução & Orquestração
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/workflow-engine` | ~839 | 2 | Workflows com quality gates |
| `@ideia/delivery-orchestrator` | ~4.054 | 8 | Canary, rollback, GitOps |
| `@ideia/execution-layer` | ~53 | 2 | CircuitBreaker, Retry |
| `@ideia/resilience-engine` | ~1.204 | 2 | Bulkhead, DegradationManager |
| `@ideia/resilience-v2` | ~2.725 | 5 | Resiliência v2 |
| `@ideia/verification-layer` | ~280 | 2 | Camada de verificação |
| `@ideia/correction-oracle` | ~197 | 1 | Oráculo de correção |
| `@ideia/checkpoint-engine` | ~272 | 3 | Checkpoints |
| `@ideia/continuity-engine` | ~779 | 1 | Continuidade entre sessões |
| `@ideia/zero-to-deploy` | ~695 | 2 | Workflow zero-to-deploy |

### 📊 Observabilidade & Métricas
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/observability-engine` | ~918 | 3 | Observabilidade full-stack |
| `@ideia/slo-monitor` | ~1.277 | 4 | SLO tracking |
| `@ideia/telemetry` | ~651 | 2 | Telemetria |
| `@ideia/trace-propagation` | ~54 | 1 | Propagação de traces |
| `@ideia/trace-registry` | ~371 | 2 | Registro de traces |
| `@ideia/metrics-store` | ~1.134 | 4 | Armazenamento de métricas |
| `@ideia/performance-monitor` | ~624 | 2 | Monitor de performance |
| `@ideia/health-check` | ~417 | 1 | Health check agregado |
| `@ideia/incident-manager` | ~518 | 2 | Gerenciamento de incidentes |
| `@ideia/incident-response` | ~3.765 | 1 | Resposta a incidentes |

### 🔌 Integração IDE (Theia Plugin)
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/plugin` | ~13.023 | 16 | Theia Plugin (10 widgets, 10 serviços) |
| `@ideia/plugin-sdk` | ~640 | 3 | SDK para plugins |
| `@ideia/theia-ai` | ~1.935 | 7 | Integração Theia AI |
| `@ideia/theia-cloud` | ~1.800 | 3 | Theia Cloud multitenant |
| `@ideia/ide-integration` | ~140 | 1 | Integração IDE |

### 🎛️ CLI & Configuração
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/cli` | ~172.292 | 789 | CLI principal (160+ comandos) |
| `@ideia/config-engine` | ~3.416 | 7 | Engine de configuração |
| `@ideia/profiles` | ~2.415 | 5 | Perfis de usuário |
| `@ideia/progressive-disclosure` | ~1.245 | 1 | Divulgação progressiva |

### 🧪 Testes & Qualidade
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/quality-gates` | ~1.431 | 11 | Quality gates engine |
| `@ideia/quality-threshold` | ~95 | 1 | Thresholds de qualidade |
| `@ideia/test-orchestrator` | ~531 | 2 | Orquestrador de testes |
| `@ideia/contract-cdc` | ~1.949 | 8 | Contract testing (Pact) |
| `@ideia/contracts` | ~959 | 6 | Contratos e DTOs (Zod) |
| `@ideia/predictive-quality` | ~1.304 | 2 | Qualidade preditiva |
| `@ideia/bias-detection` | ~917 | 1 | Detecção de viés |

### 🔄 Evolução & Autonomia
| Package | LOC | Testes | Função |
|---------|-----|--------|--------|
| `@ideia/autonomous-evolution-engine` | ~1.195 | 5 | Evolução autônoma |
| `@ideia/autonomous-editor` | ~131 | 1 | Editor autônomo |
| `@ideia/autonomy-controller` | ~652 | 4 | Controle de autonomia |
| `@ideia/auto-adr` | ~1.022 | 6 | ADR automático |
| `@ideia/technology-radar` | ~987 | 2 | Radar tecnológico |
| `@ideia/control-tower` | ~372 | 1 | Torre de controle |
| `@ideia/feedback-pipeline` | ~772 | 5 | Pipeline de feedback |
| `@ideia/self-healing` | ~2.069 | 1 | Auto-cura |
| `@ideia/reality-sync` | ~5.098 | 6 | Sincronização realidade-código |

### 🔧 Adapters Multi-linguagem (13)
| Package | LOC | Testes | Linguagem |
|---------|-----|--------|-----------|
| `@ideia/adapter-typescript` | ~561 | 1 | TypeScript |
| `@ideia/adapter-python` | — | — | Python |
| `@ideia/adapter-go` | ~690 | 2 | Go |
| `@ideia/adapter-java` | ~608 | 2 | Java |
| `@ideia/adapter-kotlin` | ~396 | 2 | Kotlin |
| `@ideia/adapter-rust` | — | — | Rust |
| `@ideia/adapter-php` | ~471 | 2 | PHP |
| `@ideia/adapter-ruby` | ~435 | 2 | Ruby |
| `@ideia/adapter-dart` | ~680 | 2 | Dart |
| `@ideia/adapter-elixir` | ~413 | 2 | Elixir |
| `@ideia/adapter-haskell` | ~420 | 2 | Haskell |
| `@ideia/adapter-swift` | ~391 | 2 | Swift |
| `@ideia/adapter-zig` | ~479 | 2 | Zig |
| `@ideia/adapter-fastapi` | ~550 | 2 | FastAPI (Python) |
| `@ideia/adapter-nestjs` | ~756 | 2 | NestJS |
| `@ideia/adapter-scala` | ~382 | 2 | Scala |

## 5. Sistema Multiagente

IDEIA opera com **6 agentes especializados** mais 1 supervisor, cada um com nível de autonomia definido:

### Agentes

| Agente | Autonomia | Papel | Capacidades |
|--------|-----------|-------|-------------|
| **Analyst** | N1 (Supervisionado) | Análise de requisitos | Classificação de intenção, detecção de ambiguidade, especificação, avaliação de risco |
| **Architect** | N1 (Supervisionado) | Design de sistemas | Avaliação tecnológica, definição de contratos, criação de ADRs, revisão arquitetural |
| **Programmer** | N2 (Semi-autônomo) | Implementação | Geração de código, refatoração, correção de bugs, testes unitários, otimização |
| **Reviewer** | N1 (Supervisionado) | Revisão de código | Quality check, security scan, enforce de estilo, análise de performance |
| **Tester** | N2 (Semi-autônomo) | Testes | Geração de testes, execução, análise de cobertura, mutation testing, regressão |
| **DevOps** | N2 (Semi-autônomo) | Infraestrutura | IaC, CI/CD, deploy automation, monitoramento, release management |

### Níveis de Autonomia
| Nível | Descrição |
|-------|-----------|
| **N0 Assistido** | Humano decide — IA executa e reporta |
| **N1 Supervisionado** | IA propõe, humano aprova |
| **N2 Semi-autônomo** | IA avança sem aprovação por tarefa |
| **N3 Autônomo** | IA executa ciclo completo |
| **N4 Total** | IA gerencia backlog e executa autonomamente |

### Orquestração (LangGraph)

O runtime de agentes usa **LangGraph** com:
- **StateGraph** com 8 nós: analyst, architect, programmer, reviewer, tester, devops, supervisor + router
- **8 tipos de steps:** interpret, evaluate, execute, log, update_memory, request_approval, wait_approval, notify, tool_call
- **Sub-grafos** para tarefas complexas (decomposição hierárquica)
- **Paralelismo** entre nós independentes (reviewer + tester simultâneos)
- **Timeout e retry** configuráveis por nó
- **ProviderRouter** com fallback entre LLM providers
- **HandoffFileManager** — comunicação entre agentes via JSON files (auditável, resumível)
- **MakerVerifierLoop** — ciclo apertado de implementação + verificação independente

### Subagentes (Pipeline Scout → Guard → Orchestrator → Build → Check)

Micro-robôs que operam dentro de uma tarefa específica, cada um com modelo de IA diferente (barato para tarefas simples, caro para complexas):

| Robô | Modelo | Temperatura | Função |
|------|--------|-------------|--------|
| **Scout** | Barato (haiku) | 0.7 | Explora o codebase, indexa, constrói grafo de dependências, coleta contexto |
| **Guard** | Barato (haiku) | 0.2 | Testa propostas adversarialmente, identifica edge cases, valida suposições |
| **Orchestrator** | Caro (sonnet) | 0.5 | Sintetiza planos a partir de Scout + Guard, atribui tarefas, resolve conflitos |
| **Build** | Médio (sonnet) | 0.3 | Implementa código seguindo o plano arquitetural |
| **Check** | Barato (haiku) | 0.1 | Valida implementação contra spec, executa quality checks, loop de correção |

Pipeline padrão: `scout → guard → orchestrator → build → check` com até 3 loops build-check.

### Robôs Operacionais (Robot Registry)

O `@ideia/robot-registry` gerencia robôs operacionais com **5 tipos** e **17 tarefas especializadas**:

| Tipo | Robôs | Tarefas |
|------|-------|---------|
| **code** | Geradores de código | scaffold, generate, format, refactor |
| **test** | Executores de teste | unit, integration, e2e, mutation |
| **doc** | Escritores de documentação | technical, user, api, changelog |
| **infra** | Operadores de infraestrutura | deploy, backup, monitor, security |
| **physical** | Integração robótica física | ações físicas |

Cada robô possui: registro com capacidades, fila de tarefas com prioridade, dead-letter queue, métricas de performance (success rate, avg duration, MTTR), e seleção por scoring (load 30% + success rate 40% + speed 30%).

### Papéis de Identidade e Controle de Acesso

O `@ideia/agent-identity` define 5 papéis com permissões granulares:

| Papel | Permissões | Padrões de Recurso | Aprovação |
|-------|-----------|-------------------|-----------|
| **admin** | read, write, delete, execute, admin | `*` (tudo) | ❌ |
| **dev** | read, write | `src/**`, `packages/**`, `tests/**`, `docs/**` | ❌ |
| **reviewer** | read | `*` (tudo, somente leitura) | ❌ |
| **ai-agent** | read, write | `src/**`, `packages/**`, `tests/**`, `docs/**` | ✅ requer aprovação |
| **observer** | read | `.ai/**`, `README.md` | ❌ |

Mapeamento ação→permissão: `file.read→read`, `file.write→write`, `file.delete→delete`, `shell.exec→execute`, `policy.change→admin`, `deploy.run→execute`, etc.

### Como os Robôs se Conectam aos Modelos de IA

Os robôs **não têm modelos próprios** — eles usam o **ProviderRouter** do `@ideia/llm-provider` que abstrai completamente qual modelo ou provedor está sendo usado:

```
Robô (ex: Programmer)
    │
    ▼
ProviderRouter.getActive()
    │
    ├── Ollama (local) ─── modelo rodando na máquina
    ├── OpenAI ──────────── API remota
    ├── OpenRouter ──────── API remota (agrega múltiplos)
    ├── DeepSeek ────────── API remota
    ├── Groq ────────────── API remota (inferência rápida)
    └── ... (qualquer OpenAI-compatible)
```

**Regras de roteamento:**
- **Scout/Guard/Check** → modelo barato (haiku, llama-3.1-70b, deepseek-chat) — tarefas simples
- **Build/Programmer** → modelo médio (sonnet, gpt-4o, deepseek-coder) — tarefas complexas
- **Orchestrator/Architect** → modelo caro (opus, o1, claude-3.5) — planejamento e raciocínio

Se um provedor falha, o **ProviderRouter** faz fallback automático para o próximo disponível na lista de prioridade. Tudo configurável via UI (widget Config) ou env vars.

### Fluxo Típico Completo

```
Ideia
  → Analyst (especifica requisitos)
    → Architect (projeta arquitetura, cria ADRs)
      → Scout (explora codebase, coleta contexto)
        → Guard (testa proposta adversarialmente)
          → Orchestrator (sintetiza plano)
            → Programmer/Build (implementa código)
              → Reviewer/Check (revisa e valida)
                → Tester (testa automatizado)
                  → DevOps (faz deploy, monitora)
```

## 6. CLI — 160+ Comandos

A CLI é o principal ponto de interação, construída com **Commander**, com **~172K LOC** e **789 testes**.

### Pipeline de Processamento de Prompts
```
Entrada do Usuário
    │
    ▼
┌── Guard ──→ Classify ──→ Enrich ──→ Optimize ──→ Plan ──→ Format ──┐
│  Segurança   Classifica   Enriquece   Otimiza     Planeja   Formata │
│  (injeção)   (intenção)   (contexto)   (tokens)   (passos)  (saída)  │
└─────────────────────────────────────────────────────────────────────┘
```

### Comandos Core (25+)
| Comando | Descrição |
|---------|-----------|
| `IDEIA init` | Inicializar projeto |
| `IDEIA generate` | Gerar código de templates |
| `IDEIA agent` | Executar tarefa de agente |
| `IDEIA plan` | Criar plano de execução |
| `IDEIA feature` | Gerenciar features |
| `IDEIA design` | Design de componentes |
| `IDEIA engineer` | Engenhar módulo completo |
| `IDEIA build` | Build do projeto |
| `IDEIA compile` | Compilar código |
| `IDEIA deploy` | Deploy em ambiente |
| `IDEIA scaffold` | Scaffold de projeto |
| `IDEIA context` | Contexto do workspace |
| `IDEIA memory` | Operações de memória persistente |
| `IDEIA knowledge` | Queries no knowledge graph |
| `IDEIA codebase` | Busca no codebase |
| `IDEIA explain` | Explicar código |
| `IDEIA coprocess` | Coprocessador cognitivo |
| `IDEIA multimodal` | Entrada multimodal |
| `IDEIA workflow` | Executar workflow |
| `IDEIA orchestrate` | Orquestração multi-passo |
| `IDEIA close-cycle` | Fechar ciclo de desenvolvimento |

### Comandos de Governança (20+)
| Comando | Descrição |
|---------|-----------|
| `IDEIA audit` | Executar todos os auditores |
| `IDEIA verify` | Verificar compliance |
| `IDEIA policy` | Avaliar política |
| `IDEIA compliance` | Verificar compliance |
| `IDEIA drift` | Detectar deriva de docs |
| `IDEIA attest` | Atestar proveniência de build |
| `IDEIA approve` | Aprovar ações pendentes |
| `IDEIA gate` | Executar quality gates |
| `IDEIA audit-trail` | Visualizar audit trail |
| `IDEIA audit-ledger` | Verificar chain de auditoria |
| `IDEIA contract` | Contract testing |
| `IDEIA scorecard` | Scorecard do projeto |
| `IDEIA autonomy` | Configurar nível de autonomia |
| `IDEIA forget` | Direito ao esquecimento (LGPD) |
| `IDEIA privacy` | DSR + consentimento |
| `IDEIA explain` | Direito à explicação |

### Comandos de Workflow (15+)
| Comando | Descrição |
|---------|-----------|
| `IDEIA workflow` | Run workflow |
| `IDEIA orchestrate` | Orquestração multi-passo |
| `IDEIA consolidate` | Consolidar branches |
| `IDEIA pr-review` | Revisão automática de PR |
| `IDEIA release` | Criar release |
| `IDEIA distribute` | Distribuir package |
| `IDEIA migration` | Executar migrações |
| `IDEIA backup` | Backup do estado |
| `IDEIA maintenance` | Tarefas de manutenção |
| `IDEIA archive` | Arquivar dados antigos |
| `IDEIA emergency` | Procedimentos de emergência |

### Comandos de Agente (10+)
| Comando | Descrição |
|---------|-----------|
| `IDEIA agents` | Gerenciar agentes |
| `IDEIA catalog` | Catálogo de serviços (6 subcomandos) |
| `IDEIA tutorial` | Sistema de tutoriais (7 subcomandos) |
| `IDEIA lifecycle` | Ciclo de vida do projeto (6 subcomandos) |

### Comandos de Sistema (10+)
| Comando | Descrição |
|---------|-----------|
| `IDEIA status` | Status do sistema |
| `IDEIA doctor` | Diagnóstico do sistema |
| `IDEIA config` | Configuração |
| `IDEIA docs` | Documentação |
| `IDEIA plugin` | Gerenciamento de plugins |
| `IDEIA adapter` | Gerenciamento de adapters |
| `IDEIA hook` | Gerenciamento de git hooks |

### Recursos da CLI
- ✅ Output em JSON (--json)
- ✅ Verbose mode (--verbose)
- ✅ Audit trail SHA-256 chain
- ✅ Approval flow 3 níveis
- ✅ Exit handler consistente
- ✅ Validação de output contra PII

## 7. Interface Theia — Widgets e Serviços

A interface é construída sobre **Eclipse Theia 1.73.1** com **Inversify DI**, **10 widgets** e **10 serviços backend**.

### Frontend — 10 Widgets + TitleBar

| Widget | Arquivo | Função |
|--------|---------|--------|
| **ChatWidget** | `chat-widget.tsx` | Chat com SSE streaming, histórico, checkpoints |
| **DashboardWidget** | `dashboard-widget.tsx` | Métricas em tempo real, cards (services, capabilities, studies, tutorials) |
| **DiffWidget** | `diff-widget.tsx` | Diff side-by-side com sintaxe highlight |
| **ApprovalWidget** | `approval-widget.tsx` | Fluxo de aprovação 3 níveis (dev → tech-lead → security) |
| **FileWidget** | `file-widget.tsx` | Árvore de arquivos com navegação |
| **StudiesWidget** | `studies-widget.tsx` | Estudos ativos/completados com governança |
| **SuggestionsWidget** | `suggestions-widget.tsx` | Sugestões IA com scanning real do codebase |
| **SearchOverlay** | `search-overlay.tsx` | Busca rápida (Ctrl+Shift+F) |
| **SecurityWidget** | `security-widget.tsx` | Dashboard de segurança (8 arquivos) |
| **AuditWidget** | `audit-widget.tsx` | Visualização do audit trail |
| **CustomTitleBar** | `titlebar.tsx` | Title bar customizada |

### Backend — 10 Serviços

| Serviço | Arquivo | Função |
|---------|---------|--------|
| **ChatBackendService** | `chat-backend-service.ts` | Chat + streaming SSE + checkpoints |
| **TaskRunner** | `task-runner.ts` | File I/O + task CRUD |
| **AgentBackendService** | `agent-backend-service.ts` | 5 agentes built-in |
| **MemoryBackendService** | `memory-backend-service.ts` | KV store persistente |
| **DashboardBackendService** | `dashboard-backend-service.ts` | Agregação de métricas |
| **ProviderRouter** | `provider-router.ts` | Roteamento LLM com fallback |
| **OutputValidator** | `output-validator.ts` | Validação de segurança (31 regras PII) |
| **DAPSetup** | `dap-setup.ts` | Debug Adapter Protocol |
| **StatusBarService** | `statusbar-service.ts` | Status bar adaptativa |
| **LifecycleService** | `lifecycle-service.ts` | Ciclo de vida IDEIA |

### LSP (Language Server Protocol)
- **8 Providers:** completion, hover, definition, references, signatureHelp, documentSymbol, codeAction, rename
- **5 Linguagens:** TypeScript, JavaScript, Python, Java, HTML

### DAP (Debug Adapter Protocol)
- WebSocket `/dap` endpoint
- DebugPanel com breakpoints, step, stack, variables, REPL
- DAPClient próprio

## 8. Camada de Mensageria (NATS JetStream)

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| **IEventBus** | `event-bus/src/types.ts` | Interface unificada |
| **EventBus** | `event-bus/src/event-bus.ts` | Implementação in-memory |
| **NatsEventBus** | `event-bus/src/nats-event-bus.ts` | NATS JetStream implementação |
| **EventBusFactory** | `event-bus/src/event-bus-factory.ts` | Factory `createBus('auto'/'memory'/'nats')` |
| **Connection Manager** | interno | Reconexão automática |
| **Stream Manager** | interno | File Storage |
| **DeadLetterQueue** | interno | Mensagens falhas |
| **ConsumerGroup Manager** | interno | Grupos de consumo |
| **KV Store** | interno | Key-Value persistente |
| **Object Store** | interno | Armazenamento de objetos |
| **Request-Reply** | interno | Padrão req/reply |
| **Health Check** | interno | Monitoramento de saúde |
| **WS Broadcast** | `event-bus/src/ws-broadcast.ts` | Broadcast WebSocket |

**Fallback automático:** Se NATS não estiver disponível, `createBus()` retorna EventBus in-memory automaticamente.

## 9. Camada de Segurança

| Componente | Descrição |
|------------|-----------|
| **PolicyEngine** | 27 patterns de segurança (Linux + Windows + PowerShell) |
| **Output Validation** | 31 regras PII (CPF, SSN, IBAN, cartão crédito, CNPJ, RG, etc.) |
| **Audit Trail SHA-256** | Cadeia de hash verificável, `verifyChain()` |
| **Approval Flow** | 3 níveis: dev → tech-lead → security |
| **Prompt Security** | 23 jailbreak patterns, OWASP LLM Top 10 |
| **Safety Circuit** | Circuit breaker, kill switch, watchdog |
| **Scope Isolation** | Path traversal protection, workspace boundary |
| **Terminal Sandbox** | Execução isolada via `vm.Script` |
| **Trusted Context** | Contexto confiável entre agentes |
| **Automated Pentest** | 7 categorias de teste, modo `--ci` |
| **SBOM Generation** | CycloneDX 1.5, 200+ componentes |
| **Secrets Scan** | 25 patterns (AWS, JWT, Stripe, Slack, GitHub, etc.) |
| **TLS 1.3** | 8 servidores HTTPS com certificados auto-assinados |
| **OWASP LLM 9/10** | Indirect injection, PII output, plugin isolation |
| **OWASP ASVS L1 71%** | 15 novos checks, CLI `security asvs` |
| **Incident Notification** | Slack + Email + PagerDuty, roteamento por severidade |

### Policies YAML (Cedar-style)
| Policy | Propósito |
|--------|-----------|
| `access-control.policy.yaml` | Controle de acesso |
| `data-security.policy.yaml` | Segurança de dados |
| `deploy.policy.yaml` | Políticas de deploy |
| `governance.policy.yaml` | Governança |
| `shell-exec.policy.yaml` | Execução de shell |

## 10. Sistema de Memória e Armazenamento

| Camada | Tecnologia | Propósito |
|--------|-----------|-----------|
| **L1 — Cache** | Cache + NATS KV | Cache de alta velocidade |
| **L2 — Working Memory** | MemoryStore | Memória de trabalho persistente |
| **L3 — Vector Store** | pgvector | Busca semântica |
| **L4 — Knowledge Graph** | MemoryGraph | Grafo de conhecimento |
| **L5 — Long-term Memory** | SyntheticMemory | Memória sintética de longo prazo |
| **L6 — Object Store** | NATS Object Store | Objetos binários grandes |

### Datastores
| Componente | Descrição |
|------------|-----------|
| **DataLayer** | Abstração PostgreSQL + SQLite + pgvector |
| **MemoryStore** | KV persistente com atomic writes, locks, backup |
| **MemoryHierarchy** | 6 níveis de memória com promoção/demotion |
| **VectorStore** | Busca vetorial com pgvector |
| **SchemaRegistry** | Registro de schemas com versionamento |
| **MetricsStore** | Métricas históricas |
| **ViolationRegistry** | Registro de violações de segurança |
| **TraceRegistry** | Registro de traces de execução |

## 11. Inteligência e IA

### LLM Providers
| Provider | Modelos |
|----------|---------|
| **Ollama** (local) | ollama/* |
| **OpenAI** | gpt-4, gpt-4o, gpt-4o-mini |
| **Anthropic** | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| **DeepSeek** | deepseek-chat, deepseek-coder |

### Componentes de IA
| Componente | Descrição |
|------------|-----------|
| **LLMProvider** | Interface unificada, ProviderRouter com fallback |
| **LangGraph** | Orquestração multiagente (StateGraph) |
| **PromptSecurity** | Injection detection, jailbreak, bias, PII |
| **PromptEconomy** | Compressor, Budget, Cache, Router, EarlyExit |
| **PatternDetector** | Detecção de padrões no codebase |
| **LearningEngine** | Aprendizado adaptativo |
| **RAGEngine** | Retrieval-Augmented Generation |
| **IntentClassifier** | Classificação de intenção |
| **LLMCache** | Cache de respostas com TTL |
| **QuantizationEngine** | Quantização de modelos |
| **DistillationEngine** | Destilação R1-style (professor → aluno) |
| **FinetuningPipeline** | Pipeline de fine-tuning |
| **LocalAI** | IA local com Ollama |

### IA Heurística

O IDEIA possui **dois pacotes** dedicados a IA heurística, usados quando modelos LLM não são necessários ou como fallback:

#### `@ideia/heuristic-engine` — Solvers Heurísticos

Registro central de algoritmos de busca e otimização:

| Algoritmo | Tipo | Complexidade | Ótimo | Uso |
|-----------|------|-------------|-------|-----|
| **A\*** | astar | O(b^d) | ✅ | Pathfinding ótimo com heurística admissível |
| **Algoritmo Genético** | genetic | O(pop×gen) | ❌ | Otimização evolutiva (seleção, crossover, mutação) |
| **Simulated Annealing** | simulated_annealing | O(k×n) | ❌ | Otimização probabilística com resfriamento |
| **Constraint Satisfaction** | constraint_satisfaction | O(n!) | ✅ | Soluções que satisfazem todas as restrições |
| **Greedy Best-First** | greedy | O(b×m) | ❌ | Busca rápida com guidance heurística |

Heurísticas de domínio: `DeveloperSpeedHeuristic` (velocidade do desenvolvedor por arquivo), `FileAccessCostHeuristic` (custo de acesso a arquivo).

Hyper-heuristic selector que aprende qual algoritmo performa melhor para cada tipo de problema.

#### `@ideia/heuristic-ai` — Engine de Decisão Heurística

Sistema de regras ponderadas para tomada de decisão sem LLM:

| Regra | Peso | Categoria |
|-------|------|-----------|
| Preferir soluções mais simples | 0.8 | design |
| Favorecer padrões estabelecidos | 0.6 | architecture |
| Minimizar dependências externas | 0.5 | architecture |
| Priorizar testabilidade | 0.7 | quality |
| Considerar segurança primeiro | 0.9 | security |

Funciona como fallback quando o LLM não está disponível: o `cognitive-coprocessor` e o `predictive-quality` usam heurísticas quando a API do LLM falha.

#### Tree of Thought com Scorers Heurísticos

O `@ideia/tree-of-thought` usa `HeuristicScorer` em 6 estratégias de busca:
- **Tree of Thought (ToT)** — busca em árvore com poda heurística
- **Monte Carlo Tree Search (MCTS)** — busca com simulações
- **Beam Search** — busca em feixe com scoring
- **Graph of Thought (GoT)** — grafo de pensamentos com raciocínio causal
- **Active Inference ToT** — inferência ativa com heurísticas
- **Neuro-Symbolic ToT** — combinação neural + simbólica

### Prompt Pipeline
```
Guard → Classify → Enrich → Optimize → Plan → Format
  │         │          │          │        │        │
  │    Classifica  Enriquece  Otimiza   Planeja  Formata
  │    intenção    contexto   tokens    passos   saída
  │
  Bloqueia
  injeção
```

## 12. Observabilidade e Métricas

| Componente | Descrição |
|------------|-----------|
| **ObservabilityEngine** | Engine central de observabilidade |
| **SloMonitor** | SLO/SLA tracking com métricas |
| **Telemetry** | Coleta estruturada de telemetria |
| **TracePropagation** | Propagação de traces entre serviços |
| **TraceRegistry** | Registro de traces |
| **MetricsStore** | Armazenamento de métricas históricas |
| **PerformanceMonitor** | Monitoramento de performance |
| **HealthCheck** | Health check agregado |
| **IncidentManager** | Gerenciamento de incidentes |
| **IncidentResponse** | Playbooks de resposta |

### 7 Dimensões de Qualidade Monitoradas
| Dimensão | Score Atual | Score Alvo |
|----------|-------------|------------|
| Código (lint, types, cobertura) | ~75/100 | 80/100 |
| Segurança (OWASP, audit, red team) | ~82/100 | 90/100 |
| Performance (TTFT, TPS, throughput) | ~40/100 | 80/100 |
| UX (NPS, SUS, time-to-task) | ~55/100 | 75/100 |
| Integração (contratos, eventos) | ~75/100 | 85/100 |
| Resiliência (circuit breaker, retry) | ~50/100 | 80/100 |
| Dados (embeddings, backup, privacidade) | ~40/100 | 75/100 |

## 13. Delivery e Deploy

### Pipeline de Entrega (Zero-to-Deploy)
```
Phase 1: REQUIREMENTS ── Agent: Analyst ── Analyze, classify, spec
    ↓
Phase 2: ARCHITECTURE ── Agent: Architect ── Design, ADR, contracts
    ↓
Phase 3: IMPLEMENT ── Agent: Programmer ── Code, unit tests, refactor
    ↓
Phase 4: VERIFY ── Agent: Tester + Reviewer ── Tests, review, scan
    ↓
Phase 5: INTEGRATE ── Agent: DevOps ── CI/CD, merge, release prep
    ↓
Phase 6: DEPLOY ── Agent: DevOps ── Deploy, monitor, rollback
```

### Componentes de Delivery
| Componente | Descrição |
|------------|-----------|
| **DeliveryOrchestrator** | Orquestrador de entrega com quality gates |
| **Canary Deploy** | Progressivo: 10% → 50% → 100% |
| **Auto-Rollback** | Com health checks automáticos |
| **GitOps Sync** | Sincronização GitOps |
| **Webhook CI/CD** | Integração com CI/CD externo |
| **Release Automation** | Automação de releases |
| **Build Installer** | Cross-platform (Win/Mac/Linux) |
| **Desktop Updater** | Auto-updater via electron-updater |

## 14. Prompt Economy

**Package:** `@ideia/prompt-economy` | **Testes:** 8 (38 testes)

| Componente | Função |
|------------|--------|
| **ContextCompressor** | Compressão inteligente de contexto (remove redundância, prioriza relevância) |
| **BudgetTracker** | Controle de budget de tokens por sessão/agente |
| **ComplexityRouter** | Roteamento por complexidade da query (simples → modelo barato, complexa → modelo caro) |
| **LLMCache** | Cache de respostas LLM com TTL e invalidação semântica |
| **EarlyExitDecider** | Decisão de saída antecipada quando confiança suficiente |

## 15. Self-Awareness

IDEIA possui consciência de si mesma através de 7 módulos:

| Módulo | Arquivo | Função |
|--------|---------|--------|
| **ServiceCatalog** | `packages/cli/src/ecosystem/service-catalog.ts` | 77 serviços mapeados, API de descoberta |
| **SelfDescription** | `packages/cli/src/ecosystem/self-description.ts` | Descrição completa da plataforma |
| **SelfAwareness** | `packages/cli/src/ecosystem/self-awareness.ts` | `describeSystem()`, `getCapabilities()`, `getArchitecture()`, `getStack()`, `getWorkflows()` |
| **LifecycleOrchestrator** | `packages/cli/src/lifecycle/project-lifecycle-orchestrator.ts` | 7 fases (idea → monitoring), checkpoints, rollback |
| **TutorialSystem** | `packages/cli/src/tutorials/tutorial-system.ts` | 6 tutoriais, progress tracking, badges |
| **LLMContextBuilder** | `packages/cli/src/context-engine/llm-context-builder.ts` | Contexto inteligente por perfil de tarefa |
| **CapabilityDiscovery** | `packages/cli/src/ecosystem/capability-discovery.ts` | Auto-descoberta dinâmica de capabilities |

### Self-Description API
| Endpoint | Descrição |
|----------|-----------|
| `GET /manifest` | Manifesto completo (JSON/YAML) |
| `GET /self` | Self-description por nível |
| `GET /self/agents` | Lista de agentes |
| `GET /self/capabilities` | Lista de capacidades |
| `GET /self/commands` | Lista de comandos |
| `GET /self/tools` | Lista de ferramentas |
| `GET /self/context?pack=<id>` | Context pack para LLM |
| `GET /health` | Health check + platform info |

### Context Packs (11)
| Pack | Tokens | Uso |
|------|--------|-----|
| `ideia-introduction` | ~300 | Primeira interação |
| `fullstack-feature` | ~800 | Feature full-stack |
| `bugfix` | ~400 | Correção de bugs |
| `refactor` | ~500 | Refatoração |
| `documentation` | ~400 | Documentação |
| `performance` | ~600 | Performance |
| `security-review` | ~700 | Segurança |
| `migration` | ~500 | Migração |
| `testing` | ~600 | Testes |
| `deployment` | ~500 | Deploy |
| `onboarding` | ~2000 | Onboarding de LLMs |

## 16. G0-G9 Cycle Orchestrator

**Package:** `@ideia/g0-g9-cycle` | **LOC:** 946 | **Testes:** 1

O G0-G9 é um ciclo completo de desenvolvimento que vai da ideação (G0) à produção (G9):

| Fase | Nome | Descrição |
|------|------|-----------|
| **G0** | Idea | Captura da ideia inicial |
| **G1** | Research | Pesquisa e estudo de viabilidade |
| **G2** | Spec | Especificação técnica (Spec-Driven Development) |
| **G3** | Plan | Planejamento detalhado |
| **G4** | Implement | Implementação |
| **G5** | Review | Revisão de código |
| **G6** | Test | Testes automatizados |
| **G7** | Stage | Homologação |
| **G8** | Deploy | Publicação |
| **G9** | Monitor | Monitoramento contínuo |

Dependências: `study-engine`, `risk-approval`, `quality-gates`, `planning-engine`, `spec-engine`, `agent-runtime`, `distillation-engine`

## 17. Ciclo Autônomo Padrão (CAP)

O CAP é o pipeline autônomo que transforma qualquer entrada em implementação validada:

```
ENTRADA (humano ou plataforma)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CICLO AUTÔNOMO PADRÃO (CAP)                    │
│                                                                   │
│  F1 ──→ F2 ──→ F3 ──→ F4 ──→ F5 ──→ F6 ──→ F7 ──→ F8 ──→ F9  │
│  │      │      │      │      │      │      │      │      │      │
│  │      │      │      │      │      │      │      │      │      │
│  Coleta  Triagem  Estudo  Aprof.  Score  Impl.  Plano  Ciclo  │
│  Info    Viabil.         Intens.  Qualif. Estudo  Real   Valid. │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
SAÍDA (código implementado, testado, documentado, revisado)
```

### Gatilhos de Transição
| Fase | Avançar se | Recuar se |
|------|-----------|-----------|
| F1 → F2 | ≥3 fontes consultadas | Fontes insuficientes |
| F2 → F3 | Score ≥ 3.5 | Score < 3.5 → ARQUIVAR |
| F3 → F4 | Estudo nível ≥ 4 | Nível < 4 |
| F4 → F5 | Nível 7+ OU extrações identificadas | Nível < 7 |
| F5 → F6 | Score ≥ 90 | Score ≥ 75 → publicar sem impl |
| F6 → F7 | Estudo de implementação aprovado | Incompleto |
| F7 → F8 | Tasks registradas e priorizadas | Sem tasks |
| F8 → F9 | Todas tasks verdes | Algum gate vermelho |
| F9 → FIM | Estabilidade total | Degradação |

## 18. Qualidade — 7 Dimensões

| Dimensão | Score | Alvo | Status |
|----------|-------|------|--------|
| **Código** (lint, types, cobertura, complexidade) | ~75 | 80 | 🟡 Próximo |
| **Segurança** (OWASP, audit, red team) | ~82 | 90 | 🟡 Melhorou |
| **Performance** (TTFT, TPS, memória, throughput) | ~40 | 80 | 🔴 Foco necessário |
| **UX** (NPS, SUS, time-to-task, acessibilidade) | ~55 | 75 | 🟡 Em progresso |
| **Integração** (contratos, eventos, schema compat) | ~75 | 85 | 🟡 Próximo |
| **Resiliência** (circuit breaker, retry, self-heal) | ~50 | 80 | 🟡 Em progresso |
| **Dados** (embeddings, backup, privacidade) | ~40 | 75 | 🔴 Foco necessário |

## 19. Quality Gates

### Gate 1 — Commit
```
lint-staged (eslint --fix + prettier --write)
tsc --noEmit (typecheck)
jest --changedSince HEAD~1
```

### Gate 2 — PR
```
lint · typecheck · coverage · boundaries · contract-check
CodeQL · snyk · injection suite · red teaming
smoke test · event bus · contract verification
```

### Gate 3 — Release
```
E2E completo · Performance full suite · Segurança full suite
Resiliência · Load test (k6) · Chaos engineering · Audit chain
SBOM · Changelog · README · Build
```

## 20. Segurança e Compliance

### Frameworks de Compliance
| Framework | Status | Cobertura |
|-----------|--------|-----------|
| **LGPD** | 7/10 artigos | Consentimento, portabilidade, eliminação, explicação |
| **GDPR** | 7/10 artigos | Mesmo que LGPD |
| **EU AI Act** | 6/6 requisitos | Classificação de risco, transparência, supervisão humana, documentação técnica, acurácia, governança |
| **OWASP ASVS L1** | 71% | 15 checks implementados |
| **OWASP LLM Top 10** | 9/10 | Indirect injection, PII output, plugin isolation |

### Regras de Segurança

| Categoria | Quantidade | Exemplos |
|-----------|-----------|----------|
| **Secret Patterns** | 25 | AWS, JWT, Stripe, Slack, GitHub, Azure, GCP, OpenAI, Datadog, SendGrid, PagerDuty, npm, Google, Facebook, Twitter, Docker, SSH, PGP, Heroku, Mailgun, Twilio, DigitalOcean, GitLab, Bitbucket, NewRelic |
| **Policy Patterns** | 27 | rm/cp/mv/chmod/chown (Linux), del/copy/move/icacls/takeown (Windows), Remove-Item/Copy-Item/Move-Item/Set-Acl (PowerShell) |
| **PII Validation** | 31 | CPF, CNPJ, SSN, EIN, ITIN, NIF, NIS, IBAN, cartão crédito, email, telefone, CEP, IP, RG, CNS, CNH, PIS, Carteira de Trabalho, Título de Eleitor, Passaporte, RENAVAM, PLACA, IPv4/v6, MAC Address, coordenadas GPS |
| **Approval Levels** | 3 | dev → tech-lead → security |

### Proteções Implementadas
- ✅ **Secrets Management:** ConfigManager (55+ env vars, typed)
- ✅ **SQL Injection:** `validateIdentifier()` em queries
- ✅ **XSS/CSRF:** helmet + CSP nos servidores
- ✅ **Path Traversal:** `assertWithinWorkspace()` em operações de arquivo
- ✅ **TLS 1.3:** 8 servidores HTTPS
- ✅ **Audit Trail:** SHA-256 chain em todos os comandos CLI
- ✅ **Container Runtime Security:** gVisor/runsc para execução isolada

## 21. Adapters Multi-linguagem (13)

IDEIA possui **13 adapters de linguagem** que permitem gerar, analisar e refatorar código em múltiplas linguagens:

| Linguagem | Framework | Status | Geração | Análise | Refactor |
|-----------|-----------|--------|---------|---------|----------|
| TypeScript | — | ✅ Stable | ✅ | ✅ | ✅ |
| Python | FastAPI | ✅ Stable | ✅ | ✅ | ✅ |
| Rust | — | ✅ Stable | ✅ | ✅ | ❌ |
| Go | Gin/Fiber | ✅ Stable | ✅ | ✅ | ✅ |
| Java | Spring Boot | 🟡 Beta | ✅ | ✅ | ❌ |
| Kotlin | Ktor | 🟡 Beta | ✅ | ✅ | ❌ |
| NestJS | NestJS | ✅ Stable | ✅ | ✅ | ✅ |
| Elixir | Phoenix | 🟡 Beta | ✅ | ✅ | ❌ |
| Haskell | Yesod | 🔴 Alpha | ✅ | ✅ | ❌ |
| Dart | — | 🟡 Beta | ✅ | ✅ | ❌ |
| PHP | Laravel | 🟡 Beta | ✅ | ✅ | ❌ |
| Ruby | Rails | 🟡 Beta | ✅ | ✅ | ❌ |
| Scala | Play | 🟡 Beta | ✅ | ✅ | ❌ |
| Swift | Vapor | 🟡 Beta | ✅ | ✅ | ❌ |
| Zig | Zig HTTP | 🟡 Beta | ✅ | ✅ | ❌ |
| C# | .NET | 🟡 Beta | ✅ | ✅ | ❌ |

## 22. Especificação Técnica de Packages

### Package `@ideia/cli` (~172K LOC)
**Dependências:** agent-runtime, audit-trail, contracts, logger, delivery-orchestrator, event-bus, feedback-pipeline, memory-store, observability-engine, policy-engine, profiles, config-engine, control-tower, safety-circuit, scope-isolation, bhp, continuity-engine, autonomous-evolution-engine, technology-radar, auto-adr, notification-system, onboarding-wizard, self-optimization-panel, metrics-store, slo-monitor, trace-registry, workflow-engine, adapter-base, chalk, commander, node-pty, ws, yaml, ora

### Package `@ideia/plugin` (~13K LOC)
**Dependências Theia:** @theia/ai-chat, @theia/ai-core, @theia/ai-editor, @theia/ai-mcp, @theia/ai-ollama, @theia/ai-openai, @theia/ai-terminal, @theia/core, @theia/editor, @theia/filesystem, @theia/messages, @theia/monaco, @theia/navigator, @theia/preferences, @theia/workspace
**Dependências IDEIA:** agent-runtime, core, delivery-orchestrator, event-bus, llm-provider, memory-store, policy-engine, verification-layer
**Tech Stack:** inversify, react, react-dom, react-window, uuid

### Package `@ideia/agent-runtime` (~4.8K LOC)
**Dependências:** policy-engine, audit-trail, memory-store, contracts, logger, llm-provider, @langchain/langgraph, @langchain/core
**Componentes:** LangGraphAgent, StepExecutor, 8 nodes (analyst, architect, programmer, reviewer, tester, devops, supervisor, router), HandoffFileManager, MakerVerifierLoop, ProviderRouter

### Package `@ideia/event-bus` (~4.6K LOC)
**Dependências:** audit-trail, contracts, logger, ws, nats
**Componentes:** IEventBus, EventBus, NatsEventBus, EventBusFactory, WSBroadcast

## 23. Scripts de Automação

### Scripts de Auditoria (16)
| Script | Função |
|--------|--------|
| `scripts/audit/run-audit.ts` | 12 steps: env, imports, duplicates, contracts, flows, tests, hardening, regression, report |
| `scripts/audit/check-all-tsc.js` | Verificação de compilação |
| `scripts/audit/check-contracts.ts` | Verificação de contratos |
| `scripts/audit/check-duplicates.ts` | Duplicatas |
| `scripts/audit/check-env.ts` | Environment |
| `scripts/audit/check-flows.ts` | 8 fluxos |
| `scripts/audit/check-imports.ts` | Imports |
| `scripts/audit/check-tests.ts` | Testes |
| `scripts/audit/coverage-tracker.ts` | Cobertura |
| `scripts/audit/write-report.ts` | Relatórios |
| `scripts/audit/revisao-final.js` | Revisão final |
| `scripts/audit/revisao-final-v2.js` | Revisão final v2 |
| `scripts/audit/consolidate.ts` | Consolidação |
| `scripts/audit-daemon.mjs` | Daemon contínuo SHA-256 |

### Scripts de Segurança (5)
| Script | Função |
|--------|--------|
| `scripts/red-teaming.js` | Red teaming automatizado |
| `scripts/security-pentest.ts` | Pentest automatizado (7 categorias, modo `--ci`) |
| `scripts/threat-intel.ts` | Inteligência de ameaças |
| `scripts/check-secrets.ts` | Verificação de secrets |
| `scripts/generate-dev-cert.mjs` | Certificados TLS auto-assinados |

### Scripts de Build & Deploy (8)
| Script | Função |
|--------|--------|
| `scripts/build-all-platforms.js` | Build multi-plataforma |
| `scripts/build-installer.js` | Instalador cross-platform |
| `scripts/bundle-analyzer.js` | Análise de bundle |
| `scripts/canary-publish.js` | Canary publish |
| `scripts/deploy-cdn.js` | Deploy CDN |
| `scripts/generate-sbom.ts` | SBOM CycloneDX 1.5 |
| `scripts/generate-all-workflows.ts` | Workflows CI/CD |

### Scripts de Documentação & Qualidade (8)
| Script | Função |
|--------|--------|
| `scripts/docs-sync.ts` | Sincronização docs ↔ código |
| `scripts/quality-check.mjs` | Quality check (99+ checks) |
| `scripts/compliance-report.ts` | Relatório de compliance |
| `scripts/check-circular-deps.ts` | Dependências circulares |
| `scripts/check-dead-code.ts` | Código morto |
| `scripts/check-package-consistency.ts` | Consistência de packages |
| `scripts/check-unused-deps.ts` | Dependências não usadas |
| `scripts/auto-fix-tests.mjs` | Auto-correção de testes |

## 24. Documentação e Estudos

### Documentos de Governança (86+)
Os documentos estão organizados em `docs/governance/`:

| Documento | Descrição |
|-----------|-----------|
| `REALITY-MANIFEST.md` | Documento mestre da verdade (292 packages) |
| `GAPS-PRODUCAO-IDE.md` | 140 gaps resolvidos, 7 abertos |
| `document-registry.md` | Registro central de documentos |
| `HANDOFF-NEXT-SESSION.md` | Continuidade entre sessões |
| `RELATORIO-COMPLETO-ESTADO-ATUAL-IDEIA.md` | Relatório 360° |
| `MATRIZ-COMPLIANCE-SEGURANCA.md` | Matriz de compliance |
| `SISTEMA-AUTONOMIA-CONFIGURAVEL.md` | Sistema de autonomia (1122 linhas) |
| `release-criteria.md` | Critérios de release |
| `SECRETS-MANAGEMENT.md` | Gerenciamento de secrets |

### Estudos Publicados (287+)
Os estudos estão em `docs/ESTUDOS/` e cobrem:

| Categoria | Quantidade | Exemplos |
|-----------|-----------|----------|
| **Estratégicos (E)** | 5 | Visão de Produto, Planos de Implementação, Qualidade Total, UX, Desktop |
| **Modulares (S)** | 81+ | Event Bus, Memória, Intenção→Plano, Segurança, Multiagente, Pipeline, Theia, Testes, Performance |
| **Desktop (D)** | 23 | Electron, Tauri, NW.js, Neutralino, Instaladores, Code Signing, GPU |
| **Implementação** | 15+ | NATS, LangGraph, PostgreSQL, Cedar, CI/CD, Testes CLI |
| **Intensificação** | 10+ | Concorrência, Blueprints, Benchmarks, Deep Dives |
| **Livros IA Eficiente** | 10 | S72-S81: Quantização, PEFT, Destilação, MoE, Token Economy, SDD, Pipeline |
| **Outros** | 140+ | Anomalias, Bias, CQRS, Event Sourcing, Embeddings, GANs, Heurísticas |

### ADRs (Architecture Decision Records) — 72
Documentados em `docs/adr/` e cobrindo decisões como:
- ADR-001: Theia Platform como base
- ADR-002: NATS JetStream para mensageria
- ADR-003: LangGraph para orquestração
- ADR-017 a ADR-072: IEventBus unificado, LLMProvider opcional, ESLint pragmático, Spec Engine, Distillation Engine, etc.

## 25. Diferencias Competitivos

| Diferencial | IDEIA | Claude Code | Copilot | Windsurf | Cursor |
|-------------|-------|-------------|---------|----------|--------|
| **Policy Engine (27 patterns)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Output Validation (31 PII)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Audit Trail SHA-256** | ✅ | ❌ | ⚠️ | ❌ | ❌ |
| **Approval 3 níveis** | ✅ | ❌ | ❌ | ⚠️ 1 nível | ❌ |
| **CLI-first (160+ comandos)** | ✅ | ⚠️ Terminal | ❌ | ❌ | ❌ |
| **13 Adapters linguagens** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Path Traversal Protection** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Atomic Writes** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Self-Awareness** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Prompt Economy** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Theia Plugin Nativo** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **NATS JetStream** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **LangGraph Multiagente** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ciclo Autônomo Padrão (CAP)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Estudos Técnicos (287+)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **G0-G9 Cycle** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Compliance LGPD/GDPR/EU AI Act** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **OWASP ASVS L1 71%** | ✅ | ❌ | ❌ | ❌ | ❌ |

## 26. Roadmap e Pendências

### Métricas Atuais (2026-07-27)
| Métrica | Valor |
|---------|-------|
| `tsc --noEmit` | 0 erros |
| Packages com código | 292 |
| Arquivos fonte .ts | 947 |
| Arquivos .test.ts | 1.556 |
| LOC produção | ~99.200 |
| LOC testes | ~185.400 |
| LOC total | ~284.600 |
| Testes totais | 4.391 (4.347 passando, 10 falhas, 28 skipped, 6 todo) |
| Gaps resolvidos | 140 |
| Gaps abertos | 7 (GS141-GS147) |
| Comandos CLI | ~160 |
| ESLint errors | 0 |
| TODOs em produção | 27 (17 arquivos) |
| FIXMEs em produção | 10 (6 arquivos) |
| HACKs em produção | 8 (8 arquivos) |
| `console.log` em produção | 171 (44 arquivos) |
| Arquivos >500 linhas | 26 |
| Packages sem testes | 1 (adapter-typescript) |
| ADRs documentados | 72 |

### Pendências Prioritárias
| # | Tarefa | Esforço | Prioridade |
|---|--------|---------|:----------:|
| 1 | Resolver 27 TODOs reais em produção | ~4h | 🔴 Crítica |
| 2 | Resolver 10 FIXMEs + 8 HACKs | ~3h | 🔴 Crítica |
| 3 | Substituir 171 console.log por logger | ~8h | 🔴 Crítica |
| 4 | Refatorar 26 arquivos >500 linhas | ~16h | 🔴 Crítica |
| 5 | Adapters reais — 13 linguagens sem geração real | ~30h | 🟠 Alta |
| 6 | Testes `@ideia/cli` (86.5K LOC descoberto) | ~20h | 🟠 Alta |
| 7 | Atualizar dependências (TS 5.9→7.x, Jest 29→30) | ~8h | 🟠 Alta |
| 8 | Cockpit dashboard (último critério v2.1) | ~6h | 🟡 Média |
| 9 | OWASP ASVS 71%→90% (15 checks) | ~16h | 🟡 Média |
| 10 | LGPD/GDPR 7/10→10/10 | ~8h | 🟡 Média |

### Roadmap
| Horizonte | Foco |
|-----------|------|
| **Curto Prazo** | Code smells, adapters reais, dependências |
| **Médio Prazo** | Cockpit dashboard, OWASP ASVS 90%, CI/CD automation |
| **Longo Prazo** | Cobertura 80%+, NATS JetStream produção, LangGraph avançado, Theia Cloud |

## 27. Comandos Rápidos

```bash
# Compilar / Typecheck
npx tsc --noEmit           # 0 erros
npx tsc -b                 # Build completo

# Testes
npm run test:unit          # Unitários com cobertura
npm run test:integration   # Integração
npm run test:mutation      # Mutation testing (Stryker)

# Lint & Formatação
npm run lint               # ESLint
npm run lint:fix           # ESLint auto-fix
npm run format             # Prettier
npm run format:check       # Verificar formatação

# Qualidade
npm run quality:check      # 99+ checks
npm run quality:check:ci   # Modo CI (exit 1 se falhar)
npm run verify             # quality + typecheck + lint + test

# Documentação
npx tsx scripts/docs-sync.ts         # Audit docs
npx tsx scripts/docs-sync.ts --fix   # Auto-corrigir
npx tsx scripts/docs-sync.ts --ci    # CI mode

# Auditoria
npx tsx scripts/audit/run-audit.ts   # Pipeline completo

# Segurança
npx tsx scripts/security-pentest.ts  # Pentest automatizado
npx tsx scripts/red-teaming.js       # Red teaming
npx tsx scripts/generate-sbom.ts     # SBOM CycloneDX

# Docker
npm run docker:up          # Subir serviços (NATS + PostgreSQL)
npm run docker:down        # Parar serviços
npm run docker:reset       # Reset completo

# Desktop
npm run start:electron     # Iniciar Electron
npm run build:installer    # Build instalador

# Theia
npm run build:plugin       # Compilar plugin Theia
npm run build:app          # Build Theia app
npm run dev                # Iniciar Theia backend

# CLI (após build)
npx ideia status           # Status do sistema
npx ideia doctor           # Diagnóstico
npx ideia audit            # Auditoria completa
npx ideia gate             # Quality gates
```

---

> **Dossiê gerado em:** 2026-07-27
> **Baseado em:** Análise completa de ~50 documentos de governança, 292 packages, 1.556 arquivos de teste, 287+ estudos técnicos
> **Fonte da verdade:** `REALITY-MANIFEST.md`, `AGENTS.md`, `.ai/ideia-manifest.md`, `.ai/rules/UNIVERSAL.md`
