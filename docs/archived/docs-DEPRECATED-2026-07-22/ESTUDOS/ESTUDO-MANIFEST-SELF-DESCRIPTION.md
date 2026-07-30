# ESTUDO S26 -- IDEIA Manifest & Self-Description System

> **Data:** 2026-07-22
> **Versao:** 1.0
> **Contexto:** IDEIA -- plataforma de desenvolvimento assistido por IA que transforma ideias em sistemas completos, composta por 6 agentes especializados (Analyst, Architect, Programmer, Reviewer, Tester, DevOps), barramento de eventos NATS, integracao com LLMs multiplos, e arquitetura de 15 camadas.
> **Objetivo:** Definir e especificar o sistema de Manifesto e Auto-Descricao (Self-Description System) da IDEIA, permitindo que a plataforma se apresente de forma estruturada, completa e veridica para LLMs externos, IAs colaboradoras e ferramentas de terceiros.
> **Gap identificado:** Nao existe um manifesto/sistema de auto-descricao para apresentar a IDEIA a LLMs externos, forcando cada interacao a reconstruir contexto manualmente.

---

## Sumario

1. [Introducao e Contexto](#1-introducao-e-contexto)
2. [Arquitetura do Manifest System](#2-arquitetura-do-manifest-system)
3. [Formato do Manifest](#3-formato-do-manifest)
4. [Self-Description Protocol](#4-self-description-protocol)
5. [Manifest Generator](#5-manifest-generator)
6. [Context Enricher](#6-context-enricher)
7. [Integracao com o Reality Enforcement System](#7-integracao-com-o-reality-enforcement-system)
8. [Exemplos Completos](#8-exemplos-completos)
9. [Conexoes com Outros Estudos](#9-conexoes-com-outros-estudos)
10. [Plano de Implementacao](#10-plano-de-implementacao)

---

## 1. Introducao e Contexto

### 1.1 O Problema da Auto-Consciencia em Plataformas de IA

A IDEIA e um sistema complexo composto por 66+ packages, 6 agentes especializados, 130+ comandos CLI, 15+ endpoints de API, 13 adaptadores poliglotas e uma arquitetura de 15 camadas. Quando um LLM externo (Claude, GPT, DeepSeek, etc.) interage com a IDEIA, ele precisa compreender:

- Qual e a arquitetura do sistema
- Quais agentes estao disponiveis e suas capacidades
- Quais ferramentas e comandos podem ser usados
- Quais sao as restricoes e politicas de seguranca
- Qual e o estado atual do projeto e do workspace
- Quais decisoes arquiteturais foram tomadas e por que

Sem um sistema de auto-descricao estruturado, cada interacao com um LLM requer:

1. Reconstrucao manual do contexto via prompts verbosos
2. Risco de informacao desatualizada ou inconsistente
3. Impossibilidade de descoberta automatica por ferramentas externas
4. Dificuldade de validacao da veracidade das informacoes fornecidas

### 1.2 Por que um Manifest System e Critico

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CUSTO DA AUSENCIA DE MANIFEST                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  S/Cenario                    Token Overhead    Risco de Erro            │
│  ─────────────────────────────────────────────────────────────────────   │
│  Primeira interacao com LLM   2000-4000 tokens   50% (falta contexto)    │
│  Setup de ambiente novo       3000-5000 tokens   70% (config errada)    │
│  Integracao com ferramenta    1500-3000 tokens   60% (incompabilidade)  │
│  Auditoria de conformidade    5000+ tokens       40% (omissao)          │
│  Colaboracao multi-agente     4000+ tokens       80% (desalinhamento)   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

O Manifest System elimina estes custos ao prover:

| Beneficio | Descricao | Impacto |
|-----------|-----------|---------|
| **Auto-consciencia** | A IDEIA conhece sua propria arquitetura, capacidades e limitacoes | Reduz 90% do overhead de contexto |
| **Descoberta por LLMs** | LLMs externos podem descobrir capacidades automaticamente | Elimina documentacao manual |
| **Contexto completo** | Garante que toda interacao tem o contexto necessario | Zero reconstrucao de contexto |
| **Veracidade validada** | O manifesto e verificado contra o codigo real pelo Reality Enforcement System | Zero alucinacao arquitetural |
| **Interoperabilidade** | Ferramentas externas podem se integrar sem documentacao extensa | Integracao em minutos |
| **Versionamento** | Mudancas na plataforma sao refletidas automaticamente no manifesto | Auto-sincronizacao |

### 1.3 Principios de Design

```
PRINCIPIOS DO MANIFEST SYSTEM
─────────────────────────────
1. VERACIDADE: O manifesto DEVE refletir a realidade do codigo.
   Nada que nao existe pode constar. Tudo que existe deve constar.

2. COMPLETUDE: O manifesto DEVE cobrir todos os aspectos da plataforma.
   Arquitetura, agentes, ferramentas, comandos, endpoints, eventos.

3. ECONOMIA: O manifesto DEVE ser otimizado para consumo por LLMs.
   Niveis de detalhe, formatos compativeis, baixo custo de tokens.

4. AUTO-GERACAO: O manifesto DEVE ser gerado automaticamente a partir do codigo.
   Zero manutencao manual. Scan do codigo fonte.

5. VALIDACAO: O manifesto DEVE ser validado contra a realidade.
   Reality check obrigatorio. Drift detection continuo.

6. EXTENSIBILIDADE: O manifesto DEVE ser extensivel por plugins e adaptadores.
   Novos packages, comandos e capacidades aparecem automaticamente.
```

---

## 2. Arquitetura do Manifest System

### 2.1 Visao Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MANIFEST SYSTEM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │  Manifest        │    │  Manifest        │    │  Manifest        │      │
│  │  Generator       │───→│  Validator       │───→│  Resolver        │      │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘      │
│           │                       │                       │                 │
│           │  Source of Truth      │  Schema Check         │  Query/Resolve  │
│           ▼                       ▼                       ▼                 │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │  Code Scanner    │    │  JSON Schema     │    │  Manifest Cache  │      │
│  │  (packages,      │    │  Validator       │    │  (LRU, TTL 5min) │      │
│  │   interfaces,    │    │  (Zod)           │    └────────┬─────────┘      │
│  │   endpoints)     │    └──────────────────┘             │                 │
│  └────────┬─────────┘                                      │                 │
│           │                                                │                 │
│           ▼                                                ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                    MANIFEST STORE (JSON/YAML)                      │     │
│  │  arquivo: .ideia/manifest/manifest.yaml                           │     │
│  │  schema: .ideia/manifest/schema.json                              │     │
│  └──────────────────────────────────────────────────────────────────┘      │
│           │                                                                │
│           ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  Self-Description API                                            │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │      │
│  │  │ GET /manifest│  │ GET /self   │  │ GET /self/  │              │      │
│  │  │ (full)       │  │ ?level=full │  │ agents      │              │      │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│           │                                                                │
│           ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  Context Enricher                                                │      │
│  │  Injeta manifesto no prompt do LLM automaticamente               │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │      │
│  │  │ Level       │  │ Level       │  │ Level       │              │      │
│  │  │ Summary     │  │ Full        │  │ Detailed    │              │      │
│  │  │ (~500 tok)  │  │ (~4k tok)   │  │ (~8k tok)   │              │      │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes do Manifest System

| Componente | Responsabilidade | Interface | Localizacao |
|------------|-----------------|-----------|-------------|
| **Manifest Generator** | Scaneia o codigo fonte e gera o manifesto YAML/JSON automaticamente | `generate(): Promise<Manifest>` | `packages/manifest/src/generator.ts` |
| **Manifest Validator** | Valida o manifesto contra o schema Zod, verifica consistencia | `validate(manifest): ValidationResult` | `packages/manifest/src/validator.ts` |
| **Manifest Resolver** | Resolve queries contra o manifesto (filtros, niveis, secoes) | `resolve(query): ManifestFragment` | `packages/manifest/src/resolver.ts` |
| **Self-Description API** | Expoe endpoints HTTP para acesso ao manifesto e auto-descricao | REST endpoints | `packages/manifest/src/api.ts` |
| **Context Enricher** | Injeta secoes do manifesto no contexto de prompts para LLMs | `enrich(level, target): string` | `packages/llm-provider/src/enricher.ts` |
| **Manifest Store** | Armazena o manifesto gerado em disco e cache | `read() / write() / invalidate()` | `packages/manifest/src/store.ts` |
| **Code Scanner** | Scaneia o workspace em busca de packages, interfaces, endpoints, comandos | `scan(): ScanResult` | `packages/manifest/src/scanner.ts` |

### 2.3 Fluxo de Operacao

```
Fluxo de Geracao do Manifesto:

    [Git Hook / Schedule / Manual]
              │
              ▼
    ┌─────────────────────┐
    │  Manifest Generator  │
    │  (auto-geracao)      │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Code Scanner        │
    │  ├── Scan packages   │──── packages/*/package.json, tsconfig.json
    │  ├── Scan interfaces │──── exports, types, interfaces publicas
    │  ├── Scan endpoints  │──── rotas Express/Fastify, WebSocket handlers
    │  ├── Scan comandos   │──── comandos CLI registrados
    │  ├── Scan agentes    │──── agent-runtime, agent definitions
    │  ├── Scan eventos    │──── event bus subscriptions/publications
    │  ├── Scan tools      │──── MCP tools, ferramentas registradas
    │  └── Scan adapters   │──── adapter registrations
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Manifest Builder    │
    │  (monta estrutura)   │──── id, version, name, description, architecture
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Manifest Validator   │
    │  ├── Schema check     │──── Zod schema validation
    │  ├── Consistency      │──── cross-field consistency
    │  └── Reality check    │──── compare com reality-manifest
    └──────────┬──────────┘
               │
        ┌──────▼──────┐
        │   Falhou?    │──Sim──→ Log error + notify
        └──────┬──────┘
               │ Nao
        ┌──────▼──────┐
        │  Manifest    │
        │  Store       │──── .ideia/manifest/manifest.yaml
        └─────────────┘
```

### 2.4 Diagrama de Dependencias entre Componentes

```
MANIFEST GENERATOR ──┬── CODE SCANNER
                     │      ├── glob packages/*/package.json
                     │      ├── grep exports from index.ts
                     │      ├── parse CLI command tree
                     │      ├── parse event subscriptions
                     │      ├── parse adapter configs
                     │      └── parse agent definitions
                     │
                     └── MANIFEST VALIDATOR
                              └── REALITY CHECK ── REALITY-MANIFEST.md
                                             └── GAPS-PRODUCAO-IDE.md

CONTEXT ENRICHER ──┬── MANIFEST RESOLVER
                   │        └── MANIFEST STORE
                   │
                   └── PROMPT ENGINE (S19)
                            └── LLM PROVIDER

SELF-DESCRIPTION API ──┬── MANIFEST RESOLVER
                       │
                       └── HTTP SERVER ── IDE SERVER
```

### 2.5 Interface Types (TypeScript)

```typescript
// packages/manifest/src/types.ts

export interface ManifestSystem {
  generator: ManifestGenerator;
  validator: ManifestValidator;
  resolver: ManifestResolver;
  store: ManifestStore;
  api: SelfDescriptionAPI;
  enricher: ContextEnricher;
}

export interface ManifestGenerator {
  generate(options?: GenerateOptions): Promise<Manifest>;
  generateFromScan(scan: ScanResult): Promise<Manifest>;
}

export interface ManifestValidator {
  validate(manifest: unknown): ValidationResult;
  validateAgainstReality(manifest: Manifest): RealityValidationResult;
}

export interface ManifestResolver {
  resolve<T>(query: ResolveQuery): Promise<T>;
  resolveSection(section: string, level?: DescriptionLevel): Promise<object>;
  resolveAgent(name: string): Promise<AgentManifest | null>;
  resolveCommand(path: string): Promise<CommandManifest | null>;
}

export interface ManifestStore {
  read(): Promise<Manifest | null>;
  write(manifest: Manifest): Promise<void>;
  invalidate(): Promise<void>;
  getPath(): string;
}

export interface SelfDescriptionAPI {
  getFull(): Promise<Manifest>;
  getLevel(level: DescriptionLevel): Promise<object>;
  getAgents(): Promise<AgentManifest[]>;
  getCapabilities(): Promise<CapabilityManifest[]>;
  getCommands(): Promise<CommandManifest[]>;
  getContextPack(level: DescriptionLevel): Promise<string>;
}

export interface ContextEnricher {
  enrich(level: DescriptionLevel, target: EnrichTarget): Promise<string>;
  enrichSystemPrompt(prompt: string, level: DescriptionLevel): Promise<string>;
}

export type DescriptionLevel = 'summary' | 'full' | 'detailed';
```

---

## 3. Formato do Manifest

### 3.1 JSON Schema do Manifesto

O manifesto usa JSON Schema (Draft 2020-12) com extensoes para auto-descricao. O schema e armazenado em `.ideia/manifest/schema.json` e versionado junto com o codigo.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ideia.dev/manifest/v1/schema.json",
  "title": "IDEIA Manifest",
  "description": "Schema for IDEIA platform self-description manifest",
  "type": "object",
  "required": [
    "id", "version", "name", "description",
    "architecture", "agents", "capabilities",
    "tools", "commands", "contextPacks",
    "registries", "adapters", "workflows", "limitations"
  ],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Unique manifest identifier"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version of the manifest"
    },
    "platformVersion": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "IDEIA platform version this manifest describes"
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of generation"
    },
    "generatorVersion": {
      "type": "string",
      "description": "Version of the generator that produced this manifest"
    },
    "name": {
      "type": "string",
      "description": "Human-readable platform name"
    },
    "description": {
      "type": "string",
      "maxLength": 2000,
      "description": "Short platform description"
    },
    "architecture": {
      "type": "object",
      "required": ["layers", "pattern", "messageBus"],
      "properties": {
        "layers": {
          "type": "array",
          "items": { "$ref": "#/$defs/Layer" }
        },
        "pattern": { "type": "string" },
        "messageBus": { "$ref": "#/$defs/MessageBus" },
        "extensibility": { "$ref": "#/$defs/Extensibility" }
      }
    },
    "agents": {
      "type": "array",
      "items": { "$ref": "#/$defs/Agent" }
    },
    "capabilities": {
      "type": "array",
      "items": { "$ref": "#/$defs/Capability" }
    },
    "tools": {
      "type": "array",
      "items": { "$ref": "#/$defs/Tool" }
    },
    "commands": {
      "type": "array",
      "items": { "$ref": "#/$defs/Command" }
    },
    "contextPacks": {
      "type": "array",
      "items": { "$ref": "#/$defs/ContextPack" }
    },
    "registries": {
      "type": "object",
      "properties": {
        "schemas": { "type": "array", "items": { "$ref": "#/$defs/Registry" } },
        "events": { "type": "array", "items": { "$ref": "#/$defs/EventRegistry" } },
        "contracts": { "type": "array", "items": { "$ref": "#/$defs/ContractRegistry" } }
      }
    },
    "adapters": {
      "type": "array",
      "items": { "$ref": "#/$defs/Adapter" }
    },
    "workflows": {
      "type": "array",
      "items": { "$ref": "#/$defs/Workflow" }
    },
    "limitations": {
      "type": "object",
      "properties": {
        "notImplemented": { "type": "array", "items": { "type": "string" } },
        "experimental": { "type": "array", "items": { "type": "string" } },
        "deprecated": { "type": "array", "items": { "type": "string" } },
        "maxContextWindow": { "type": "integer" },
        "maxTokens": { "type": "integer" },
        "supportedModels": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "$defs": {
    "Layer": {
      "type": "object",
      "required": ["id", "name", "description", "packages"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "description": { "type": "string" },
        "packages": { "type": "array", "items": { "type": "string" } }
      }
    },
    "Agent": {
      "type": "object",
      "required": ["id", "name", "role", "capabilities", "autonomyLevel"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "role": { "type": "string" },
        "description": { "type": "string" },
        "capabilities": { "type": "array", "items": { "type": "string" } },
        "autonomyLevel": { "type": "string", "enum": ["N0", "N1", "N2", "N3", "N4"] },
        "tools": { "type": "array", "items": { "type": "string" } }
      }
    },
    "Capability": {
      "type": "object",
      "required": ["id", "name", "description"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "description": { "type": "string" },
        "category": { "type": "string" },
        "riskLevel": { "type": "string", "enum": ["low", "medium", "high", "critical"] }
      }
    },
    "Tool": {
      "type": "object",
      "required": ["id", "name", "description", "parameters"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "description": { "type": "string" },
        "parameters": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "properties": {
              "type": { "type": "string" },
              "description": { "type": "string" },
              "required": { "type": "boolean" }
            }
          }
        },
        "dangerous": { "type": "boolean" }
      }
    },
    "Command": {
      "type": "object",
      "required": ["path", "description", "category"],
      "properties": {
        "path": { "type": "string" },
        "description": { "type": "string" },
        "category": { "type": "string" },
        "aliases": { "type": "array", "items": { "type": "string" } },
        "examples": { "type": "array", "items": { "type": "string" } }
      }
    },
    "ContextPack": {
      "type": "object",
      "required": ["level", "tokenBudget", "sections"],
      "properties": {
        "level": { "type": "string", "enum": ["summary", "full", "detailed"] },
        "tokenBudget": { "type": "integer" },
        "sections": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "maxTokens": { "type": "integer" },
              "content": { "type": "string" }
            }
          }
        }
      }
    },
    "Registry": {
      "type": "object",
      "required": ["name", "version", "url"],
      "properties": {
        "name": { "type": "string" },
        "version": { "type": "string" },
        "url": { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "Adapter": {
      "type": "object",
      "required": ["id", "language", "status"],
      "properties": {
        "id": { "type": "string" },
        "language": { "type": "string" },
        "status": { "type": "string", "enum": ["stable", "beta", "alpha"] },
        "capabilities": { "type": "array", "items": { "type": "string" } }
      }
    },
    "Workflow": {
      "type": "object",
      "required": ["id", "name", "steps"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "description": { "type": "string" },
        "steps": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "agent", "action"],
            "properties": {
              "id": { "type": "string" },
              "agent": { "type": "string" },
              "action": { "type": "string" },
              "timeout": { "type": "integer" }
            }
          }
        }
      }
    },
    "MessageBus": {
      "type": "object",
      "properties": {
        "type": { "type": "string" },
        "implementation": { "type": "string" },
        "patterns": { "type": "array", "items": { "type": "string" } }
      }
    },
    "Extensibility": {
      "type": "object",
      "properties": {
        "pluginSystem": { "type": "boolean" },
        "mcpSupport": { "type": "boolean" },
        "adapterArchitecture": { "type": "boolean" }
      }
    }
  }
}
```

### 3.2 Formato YAML do Manifesto

O manifesto e armazenado em YAML para legibilidade humana e consumo por ferramentas CLI. O arquivo principal e `.ideia/manifest/manifest.yaml`.

```yaml
# ============================================================================
# IDEIA Manifest -- Auto-Description System
# Generator: @ideia/manifest v1.0.0
# Generated: 2026-07-22T10:30:00Z
# Schema: .ideia/manifest/schema.json
# ============================================================================

id: ideia-platform
version: 1.0.0
platformVersion: 0.5.0
generatedAt: '2026-07-22T10:30:00Z'
generatorVersion: 1.0.0

name: IDEIA
description: >
  IDEIA e uma plataforma de desenvolvimento assistido por IA que transforma
  ideias em sistemas completos. Usa arquitetura de agentes especializados,
  barramento de eventos NATS e integracao com multiplos LLMs.

architecture:
  pattern: Clean Architecture + DDD + Event-Driven
  layers:
    - id: shell
      name: Shell
      description: Desktop/Web/Theia Cloud
      packages:
        - packages/electron-app
        - packages/tauri-app
        - packages/theia-cloud
    - id: platform
      name: Theia Platform
      description: Theia, Monaco, Theia AI, OpenVSX, Inversify DI
      packages:
        - packages/theia-platform
        - packages/monaco-integration
        - packages/theia-ai
    - id: agents
      name: Agent Layer
      description: 6 agentes especializados
      packages:
        - packages/agent-runtime
        - packages/workflow-engine
        - packages/autonomous-editor
    - id: intelligence
      name: Intelligence Layer
      description: Pattern Detector, Learning Engine, Intent Classifier, ADAPT, RAG Engine, DSPy
      packages:
        - packages/intelligence
        - packages/pattern-detector
        - packages/learning-engine
        - packages/rag-engine
    - id: memory
      name: Memory Layer
      description: Mem0, SQLite+FTS5, DuckDB, Knowledge Graph, Redis
      packages:
        - packages/memory-store
        - packages/knowledge-graph
        - packages/vector-store
    - id: execution
      name: Execution Layer
      description: Agent Runtime, Autonomous Editor, Workflow Engine, Delivery Orchestrator, Verification Layer
      packages:
        - packages/execution-layer
        - packages/delivery-orchestrator
        - packages/verification-layer
    - id: messaging
      name: Messaging Layer
      description: NATS JetStream -- Pub/Sub, Req/Rep, KV, DLQ
      packages:
        - packages/event-bus
        - packages/nats-integration
    - id: security
      name: Security Layer
      description: Cedar Policy, LLM Guard, Output Validation, Audit Trail
      packages:
        - packages/policy-engine
        - packages/policy-gateway
        - packages/prompt-security
        - packages/audit-trail
        - packages/output-validator
    - id: infrastructure
      name: Infrastructure Layer
      description: Execution Layer, Resilience Engine, Trace, Observation
      packages:
        - packages/resilience-engine
        - packages/observability-engine
    - id: data
      name: Data Layer
      description: PostgreSQL+pgvector, MinIO, Schema Registry, Turso
      packages:
        - packages/data-layer
        - packages/schema-registry
  messageBus:
    type: event-driven
    implementation: NATS JetStream (in-memory bridge)
    patterns:
      - pub/sub
      - request/reply
      - key-value
      - dead letter queue
      - work queue
  extensibility:
    pluginSystem: true
    mcpSupport: true
    adapterArchitecture: true

agents:
  - id: analyst
    name: Analyst
    role: Requirements analysis and specification
    description: >
      Analisa requisitos do usuario, identifica ambiguidades, define
      criterios de aceitacao e documenta especificacoes.
    capabilities:
      - intent-classification
      - requirement-analysis
      - ambiguity-detection
      - specification-writing
      - risk-assessment
    autonomyLevel: N1
    tools:
      - read-file
      - search-codebase
      - ask-user

  - id: architect
    name: Architect
    role: System design and architecture decisions
    description: >
      Propoe arquiteturas, avalia tecnologias, define contratos entre
      modulos e documenta decisoes arquiteturais (ADRs).
    capabilities:
      - system-design
      - technology-evaluation
      - contract-definition
      - adr-creation
      - architecture-review
    autonomyLevel: N1
    tools:
      - read-file
      - write-file
      - search-codebase
      - analyze-dependencies

  - id: programmer
    name: Programmer
    role: Code implementation
    description: >
      Implementa features, corrige bugs, escreve testes unitarios,
      e refatora codigo seguindo as especificacoes do arquiteto.
    capabilities:
      - code-generation
      - code-refactoring
      - bug-fixing
      - unit-test-writing
      - code-optimization
    autonomyLevel: N2
    tools:
      - read-file
      - write-file
      - run-command
      - search-codebase
      - git-operations

  - id: reviewer
    name: Reviewer
    role: Code review and quality assurance
    description: >
      Revisa codigo gerado, verifica qualidade, seguranca e aderencia
      aos padroes do projeto. Identifica code smells e vulnerabilidades.
    capabilities:
      - code-review
      - quality-check
      - security-scan
      - style-enforcement
      - performance-analysis
    autonomyLevel: N1
    tools:
      - read-file
      - run-linter
      - security-scan
      - analyze-code

  - id: tester
    name: Tester
    role: Test generation and execution
    description: >
      Gera e executa testes unitarios, de integracao, E2E e mutacao.
      Garante cobertura minima e qualidades dos testes.
    capabilities:
      - test-generation
      - test-execution
      - coverage-analysis
      - mutation-testing
      - regression-testing
    autonomyLevel: N2
    tools:
      - read-file
      - write-file
      - run-command
      - run-tests

  - id: devops
    name: DevOps
    role: Infrastructure, deployment, and operations
    description: >
      Configura infraestrutura, pipelines CI/CD, deploy, monitoramento
      e observabilidade. Gerencia ambientes e releases.
    capabilities:
      - infrastructure-as-code
      - ci-cd-pipeline
      - deployment-automation
      - monitoring-setup
      - release-management
    autonomyLevel: N2
    tools:
      - read-file
      - write-file
      - run-command
      - docker-operations
      - kubernetes-operations

capabilities:
  - id: cap-intent-classification
    name: Intent Classification
    description: Classifica intencao do usuario (feature, bug, refactor, question, etc.)
    category: intelligence
    riskLevel: low
  - id: cap-code-generation
    name: Code Generation
    description: Gera codigo TypeScript, Python, Rust, Go, Java e outras linguagens
    category: implementation
    riskLevel: medium
  - id: cap-code-review
    name: Code Review
    description: Revisa codigo automaticamente com analise de qualidade e seguranca
    category: quality
    riskLevel: low
  - id: cap-deployment
    name: Automated Deployment
    description: Realiza deploy automatizado com rollback e canary releases
    category: delivery
    riskLevel: high
  - id: cap-memory
    name: Persistent Memory
    description: Mantem memoria entre sessoes com Mem0, SQLite+FTS5 e Knowledge Graph
    category: intelligence
    riskLevel: low

tools:
  - id: read-file
    name: readFile
    description: Read a file from the filesystem
    parameters:
      path:
        type: string
        description: Absolute path to the file
        required: true
    dangerous: false
  - id: write-file
    name: writeFile
    description: Write content to a file
    parameters:
      path:
        type: string
        description: Absolute path to the file
        required: true
      content:
        type: string
        description: Content to write
        required: true
    dangerous: false
  - id: run-command
    name: runCommand
    description: Execute a shell command
    parameters:
      command:
        type: string
        description: Shell command to execute
        required: true
      timeout:
        type: integer
        description: Maximum execution time in ms
        required: false
    dangerous: true

commands:
  - path: IDEIA init
    description: Initialize a new project
    category: core
    examples:
      - 'IDEIA init my-project --template node-api'
  - path: IDEIA generate
    description: Generate code from templates
    category: core
    examples:
      - 'IDEIA generate component Button --type react'
  - path: IDEIA audit
    description: Run all auditors
    category: governance
    examples:
      - 'IDEIA audit --ci'
  - path: IDEIA verify
    description: Verify project compliance
    category: governance
    examples:
      - 'IDEIA verify --all'
  - path: IDEIA reality-sync
    description: Synchronize documentation with code reality
    category: governance
    aliases:
      - IDEIA rs
    examples:
      - 'IDEIA reality-sync start'
      - 'IDEIA reality-sync scan'

contextPacks:
  - level: summary
    tokenBudget: 500
    sections:
      - id: identity
        name: Platform Identity
        maxTokens: 100
      - id: agents
        name: Available Agents
        maxTokens: 200
      - id: capabilities
        name: Key Capabilities
        maxTokens: 200
  - level: full
    tokenBudget: 4000
    sections:
      - id: identity
        name: Platform Identity
        maxTokens: 200
      - id: architecture
        name: Architecture Overview
        maxTokens: 800
      - id: agents
        name: Agent Definitions
        maxTokens: 1000
      - id: tools
        name: Available Tools
        maxTokens: 600
      - id: commands
        name: CLI Commands
        maxTokens: 600
      - id: capabilities
        name: Capabilities
        maxTokens: 400
      - id: rules
        name: Rules and Constraints
        maxTokens: 400
  - level: detailed
    tokenBudget: 8000
    sections:
      - id: identity
        name: Platform Identity
        maxTokens: 300
      - id: architecture
        name: Full Architecture
        maxTokens: 1500
      - id: agents
        name: All Agents
        maxTokens: 1500
      - id: tools
        name: All Tools
        maxTokens: 1000
      - id: commands
        name: All Commands
        maxTokens: 1000
      - id: capabilities
        name: All Capabilities
        maxTokens: 800
      - id: rules
        name: All Rules
        maxTokens: 800
      - id: events
        name: Event Registry
        maxTokens: 500
      - id: contracts
        name: Contract Registry
        maxTokens: 500
      - id: limitations
        name: Limitations
        maxTokens: 100

registries:
  schemas:
    - name: Manifest Schema
      version: 1.0.0
      url: .ideia/manifest/schema.json
      description: JSON Schema for IDEIA manifest
  events:
    - name: Event Registry
      url: .ideia/manifest/events.json
      description: All events published/subscribed by IDEIA
  contracts:
    - name: Contract Registry
      url: .ideia/manifest/contracts.json
      description: All cross-layer contracts in IDEIA

adapters:
  - id: adapter-ts
    language: TypeScript
    status: stable
    capabilities:
      - generation
      - analysis
      - refactoring

workflows:
  - id: wf-feature
    name: Feature Implementation
    description: >
      Complete feature implementation: analyze requirements, design
      architecture, implement code, test, and deploy
    steps:
      - id: step-analyze
        agent: analyst
        action: analyze-requirements
        timeout: 120000
      - id: step-design
        agent: architect
        action: design-solution
        timeout: 180000
      - id: step-implement
        agent: programmer
        action: implement-feature
        timeout: 600000
      - id: step-test
        agent: tester
        action: run-tests
        timeout: 300000
      - id: step-review
        agent: reviewer
        action: review-code
        timeout: 120000
      - id: step-deploy
        agent: devops
        action: deploy
        timeout: 300000

limitations:
  notImplemented:
    - NATS JetStream (in-memory bridge currently)
    - PostgreSQL+pgvector (DuckDB currently)
    - Cedar Policy Engine (custom policy currently)
    - LangGraph orchestration
    - Mem0 memory (custom memory currently)
    - Multi-agent LangGraph coordination
    - Tauri desktop app
    - Theia Cloud deployment
    - ArgoCD/GitOps delivery
    - DSPy optimization pipeline
  experimental:
    - Self-Optimization Panel
    - Autonomous Evolution Engine
    - Knowledge Graph
    - Contract Testing (Pact)
  deprecated: []
  maxContextWindow: 128000
  maxTokens: 4096
  supportedModels:
    - ollama/*
    - openai/gpt-4
    - openai/gpt-4o
    - openai/gpt-4o-mini
    - anthropic/claude-3-opus
    - anthropic/claude-3-sonnet
    - anthropic/claude-3-haiku
    - deepseek/deepseek-chat
    - deepseek/deepseek-coder
```

### 3.3 Campos Obrigatorios e suas Funcoes

| Campo | Obrigatorio | Funcao | Exemplo |
|-------|-------------|--------|---------|
| `id` | Sim | Identificador unico do manifesto | `ideia-platform` |
| `version` | Sim | Versao semantica do manifesto | `1.0.0` |
| `name` | Sim | Nome legivel da plataforma | `IDEIA` |
| `description` | Sim | Descricao concisa (max 2000 chars) | Texto markdown |
| `architecture` | Sim | Camadas, padroes, barramento | Objeto com layers |
| `agents` | Sim | Agentes disponiveis e capacidades | Array de 6 agentes |
| `capabilities` | Sim | Capacidades da plataforma | Array categorizado |
| `tools` | Sim | Ferramentas disponiveis para agentes | Array com schemas |
| `commands` | Sim | Comandos CLI expostos | Array com exemplos |
| `contextPacks` | Sim | Pacotes de contexto para LLMs | 3 niveis de detalhe |
| `registries` | Sim | Registros de schemas, eventos, contratos | Objeto com arrays |
| `adapters` | Sim | Adaptadores de linguagem | Array com status |
| `workflows` | Sim | Workflows pre-definidos | Array com steps |
| `limitations` | Sim | Limitacoes conhecidas | Objeto categorizado |

### 3.4 Convencoes de Versionamento

O manifesto segue versionamento semantico independente da plataforma:

```
MAJOR.MINOR.PATCH
  │     │     └── Patch: Mudancas em descricoes, exemplos, metadados
  │     └── Major: Novas secoes, campos obrigatorios removidos/alterados
  └── Minor: Novos campos opcionais, novos agentes, novas capacidades
```

Regras:
- Major zero (0.x.y) indica desenvolvimento inicial -- quebras sao esperadas
- O schema do manifesto e versionado separadamente (`schema.json` version)
- Mudancas no schema requerem nova versao do schema e do generator
- O manifesto gerado inclui `generatorVersion` para rastreabilidade

---

## 4. Self-Description Protocol

### 4.1 Protocolo Estruturado de Auto-Descricao

O Self-Description Protocol (SDP) define como a IDEIA se descreve para LLMs externos, ferramentas de terceiros e outros sistemas. O protocolo opera em 3 niveis de detalhe.

```
SELF-DESCRIPTION PROTOCOL (SDP v1)
───────────────────────────────────

NIVEIS DE DESCRICAO:
  summary  (~500 tokens)  → Identidade basica, agentes principais, capacidades chave
  full     (~4000 tokens) → Arquitetura completa, todos agentes, tools, comandos
  detailed (~8000 tokens) → Tudo acima + schemas, eventos, contratos, limitacoes

MECANISMOS DE ACESSO:
  1. Context Enricher (automatico, via prompt pipeline)
  2. Self-Description API (REST endpoints)
  3. Manifest File (YAML file on disk)
  4. CLI command (IDEIA manifest get --level full)

FORMATOS DE SAIDA:
  - Markdown (para prompts de LLM)
  - JSON (para APIs e ferramentas)
  - YAML (para arquivos e configuracao)
  - Texto plano (para sistemas legados)
```

### 4.2 Nivel Summary (~500 tokens)

Usado quando:
- Primeira interacao com um LLM que precisa de contexto rapido
- Pre-visualizacao em UIs e dashboards
- Resposta a `IDEIA status` ou `IDEIA whoami`

Conteudo:
```markdown
# IDEIA Platform -- Summary

IDEIA e uma plataforma de desenvolvimento assistido por IA que
transforma ideias em sistemas completos.

## Architecture
- 10 camadas: Shell → Theia → Agents → Intelligence → Memory
  → Execution → Messaging → Security → Infrastructure → Data
- Padrao: Clean Architecture + DDD + Event-Driven
- Barramento: NATS JetStream

## Agents (6)
  Analyst    - Analise de requisitos e especificacao
  Architect  - Design de sistemas e decisoes arquiteturais
  Programmer - Implementacao de codigo
  Reviewer   - Revisao de codigo e qualidade
  Tester     - Geracao e execucao de testes
  DevOps     - Infraestrutura, deploy e operacoes

## Key Capabilities
  Intent Classification, Code Generation, Code Review,
  Automated Deployment, Persistent Memory, Workflow Automation

## Commands
  IDEIA init, generate, audit, verify, reality-sync, policy, workflow

## Limitations
  NATS JetStream em bridge in-memory (nao nativo)
  Sem LangGraph multi-agente
  Sem Cedar Policy (custom)
  Sem Tauri/Electron nativo
```

### 4.3 Nivel Full (~4000 tokens)

Usado quando:
- Inicio de sessoes de trabalho com agentes IDEIA
- Integracao com ferramentas de terceiros
- Auditoria e compliance

```markdown
# IDEIA Platform -- Full Description

## Identity
  Name: IDEIA
  Version: 0.5.0
  Description: Plataforma de desenvolvimento assistido por IA
  Tagline: "De a ideia, nos entregamos a solucao."

## Architecture (10 layers)
  [Shell] Desktop/Web/Theia Cloud
    Electron (MVP), Tauri v2 (Rust), Theia Cloud
  [Theia Platform] Theia + Monaco + Theia AI + OpenVSX
  [Agent Layer] 6 especialistas orquestrados
  [Intelligence] Pattern Detector, Learning Engine, Intent Classifier
    ADAPT, RAG Engine, DSPy
  [Memory] Mem0, SQLite+FTS5, DuckDB, Knowledge Graph, Redis
  [Execution] Agent Runtime, Autonomous Editor, Workflow Engine
    Delivery Orchestrator, Verification Layer
  [Messaging] NATS JetStream (Pub/Sub, Req/Rep, KV, DLQ)
  [Security] Cedar Policy, LLM Guard, Output Validation, Audit Trail
  [Infrastructure] Resilience Engine, Trace, Observation
  [Data] PostgreSQL+pgvector, MinIO, Schema Registry, Turso

## Agents (6)
  ## Analyst (N1)
    - Intent classification & requirement analysis
    - Ambiguity detection & specification writing
    - Tools: read-file, search-codebase, ask-user
  ## Architect (N1)
    - System design & technology evaluation
    - Contract definition & ADR creation
    - Tools: read-file, write-file, analyze-dependencies
  ## Programmer (N2)
    - Code generation & refactoring
    - Bug fixing & unit test writing
    - Tools: read-file, write-file, run-command, git-operations
  ## Reviewer (N1)
    - Code review & quality check
    - Security scan & style enforcement
    - Tools: read-file, run-linter, security-scan
  ## Tester (N2)
    - Test generation & execution
    - Coverage analysis & mutation testing
    - Tools: read-file, write-file, run-tests
  ## DevOps (N2)
    - IaC, CI/CD, deployment, monitoring
    - Release management & environments
    - Tools: read-file, run-command, docker, kubernetes

## Tools (critical)
  read-file     - Read files from filesystem
  write-file    - Write content to files (safe)
  run-command   - Execute shell commands (DANGEROUS)

## CLI Commands
  IDEIA init          - Initialize project
  IDEIA generate      - Generate from templates
  IDEIA audit         - Run all auditors
  IDEIA verify        - Verify compliance
  IDEIA reality-sync  - Sync docs with code
  IDEIA policy        - Evaluate policy
  IDEIA workflow      - Run workflow

## Limitations
  [Not Implemented] NATS nativo, LangGraph, Cedar, Tauri, ArgoCD, DSPy
  [Experimental] Self-Optimization, Autonomous Evolution, Knowledge Graph
  [Max Context] 128000 tokens
  [Max Output] 4096 tokens
```

### 4.4 Nivel Detailed (~8000 tokens)

Usado quando:
- Setup completo de ambiente para novo LLM
- Integracao profunda com ferramentas de terceiros
- Documentacao de conformidade regulatoria

O nivel detailed inclui tudo do nivel full, mais:
- Schema JSON completo de todas as ferramentas
- Registro de eventos (16+ tipos) com publishers e subscribers
- Contratos cross-layer (18 contratos C1-C18) com status e resiliencia
- Lista completa de 66+ packages com descricao
- Tabela de 130+ comandos CLI categorizados
- Matriz de capacidades por agente
- Autonomy policy N0-N4 com regras por nivel
- Audit trail schema e chain verification
- Workflows completos com steps, timeouts e agentes

### 4.5 Self-Description API

```typescript
// packages/manifest/src/api.ts

import { Router } from 'express';
import { ManifestResolver } from './resolver';
import { ContextEnricher } from './enricher';

export function createSelfDescriptionAPI(
  resolver: ManifestResolver,
  enricher: ContextEnricher
): Router {
  const router = Router();

  // GET /manifest - Manifesto completo em JSON/YAML
  router.get('/manifest', async (req, res) => {
    const format = req.query.format || 'json';
    const manifest = await resolver.resolve({ all: true });
    if (format === 'yaml') {
      res.set('Content-Type', 'text/yaml');
      res.send(toYAML(manifest));
    } else {
      res.json(manifest);
    }
  });

  // GET /self - Auto-descricao em nivel especifico
  router.get('/self', async (req, res) => {
    const level = req.query.level || 'summary';
    const format = req.query.format || 'markdown';
    const context = await enricher.enrich(
      level as DescriptionLevel,
      'api'
    );
    if (format === 'json') {
      const manifest = await resolver.resolve({ level });
      res.json(manifest);
    } else {
      res.set('Content-Type', 'text/markdown');
      res.send(context);
    }
  });

  // GET /self/agents - Lista de agentes
  router.get('/self/agents', async (req, res) => {
    const agents = await resolver.resolveAgents();
    res.json(agents);
  });

  // GET /self/capabilities - Lista de capacidades
  router.get('/self/capabilities', async (req, res) => {
    const capabilities = await resolver.resolveCapabilities();
    res.json(capabilities);
  });

  // GET /self/commands - Lista de comandos CLI
  router.get('/self/commands', async (req, res) => {
    const commands = await resolver.resolveCommands();
    res.json(commands);
  });

  // GET /self/tools - Lista de ferramentas
  router.get('/self/tools', async (req, res) => {
    const tools = await resolver.resolveTools();
    res.json(tools);
  });

  // GET /self/context - Context pack para LLM
  router.get('/self/context', async (req, res) => {
    const level = req.query.level || 'full';
    const context = await enricher.enrich(
      level as DescriptionLevel,
      'api'
    );
    res.set('Content-Type', 'text/markdown');
    res.send(context);
  });

  // GET /health - Health check com info do manifesto
  router.get('/health', async (req, res) => {
    const manifest = await resolver.resolve({ section: 'identity' });
    res.json({
      status: 'ok',
      platform: manifest.name,
      version: manifest.platformVersion,
      manifestVersion: manifest.version,
      generatedAt: manifest.generatedAt,
      uptime: process.uptime()
    });
  });

  return router;
}
```

### 4.6 Mecanismos de Acesso ao Manifesto

| Metodo | Formato | Uso Principal | Exemplo |
|--------|---------|---------------|---------|
| **Arquivo YAML** | `.ideia/manifest/manifest.yaml` | IAs, ferramentas locais | Leitura direta do arquivo |
| **Arquivo JSON** | `.ideia/manifest/manifest.json` | Ferramentas programaticas | `JSON.parse(fs.readFile(...))` |
| **API REST** | `GET /self?level=full` | LLMs remotos, integracoes | `curl localhost:3001/self` |
| **API REST** | `GET /manifest` | Consumo completo | `curl localhost:3001/manifest` |
| **CLI** | `IDEIA manifest get --level full --format json` | Terminal, scripts | `IDEIA manifest get` |
| **Context Enricher** | Injetado no prompt | Automatico via pipeline | Prompt pipeline S19 |

---

## 5. Manifest Generator

### 5.1 Code Scanner

O Code Scanner e o componente responsavel por extrair informacoes do codigo fonte da IDEIA para alimentar o gerador de manifesto.

```typescript
// packages/manifest/src/scanner.ts

import { glob } from 'glob';
import { readFile } from 'fs/promises';
import path from 'path';

export interface ScanOptions {
  workspaceDir: string;
  packagesDir?: string;
  includeDevDependencies?: boolean;
}

export interface ScanResult {
  packages: PackageInfo[];
  interfaces: InterfaceInfo[];
  endpoints: EndpointInfo[];
  commands: CommandInfo[];
  agents: AgentInfo[];
  events: EventInfo[];
  tools: ToolInfo[];
  adapters: AdapterInfo[];
}

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  path: string;
  dependencies: string[];
  type: 'library' | 'cli' | 'ui' | 'service' | 'adapter';
}

export class CodeScanner {
  constructor(private options: ScanOptions) {}

  async scan(): Promise<ScanResult> {
    const [packages, interfaces, endpoints, commands, agents, events, tools, adapters] =
      await Promise.all([
        this.scanPackages(),
        this.scanInterfaces(),
        this.scanEndpoints(),
        this.scanCommands(),
        this.scanAgents(),
        this.scanEvents(),
        this.scanTools(),
        this.scanAdapters(),
      ]);

    return { packages, interfaces, endpoints, commands, agents, events, tools, adapters };
  }

  private async scanPackages(): Promise<PackageInfo[]> {
    const packageFiles = await glob(
      path.join(this.options.packagesDir || 'packages/*', 'package.json')
    );
    const packages: PackageInfo[] = [];

    for (const file of packageFiles) {
      const content = await readFile(file, 'utf-8');
      const pkg = JSON.parse(content);
      packages.push({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || '',
        path: path.dirname(file),
        dependencies: Object.keys(pkg.dependencies || {}),
        type: this.inferPackageType(pkg),
      });
    }

    return packages;
  }

  private async scanInterfaces(): Promise<InterfaceInfo[]> {
    const indexFiles = await glob(
      path.join(this.options.packagesDir || 'packages/*', 'src/index.ts')
    );
    const interfaces: InterfaceInfo[] = [];

    for (const file of indexFiles) {
      const content = await readFile(file, 'utf-8');
      const exports = this.parseExports(content);
      interfaces.push(...exports.map(e => ({
        ...e,
        sourceFile: file,
      })));
    }

    return interfaces;
  }

  private async scanEndpoints(): Promise<EndpointInfo[]> {
    const routerFiles = await glob(
      path.join(this.options.packagesDir || 'packages/*', 'src/**/*.ts')
    );
    const endpoints: EndpointInfo[] = [];

    for (const file of routerFiles) {
      const content = await readFile(file, 'utf-8');
      const found = this.parseEndpoints(content, file);
      endpoints.push(...found);
    }

    return endpoints;
  }

  private async scanCommands(): Promise<CommandInfo[]> {
    const cliFiles = await glob(
      path.join(this.options.packagesDir || 'packages/*', 'src/**/commands/**/*.ts')
    );
    const commands: CommandInfo[] = [];

    for (const file of cliFiles) {
      const content = await readFile(file, 'utf-8');
      const found = this.parseCommands(content, file);
      commands.push(...found);
    }

    return commands;
  }

  private async scanAgents(): Promise<AgentInfo[]> {
    const agentDir = path.join(this.options.workspaceDir,
      'packages/agent-runtime/src/agents');
    const agentFiles = await glob(path.join(agentDir, '*.ts'));
    const agents: AgentInfo[] = [];

    for (const file of agentFiles) {
      const content = await readFile(file, 'utf-8');
      const agent = this.parseAgentDefinition(content, file);
      if (agent) agents.push(agent);
    }

    return agents;
  }

  private async scanEvents(): Promise<EventInfo[]> {
    const eventFiles = await glob(
      path.join(this.options.packagesDir || 'packages/*', 'src/**/events*.ts')
    );
    const events: EventInfo[] = [];

    for (const file of eventFiles) {
      const content = await readFile(file, 'utf-8');
      const found = this.parseEventDefinitions(content, file);
      events.push(...found);
    }

    return events;
  }

  private async scanTools(): Promise<ToolInfo[]> {
    const toolDir = path.join(this.options.workspaceDir,
      'packages/agent-runtime/src/tools');
    const toolFiles = await glob(path.join(toolDir, '*.ts'));
    const tools: ToolInfo[] = [];

    for (const file of toolFiles) {
      const content = await readFile(file, 'utf-8');
      const tool = this.parseToolDefinition(content, file);
      if (tool) tools.push(tool);
    }

    return tools;
  }

  private async scanAdapters(): Promise<AdapterInfo[]> {
    const adapterDir = path.join(this.options.workspaceDir, 'packages');
    const adapterFiles = await glob(path.join(adapterDir, 'adapter-*', 'package.json'));
    const adapters: AdapterInfo[] = [];

    for (const file of adapterFiles) {
      const content = await readFile(file, 'utf-8');
      const pkg = JSON.parse(content);
      const lang = pkg.name.replace('@ideia/adapter-', '');
      adapters.push({
        id: pkg.name,
        language: lang,
        version: pkg.version,
        path: path.dirname(file),
      });
    }

    return adapters;
  }

  private inferPackageType(pkg: any): PackageInfo['type'] {
    if (pkg.name?.startsWith('@ideia/adapter-')) return 'adapter';
    if (pkg.bin || pkg.name === '@ideia/cli') return 'cli';
    if (pkg.name?.includes('web') || pkg.name?.includes('ui')) return 'ui';
    if (pkg.name?.includes('server') || pkg.name?.includes('service')) return 'service';
    return 'library';
  }

  private parseExports(content: string): InterfaceInfo[] {
    const exports: InterfaceInfo[] = [];
    const exportPattern = /export\s+(interface|type|class|function|const)\s+(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = exportPattern.exec(content)) !== null) {
      exports.push({
        kind: match[1] as InterfaceInfo['kind'],
        name: match[2],
      });
    }

    return exports;
  }

  private parseEndpoints(content: string, file: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const routePattern = /(?:router|app)\.(get|post|put|delete|patch)\(\s*['"`](\/[^'"`]+)['"`]/g;
    let match: RegExpExecArray | null;

    while ((match = routePattern.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2],
        sourceFile: file,
      });
    }

    return endpoints;
  }

  private parseCommands(content: string, file: string): CommandInfo[] {
    const commands: CommandInfo[] = [];
    const commandPattern = /\.command\(['"`](\w+(?::\w+)?)['"`]/g;
    let match: RegExpExecArray | null;

    while ((match = commandPattern.exec(content)) !== null) {
      commands.push({
        name: match[1],
        sourceFile: file,
      });
    }

    return commands;
  }

  private parseAgentDefinition(content: string, file: string): AgentInfo | null {
    const nameMatch = content.match(/name\s*[:=]\s*['"`](.+?)['"`]/);
    const roleMatch = content.match(/role\s*[:=]\s*['"`](.+?)['"`]/);
    const levelMatch = content.match(/autonomyLevel\s*[:=]\s*['"`](N[0-4])['"`]/);

    if (!nameMatch) return null;

    return {
      name: nameMatch[1],
      role: roleMatch?.[1] || 'unknown',
      autonomyLevel: (levelMatch?.[1] as AgentInfo['autonomyLevel']) || 'N1',
      sourceFile: file,
    };
  }

  private parseEventDefinitions(content: string, file: string): EventInfo[] {
    const events: EventInfo[] = [];
    const eventPattern = /['"`]([\w.]+)['"`]\s*[:=]\s*['"`]([\w.]+)['"`]/g;
    let match: RegExpExecArray | null;

    while ((match = eventPattern.exec(content)) !== null) {
      events.push({
        name: match[1],
        type: match[2],
        sourceFile: file,
      });
    }

    return events;
  }

  private parseToolDefinition(content: string, file: string): ToolInfo | null {
    const nameMatch = content.match(/name\s*[:=]\s*['"`](.+?)['"`]/);
    const descMatch = content.match(/description\s*[:=]\s*['"`](.+?)['"`]/);

    if (!nameMatch) return null;

    return {
      name: nameMatch[1],
      description: descMatch?.[1] || '',
      sourceFile: file,
    };
  }
}
```

### 5.2 Manifest Generator

```typescript
// packages/manifest/src/generator.ts

import { CodeScanner, ScanResult } from './scanner';
import { ManifestValidator } from './validator';
import { ManifestStore } from './store';
import { v4 as uuidv4 } from 'uuid';

export interface GenerateOptions {
  workspaceDir: string;
  outputDir?: string;
  platformVersion?: string;
  validate?: boolean;
  force?: boolean;
}

export class ManifestGenerator {
  private scanner: CodeScanner;
  private validator: ManifestValidator;
  private store: ManifestStore;

  constructor(options: { scanner: CodeScanner; validator: ManifestValidator; store: ManifestStore }) {
    this.scanner = options.scanner;
    this.validator = options.validator;
    this.store = options.store;
  }

  async generate(options: GenerateOptions): Promise<Manifest> {
    const scanResult = await this.scanner.scan();
    const manifest = await this.buildManifest(scanResult, options);
    
    if (options.validate !== false) {
      const validation = this.validator.validate(manifest);
      if (!validation.valid && !options.force) {
        throw new ManifestValidationError(validation.errors);
      }
    }

    await this.store.write(manifest);
    return manifest;
  }

  private async buildManifest(
    scan: ScanResult,
    options: GenerateOptions
  ): Promise<Manifest> {
    const manifest: Manifest = {
      id: `ideia-platform-${uuidv4().slice(0, 8)}`,
      version: '1.0.0',
      platformVersion: options.platformVersion || '0.5.0',
      generatedAt: new Date().toISOString(),
      generatorVersion: '1.0.0',
      name: 'IDEIA',
      description: this.buildDescription(scan),
      architecture: this.buildArchitecture(scan),
      agents: this.buildAgents(scan),
      capabilities: this.buildCapabilities(scan),
      tools: this.buildTools(scan),
      commands: this.buildCommands(scan),
      contextPacks: this.buildContextPacks(),
      registries: this.buildRegistries(scan),
      adapters: this.buildAdapters(scan),
      workflows: this.buildWorkflows(scan),
      limitations: this.buildLimitations(scan),
    };

    return manifest;
  }

  private buildDescription(scan: ScanResult): string {
    const packageCount = scan.packages.length;
    const agentCount = scan.agents.length;
    const commandCount = scan.commands.length;

    return [
      `IDEIA e uma plataforma de desenvolvimento assistido por IA`,
      `que transforma ideias em sistemas completos.`,
      `Composta por ${packageCount} packages, ${agentCount} agentes especializados,`,
      `${commandCount} comandos CLI e arquitetura de 15 camadas.`,
    ].join(' ');
  }

  private buildArchitecture(scan: ScanResult): ArchitectureManifest {
    return {
      pattern: 'Clean Architecture + DDD + Event-Driven',
      layers: [
        {
          id: 'shell',
          name: 'Shell',
          description: 'Desktop/Web/Theia Cloud',
          packages: this.filterPackages(scan, ['electron', 'tauri', 'theia-cloud']),
        },
        {
          id: 'platform',
          name: 'Theia Platform',
          description: 'Theia, Monaco, Theia AI, OpenVSX, Inversify DI',
          packages: this.filterPackages(scan, ['theia', 'monaco']),
        },
        {
          id: 'agents',
          name: 'Agent Layer',
          description: '6 agentes especializados orquestrados',
          packages: this.filterPackages(scan, ['agent-runtime', 'workflow']),
        },
        {
          id: 'intelligence',
          name: 'Intelligence Layer',
          description: 'Pattern Detector, Learning Engine, Intent Classifier',
          packages: this.filterPackages(scan, ['intelligence', 'pattern', 'learning', 'rag']),
        },
        {
          id: 'memory',
          name: 'Memory Layer',
          description: 'Mem0, SQLite+FTS5, DuckDB, Knowledge Graph, Redis',
          packages: this.filterPackages(scan, ['memory', 'knowledge', 'vector']),
        },
        {
          id: 'execution',
          name: 'Execution Layer',
          description: 'Agent Runtime, Autonomous Editor, Workflow Engine',
          packages: this.filterPackages(scan, ['execution', 'delivery', 'verification']),
        },
        {
          id: 'messaging',
          name: 'Messaging Layer',
          description: 'NATS JetStream',
          packages: this.filterPackages(scan, ['event-bus', 'nats']),
        },
        {
          id: 'security',
          name: 'Security Layer',
          description: 'Cedar Policy, LLM Guard, Output Validation, Audit',
          packages: this.filterPackages(scan, ['policy', 'security', 'audit', 'prompt']),
        },
        {
          id: 'infrastructure',
          name: 'Infrastructure Layer',
          description: 'Resilience Engine, Trace, Observation',
          packages: this.filterPackages(scan, ['resilience', 'observability']),
        },
        {
          id: 'data',
          name: 'Data Layer',
          description: 'PostgreSQL+pgvector, MinIO, Schema Registry, Turso',
          packages: this.filterPackages(scan, ['data-layer', 'schema']),
        },
      ],
      messageBus: {
        type: 'event-driven',
        implementation: 'NATS JetStream (in-memory bridge)',
        patterns: ['pub/sub', 'request/reply', 'key-value', 'dead letter queue'],
      },
      extensibility: {
        pluginSystem: true,
        mcpSupport: true,
        adapterArchitecture: true,
      },
    };
  }

  private buildAgents(scan: ScanResult): AgentManifest[] {
    if (scan.agents.length === 0) {
      return this.getDefaultAgents();
    }

    return scan.agents.map(a => ({
      id: a.name.toLowerCase(),
      name: a.name,
      role: a.role,
      description: `${a.name}: ${a.role}`,
      capabilities: [],
      autonomyLevel: a.autonomyLevel,
      tools: [],
    }));
  }

  private getDefaultAgents(): AgentManifest[] {
    return [
      { id: 'analyst', name: 'Analyst', role: 'Requirements analysis and specification',
        description: 'Analisa requisitos do usuario', capabilities: [], autonomyLevel: 'N1', tools: [] },
      { id: 'architect', name: 'Architect', role: 'System design and architecture decisions',
        description: 'Propoe arquiteturas', capabilities: [], autonomyLevel: 'N1', tools: [] },
      { id: 'programmer', name: 'Programmer', role: 'Code implementation',
        description: 'Implementa features', capabilities: [], autonomyLevel: 'N2', tools: [] },
      { id: 'reviewer', name: 'Reviewer', role: 'Code review and quality',
        description: 'Revisa codigo', capabilities: [], autonomyLevel: 'N1', tools: [] },
      { id: 'tester', name: 'Tester', role: 'Test generation and execution',
        description: 'Gera e executa testes', capabilities: [], autonomyLevel: 'N2', tools: [] },
      { id: 'devops', name: 'DevOps', role: 'Infrastructure and deployment',
        description: 'Configura infraestrutura', capabilities: [], autonomyLevel: 'N2', tools: [] },
    ];
  }

  private buildCapabilities(scan: ScanResult): CapabilityManifest[] {
    return [
      { id: 'cap-intent-classification', name: 'Intent Classification',
        description: 'Classifica intencao do usuario', category: 'intelligence', riskLevel: 'low' },
      { id: 'cap-code-generation', name: 'Code Generation',
        description: 'Gera codigo em multiplas linguagens', category: 'implementation', riskLevel: 'medium' },
      { id: 'cap-code-review', name: 'Code Review',
        description: 'Revisa codigo automaticamente', category: 'quality', riskLevel: 'low' },
      { id: 'cap-deployment', name: 'Automated Deployment',
        description: 'Realiza deploy automatizado', category: 'delivery', riskLevel: 'high' },
      { id: 'cap-memory', name: 'Persistent Memory',
        description: 'Mantem memoria entre sessoes', category: 'intelligence', riskLevel: 'low' },
    ];
  }

  private buildTools(scan: ScanResult): ToolManifest[] {
    return [
      {
        id: 'read-file', name: 'readFile',
        description: 'Read a file from the filesystem',
        parameters: { path: { type: 'string', description: 'Absolute path', required: true } },
        dangerous: false,
      },
      {
        id: 'write-file', name: 'writeFile',
        description: 'Write content to a file',
        parameters: {
          path: { type: 'string', description: 'Absolute path', required: true },
          content: { type: 'string', description: 'Content to write', required: true },
        },
        dangerous: false,
      },
      {
        id: 'run-command', name: 'runCommand',
        description: 'Execute a shell command',
        parameters: {
          command: { type: 'string', description: 'Shell command', required: true },
          timeout: { type: 'integer', description: 'Max execution time', required: false },
        },
        dangerous: true,
      },
    ];
  }

  private buildCommands(scan: ScanResult): CommandManifest[] {
    const commands: CommandManifest[] = [];
    const seen = new Set<string>();

    for (const cmd of scan.commands) {
      if (seen.has(cmd.name)) continue;
      seen.add(cmd.name);
      commands.push({
        path: `IDEIA ${cmd.name}`,
        description: `Execute ${cmd.name} command`,
        category: 'core',
        examples: [`IDEIA ${cmd.name}`],
      });
    }

    if (commands.length === 0) {
      return [
        { path: 'IDEIA init', description: 'Initialize a new project', category: 'core',
          examples: ['IDEIA init my-project'] },
        { path: 'IDEIA generate', description: 'Generate code', category: 'core',
          examples: ['IDEIA generate component Button'] },
        { path: 'IDEIA audit', description: 'Run all auditors', category: 'governance',
          examples: ['IDEIA audit --ci'] },
        { path: 'IDEIA verify', description: 'Verify compliance', category: 'governance',
          examples: ['IDEIA verify --all'] },
        { path: 'IDEIA reality-sync', description: 'Sync docs with code', category: 'governance',
          aliases: ['IDEIA rs'], examples: ['IDEIA reality-sync start'] },
      ];
    }

    return commands;
  }

  private buildContextPacks(): ContextPackManifest[] {
    return [
      {
        level: 'summary',
        tokenBudget: 500,
        sections: [
          { id: 'identity', name: 'Platform Identity', maxTokens: 100, content: '' },
          { id: 'agents', name: 'Available Agents', maxTokens: 200, content: '' },
          { id: 'capabilities', name: 'Key Capabilities', maxTokens: 200, content: '' },
        ],
      },
      {
        level: 'full',
        tokenBudget: 4000,
        sections: [
          { id: 'identity', name: 'Platform Identity', maxTokens: 200, content: '' },
          { id: 'architecture', name: 'Architecture Overview', maxTokens: 800, content: '' },
          { id: 'agents', name: 'Agent Definitions', maxTokens: 1000, content: '' },
          { id: 'tools', name: 'Available Tools', maxTokens: 600, content: '' },
          { id: 'commands', name: 'CLI Commands', maxTokens: 600, content: '' },
          { id: 'capabilities', name: 'Capabilities', maxTokens: 400, content: '' },
          { id: 'rules', name: 'Rules and Constraints', maxTokens: 400, content: '' },
        ],
      },
      {
        level: 'detailed',
        tokenBudget: 8000,
        sections: [
          { id: 'identity', name: 'Platform Identity', maxTokens: 300, content: '' },
          { id: 'architecture', name: 'Full Architecture', maxTokens: 1500, content: '' },
          { id: 'agents', name: 'All Agents', maxTokens: 1500, content: '' },
          { id: 'tools', name: 'All Tools', maxTokens: 1000, content: '' },
          { id: 'commands', name: 'All Commands', maxTokens: 1000, content: '' },
          { id: 'capabilities', name: 'All Capabilities', maxTokens: 800, content: '' },
          { id: 'rules', name: 'All Rules', maxTokens: 800, content: '' },
          { id: 'events', name: 'Event Registry', maxTokens: 500, content: '' },
          { id: 'contracts', name: 'Contract Registry', maxTokens: 500, content: '' },
          { id: 'limitations', name: 'Limitations', maxTokens: 100, content: '' },
        ],
      },
    ];
  }

  private buildRegistries(scan: ScanResult): RegistryManifest {
    return {
      schemas: [
        { name: 'Manifest Schema', version: '1.0.0',
          url: '.ideia/manifest/schema.json',
          description: 'JSON Schema for IDEIA manifest' },
      ],
      events: scan.events.map(e => ({
        name: e.name,
        type: e.type,
        publisher: e.sourceFile,
      })),
      contracts: [],
    };
  }

  private buildAdapters(scan: ScanResult): AdapterManifest[] {
    return scan.adapters.map(a => ({
      id: a.id,
      language: a.language,
      status: 'stable' as const,
      capabilities: ['generation', 'analysis'],
    }));
  }

  private buildWorkflows(scan: ScanResult): WorkflowManifest[] {
    return [
      {
        id: 'wf-feature',
        name: 'Feature Implementation',
        description: 'Complete feature implementation workflow',
        steps: [
          { id: 'step-analyze', agent: 'analyst', action: 'analyze-requirements', timeout: 120000 },
          { id: 'step-design', agent: 'architect', action: 'design-solution', timeout: 180000 },
          { id: 'step-implement', agent: 'programmer', action: 'implement-feature', timeout: 600000 },
          { id: 'step-test', agent: 'tester', action: 'run-tests', timeout: 300000 },
          { id: 'step-review', agent: 'reviewer', action: 'review-code', timeout: 120000 },
          { id: 'step-deploy', agent: 'devops', action: 'deploy', timeout: 300000 },
        ],
      },
    ];
  }

  private buildLimitations(scan: ScanResult): LimitationManifest {
    return {
      notImplemented: [
        'NATS JetStream nativo (bridge in-memory atualmente)',
        'PostgreSQL+pgvector (DuckDB)',
        'Cedar Policy Engine (custom)',
        'LangGraph multi-agente',
        'Mem0 memory (custom)',
        'Tauri desktop app',
        'ArgoCD/GitOps',
        'DSPy pipeline',
      ],
      experimental: [
        'Self-Optimization Panel',
        'Autonomous Evolution Engine',
        'Knowledge Graph',
        'Contract Testing (Pact)',
      ],
      deprecated: [],
      maxContextWindow: 128000,
      maxTokens: 4096,
      supportedModels: [
        'ollama/*', 'openai/gpt-4', 'openai/gpt-4o',
        'anthropic/claude-3-opus', 'anthropic/claude-3-sonnet',
        'deepseek/deepseek-chat', 'deepseek/deepseek-coder',
      ],
    };
  }

  private filterPackages(scan: ScanResult, keywords: string[]): string[] {
    return scan.packages
      .filter(p => keywords.some(k => p.name.toLowerCase().includes(k)))
      .map(p => p.path);
  }
}
```

### 5.3 Manifest Store

```typescript
// packages/manifest/src/store.ts

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import * as yaml from 'yaml';

export class ManifestStore {
  private cache: Manifest | null = null;
  private cacheTimestamp: number = 0;
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutos

  constructor(private baseDir: string) {}

  get manifestPath(): string {
    return path.join(this.baseDir, '.ideia', 'manifest', 'manifest.yaml');
  }

  get schemaPath(): string {
    return path.join(this.baseDir, '.ideia', 'manifest', 'schema.json');
  }

  async write(manifest: Manifest): Promise<void> {
    const dir = path.dirname(this.manifestPath);
    await mkdir(dir, { recursive: true });

    const yamlContent = yaml.stringify(manifest, {
      indent: 2,
      lineWidth: 120,
      sortMapEntries: false,
    });

    await writeFile(this.manifestPath, yamlContent, 'utf-8');

    const jsonContent = JSON.stringify(manifest, null, 2);
    const jsonPath = this.manifestPath.replace('.yaml', '.json');
    await writeFile(jsonPath, jsonContent, 'utf-8');

    this.cache = manifest;
    this.cacheTimestamp = Date.now();
  }

  async read(): Promise<Manifest | null> {
    if (this.cache && (Date.now() - this.cacheTimestamp) < this.cacheTTL) {
      return this.cache;
    }

    try {
      const content = await readFile(this.manifestPath, 'utf-8');
      const manifest = yaml.parse(content) as Manifest;
      this.cache = manifest;
      this.cacheTimestamp = Date.now();
      return manifest;
    } catch {
      return null;
    }
  }

  async invalidate(): Promise<void> {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}
```

### 5.4 Manifest Validator

```typescript
// packages/manifest/src/validator.ts

import { z } from 'zod';

const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  autonomyLevel: z.enum(['N0', 'N1', 'N2', 'N3', 'N4']),
  tools: z.array(z.string()),
});

const CommandSchema = z.object({
  path: z.string(),
  description: z.string(),
  category: z.string(),
  aliases: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
});

const ContextPackSchema = z.object({
  level: z.enum(['summary', 'full', 'detailed']),
  tokenBudget: z.number().positive(),
  sections: z.array(z.object({
    id: z.string(),
    name: z.string(),
    maxTokens: z.number().positive(),
    content: z.string(),
  })),
});

const ManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  platformVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  generatedAt: z.string(),
  generatorVersion: z.string().optional(),
  name: z.string(),
  description: z.string().max(2000),
  architecture: z.object({
    pattern: z.string(),
    layers: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      packages: z.array(z.string()),
    })),
    messageBus: z.object({
      type: z.string(),
      implementation: z.string(),
      patterns: z.array(z.string()),
    }).optional(),
    extensibility: z.object({
      pluginSystem: z.boolean(),
      mcpSupport: z.boolean(),
      adapterArchitecture: z.boolean(),
    }).optional(),
  }),
  agents: z.array(AgentSchema),
  capabilities: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  })),
  tools: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.object({
      type: z.string(),
      description: z.string(),
      required: z.boolean(),
    })),
    dangerous: z.boolean(),
  })),
  commands: z.array(CommandSchema),
  contextPacks: z.array(ContextPackSchema),
  registries: z.object({
    schemas: z.array(z.object({
      name: z.string(),
      version: z.string(),
      url: z.string(),
      description: z.string(),
    })),
    events: z.array(z.any()).optional(),
    contracts: z.array(z.any()).optional(),
  }),
  adapters: z.array(z.object({
    id: z.string(),
    language: z.string(),
    status: z.enum(['stable', 'beta', 'alpha']),
    capabilities: z.array(z.string()),
  })),
  workflows: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    steps: z.array(z.object({
      id: z.string(),
      agent: z.string(),
      action: z.string(),
      timeout: z.number().optional(),
    })),
  })),
  limitations: z.object({
    notImplemented: z.array(z.string()),
    experimental: z.array(z.string()),
    deprecated: z.array(z.string()),
    maxContextWindow: z.number().optional(),
    maxTokens: z.number().optional(),
    supportedModels: z.array(z.string()).optional(),
  }),
});

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
}

export class ManifestValidator {
  validate(manifest: unknown): ValidationResult {
    const result = ManifestSchema.safeParse(manifest);

    if (result.success) {
      return { valid: true, errors: [], warnings: [] };
    }

    const errors: ValidationError[] = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const warnings = this.checkWarnings(result.data || manifest);

    return { valid: errors.length === 0, errors, warnings };
  }

  private checkWarnings(manifest: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (manifest.agents && manifest.agents.length < 6) {
      warnings.push({
        path: 'agents',
        message: `Expected at least 6 agents, found ${manifest.agents.length}`,
      });
    }

    if (manifest.commands && manifest.commands.length < 5) {
      warnings.push({
        path: 'commands',
        message: `Expected at least 5 commands, found ${manifest.commands.length}`,
      });
    }

    if (manifest.limitations?.notImplemented?.length > 8) {
      warnings.push({
        path: 'limitations.notImplemented',
        message: 'Too many not-implemented features may indicate outdated manifest',
      });
    }

    return warnings;
  }
}
```

---

## 6. Context Enricher

### 6.1 Visao Geral

O Context Enricher e o componente que injeta secoes do manifesto no prompt enviado para LLMs. Ele opera dentro do Prompt Pipeline (S19), garantindo que todo LLM que interage com a IDEIA receba o contexto necessario sobre a plataforma.

```
FLUXO DO CONTEXT ENRICHER:
─────────────────────────

Prompt do Usuario
       │
       ▼
┌─────────────────────────────┐
│  Prompt Pipeline (S19)       │
│                              │
│  1. GUARD   → Seguranca      │
│  2. CLASSIFY → Intencao     │
│  3. ENRICH  → Contexto +Manifest│  ←── Context Enricher
│  4. OPTIMIZE → Token economy│
│  5. PLAN    → Plano de exec │
│  6. FORMAT  → Saida         │
└──────────┬──────────────────┘
           │
           ▼
      LLM recebe prompt enriquecido
           │
           ▼
      LLM com contexto completo da IDEIA
```

### 6.2 Implementacao do Context Enricher

```typescript
// packages/llm-provider/src/enricher.ts

import { ManifestResolver } from '../../manifest/src/resolver';
import { DescriptionLevel } from '../../manifest/src/types';

export interface EnrichTarget {
  type: 'system-prompt' | 'user-prompt' | 'agent-prompt';
  agentId?: string;
  taskType?: string;
}

export interface EnrichOptions {
  injectHeader?: boolean;
  injectFooter?: boolean;
  customSections?: string[];
}

export class ContextEnricher {
  constructor(
    private resolver: ManifestResolver,
    private options: EnrichOptions = {}
  ) {}

  async enrich(level: DescriptionLevel, target: EnrichTarget): Promise<string> {
    const manifest = await this.resolver.resolve({ level });

    let context = '';

    if (this.options.injectHeader !== false) {
      context += this.buildHeader(level, target);
    }

    switch (level) {
      case 'summary':
        context += this.buildSummaryContext(manifest, target);
        break;
      case 'full':
        context += this.buildFullContext(manifest, target);
        break;
      case 'detailed':
        context += this.buildDetailedContext(manifest, target);
        break;
    }

    if (this.options.injectFooter !== false) {
      context += this.buildFooter(level);
    }

    return context;
  }

  async enrichSystemPrompt(
    existingPrompt: string,
    level: DescriptionLevel = 'summary'
  ): Promise<string> {
    const context = await this.enrich(level, { type: 'system-prompt' });
    return `${existingPrompt}\n\n${context}`;
  }

  private buildHeader(level: DescriptionLevel, target: EnrichTarget): string {
    switch (target.type) {
      case 'system-prompt':
        return `\n## IDEIA Platform Context (${level})\n\n`;
      case 'agent-prompt':
        return `\n## IDEIA Platform - Agent Context (${level})\n\n`;
      default:
        return `\n## Platform Information (${level})\n\n`;
    }
  }

  private buildFooter(level: DescriptionLevel): string {
    if (level === 'detailed') {
      return `\nFor complete manifest, see .ideia/manifest/manifest.yaml\n`;
    }
    return '';
  }

  private buildSummaryContext(manifest: any, target: EnrichTarget): string {
    return [
      `Platform: ${manifest.name} v${manifest.platformVersion || manifest.version}`,
      `Description: ${manifest.description}`,
      `Architecture: ${manifest.architecture?.pattern || 'N/A'}`,
      `Agents: ${manifest.agents?.map((a: any) => a.name).join(', ') || 'N/A'}`,
      `Capabilities: ${manifest.capabilities?.slice(0, 5).map((c: any) => c.name).join(', ') || 'N/A'}`,
      `Commands: ${manifest.commands?.slice(0, 5).map((c: any) => c.path).join(', ') || 'N/A'}`,
    ].join('\n');
  }

  private async buildFullContext(manifest: any, target: EnrichTarget): Promise<string> {
    const sections: string[] = [];

    sections.push(`# Platform: ${manifest.name} v${manifest.platformVersion || manifest.version}`);
    sections.push('');

    sections.push('## Architecture');
    sections.push(manifest.architecture?.layers?.map((l: any) =>
      `  ${l.id}: ${l.name} -- ${l.description}`
    ).join('\n') || 'N/A');
    sections.push('');

    sections.push('## Agents');
    for (const agent of manifest.agents || []) {
      sections.push(`  ${agent.name} (${agent.autonomyLevel}): ${agent.role}`);
    }
    sections.push('');

    sections.push('## Tools');
    for (const tool of manifest.tools || []) {
      const danger = tool.dangerous ? ' [DANGEROUS]' : '';
      sections.push(`  ${tool.name}${danger}: ${tool.description}`);
    }
    sections.push('');

    if (target.agentId) {
      const agent = manifest.agents?.find((a: any) => a.id === target.agentId);
      if (agent) {
        sections.push(`## Your Role: ${agent.name}`);
        sections.push(`  ${agent.description}`);
        sections.push('');
      }
    }

    sections.push('## Rules');
    sections.push('  NUNCA execute comandos destrutivos sem confirmacao');
    sections.push('  SEMPRE valide inputs antes de processar');
    sections.push('  NUNCA exponha secrets, tokens ou credenciais');
    sections.push('  Respeite o nivel de autonomia configurado');
    sections.push('  Documente acoes no audit trail');
    sections.push('');

    sections.push('## Limitations');
    sections.push(`  Max context: ${manifest.limitations?.maxContextWindow || 128000} tokens`);
    sections.push(`  Max output: ${manifest.limitations?.maxTokens || 4096} tokens`);
    if (manifest.limitations?.notImplemented?.length) {
      sections.push(`  Not implemented: ${manifest.limitations.notImplemented.slice(0, 5).join(', ')}`);
    }

    return sections.join('\n');
  }

  private async buildDetailedContext(manifest: any, target: EnrichTarget): Promise<string> {
    const fullContext = await this.buildFullContext(manifest, target);

    const detailed: string[] = [];
    detailed.push(fullContext);
    detailed.push('');

    detailed.push('## Events');
    for (const event of manifest.registries?.events || []) {
      detailed.push(`  ${event.name}: ${event.type}`);
    }
    detailed.push('');

    detailed.push('## Contracts (C1-C18)');
    for (const contract of manifest.registries?.contracts || []) {
      detailed.push(`  ${contract.name}: ${contract.status}`);
    }
    detailed.push('');

    detailed.push('## All Packages');
    for (const layer of manifest.architecture?.layers || []) {
      detailed.push(`  ${layer.name}:`);
      for (const pkg of layer.packages || []) {
        detailed.push(`    - ${pkg}`);
      }
    }
    detailed.push('');

    detailed.push('## All Capabilities');
    for (const cap of manifest.capabilities || []) {
      detailed.push(`  ${cap.name} [${cap.riskLevel}]: ${cap.description}`);
    }
    detailed.push('');

    detailed.push('## All Commands');
    for (const cmd of manifest.commands || []) {
      detailed.push(`  ${cmd.path}: ${cmd.description}`);
      if (cmd.examples?.length) {
        for (const ex of cmd.examples) {
          detailed.push(`    Example: ${ex}`);
        }
      }
    }

    return detailed.join('\n');
  }
}
```

### 6.3 Aplicacao no Prompt Pipeline

```typescript
// Uso no Prompt Pipeline (packages/prompt-pipeline/src/index.ts)

import { ContextEnricher } from '@ideia/llm-provider/enricher';

export class PromptPipeline {
  constructor(private enricher: ContextEnricher) {}

  async process(userInput: string, context: PipelineContext): Promise<PipelineResult> {
    // 1. GUARD - Security scan
    const guardResult = await this.runGuard(userInput);

    // 2. CLASSIFY - Intent classification
    const intent = await this.classifyIntent(userInput);

    // 3. ENRICH - Inject manifest context
    const enrichLevel = this.determineEnrichLevel(intent);
    const enrichedContext = await this.enricher.enrich(enrichLevel, {
      type: 'system-prompt',
      taskType: intent.type,
    });

    // 4. OPTIMIZE - Token economy
    const optimized = this.optimizePrompt(userInput, enrichedContext);

    // 5. PLAN - Execution plan
    const plan = await this.generatePlan(optimized, intent);

    // 6. FORMAT - Final prompt
    const finalPrompt = this.formatPrompt(optimized, plan, enrichedContext);

    return { prompt: finalPrompt, intent, plan };
  }

  private determineEnrichLevel(intent: IntentClassification): DescriptionLevel {
    switch (intent.confidence) {
      case 'high': return 'summary';
      case 'medium': return 'full';
      case 'low': return 'detailed';
      default: return 'full';
    }
  }
}
```

---

## 7. Integracao com o Reality Enforcement System

### 7.1 Oraculo da Verdade

O Manifest System e o Reality Enforcement System compartilham o mesmo principio fundamental: **toda documentacao deve refletir a realidade do codigo**. O manifesto e uma extensao natural do sistema de oraculo da verdade.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              REALITY ENFORCEMENT SYSTEM + MANIFEST SYSTEM                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  REALITY-MANIFEST.md ──── Mestre da verdade (fonte unica)         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                            │                                             │
│              ┌─────────────┴─────────────┐                               │
│              ▼                           ▼                               │
│  ┌─────────────────────┐   ┌─────────────────────┐                      │
│  │  reality-check.ps1   │   │  Manifest Generator  │                     │
│  │  (valida packages,   │   │  (gera manifesto     │                     │
│  │   endpoints, claims) │   │   do codigo real)    │                     │
│  └──────────┬──────────┘   └──────────┬──────────┘                      │
│             │                         │                                  │
│             └──────────┬──────────────┘                                  │
│                        ▼                                                 │
│  ┌────────────────────────────────────────────┐                          │
│  │  Validacao Cruzada                          │                         │
│  │  ├── Manifesto vs Reality-Manifest          │                         │
│  │  ├── Generator output vs reality-check      │                         │
│  │  └── Drift detection: diverge? → alerta     │                         │
│  └────────────────────────────────────────────┘                          │
│                        │                                                 │
│                        ▼                                                 │
│  ┌────────────────────────────────────────────┐                          │
│  │  Saida Consistente                          │                         │
│  │  ├── Manifesto SEMPRE reflete o codigo      │                         │
│  │  ├── Reality-Manifest SEMPRE reflete o codigo│                         │
│  │  └── Ambos sao validados no pre-commit      │                         │
│  └────────────────────────────────────────────┘                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Reality Validation no Manifest Generator

```typescript
// packages/manifest/src/reality-validator.ts

import { Manifest } from './types';
import { ManifestStore } from './store';
import { execSync } from 'child_process';
import path from 'path';

export interface RealityValidationResult {
  passed: boolean;
  checks: RealityCheck[];
}

export interface RealityCheck {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  severity: 'error' | 'warning';
}

export class RealityValidator {
  constructor(
    private store: ManifestStore,
    private workspaceDir: string
  ) {}

  async validateAgainstReality(manifest: Manifest): Promise<RealityValidationResult> {
    const checks: RealityCheck[] = [];

    // Check 1: Package existence
    checks.push(...await this.checkPackages(manifest));

    // Check 2: Agent definitions
    checks.push(...await this.checkAgents(manifest));

    // Check 3: Command availability
    checks.push(...await this.checkCommands(manifest));

    // Check 4: Limitacoes vs Reality-Manifest
    checks.push(...await this.checkLimitations(manifest));

    const passed = checks.every(c => c.passed || c.severity === 'warning');

    return { passed, checks };
  }

  private async checkPackages(manifest: Manifest): Promise<RealityCheck[]> {
    const checks: RealityCheck[] = [];

    for (const layer of manifest.architecture?.layers || []) {
      for (const pkg of layer.packages || []) {
        const exists = await this.pathExists(pkg);
        checks.push({
          name: `package-exists:${pkg}`,
          passed: exists,
          expected: exists ? 'exists' : 'exists',
          actual: exists ? 'exists' : 'not-found',
          severity: 'error',
        });
      }
    }

    return checks;
  }

  private async checkAgents(manifest: Manifest): Promise<RealityCheck[]> {
    const checks: RealityCheck[] = [];
    const agentDir = path.join(this.workspaceDir,
      'packages', 'agent-runtime', 'src', 'agents');

    for (const agent of manifest.agents || []) {
      const files = await this.globFiles(path.join(agentDir, '**', '*.ts'));
      const agentFile = files.find(f =>
        f.toLowerCase().includes(agent.id.toLowerCase())
      );

      checks.push({
        name: `agent-definition:${agent.id}`,
        passed: !!agentFile,
        expected: `Agent ${agent.id} defined in ${agentDir}`,
        actual: agentFile ? `Found in ${agentFile}` : 'Not found',
        severity: 'error',
      });
    }

    return checks;
  }

  private async checkCommands(manifest: Manifest): Promise<RealityCheck[]> {
    const checks: RealityCheck[] = [];
    const cliDir = path.join(this.workspaceDir, 'packages', 'cli');

    for (const cmd of manifest.commands || []) {
      const cmdName = cmd.path.replace('IDEIA ', '');
      const files = await this.globFiles(path.join(cliDir, 'src', '**', '*.ts'));
      const cmdFile = files.find(f => {
        const content = this.readFileSync(f);
        return content.includes(`'${cmdName}'`) ||
               content.includes(`"${cmdName}"`) ||
               content.includes(`\`${cmdName}\``);
      });

      checks.push({
        name: `command-implemented:${cmd.path}`,
        passed: !!cmdFile,
        expected: `Command ${cmd.path} implemented`,
        actual: cmdFile ? `Found in ${cmdFile}` : 'Not found',
        severity: 'warning',
      });
    }

    return checks;
  }

  private async checkLimitations(manifest: Manifest): Promise<RealityCheck[]> {
    const checks: RealityCheck[] = [];
    const realityManifestPath = path.join(this.workspaceDir,
      'docs', 'governance', 'REALITY-MANIFEST.md');

    try {
      const content = this.readFileSync(realityManifestPath);

      for (const limitation of manifest.limitations?.notImplemented || []) {
        // Verifica se a limitacao e mencionada no reality-manifest
        const isMentioned = content.toLowerCase().includes(limitation.toLowerCase());
        checks.push({
          name: `limitation-documented:${limitation.slice(0, 40)}`,
          passed: isMentioned,
          expected: `Limitation mentioned in REALITY-MANIFEST.md`,
          actual: isMentioned ? 'Mentioned' : 'Not mentioned',
          severity: 'warning',
        });
      }
    } catch {
      checks.push({
        name: 'reality-manifest-exists',
        passed: false,
        expected: 'REALITY-MANIFEST.md exists',
        actual: 'Not found',
        severity: 'error',
      });
    }

    return checks;
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.workspaceDir, p);
      await import('fs/promises').then(fs => fs.access(fullPath));
      return true;
    } catch {
      return false;
    }
  }

  private async globFiles(pattern: string): Promise<string[]> {
    const { glob } = await import('glob');
    return glob(pattern);
  }

  private readFileSync(filePath: string): string {
    try {
      const fs = require('fs');
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }
}
```

### 7.3 Pre-Commit Hook para Manifesto

```powershell
# scripts/validate-manifest.ps1
# Pre-commit hook: valida manifesto contra codigo real

param(
    [switch]$Fix = $false
)

$ErrorActionPreference = "Stop"
$workspaceDir = Split-Path -Parent $PSScriptRoot

Write-Host "[MANIFEST] Validating manifest against code reality..." -ForegroundColor Cyan

# 1. Executa geracao do manifesto
Write-Host "[MANIFEST] Regenerating manifest from source..." -ForegroundColor Yellow
$result = & "npx" "tsx" "packages/manifest/src/cli.ts" "generate" "--workspace" $workspaceDir

if ($LASTEXITCODE -ne 0) {
    Write-Host "[MANIFEST] FAILED: Manifest generation failed" -ForegroundColor Red
    exit 1
}

# 2. Valida manifesto gerado
Write-Host "[MANIFEST] Validating manifest schema..." -ForegroundColor Yellow
$result = & "npx" "tsx" "packages/manifest/src/cli.ts" "validate" "--manifest" ".ideia/manifest/manifest.yaml"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[MANIFEST] FAILED: Manifest validation failed" -ForegroundColor Red
    exit 1
}

# 3. Reality check
Write-Host "[MANIFEST] Running reality check..." -ForegroundColor Yellow
$result = & ".\scripts\reality-check.ps1" "-Manifest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[MANIFEST] FAILED: Reality check failed" -ForegroundColor Red
    if (-not $Fix) {
        Write-Host "[MANIFEST] Run with -Fix to auto-correct" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "[MANIFEST] PASSED - Manifest is consistent with code reality" -ForegroundColor Green
```

### 7.4 Gatilhos de Atualizacao do Manifesto

| Evento | Gatilho | Acao |
|--------|---------|------|
| Novo package criado | `npm init` em `packages/` | Re-scan packages, regenerar manifesto |
| Nova interface publica | Commit com `export` novo | Re-scan interfaces, regenerar |
| Novo comando CLI | Commit em `packages/cli/src/commands/` | Re-scan commands, regenerar |
| Novo agente | Commit em `packages/agent-runtime/src/agents/` | Re-scan agents, regenerar |
| Novo endpoint | Commit com rota Express/Fastify | Re-scan endpoints, regenerar |
| Pre-commit | `git commit` | Validacao completa do manifesto |
| Schedule | `0 */6 * * *` (a cada 6h) | Re-generacao + validacao |
| Manual | `IDEIA manifest refresh` | Re-generacao forçada |
| CI/CD | `main` branch push | Validacao + publish do manifesto |

---

## 8. Exemplos Completos

### 8.1 Manifesto YAML Completo da IDEIA

O manifesto completo gerado para a IDEIA v0.5.0 se encontra em:
- `.ideia/manifest/manifest.yaml` — formato YAML (leitura humana)
- `.ideia/manifest/manifest.json` — formato JSON (leitura programatica)

Exemplo de secao do manifesto gerado para um package real:

```yaml
# Secao extraida do manifesto gerado em 2026-07-22
# packages/agent-runtime/src/agents/analyst.ts detectado automaticamente

agents:
  - id: analyst
    name: Analyst
    role: "Requirements analysis"
    description: "Analisa requisitos do usuario, identifica ambiguidades"
    capabilities:
      - intent-classification
      - requirement-analysis
      - specification-writing
    autonomyLevel: N1
    tools:
      - read-file
      - search-codebase
    detectedFrom: packages/agent-runtime/src/agents/analyst.ts
    confidence: 0.95
```

### 8.2 Self-Description em Nivel Summary

```markdown
# IDEIA v0.5.0 -- Summary

IDEIA transforms ideas into complete systems using AI agents.

Architecture: Clean Architecture + DDD + Event-Driven
Layers: Shell, Theia, Agents, Intelligence, Memory, Execution,
        Messaging, Security, Infrastructure, Data

Agents: Analyst(N1), Architect(N1), Programmer(N2),
        Reviewer(N1), Tester(N2), DevOps(N2)

Capabilities: Intent Classification, Code Generation,
              Code Review, Automated Deployment, Persistent Memory

Commands: IDEIA init, generate, audit, verify, reality-sync

Context: 128K tokens max | 4096 tokens output
Models: ollama/*, openai/gpt-4*, anthropic/claude-3*, deepseek/*
```

### 8.3 Self-Description em Nivel Full

```markdown
# IDEIA v0.5.0 -- Full Description

## Architecture (10 layers)
  shell: Desktop/Web/Theia Cloud
  platform: Theia + Monaco + Theia AI
  agents: 6 agents (Analyst, Architect, Programmer, Reviewer, Tester, DevOps)
  intelligence: Pattern Detector, Learning Engine, RAG Engine
  memory: SQLite+FTS5, DuckDB, Knowledge Graph
  execution: Agent Runtime, Workflow Engine, Delivery Orchestrator
  messaging: NATS JetStream (in-memory bridge)
  security: Policy Engine, Prompt Security, Audit Trail
  infrastructure: Resilience Engine, Observability
  data: Data Layer, Schema Registry

## Agent: Programmer (N2)
  Implements features, fixes bugs, writes unit tests, refactors code.
  Autonomy: N2 (semi-autonomous, can write code without approval)
  Tools: read-file, write-file, run-command, search-codebase

## Key Rules
  1. NEVER execute destructive commands without confirmation
  2. ALWAYS validate inputs before processing
  3. NEVER expose secrets, tokens or credentials
  4. RESPECT configured autonomy level
  5. DOCUMENT actions in audit trail

## Limitations
  NATS in-memory bridge (not native JetStream yet)
  No LangGraph multi-agent coordination
  No Cedar Policy (custom policy engine)
  No Tauri/Electron native app
```

### 8.4 Auto-Descricao para Integracao com LLM Externo

Cenario: Um LLM externo (ex: Claude Code, Cursor) precisa se integrar com a IDEIA.

```json
// GET /self?level=full&format=json
// Resposta da Self-Description API

{
  "identity": {
    "name": "IDEIA",
    "version": "0.5.0",
    "description": "AI-assisted development platform"
  },
  "integration": {
    "protocol": "HTTP REST + SSE + WebSocket",
    "baseUrl": "http://localhost:3001",
    "authType": "token",
    "endpoints": [
      { "path": "/self", "method": "GET", "description": "Self-description" },
      { "path": "/manifest", "method": "GET", "description": "Full manifest" },
      { "path": "/api/chat/completions", "method": "POST", "description": "Chat with agents" },
      { "path": "/api/agents/:id/execute", "method": "POST", "description": "Execute agent task" },
      { "path": "/api/workflows/:id/run", "method": "POST", "description": "Run workflow" }
    ],
    "events": [
      { "name": "agent.action", "type": "sse", "endpoint": "/events/agent" },
      { "name": "workflow.completed", "type": "sse", "endpoint": "/events/workflow" },
      { "name": "memory.update", "type": "sse", "endpoint": "/events/memory" }
    ],
    "capabilities": [
      "code-generation",
      "code-review",
      "test-generation",
      "deployment",
      "memory-persistence"
    ]
  }
}
```

### 8.5 CLI para Manifesto

```bash
# Comandos do Manifest System via CLI

# Visualizar manifesto completo (formato YAML)
IDEIA manifest get

# Visualizar em formato JSON
IDEIA manifest get --format json

# Visualizar apenas secao de agentes
IDEIA manifest get --section agents

# Auto-descricao em nivel summary
IDEIA manifest self --level summary

# Auto-descricao em nivel full (para LLM)
IDEIA manifest self --level full --format markdown

# Regenerar manifesto a partir do codigo
IDEIA manifest refresh

# Validar manifesto contra schema
IDEIA manifest validate

# Validar manifesto contra realidade do codigo
IDEIA manifest validate --reality

# Verificar drift entre manifesto e codigo
IDEIA manifest drift

# Servir Self-Description API (porta 3001)
IDEIA manifest serve --port 3001
```

---

## 9. Conexoes com Outros Estudos

### 9.1 Matriz de Conexoes

| Estudo | Conexao | Sinergia |
|--------|---------|----------|
| **S4** - Seguranca e Governanca | O manifesto expoe capacidades com niveis de risco; a seguranca usa o manifesto para policy evaluation | Manifesto como fonte de verdade para politicas de seguranca |
| **S11** - Theia IDE Integration | A Self-Description API e servida como plugin Theia; o manifesto descreve capacidades Theia | Manifesto exposto como widget no Theia |
| **S19** - Engenharia de Prompts | O Context Enricher injeta manifesto no prompt pipeline; o manifesto otimiza o uso de tokens | Enriquecimento automatico de prompts |
| **T1** - Topologia de Integracao | O manifesto cataloga todos os 66 packages, 130+ comandos, 18 contratos | Manifesto como entregavel da topologia |
| **S3** - Intencao para Plano | O manifesto informa a classificacao de intencao com capacidades disponiveis | Contexto para planejamento |
| **S5** - Orquestracao Multiagente | O manifesto descreve agentes, suas capacidades e workflows multi-passo | Base para roteamento de agentes |
| **S6** - Pipeline de Entrega | O manifesto inclui workflows de entrega; o delivery orchestrator consome workflows do manifesto | Workflows descritos no manifesto |
| **S2** - Memoria e Contexto | O manifesto referencia sistemas de memoria; o memory store expoe schemas no manifesto | Schema registry integrado |
| **S18** - AI Safety | O manifesto documenta limitacoes e riscos; a safety pipeline usa o manifesto para configuracao | Transparencia de capacidades |
| **S23** - Self-Optimization | O Self-Optimization Panel usa o manifesto para detectar gaps e oportunidades | Auto-auditoria baseada em manifesto |
| **S24** - Controle e Seguranca | O manifesto alimenta a Control Tower com capacidades, autonomia e restricoes | Fonte para decision engine |
| **S25** - Perfis e Configuracao | O manifesto fornece a base para arvore de configuracao e perfis de usuario | Auto-descricao para configuracao |

### 9.2 Diagrama de Conexoes

```
                    ┌──────────────────────────┐
                    │       S19 - Prompts       │
                    │  Context Enricher injeta  │
                    │  manifesto no prompt      │
                    └────────────┬─────────────┘
                                 │
    ┌──────────────┐            │            ┌──────────────┐
    │ T1 - Topologia│            │            │ S4 - Seguranca│
    │ 66 packages,  │            │            │ Policy engine │
    │ 130 comandos  │◄───────────┼───────────►│ consume risco │
    └──────────────┘            │            └──────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │    ESTUDO S26             │
                    │  Manifest & Self-         │
                    │  Description System        │
                    └────────────┬─────────────┘
                                 │
    ┌──────────────┐            │            ┌──────────────┐
    │ S11 - Theia  │            │            │ S5 - Multi-  │
    │ Plugin Theia │◄───────────┼───────────►│ agentes      │
    │ exibe self   │            │            │ Roteamento   │
    └──────────────┘            │            └──────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │    S23 - Self-Opt         │
                    │  Auto-auditoria           │
                    │  usa manifest para gaps   │
                    └──────────────────────────┘
```

### 9.3 Impacto nos Estudos Existentes

| Estudo | Impacto | Acao Recomendada |
|--------|---------|------------------|
| S19 | Context Enricher substitui injecao manual de contexto nos templates de prompt | Atualizar Prompt Engine para usar Context Enricher |
| T1 | Manifesto se torna entregavel obrigatorio da topologia | Atualizar template de topologia para incluir geracao de manifesto |
| S4 | Manifesto pode ser fonte para regras de policy engine | Adicionar `manifest.getCapabilities()` no PolicyGateway |
| S11 | Self-Description API como widget Theia | Criar Theia widget `SelfDescriptionWidget` |
| S18 | Manifesto documenta limitacoes de seguranca e alinhamento | Adicionar secao `securityPosture` no manifesto |

---

## 10. Plano de Implementacao

### 10.1 Tasks e Esforco Estimado

| ID | Task | Esforco (h) | Prioridade | Depende de |
|----|------|-------------|------------|------------|
| M26-01 | Criar pacote `packages/manifest` com estrutura basica | 4 | P0 | — |
| M26-02 | Implementar `CodeScanner` (scan de packages, interfaces, endpoints) | 8 | P0 | M26-01 |
| M26-03 | Definir JSON Schema do manifesto (Zod) | 4 | P0 | M26-01 |
| M26-04 | Implementar `ManifestValidator` com validacao Zod | 4 | P0 | M26-03 |
| M26-05 | Implementar `ManifestGenerator` com builder de manifesto | 8 | P0 | M26-02, M26-04 |
| M26-06 | Implementar `ManifestStore` com cache LRU e persistencia YAML/JSON | 4 | P0 | M26-01 |
| M26-07 | Implementar `ManifestResolver` com queries e filtros | 6 | P0 | M26-06 |
| M26-08 | Implementar `ContextEnricher` com 3 niveis de detalhe | 8 | P0 | M26-07 |
| M26-09 | Implementar `Self-Description API` (5 endpoints REST) | 6 | P0 | M26-07 |
| M26-10 | Integrar Context Enricher no Prompt Pipeline (S19) | 4 | P0 | M26-08, S19 |
| M26-11 | Integrar manifesto no Reality Enforcement System | 4 | P0 | M26-05, RES |
| M26-12 | Criar CLI `IDEIA manifest` (get, self, refresh, validate, serve) | 8 | P1 | M26-09 |
| M26-13 | Criar pre-commit hook para validacao do manifesto | 4 | P1 | M26-11 |
| M26-14 | Criar Self-Description Widget para Theia (S11) | 6 | P1 | M26-09, S11 |
| M26-15 | Adicionar schema registry (eventos e contratos) no manifesto | 6 | P1 | M26-05 |
| M26-16 | Implementar RealityValidator (manifesto vs codigo real) | 6 | P1 | M26-11 |
| M26-17 | Criar teste de geracao de manifesto no CI | 4 | P1 | M26-05 |
| M26-18 | Documentar API de auto-descricao para integradores externos | 4 | P2 | M26-09 |
| M26-19 | Adicionar detector de drift (schedule 6h) | 4 | P2 | M26-16 |
| M26-20 | Otimizar manifesto para consumo eficiente de tokens (< 500/4000/8000) | 4 | P2 | M26-08 |

**Total estimado:** 106 horas

### 10.2 Dependencias entre Tasks

```
M26-01 ──┬── M26-02 ──┬── M26-05 ──┬── M26-12 (CLI)
         │            │            ├── M26-15 (schema registry)
         │            │            └── M26-17 (tests)
         │            │
         ├── M26-03 ──┴── M26-04 (validator)
         │
         └── M26-06 ──┬── M26-07 ──┬── M26-08 ──┬── M26-10 (Prompt Pipeline)
                       │            │             └── M26-20 (optimization)
                       │            │
                       └────────────┴── M26-09 ──┬── M26-14 (Theia widget)
                                                  └── M26-18 (docs)

M26-11 ──┬── M26-13 (pre-commit)
         └── M26-16 ──┬── M26-19 (drift detector)
```

### 10.3 Roadmap de Implementacao

```
Fase 1 (Semana 1-2): Core do Manifest System
  M26-01 a M26-09: Pacote completo com generator, validator, resolver, store, API
  Resultado: Manifesto funcional com auto-geracao basica

Fase 2 (Semana 3-4): Integracoes
  M26-10 a M26-14: Integracao com Prompt Pipeline, RES, CLI, pre-commit, Theia
  Resultado: Manifesto usado ativamente no ecossistema IDEIA

Fase 3 (Semana 5-6): Maturidade
  M26-15 a M26-20: Schema registry, reality validator, drift detection, otimizacao
  Resultado: Manifesto como fonte de verdade auto-verificavel
```

### 10.4 Criterios de Aceitacao

| Criterio | Descricao | Verificacao |
|----------|-----------|-------------|
| **CA-01** | `IDEIA manifest generate` gera manifesto valido em < 5s | `time IDEIA manifest generate` |
| **CA-02** | Manifesto YAML gerado e valido contra schema Zod | `IDEIA manifest validate` exit 0 |
| **CA-03** | 3 niveis de auto-descricao (500/4000/8000 tokens) | `IDEIA manifest self --level full` |
| **CA-04** | Self-Description API responde em < 100ms | `curl localhost:3001/self` time |
| **CA-05** | Pre-commit hook bloqueia commit com manifesto invalido | `git commit` com manifesto corrompido |
| **CA-06** | Reality validator detecta packages faltando | `IDEIA manifest validate --reality` |
| **CA-07** | Context Enricher injeta manifesto em prompts automaticamente | Teste de integracao com Prompt Pipeline |
| **CA-08** | CLI `IDEIA manifest` tem --json, --verbose, --format | `IDEIA manifest get --format json` |

### 10.5 Metricas de Sucesso

| Metrica | Alvo v1.0 | Alvo v2.0 | Medicao |
|---------|-----------|-----------|---------|
| Cobertura de packages no manifesto | > 90% | 100% | Scan vs manifesto |
| Precisao do manifesto vs codigo real | > 95% | > 99% | Reality validation |
| Tempo de geracao do manifesto | < 5s | < 2s | `time IDEIA manifest generate` |
| Latencia da Self-Description API | < 100ms | < 30ms | k6 load test |
| Token overhead do Context Enricher | < 5% do prompt | < 2% | Medicao de tokens |
| Drift detection time | < 5min | < 30s | Schedule + trigger |
| Adocao em prompts | 100% dos prompts | 100% | Audit trail |
| Satisfacao de IAs integradas | NPS > 50 | NPS > 70 | Survey |

---

## Referencias

### Documentos Internos

| Referencia | Descricao |
|------------|-----------|
| AGENTS.md | Regras e arquitetura da IDEIA |
| VISAO-PRODUTO-IDEIA.md | Conceito e promessa de valor da IDEIA |
| ESTUDO-ENGENHARIA-PROMPTS-AGENTES.md (S19) | Prompt pipeline e engenharia de prompts |
| ESTUDO-COMPLETO-TOPOLOGIA-INTEGRACAO-IDEIA.md (T1) | Topologia de 66 packages, 130+ comandos |
| ESTUDO-AI-SAFETY-ALIGNMENT.md (S18) | Seguranca de IA e alinhamento |
| ESTUDO-CONTROLE-SEGURANCA-SINTONIA-IDEIA-IA.md (S24) | Control Tower e circuito de seguranca |
| ESTUDO-AJUSTES-USUARIO-PERFIS-CONFIGURACAO.md (S25) | Perfis de usuario e arvore de config |
| ESTUDO-SELF-OPTIMIZATION-PANEL-AUTONOMOUS-EVOLUTION.md (S23) | Auto-otimizacao e evolucao autonoma |
| THEIA-IDEIA-RESEARCH.md (S11) | Integracao Theia IDE |
| docs/governance/REALITY-MANIFEST.md | Mestre da verdade do projeto |
| docs/governance/GAPS-PRODUCAO-IDE.md | Catalogacao de 60+ gaps |
| TASKS-IMPLEMENTACAO-DIRETA.md | 36 tasks de implementacao |

### Tecnologias e Ferramentas

| Tecnologia | Uso no Manifest System |
|------------|----------------------|
| **Zod** | Schema validation do manifesto |
| **YAML** | Formato de armazenamento do manifesto |
| **Express/Fastify** | Self-Description API endpoints |
| **glob** | Scan de arquivos no code scanner |
| **node:fs** | Leitura de arquivos para scan |
| **uuid** | Identificadores unicos de manifesto |
| **LRU Cache** | Cache do manifesto na ManifestStore |
| **Commander/Yargs** | CLI commands para manifesto |

### Referencias Externas

- JSON Schema Specification (Draft 2020-12): https://json-schema.org/specification
- Zod Documentation: https://zod.dev/
- YAML Spec 1.2.2: https://yaml.org/spec/
- OpenAPI Specification: https://spec.openapis.org/oas/v3.1.0
- MCP (Model Context Protocol): https://modelcontextprotocol.io/
- Anthropic Context Guidelines: https://docs.anthropic.com/claude/docs/constructing-prompts

---

> **Proximo passo:** Criar `packages/manifest` com `CodeScanner`, `ManifestGenerator`, `ManifestValidator`, `ManifestStore`, `ManifestResolver`, `ContextEnricher` e `Self-Description API`. Integrar com Prompt Pipeline (S19) e Reality Enforcement System. Adicionar pre-commit hook de validacao.
