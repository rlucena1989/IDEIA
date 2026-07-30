# ESTUDO S28 — Zero-to-Deploy Orchestration Architecture

> **Data:** 2026-07-22
> **Versao:** 1.0
> **Classificacao:** Estrategico / Arquitetura de Orquestracao
> **Propósito:** Definir a arquitetura de orquestracao que guia o usuario do conceito inicial ate o deploy — o fluxo unificado que realiza a promessa "De a ideia, nos entregamos a solucao."
> **Estudos-base:** S3 (INTENT-TO-PLAN-RESEARCH), S5 (ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA), S6 (PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA), S16 (ESTUDO-DEPLOY-ENTREGA-CONTINUA), S26 (REALITY-MANIFEST), S27 (Capability Registry)
> **Status:** Proposto — Pendente de implementacao

---

## Sumario

1. [Introducao](#1-introducao)
2. [Visao Geral do Fluxo](#2-visao-geral-do-fluxo)
3. [Fase 1: Ideia e Requisitos](#3-fase-1-ideia-e-requisitos)
4. [Fase 2: Arquitetura](#4-fase-2-arquitetura)
5. [Fase 3: Implementacao](#5-fase-3-implementacao)
6. [Fase 4: Testes e Integracao](#6-fase-4-testes-e-integracao)
7. [Fase 5: Build e Package](#7-fase-5-build-e-package)
8. [Fase 6: Deploy](#8-fase-6-deploy)
9. [Orquestrador Central](#9-orquestrador-central)
10. [Interacao Humana](#10-interacao-humana)
11. [Playbook Executavel](#11-playbook-executavel)
12. [Codigo TypeScript](#12-codigo-typescript)
13. [Conexoes com Outros Estudos](#13-conexoes-com-outros-estudos)
14. [Plano de Implementacao](#14-plano-de-implementacao)

---

## 1. Introducao

### 1.1 A Promessa vs Realidade

A IDEIA promete "De a ideia, nos entregamos a solucao." Esta e a proposicao de valor central — o motivo pelo qual um usuario escolheria a IDEIA em vez de escrever codigo manualmente ou usar ferramentas isoladas.

**Diagnostico atual:**

```
REALIDADE HOJE                              PROMESSA
─────────────────────────────               ─────────────────────────────
Usuario da ideia vaga                       Usuario da ideia vaga
       │                                            │
       ▼                                            ▼
Precisa navegar 15+ comandos CLI            Fluxo unificado com 1 comando
       │                                            │
       ▼                                            ▼
Cada etapa isolada (plan, code, test)       Orquestracao automatica 6 fases
       │                                            │
       ▼                                            ▼
Nenhum checkpoint, retry ou rollback         State machine com checkpoint/recover
       │                                            │
       ▼                                            ▼
Deploy: zero automation                     Deploy: 1-click com rollback
```

Nao existe hoje um fluxo orquestrado que guie o usuario do conceito inicial ate o deploy. Cada etapa existe isoladamente — o Prompt Pipeline classifica, o Agent Runtime executa, o Delivery Orchestrator faz deploy — mas nao ha coordenacao entre elas. O orquestrador zero-to-deploy e o tecido que une estas capacidades em um fluxo coeso.

### 1.2 Por Que Isto e o Diferencial Central

| Aspecto | Sem Orquestracao | Com Orquestracao Zero-to-Deploy |
|---------|-----------------|--------------------------------|
| Experiencia do usuario | Multiplos comandos, documentacao esparsa | Comando unico `IDEIA deploy <desc>` |
| Continuidade | Estado perdido entre etapas | Checkpoint persistente, retomada |
| Qualidade | Dependente do operador humano | Quality gates automaticos em cada fase |
| Rastreabilidade | Logs isolados | Audit trail completo com hash chain |
| Tempo ate deploy | Horas/dias | Minutos (ideal) |
| Adocao | Barreira alta | Plug-and-play |

### 1.3 Escopo do Estudo

Este estudo define a arquitetura, os contratos, o fluxo de estados e os padroes de implementacao para o **Orquestrador Zero-to-Deploy** — o componente que transforma a IDEIA de um conjunto de ferramentas em um sistema coerente de entrega de software.

---

## 2. Visao Geral do Fluxo

### 2.1 Macro Fluxo: 6 Fases

```
FASE 0: ENTRADA
   Usuario: "Quero um CRUD de usuarios com autenticacao JWT"
   │
   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              ORQUESTRADOR CENTRAL (Workflow Engine)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ FASE 1   │─▶│ FASE 2   │─▶│ FASE 3   │─▶│ FASE 4   │─▶│ FASE 5 │─▶ FASE 6
│  │ Ideia &  │  │ Arquite- │  │ Imple-   │  │ Testes & │  │ Build & │   Deploy
│  │ Requis.  │  │ tura     │  │ mentacao  │  │ Integrac.│  │ Package │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘
│       │              │             │             │             │
│       ▼              ▼             ▼             ▼             ▼
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐
│  │Analyst   │  │Architect │  │Programmer│  │Tester    │  │DevOps  │
│  │Agent     │  │Agent     │  │Agent     │  │+Reviewer │  │Agent   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
   SISTEMA ENTREGUE: API REST + Banco + Docker + CI/CD + Deploy
```

### 2.2 State Machine do Fluxo

```
                              ┌─────────────┐
                              │   ENTRY     │
                              │  (ideia     │
                              │   bruta)    │
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                     ┌───────▶│ REQUIREMENTS │◀────── (retry)
                     │        └──────┬──────┘
                     │               │
                     │               ▼
                     │        ┌─────────────┐
                     │        │ ARCHITECTURE │◀────── (retry)
                     │        └──────┬──────┘
                     │               │
                     │               ▼
                     │        ┌─────────────┐
                     │        │ IMPLEMENT   │◀────── (retry)
                     │        └──────┬──────┘
                     │               │
                     │               ▼
                     │        ┌─────────────┐
                     │        │  TESTING    │◀────── (fail → back to IMPLEMENT)
                     │        └──────┬──────┘
                     │               │
                     │               ▼
                     │        ┌─────────────┐
                     │        │  BUILD      │
                     │        └──────┬──────┘
                     │               │
                     │               ▼
                     │        ┌─────────────┐
                     │        │   DEPLOY    │
                     │        └──────┬──────┘
                     │               │
                     │               ▼
                     │        ┌─────────────┐
                     │        │ VERIFY      │
                     │        └──────┬──────┘
                     │               │
                     │        pass / fail
                     │          │    │
                     │          │    ▼
                     │          │  (rollback)
                     │          ▼
                     │    ┌──────────┐
                     └────│ COMPLETED│
                          └──────────┘
```

### 2.3 Contratos entre Fases

Cada fase produz artefatos contratados que a fase seguinte consome:

| Fase | Artefato de Saida | Consumido Por |
|------|------------------|---------------|
| F1 — Requisitos | `specification.json` — requisitos, user stories, aceitacao | F2 — Arquitetura |
| F2 — Arquitetura | `architecture.json` — ADRs, diagramas, stack, riscos | F3 — Implementacao |
| F3 — Implementacao | `source-code/` — repositorio completo com codigo | F4 — Testes |
| F4 — Testes | `test-report.json` — resultados, cobertura, qualidade | F5 — Build |
| F5 — Build | `artifacts/` — imagens, pacotes, SBOM | F6 — Deploy |
| F6 — Deploy | `deploy-report.json` — status, health, rollback | Orquestrador |

---

## 3. Fase 1: Ideia e Requisitos

### 3.1 Fluxo da Fase

```
ENTRADA: Texto livre do usuario: "Quero um CRUD de usuarios com autenticacao JWT"
                                                                               
         ┌──────────────────────────────────────────────────────────────┐       
         │              FASE 1 — IDEIA E REQUISITOS                     │       
         │                                                              │       
         │  ① Prompt Pipeline classifica intencao ← S3                  │       
         │     ├── feature | bugfix | refactor | question               │       
         │     ├── extracao de entidades (stack, dominio, requisitos)    │       
         │     └── urgencia: low | medium | high | critical             │       
         │                                                              │       
         │  ② Agent Analyst extrai requisitos                           │       
         │     ├── entrevista estruturada (LLM-guided)                  │       
         │     ├── identificacao de stakeholders implicados              │       
         │     ├── mapeamento de restricoes (tempo, orcamento, equipe)  │       
         │     └── identificacao de dependencias externas               │       
         │                                                              │       
         │  ③ Geracao de user stories                                  │       
         │     ├── "Como [papel] quero [feature] para [beneficio]"      │       
         │     ├── decomposicao em epics → stories → tasks             │       
         │     └── priorizacao (MoSCoW: Must/Should/Could/Wont)         │       
         │                                                              │       
         │  ④ Criterios de aceitacao                                   │       
         │     ├── cenarios Given/When/Then (Gherkin)                   │       
         │     ├── definicao de "pronto" (DoD)                          │       
         │     └── metricas de sucesso (KPIs tecnicos)                  │       
         │                                                              │       
         │  ⑤ CHECKPOINT: Aprovacao humana                              │       
         │     ├── requisitos apresentados para revisao                 │       
         │     ├── usuario ajusta, adiciona, remove                     │       
         │     └── aprovado → Fase 2 | rejeitado → retorna ①           │       
         └──────────────────────────────────────────────────────────────┘       
                                                                               
SAIDA: specification.json (contrato assinado)
```

### 3.2 Contrato — specification.json

```typescript
interface Specification {
  id: string;
  title: string;
  description: string;
  intent: 'feature' | 'bugfix' | 'refactor' | 'question';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  entities: {
    domain: string;
    stack: string[];
    requirements: string[];
  };
  userStories: Array<{
    id: string;
    role: string;
    want: string;
    benefit: string;
    priority: 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
    acceptanceCriteria: Array<{
      scenario: string;
      given: string;
      when: string;
      then: string;
    }>;
  }>;
  constraints: {
    time?: string;
    budget?: string;
    team?: string;
    external: string[];
  };
  definitionOfDone: string[];
  approvedAt?: string;
  approvedBy?: string;
}
```

### 3.3 Metricas de Qualidade da Fase

| Metrica | Alvo | Medicao |
|---------|------|---------|
| Cobertura de requisitos | >90% dos requisitos implicitos detectados | Comparacao com checklist de dominio |
| Clareza de user stories | Todas com criterios de aceitacao | Validacao de schema |
| Tempo medio da fase | <5 minutos (ideia complexa) | Timing do workflow |
| Precisao de classificacao | >85% match com revisao humana | Amostragem estatistica |

### 3.4 Integracao com S3 (Intent-to-Plan)

O Prompt Pipeline existente (S3) e o entry point obrigatorio. O classificador de intencao atual (switch-case de 6 palavras em `inferTaskType()`) deve ser substituido pelo classificador LLM-based descrito no estudo S3, secao 1.1.

```
Fluxo de integracao:
  Usuario input
    → Prompt Pipeline (S3) classifica e enriquece
    → Agent Analyst (S28) extrai requisitos detalhados
    → Orquestrador persiste checkpoint
    → Gate: aprovacao humana
```

---

## 4. Fase 2: Arquitetura

### 4.1 Fluxo da Fase

```
ENTRADA: specification.json da Fase 1

         ┌──────────────────────────────────────────────────────────────┐
         │              FASE 2 — ARQUITETURA                            │
         │                                                              │
         │  ① Agent Architect analisa requisitos                       │
         │     ├── le specification.json                                │
         │     ├── consulta Capability Registry (S27)                   │
         │     ├── verifica Reality Manifest (S26)                      │
         │     └── identifica padroes e reuso                           │
         │                                                              │
         │  ② Selecao de stack tecnologica                             │
         │     ├── consulta Matriz Tecnologica v2                       │
         │     ├── recomenda: framework, banco, mensageria, etc.        │
         │     ├── justificativa baseada em requisitos                  │
         │     └── compatibilidade cross-platform verificada            │
         │                                                              │
         │  ③ Geracao de ADRs (Architecture Decision Records)          │
         │     ├── titulo, contexto, decisao, consequencias             │
         │     ├── opcoes consideradas com pros/cons                   │
         │     └── status: proposed | accepted | deprecated             │
         │                                                              │
         │  ④ Diagramas de arquitetura                                 │
         │     ├── diagrama de contexto (C4 Nivel 1)                    │
         │     ├── diagrama de container (C4 Nivel 2)                   │
         │     ├── diagrama de componente (C4 Nivel 3)                  │
         │     └── diagrama de sequencia (fluxos criticos)              │
         │                                                              │
         │  ⑤ Analise de riscos                                        │
         │     ├── riscos tecnicos (escalabilidade, seguranca, perf)    │
         │     ├── riscos de prazo (complexidade, dependencias)         │
         │     ├── matriz probabilidade x impacto                       │
         │     └── mitigacoes propostas                                 │
         │                                                              │
         │  ⑥ Estimativa de esforco                                     │
         │     ├── pontos de funcao ou story points                     │
         │     ├── decomposicao por modulo                              │
         │     ├── estimativa otimista/provavel/pessimista (PERT)       │
         │     └── cronograma sugerido                                  │
         │                                                              │
         │  ⑦ CHECKPOINT: Revisao de arquitetura                        │
         │     ├── arquitetura apresentada para humano                 │
         │     ├── ADRs abertos para discussao                          │
         │     └── aprovado → Fase 3 | rejeitado → retorna ①          │
         └──────────────────────────────────────────────────────────────┘

SAIDA: architecture.json (ADRs, diagramas, stack, riscos, estimativas)
```

### 4.2 Contrato — architecture.json

```typescript
interface Architecture {
  id: string;
  specificationId: string;
  stack: {
    language: string;
    framework: string;
    database: string;
    messaging: string;
    cache: string;
    deployment: string;
    observability: string;
  };
  adrs: Array<{
    id: string;
    title: string;
    context: string;
    decision: string;
    options: Array<{ name: string; pros: string[]; cons: string[] }>;
    consequences: string;
    status: 'proposed' | 'accepted' | 'deprecated';
  }>;
  diagrams: {
    context: string;    // PlantUML ou Mermaid
    container: string;
    component: string;
    sequence: string;
  };
  risks: Array<{
    id: string;
    description: string;
    probability: 1|2|3|4|5;
    impact: 1|2|3|4|5;
    score: number;
    mitigation: string;
    owner: string;
  }>;
  estimates: {
    totalStoryPoints: number;
    optimistic: number;
    probable: number;
    pessimistic: number;
    modules: Array<{
      name: string;
      sp: number;
      dependencies: string[];
    }>;
  };
  approvedAt?: string;
  approvedBy?: string;
}
```

### 4.3 Exemplo de ADR Gerado

```
ADR-001: Banco de Dados para CRUD de Usuarios
──────────────────────────────────────────────
Contexto:  O sistema precisa armazenar usuarios com dados
           basicos (nome, email, senha hash) e suportar
           queries por email e ID. Escala prevista: <10k
           usuarios simultaneos.

Opcoes:
  1. PostgreSQL — relacional maduro, JSONB para flexibilidade,
     ACID, ecossistema rico
  2. MongoDB — schemaless, escalabilidade horizontal nativa,
     mas sem ACID forte
  3. SQLite — zero config, embarcado, mas sem concorrencia

Decisao: PostgreSQL via Prisma ORM
  - Prisma fornece type-safe queries + migrations
  - PostgreSQL cobre requisitos atuais com margem de crescimento
  - Ecossistema pgvector prepara para futuros embeddings

Consequencias:
  + Migrations versionadas e auditaveis
  + Type safety do banco ao frontend
  - Requer servidor PostgreSQL (nao embarcado)
  - Complexidade adicional vs SQLite para MVP
```

### 4.4 Integracao com S27 (Capability Registry)

A Fase 2 consulta o Capability Registry (S27) para:
- Verificar quais capacidades da IDEIA podem ser reusadas
- Evitar reimplementacao de componentes existentes
- Sugerir adapters existentes (LSP, DAP, Policy, etc.)

```
Agent Architect:
  ├── capabilityRegistry.query({ domain: "auth", type: "adapter" })
  │     → returns: [ "auth/jwt", "auth/oauth2", "auth/basic" ]
  ├── capabilityRegistry.query({ domain: "database", type: "orm" })
  │     → returns: [ "orm/prisma", "orm/drizzle", "orm/typeorm" ]
  └── capabilityRegistry.query({ domain: "deploy", type: "template" })
        → returns: [ "deploy/docker-compose", "deploy/k8s" ]
```

---

## 5. Fase 3: Implementacao

### 5.1 Fluxo da Fase

```
ENTRADA: architecture.json da Fase 2

         ┌──────────────────────────────────────────────────────────────┐
         │              FASE 3 — IMPLEMENTACAO                          │
         │                                                              │
         │  ① Agent Programmer prepara ambiente                        │
         │     ├── scaffold do projeto (Node CLI, API, Lib)            │
         │     ├── estrutura de diretorios padrao                      │
         │     ├── configuracao inicial (tsconfig, eslint, prettier)   │
         │     └── setup de dependencias (package.json)                │
         │                                                              │
         │  ② Implementacao iterativa por modulo                       │
         │     ├── ordem definida pelo grafo de dependencias            │
         │     ├── cada modulo: interface → implementacao → teste     │
         │     ├── validacao em tempo real (lint + typecheck)          │
         │     └── commit a cada modulo completo                        │
         │                                                              │
         │  ③ Geracao de codigo                                        │
         │     ├── camada de dominio (entidades, value objects)        │
         │     ├── camada de aplicacao (use cases, DTOs)              │
         │     ├── camada de infraestrutura (repos, adapters)          │
         │     ├── camada de API (routes, controllers, middlewares)    │
         │     └── arquivos de configuracao (env, docker, ci)          │
         │                                                              │
         │  ④ Validacao em tempo real                                  │
         │     ├── TypeScript: tsc --noEmit                            │
         │     ├── Lint: eslint --fix                                  │
         │     ├── Formata: prettier --write                           │
         │     └── Executa: node --check (syntax validation)           │
         │                                                              │
         │  ⑤ CHECKPOINT: Revisao de codigo                            │
         │     ├── diff apresentado para humano                        │
         │     ├── metricas: linhas, complexidade, cobertura           │
         │     └── aprovado → Fase 4 | rejeitado → retorna ②         │
         └──────────────────────────────────────────────────────────────┘

SAIDA: source-code/ (repositorio completo no workspace)
```

### 5.2 Regras de Implementacao

| Regra | Descricao | Violacao Bloqueia |
|-------|-----------|-------------------|
| Clean Architecture | Dominio nao importa infraestrutura | Commit |
| Contratos Explicitos | Todo DTO validado com Contract.pre() | PR |
| Proibido `any` | Sem `any` sem justificativa documentada | Commit |
| Cobertura Minima | 30% por modulo ao final da fase | Gate F3→F4 |
| Sem Secrets | Nenhuma chave/segredo no codigo | Pre-commit |
| Cross-Platform | Paths com path.join(), nunca "/" ou "\\" | PR |

### 5.3 Exemplo de Scaffold Gerado

```
meu-projeto/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── User.ts
│   │   ├── value-objects/
│   │   │   ├── Email.ts
│   │   │   └── Password.ts
│   │   └── events/
│   │       └── UserCreatedEvent.ts
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── CreateUser.ts
│   │   │   ├── AuthenticateUser.ts
│   │   │   └── ListUsers.ts
│   │   └── dto/
│   │       ├── CreateUserDTO.ts
│   │       └── UserResponseDTO.ts
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── PrismaUserRepository.ts
│   │   │   └── migrations/
│   │   ├── auth/
│   │   │   ├── JwtService.ts
│   │   │   └── BcryptService.ts
│   │   └── config/
│   │       └── env.ts
│   └── api/
│       ├── routes/
│       │   ├── user.routes.ts
│       │   └── auth.routes.ts
│       ├── controllers/
│       │   ├── UserController.ts
│       │   └── AuthController.ts
│       └── middleware/
│           ├── auth.middleware.ts
│           └── error.middleware.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .env.example
└── README.md
```

---

## 6. Fase 4: Testes e Integracao

### 6.1 Fluxo da Fase

```
ENTRADA: source-code/ da Fase 3

         ┌──────────────────────────────────────────────────────────────┐
         │              FASE 4 — TESTES E INTEGRACAO                    │
         │                                                              │
         │  ① Agent Tester analisa codigo e especificacao              │
         │     ├── le specification.json (user stories + criterios)    │
         │     ├── le architecture.json (contratos, interfaces)         │
         │     ├── analisa codigo existente (cobertura atual)          │
         │     └── identifica lacunas de teste                          │
         │                                                              │
         │  ② Geracao de testes unitarios                              │
         │     ├── Jest/Vitest configurado                             │
         │     ├── testes por entidade, use case, controller           │
         │     ├── mocks para dependencias externas                    │
         │     └── validacao de bordas e erros                         │
         │                                                              │
         │  ③ Geracao de testes de integracao                          │
         │     ├── banco de dados real ou testcontainers               │
         │     ├── fluxos completos (request → banco → response)      │
         │     ├── autenticacao e autorizacao                          │
         │     └── idempotencia e concorrencia                         │
         │                                                              │
         │  ④ Geracao de testes E2E                                    │
         │     ├── Playwright ou Cypress                               │
         │     ├── fluxos de usuario completos                         │
         │     ├── cobertura de criticais de aceitacao                 │
         │     └── testes de regressao visual                          │
         │                                                              │
         │  ⑤ Agent Reviewer revisa codigo + testes                   │
         │     ├── revisao estatica (lint, types, complexidade)        │
         │     ├── revisao de seguranca (injection, secrets)           │
         │     ├── revisao de performance (N+1 queries, loops)         │
         │     ├── revisao de boas praticas (SOLID, DRY, KISS)         │
         │     └── relatorio consolidado com score                     │
         │                                                              │
         │  ⑥ Correcao de problemas                                    │
         │     ├── problemas criticos: correcao imediata               │
         │     ├── problemas moderados: fila de correcao               │
         │     ├── sugestoes: documentadas para sprint                 │
         │     └── ciclo: corrige → testa → verifica                  │
         │                                                              │
         │  ⑦ CHECKPOINT: Quality Gate                                 │
         │     ├── cobertura de testes > 30%                           │
         │     ├── todos os testes passando                            │
         │     ├── lint + typecheck sem erros                          │
         │     ├── revisao sem blockers                                │
         │     └── aprovado → Fase 5 | rejeitado → retorna ⑤         │
         └──────────────────────────────────────────────────────────────┘

SAIDA: test-report.json (resultados, cobertura, qualidade)
```

### 6.2 Contrato — test-report.json

```typescript
interface TestReport {
  id: string;
  phaseId: string;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: {
      lines: number;
      branches: number;
      functions: number;
      statements: number;
    };
    duration: number;
  };
  categories: {
    unit: TestCategory;
    integration: TestCategory;
    e2e: TestCategory;
  };
  review: {
    score: number;
    blockers: Array<{
      severity: 'critical' | 'moderate' | 'suggestion';
      file: string;
      line: number;
      description: string;
    }>;
    lintErrors: number;
    typeErrors: number;
  };
  qualityGates: Array<{
    name: string;
    pass: boolean;
    threshold: string;
    actual: string;
  }>;
}

interface TestCategory {
  total: number;
  passed: number;
  failed: number;
  coverage: number;
}
```

### 6.3 Ciclo Corrigir-Testar-Verificar

```
[Review encontra problema]
       │
       ▼
┌────────────────────┐
│ Problema Critico?  │
└────┬───────────┬───┘
     │ Sim       │ Nao
     ▼           ▼
┌──────────┐  ┌──────────────┐
│ Correcao │  │ Adiciona a   │
│ Imediata │  │ fila tecnica │
└────┬─────┘  └──────┬───────┘
     │               │
     ▼               ▼
┌──────────┐  ┌──────────────┐
│ Roda     │  │ Continua     │
│ Testes   │  │ para Fase 5  │
└────┬─────┘  └──────────────┘
     │
     ▼
┌──────────┐
│ Passou?  │─── Nao ──→ retorna correcao
└────┬─────┘
     │ Sim
     ▼
┌──────────┐
│ Verifica │
│ Review   │
└──────────┘
```

---

## 7. Fase 5: Build e Package

### 7.1 Fluxo da Fase

```
ENTRADA: source-code/ + test-report.json

         ┌──────────────────────────────────────────────────────────────┐
         │              FASE 5 — BUILD E PACKAGE                        │
         │                                                              │
         │  ① Agent DevOps configura pipeline CI/CD                    │
         │     ├── GitHub Actions ou GitLab CI config                  │
         │     ├── matriz de build (node versions, OS)                 │
         │     ├── stages: lint → typecheck → test → build            │
         │     └── cache de dependencias                               │
         │                                                              │
         │  ② Build do artefato                                        │
         │     ├── TypeScript compilation (tsc)                        │
         │     ├── bundle (esbuild, webpack) se frontend               │
         │     ├── geracao de sourcemaps                              │
         │     └── verificacao de integridade (hash checksum)          │
         │                                                              │
         │  ③ Containerizacao (Docker)                                 │
         │     ├── Dockerfile multi-stage                               │
         │     ├── imagem otimizada (distroless/alpine)                │
         │     ├── scan de vulnerabilidades (trivy)                    │
         │     └── tag semantica (git sha + versao)                   │
         │                                                              │
         │  ④ SBOM (Software Bill of Materials)                        │
         │     ├── geracao com cyclonedx ou spdx                       │
         │     ├── listagem de todas as dependencias                   │
         │     ├── identificacao de licencas                           │
         │     └── assinatura digital                                  │
         │                                                              │
         │  ⑤ Assinatura e Proventencia                                │
         │     ├── assinatura de imagem (cosign)                       │
         │     ├── attestation (in-toto)                               │
         │     └── --provenance (npm publish quando aplicavel)         │
         │                                                              │
         │  ⑥ CHECKPOINT: Artefato pronto                              │
         │     ├── imagem publicada no registry                        │
         │     ├── SBOM disponivel                                     │
         │     ├── scan sem vulnerabilidades criticas                  │
         │     └── aprovado → Fase 6 | rejeitado → retorna            │
         └──────────────────────────────────────────────────────────────┘

SAIDA: artifact.json (imagem, SBOM, checksums, assinatura)
```

### 7.2 Exemplo de Dockerfile Gerado

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
USER appuser
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

### 7.3 Contrato — artifact.json

```typescript
interface Artifact {
  id: string;
  phaseId: string;
  image: {
    registry: string;
    name: string;
    tag: string;
    digest: string;
    size: number;
  };
  sbom: {
    format: 'cyclonedx' | 'spdx';
    version: string;
    dependencies: number;
    vulnerabilities: Array<{
      id: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      package: string;
      fix: string;
    }>;
  };
  signature: {
    tool: string;
    keyId: string;
    timestamp: string;
  };
  checksums: Record<string, string>;
}
```

---

## 8. Fase 6: Deploy

### 8.1 Fluxo da Fase

```
ENTRADA: artifact.json da Fase 5

         ┌──────────────────────────────────────────────────────────────┐
         │              FASE 6 — DEPLOY                                 │
         │                                                              │
         │  ① Definicao de ambiente                                    │
         │     ├── local (docker-compose)                               │
         │     ├── staging (ambiente controlado)                        │
         │     ├── producao (com rollout progressivo)                  │
         │     └── configuracao por ambiente (variaveis, secrets)      │
         │                                                              │
         │  ② Deploy local (dev)                                       │
         │     ├── docker-compose up -d                                │
         │     ├── banco de dados + migracoes                          │
         │     ├── verificacao de porta e conectividade                │
         │     └── URL local disponivel                                │
         │                                                              │
         │  ③ Deploy cloud (staging/prod)                              │
         │     ├── SSH ou API do provedor                              │
         │     ├── Docker pull da imagem                               │
         │     ├── docker stack deploy ou compose                      │
         │     └── configuracao de dominio e SSL                       │
         │                                                              │
         │  ④ Verificacao pos-deploy (health check)                   │
         │     ├── GET /health → 200                                   │
         │     ├── GET /ready → 200 (dependencias prontas)            │
         │     ├── GET /metrics → 200 (se aplicavel)                  │
         │     └── smoke test (endpoints principais)                   │
         │                                                              │
         │  ⑤ Rollback plan                                            │
         │     ├── versao anterior identificada                        │
         │     ├── script de rollback gerado                           │
         │     ├── ponto de restauracao do banco                       │
         │     └── tempo estimado de rollback < 5 min                 │
         │                                                              │
         │  ⑥ Relatorio de deploy                                      │
         │     ├── status (success | failed | rolled-back)             │
         │     ├── tempos de cada etapa                                │
         │     ├── URLs de acesso                                      │
         │     ├── logs de deploy                                     │
         │     └── recomendacoes pos-deploy                           │
         └──────────────────────────────────────────────────────────────┘

SAIDA: deploy-report.json (status, health, URLs, rollback)
```

### 8.2 Contrato — deploy-report.json

```typescript
interface DeployReport {
  id: string;
  phaseId: string;
  status: 'success' | 'failed' | 'rolled-back';
  environment: 'local' | 'staging' | 'production';
  urls: {
    app?: string;
    api?: string;
    health?: string;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      endpoint: string;
      status: number;
      duration: number;
      healthy: boolean;
    }>;
  };
  timing: {
    total: number;
    pull: number;
    migrate: number;
    start: number;
    verify: number;
  };
  rollback: {
    available: boolean;
    previousDigest: string;
    script: string;
    estimatedTime: number;
  };
  logs: string[];
  recommendations: string[];
}
```

### 8.3 Exemplo de Script de Deploy Local

```typescript
import { $ } from 'bun';
import { readFile, writeFile } from 'fs/promises';

async function deployLocal(config: {
  image: string;
  tag: string;
  port: number;
  env: Record<string, string>;
}) {
  const composeContent = `
version: '3.8'
services:
  app:
    image: ${config.image}:${config.tag}
    ports:
      - "${config.port}:3000"
    environment:
      ${Object.entries(config.env)
        .map(([k, v]) => `      ${k}=${v}`)
        .join('\n')}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
`;

  await writeFile('docker-compose.yml', composeContent);
  await $`docker compose up -d`;

  // Wait for health
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`http://localhost:${config.port}/health`);
      if (res.ok) {
        console.log('Deploy local successful');
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Health check failed');
}
```

---

## 9. Orquestrador Central

### 9.1 Arquitetura do Orquestrador

O Orquestrador Central e o coracao do fluxo zero-to-deploy. Ele coordena as 6 fases como uma state machine com checkpointing, retry, rollback e comunicacao via NATS.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ORQUESTRADOR CENTRAL                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    WORKFLOW ENGINE                               │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │   │
│  │  │ State      │  │ Phase      │  │ Checkpoint │  │ Retry    │  │   │
│  │  │ Machine    │  │ Executor   │  │ Manager    │  │ Handler  │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MENSAGERIA (NATS)                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │   │
│  │  │ Phase      │  │ Agent      │  │ Human      │  │ Event    │  │   │
│  │  │ Events     │  │ Commands   │  │ Approval   │  │ Log      │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    PERSISTENCIA                                   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │   │
│  │  │ Workflow   │  │ Phase      │  │ Artifact   │  │ Audit    │  │   │
│  │  │ Store      │  │ State      │  │ Store      │  │ Trail    │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 State Machine

```
Estados do Workflow:
────────────────────

  ENTRY → REQUIREMENTS → ARCHITECTURE → IMPLEMENT → TESTING → BUILD → DEPLOY → VERIFY → COMPLETED
    │         │              │            │          │       │       │       │
    │         ▼              ▼            ▼          ▼       ▼       ▼       ▼
    │    REQ_FAILED    ARCH_FAILED    IMPL_FAILED  TST_FAIL  BLD_FAIL  DPL_FAIL  VRF_FAIL
    │         │              │            │          │       │       │       │
    │         ▼              ▼            ▼          ▼       ▼       ▼       ▼
    │    REQ_RETRY      ARCH_RETRY     IMPL_RETRY  TST_FIX  BLD_RETRY DPL_RETRY VRF_RETRY
    │         │              │            │          │       │       │       │
    └─────────┴──────────────┴────────────┴──────────┴───────┴───────┴───────┘
                          (todos retornam ao estado anterior)

Transicoes possiveis:
  ENTRY           → REQUIREMENTS   (apos classificacao)
  REQUIREMENTS    → ARCHITECTURE   (apos aprovacao humana)
  REQUIREMENTS    → REQ_FAILED     (apos 3 retries excedidos)
  REQ_FAILED      → REQ_RETRY      (se retry disponivel)
  REQ_RETRY       → REQUIREMENTS   (reinicia fase)
  ARCHITECTURE    → IMPLEMENT      (apos aprovacao)
  ARCHITECTURE    → ARCH_FAILED    (apos 3 retries)
  IMPLEMENT       → TESTING        (apos codigo completo)
  IMPLEMENT       → IMPL_FAILED    (apos 3 retries)
  TESTING         → BUILD          (se quality gates passam)
  TESTING         → TST_FAIL       (se gates falham)
  TST_FAIL        → TST_FIX        (retorna para correcao)
  TST_FIX         → IMPLEMENT      (ciclo de correcao)
  BUILD           → DEPLOY         (apos artefato pronto)
  BUILD           → BLD_FAILED     (se build falha)
  DEPLOY          → VERIFY         (apos deploy executado)
  DEPLOY          → DPL_FAILED     (se deploy falha)
  VERIFY          → COMPLETED      (se health checks passam)
  VERIFY          → VRF_FAILED     (se health checks falham)
  VRF_FAILED      → VRF_RETRY      (rollback executado)
  VRF_RETRY       → DEPLOY         (redeploy da versao anterior)
```

### 9.3 Checkpointing e Retry

```typescript
interface WorkflowCheckpoint {
  workflowId: string;
  phase: Phase;
  state: WorkflowState;
  attempt: number;
  maxRetries: number;
  context: {
    specification?: Specification;
    architecture?: Architecture;
    sourcePath?: string;
    testReport?: TestReport;
    artifact?: Artifact;
    deployReport?: DeployReport;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

// Politica de retry
const RETRY_POLICY = {
  maxRetries: 3,
  backoff: 'exponential',  // 1s, 2s, 4s, 8s
  maxBackoff: 30_000,       // 30s max
  jitter: 0.1,              // 10% jitter
};
```

### 9.4 Comunicacao via NATS

Cada fase publica e consome topicos especificos no barramento NATS:

```
Topicos NATS do Orquestrador:
─────────────────────────────

workflow.{id}.phase.{phase}.start     → Fase iniciou
workflow.{id}.phase.{phase}.progress  → Progresso da fase (0-100)
workflow.{id}.phase.{phase}.complete  → Fase completou
workflow.{id}.phase.{phase}.fail      → Fase falhou
workflow.{id}.phase.{phase}.retry     → Fase sendo retentada
workflow.{id}.human.approve           → Aprovacao humana solicitada
workflow.{id}.human.approved          → Humano aprovou
workflow.{id}.human.rejected          → Humano rejeitou
workflow.{id}.checkpoint              → Checkpoint salvo
workflow.{id}.rollback                → Rollback em execucao
workflow.{id}.complete                → Workflow completo

Exemplo de mensagem:
{
  "type": "workflow.phase.complete",
  "workflowId": "wf_abc123",
  "phase": "architecture",
  "status": "success",
  "timestamp": "2026-07-22T10:30:00Z",
  "artifacts": {
    "adrs": 3,
    "risks": 5,
    "estimates": { "optimistic": 8, "probable": 13, "pessimistic": 21 }
  }
}
```

### 9.5 Fluxo de Execucao Detalhado

```
Orquestrador.start("CRUD de usuarios com JWT")
│
├── 1. Cria workflow wf_abc123
├── 2. Salva checkpoint INIT
├── 3. Publica NATS: workflow.wf_abc123.phase.requirements.start
│
├── FASE 1: REQUIREMENTS
│   ├── Agent Analyst.exec(spec)
│   ├── Checkpoint: specification.json
│   ├── Publica: workflow.wf_abc123.human.approve({phase: "requirements"})
│   ├── Aguarda aprovacao (timeout: 30min)
│   ├── Se aprovado: → FASE 2
│   └── Se rejeitado: retry (max 3)
│
├── FASE 2: ARCHITECTURE
│   ├── Agent Architect.exec(spec)
│   ├── Checkpoint: architecture.json
│   ├── Publica: approval request
│   ├── Se aprovado: → FASE 3
│   └── Se rejeitado: retry
│
├── FASE 3: IMPLEMENT
│   ├── Agent Programmer.exec(arch)
│   ├── Validacao continua (tsc, lint)
│   ├── Checkpoint: source-code/
│   ├── Se sucesso: → FASE 4
│   └── Se falha: retry (volta ao ultimo modulo estavel)
│
├── FASE 4: TESTING
│   ├── Agent Tester.exec(code)
│   ├── Agent Reviewer.exec(code, tests)
│   ├── Quality gates: coverage > 30%, 0 failures
│   ├── Se pass: → FASE 5
│   ├── Se fail: → FASE 3 (ciclo de correcao)
│   └── Se critical: bloqueia, notifica humano
│
├── FASE 5: BUILD
│   ├── Agent DevOps.exec(code)
│   ├── Docker build + scan + SBOM
│   ├── Se sucesso: → FASE 6
│   └── Se falha: retry (max 3)
│
├── FASE 6: DEPLOY
│   ├── Deploy local (dev)
│   ├── Deploy cloud (staging/prod) se configurado
│   ├── Health checks
│   ├── Se sucesso: → COMPLETED
│   ├── Se falha: rollback → retry
│   └── Rollback: volta para a ultima versao estavel
│
└── COMPLETED
    ├── Deploy report gerado
    ├── URLs de acesso
    ├── Audit trail finalizado
    └── Notificacao enviada
```

---

## 10. Interacao Humana

### 10.1 Pontos de Aprovacao (Human-in-the-Loop)

Cada fase possui pontos de aprovacao onde o humano pode intervir:

```
FASE 1 ──── [Requisitos] ──── Humano revisa e aprova user stories
                │
FASE 2 ──── [Arquitetura] ──── Humano revisa ADRs e decisao de stack
                │
FASE 3 ──── [Implementacao] ──── Humano revisa diff do codigo (opcional)
                │
FASE 4 ──── [Testes] ──── Humano revisa relatorio de qualidade
                │
FASE 5 ──── [Build] ──── Humano autoriza publicacao (opcional)
                │
FASE 6 ──── [Deploy] ──── Humano autoriza deploy em producao
```

### 10.2 Niveis de Autonomia (N0-N4)

| Nivel | Nome | Aprovacao Humana | Fases Automaticas | Caso de Uso |
|-------|------|-----------------|-------------------|-------------|
| N0 | Assistido | Todas as fases requerem aprovacao | Nenhuma | Usuario aprendendo, projetos criticos |
| N1 | Supervisionado | F1 (req), F2 (arch), F6 (deploy) | F3, F4, F5 | Projetos internos, equipe pequena |
| N2 | Semi-Autonomo | F2 (arch), F6 (deploy) | F1, F3, F4, F5 | Projetos em andamento, confianca media |
| N3 | Autonomo | F6 (deploy only) | F1, F2, F3, F4, F5 | Times senior, projetos padrao |
| N4 | Total | Nenhuma — tudo automatico | Todas | CI/CD confiavel, projetos simples |

### 10.3 Notificacoes

Cada ponto de aprovacao dispara notificacoes no canal configurado:

| Canal | Formato | Quando |
|-------|---------|--------|
| Terminal (CLI) | `[IDEIA] Fase 1 concluida. Aprovar requisitos? (y/n/d)` | Sincrono |
| Theia Notification | Toast + botao "Review" | Assincrono |
| Webhook / Slack | Mensagem com link para review | Assincrono |
| Email | Resumo + link para dashboard | Batch diario |

### 10.4 Exemplo de Interacao no Terminal

```
$ IDEIA deploy "CRUD de usuarios com autenticacao JWT"

[IDEIA] Fase 1 — Requisitos (completa em 12s)
  Projeto: user-auth-crud
  Descricao: "CRUD de usuarios com autenticacao JWT"
  User Stories: 5 (3 MUST, 1 SHOULD, 1 COULD)
  Criterios de aceitacao: 12

  ┌─────────────────────────────────────────────────────────┐
  │ #1 — Cadastro de usuario                                │
  │ Como administrador quero cadastrar usuarios para        │
  │ gerenciar acesso ao sistema                            │
  │ Criterios:                                              │
  │   - SC-01: Criar usuario com nome, email, senha         │
  │   - SC-02: Validar email unico                          │
  │   - SC-03: Senha deve ter 8+ caracteres                 │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │ [y] Aprovar e continuar                                │
  │ [n] Rejeitar e editar                                  │
  │ [d] Detalhar requisitos                                │
  └─────────────────────────────────────────────────────────┘
  > y

[IDEIA] Fase 2 — Arquitetura (completa em 45s)
  Stack: Node.js + Express + PostgreSQL + Prisma + JWT
  ADRs: 3 (banco, autenticacao, estrutura de projeto)
  Riscos: 2 (baixo: escalabilidade; medio: secrets mgmt)
  Estimativa: 13 story points (otimista 8, provavel 13, pessimista 21)

  ┌─────────────────────────────────────────────────────────┐
  │ [y] Aprovar arquitetura                                │
  │ [n] Rejeitar (justifique)                              │
  │ [d] Ver ADRs detalhados                                │
  └─────────────────────────────────────────────────────────┘
  > y

[IDEIA] Fase 3 — Implementacao (em andamento...)
  ████████████░░░░░░░░ 60% | Modulo 3/5: Auth middleware
  > ts: 0 errors | lint: 0 warnings | coverage: 34%

[IDEIA] Fase 4 — Testes (completa em 8s)
  42 testes: 42 passed, 0 failed, 2 skipped
  Cobertura: 78% lines | 65% branches | 82% functions
  Quality Gates: 4/4 aprovados

[IDEIA] Fase 5 — Build (completa em 120s)
  Imagem: ghcr.io/user/crud-auth:v1.0.0-d2a3b1c
  SBOM: 127 dependencias, 0 vulnerabilidades criticas
  Assinatura: verified (cosign)

[IDEIA] Fase 6 — Deploy

  ┌─────────────────────────────────────────────────────────┐
  │ Preparando deploy em producao                          │
  │ Ambiente: production (api.mydomain.com)                │
  │ Rollback: disponivel (v0.9.0 anterior)                 │
  │ Health check configurado: /health                      │
  │                                                        │
  │ [y] Deploy para producao                              │
  │ [s] Deploy para staging primeiro                      │
  │ [n] Cancelar                                          │
  └─────────────────────────────────────────────────────────┘
  > s

[IDEIA] Deploy em staging concluido!
  URL: https://staging-api.mydomain.com
  Health: healthy (200ms, 3/3 checks)
  Aprovacao para producao pendente...
```

---

## 11. Playbook Executavel

### 11.1 Exemplo Completo: "CRUD de Usuarios com Autenticacao JWT"

Este playbook demonstra a execucao completa do zero ao deploy para um projeto real.

```
PLAYBOOK: CRUD de Usuarios com Autenticacao JWT
────────────────────────────────────────────────
Entrada: "Quero um CRUD de usuarios com autenticacao JWT"
Stack detectada: Node.js + TypeScript + PostgreSQL + Express + JWT
Nivel de autonomia: N2 (semi-autonomo)
Tempo estimado total: ~12 minutos
```

### 11.2 Fase 1 — Requisitos (Resultado)

```json
{
  "id": "spec_001",
  "title": "CRUD de Usuarios com Autenticacao JWT",
  "intent": "feature",
  "urgency": "medium",
  "entities": {
    "domain": "authentication",
    "stack": ["node", "typescript", "postgresql", "express", "jwt"],
    "requirements": [
      "Cadastro de usuario com nome, email e senha",
      "Login com email e senha retornando JWT",
      "Listagem de usuarios (admin only)",
      "Atualizacao de perfil do proprio usuario",
      "Exclusao de conta pelo proprio usuario"
    ]
  },
  "userStories": [
    {
      "id": "US-001",
      "role": "visitante",
      "want": "me cadastrar no sistema",
      "benefit": "ter acesso a funcionalidades protegidas",
      "priority": "MUST",
      "acceptanceCriteria": [
        {
          "scenario": "Cadastro com sucesso",
          "given": "um visitante com dados validos",
          "when": "ele envia nome, email e senha para /api/register",
          "then": "o sistema retorna 201 e os dados do usuario criado"
        },
        {
          "scenario": "Cadastro com email duplicado",
          "given": "um email ja cadastrado",
          "when": "um visitante tenta cadastrar com o mesmo email",
          "then": "o sistema retorna 409 Conflict"
        }
      ]
    },
    {
      "id": "US-002",
      "role": "usuario",
      "want": "fazer login no sistema",
      "benefit": "acessar recursos protegidos",
      "priority": "MUST",
      "acceptanceCriteria": [
        {
          "scenario": "Login com sucesso",
          "given": "um usuario cadastrado",
          "when": "ele envia email e senha para /api/login",
          "then": "o sistema retorna 200 e um token JWT valido"
        },
        {
          "scenario": "Login com senha errada",
          "given": "um usuario cadastrado",
          "when": "ele envia email e senha incorreta",
          "then": "o sistema retorna 401 Unauthorized"
        }
      ]
    }
  ]
}
```

### 11.3 Fase 2 — Arquitetura (Resultado)

```
Stack:
  Linguagem:     TypeScript 5.x
  Framework:     Express.js 4.x
  Banco:         PostgreSQL 16 via Prisma ORM
  Autenticacao:  JWT (jsonwebtoken) + bcrypt
  Validacao:     Zod schemas
  Testes:        Vitest + Supertest
  Container:     Docker multi-stage
  CI/CD:         GitHub Actions

ADRs:
  ADR-001: PostgreSQL + Prisma (type-safe queries, migrations versionadas)
  ADR-002: JWT com refresh token (access: 15min, refresh: 7d)
  ADR-003: Clean Architecture (dominio isolado de infraestrutura)
  ADR-004: Zod para DTO validation (schemas compartilhados API/dominio)

Estimativa: 13 story points (~26h dev)
  Modulo 1 — Entidades e banco:  3 SP
  Modulo 2 — Autenticacao JWT:   3 SP
  Modulo 3 — CRUD de usuarios:   3 SP
  Modulo 4 — Middleware e API:    2 SP
  Modulo 5 — Testes:             2 SP
```

### 11.4 Fase 3 — Implementacao (Extrato)

```typescript
// src/domain/entities/User.ts
export class User {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: Email,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: { name: string; email: string; password: string }): User {
    return new User(
      crypto.randomUUID(),
      props.name,
      new Email(props.email),
      hashSync(props.password, 10),
      new Date(),
      new Date(),
    );
  }
}

// src/application/use-cases/CreateUser.ts
export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(dto: CreateUserDTO): Promise<UserResponseDTO> {
    const emailAlreadyInUse = await this.userRepo.findByEmail(dto.email);
    if (emailAlreadyInUse) {
      throw new AppError('EMAIL_IN_USE', 'Email ja cadastrado', 409);
    }
    const user = User.create(dto);
    await this.userRepo.save(user);
    await this.eventBus.publish(new UserCreatedEvent(user.id, user.email));
    return UserResponseDTO.from(user);
  }
}

// src/api/routes/user.routes.ts
const router = Router();
router.post('/register', validate(CreateUserDTO), async (req, res) => {
  const useCase = new CreateUserUseCase(
    new PrismaUserRepository(prisma),
    eventBus,
  );
  const result = await useCase.execute(req.body);
  res.status(201).json(result);
});
```

### 11.5 Fase 4 — Testes (Resultado)

```
Test Report — user-auth-crud
─────────────────────────────
Unit Tests:    28 passed, 0 failed (coverage: 82%)
Integration:   10 passed, 0 failed (coverage: 71%)
E2E Tests:      4 passed, 0 failed

Cobertura total: 78% lines | 65% branches | 82% functions

Quality Gates:
  [PASS] Cobertura > 30%: 78%
  [PASS] Testes falhando: 0
  [PASS] Lint errors: 0
  [PASS] Type errors: 0
  [PASS] Security scan: 0 vulnerabilidades

Review Score: 92/100
  Blockers: 0
  Sugestoes: 3 (documentacao, constantes magicas, tipagem)
```

### 11.6 Fase 5 — Build (Resultado)

```
Build Report — user-auth-crud
──────────────────────────────
Compilacao: OK (4.2s)
Bundles: 1 (703KB)
Docker Image: ghcr.io/user/user-auth-crud:v1.0.0-a1b2c3d (127MB)
Trivy Scan: 0 critical, 2 high, 5 medium, 12 low
SBOM: 127 dependencies (cyclonedx JSON)
Assinatura: cosign verified (key: ideia-cosign-2026)
```

### 11.7 Fase 6 — Deploy (Resultado)

```
Deploy Report — user-auth-crud
────────────────────────────────
Ambiente: staging
URL: https://staging-api.mydomain.com

Health Checks:
  [PASS] GET /health → 200 (45ms)
  [PASS] GET /ready  → 200 (120ms, db connected)
  [PASS] POST /api/login → 200 (250ms, smoke test)

Rollback:
  Disponivel: true
  Versao anterior: v0.9.0-e5f6g7h
  Script: ./scripts/rollback.sh
  Tempo estimado: <2min

Tempos:
  Pull:        12s
  Migrate:     3s
  Start:       8s
  Verify:      5s
  Total:       28s

Status: SUCCESS — aguardando aprovacao para producao
```

---

## 12. Codigo TypeScript

### 12.1 Workflow Engine

```typescript
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { connect, NatsConnection, JetStreamClient } from 'nats';

enum Phase {
  REQUIREMENTS = 'requirements',
  ARCHITECTURE = 'architecture',
  IMPLEMENT = 'implement',
  TESTING = 'testing',
  BUILD = 'build',
  DEPLOY = 'deploy',
  VERIFY = 'verify',
}

enum WorkflowState {
  ENTRY = 'entry',
  REQUIREMENTS = 'requirements',
  REQ_FAILED = 'req_failed',
  REQ_RETRY = 'req_retry',
  ARCHITECTURE = 'architecture',
  ARCH_FAILED = 'arch_failed',
  ARCH_RETRY = 'arch_retry',
  IMPLEMENT = 'implement',
  IMPL_FAILED = 'impl_failed',
  IMPL_RETRY = 'impl_retry',
  TESTING = 'testing',
  TST_FAILED = 'tst_failed',
  TST_FIX = 'tst_fix',
  BUILD = 'build',
  BLD_FAILED = 'bld_failed',
  BLD_RETRY = 'bld_retry',
  DEPLOY = 'deploy',
  DPL_FAILED = 'dpl_failed',
  DPL_RETRY = 'dpl_retry',
  VERIFY = 'verify',
  VRF_FAILED = 'vrf_failed',
  VRF_RETRY = 'vrf_retry',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

interface WorkflowConfig {
  id: string;
  description: string;
  autonomyLevel: 0 | 1 | 2 | 3 | 4;
  maxRetries: number;
  natsUrl: string;
}

interface PhaseContext {
  specification?: any;
  architecture?: any;
  sourceCode?: string;
  testReport?: any;
  artifact?: any;
  deployReport?: any;
}

class Workflow {
  public readonly id: string;
  public state: WorkflowState;
  public readonly config: WorkflowConfig;
  public context: PhaseContext = {};
  public attempt: number = 0;
  private nats?: NatsConnection;
  private js?: JetStreamClient;

  private readonly transitions: Map<WorkflowState, WorkflowState[]> = new Map([
    [WorkflowState.ENTRY, [WorkflowState.REQUIREMENTS]],
    [WorkflowState.REQUIREMENTS, [WorkflowState.ARCHITECTURE, WorkflowState.REQ_FAILED, WorkflowState.CANCELLED]],
    [WorkflowState.REQ_FAILED, [WorkflowState.REQ_RETRY, WorkflowState.CANCELLED]],
    [WorkflowState.REQ_RETRY, [WorkflowState.REQUIREMENTS]],
    [WorkflowState.ARCHITECTURE, [WorkflowState.IMPLEMENT, WorkflowState.ARCH_FAILED, WorkflowState.CANCELLED]],
    [WorkflowState.ARCH_FAILED, [WorkflowState.ARCH_RETRY, WorkflowState.CANCELLED]],
    [WorkflowState.ARCH_RETRY, [WorkflowState.ARCHITECTURE]],
    [WorkflowState.IMPLEMENT, [WorkflowState.TESTING, WorkflowState.IMPL_FAILED, WorkflowState.CANCELLED]],
    [WorkflowState.IMPL_FAILED, [WorkflowState.IMPL_RETRY, WorkflowState.CANCELLED]],
    [WorkflowState.IMPL_RETRY, [WorkflowState.IMPLEMENT]],
    [WorkflowState.TESTING, [WorkflowState.BUILD, WorkflowState.TST_FAILED, WorkflowState.CANCELLED]],
    [WorkflowState.TST_FAILED, [WorkflowState.TST_FIX, WorkflowState.CANCELLED]],
    [WorkflowState.TST_FIX, [WorkflowState.IMPLEMENT]],
    [WorkflowState.BUILD, [WorkflowState.DEPLOY, WorkflowState.BLD_FAILED, WorkflowState.CANCELLED]],
    [WorkflowState.BLD_FAILED, [WorkflowState.BLD_RETRY, WorkflowState.CANCELLED]],
    [WorkflowState.BLD_RETRY, [WorkflowState.BUILD]],
    [WorkflowState.DEPLOY, [WorkflowState.VERIFY, WorkflowState.DPL_FAILED, WorkflowState.CANCELLED]],
    [WorkflowState.DPL_FAILED, [WorkflowState.DPL_RETRY, WorkflowState.CANCELLED]],
    [WorkflowState.DPL_RETRY, [WorkflowState.DEPLOY]],
    [WorkflowState.VERIFY, [WorkflowState.COMPLETED, WorkflowState.VRF_FAILED]],
    [WorkflowState.VRF_FAILED, [WorkflowState.VRF_RETRY]],
    [WorkflowState.VRF_RETRY, [WorkflowState.DEPLOY]],
  ]);

  constructor(config: Partial<WorkflowConfig> = {}) {
    this.id = config.id || `wf_${randomUUID().slice(0, 8)}`;
    this.config = {
      id: this.id,
      description: config.description || '',
      autonomyLevel: config.autonomyLevel ?? 2,
      maxRetries: config.maxRetries ?? 3,
      natsUrl: config.natsUrl || 'nats://localhost:4222',
    };
    this.state = WorkflowState.ENTRY;
  }

  async connect(): Promise<void> {
    this.nats = await connect({ servers: this.config.natsUrl });
    this.js = this.nats.jetstream();
  }

  async close(): Promise<void> {
    await this.nats?.close();
  }

  canTransition(to: WorkflowState): boolean {
    const allowed = this.transitions.get(this.state);
    return allowed ? allowed.includes(to) : false;
  }

  async transition(to: WorkflowState): Promise<void> {
    if (!this.canTransition(to)) {
      throw new Error(
        `Transicao invalida: ${this.state} → ${to}. Permitidas: ${this.transitions.get(this.state)?.join(', ')}`
      );
    }
    const from = this.state;
    this.state = to;
    await this.publishEvent('workflow.state.changed', { from, to });
  }

  async executePhase(phase: Phase, executor: PhaseExecutor): Promise<void> {
    this.attempt++;
    await this.publishEvent(`workflow.${phase}.start`, { attempt: this.attempt });

    try {
      const result = await executor.execute(this.context);
      this.context = { ...this.context, ...result };
      await this.saveCheckpoint();
      await this.publishEvent(`workflow.${phase}.complete`, { result });
    } catch (error) {
      await this.publishEvent(`workflow.${phase}.fail`, {
        error: (error as Error).message,
        attempt: this.attempt,
      });
      throw error;
    }
  }

  private async saveCheckpoint(): Promise<void> {
    const checkpoint = {
      workflowId: this.id,
      phase: this.state,
      attempt: this.attempt,
      context: this.context,
      timestamp: new Date().toISOString(),
    };
    if (this.js) {
      await this.js.publish(
        `workflow.checkpoint.${this.id}`,
        JSON.stringify(checkpoint),
      );
    }
  }

  private async publishEvent(subject: string, data: any): Promise<void> {
    if (this.nats) {
      await this.nats.publish(subject, JSON.stringify(data));
    }
  }

  needsHumanApproval(phase: Phase): boolean {
    const approvalMatrix: Record<number, Phase[]> = {
      0: [Phase.REQUIREMENTS, Phase.ARCHITECTURE, Phase.IMPLEMENT, Phase.TESTING, Phase.BUILD, Phase.DEPLOY],
      1: [Phase.REQUIREMENTS, Phase.ARCHITECTURE, Phase.DEPLOY],
      2: [Phase.ARCHITECTURE, Phase.DEPLOY],
      3: [Phase.DEPLOY],
      4: [],
    };
    return approvalMatrix[this.config.autonomyLevel]?.includes(phase) ?? true;
  }

  async requestHumanApproval(phase: Phase): Promise<boolean> {
    await this.publishEvent(`workflow.${this.id}.human.approve`, { phase });
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 30 * 60 * 1000); // 30 min timeout

      const sub = this.nats?.subscribe(
        `workflow.${this.id}.human.${phase}.response`,
        {
          callback: (err, msg) => {
            clearTimeout(timeout);
            if (err) { resolve(false); return; }
            const data = JSON.parse(msg.data.toString());
            resolve(data.approved);
          },
        }
      );
    });
  }
}

interface PhaseExecutor {
  execute(context: PhaseContext): Promise<Partial<PhaseContext>>;
}

class Orchestrator {
  private workflow?: Workflow;
  private readonly phaseExecutors: Map<Phase, PhaseExecutor> = new Map();

  registerPhase(phase: Phase, executor: PhaseExecutor): void {
    this.phaseExecutors.set(phase, executor);
  }

  async start(description: string, config?: Partial<WorkflowConfig>): Promise<Workflow> {
    this.workflow = new Workflow({ ...config, description });
    await this.workflow.connect();
    console.log(`[ORCHESTRATOR] Workflow ${this.workflow.id} iniciado: "${description}"`);
    return this.workflow;
  }

  async run(): Promise<void> {
    if (!this.workflow) throw new Error('Workflow nao iniciado. Chame start() primeiro.');

    const phases = [
      Phase.REQUIREMENTS,
      Phase.ARCHITECTURE,
      Phase.IMPLEMENT,
      Phase.TESTING,
      Phase.BUILD,
      Phase.DEPLOY,
      Phase.VERIFY,
    ];

    for (const phase of phases) {
      const wf = this.workflow;
      const executor = this.phaseExecutors.get(phase);
      if (!executor) throw new Error(`Nenhum executor registrado para fase ${phase}`);

      for (let attempt = 1; attempt <= wf.config.maxRetries; attempt++) {
        try {
          if (wf.needsHumanApproval(phase) && attempt === 1) {
            const approved = await wf.requestHumanApproval(phase);
            if (!approved) {
              await wf.transition(WorkflowState.CANCELLED);
              console.log(`[ORCHESTRATOR] Workflow cancelado pelo humano na fase ${phase}`);
              return;
            }
          }

          await wf.executePhase(phase, executor);

          if (phase === Phase.VERIFY) {
            await wf.transition(WorkflowState.COMPLETED);
          } else {
            const nextState = this.getNextState(phase);
            await wf.transition(nextState);
          }
          break;
        } catch (error) {
          console.error(`[ORCHESTRATOR] Fase ${phase} falhou (tentativa ${attempt}/${wf.config.maxRetries}):`, error);

          if (attempt >= wf.config.maxRetries) {
            const failedState = this.getFailedState(phase);
            await wf.transition(failedState);
            console.error(`[ORCHESTRATOR] Workflow ${wf.id} falhou na fase ${phase} apos ${attempt} tentativas`);
            await this.executeRollback(wf);
            return;
          }
        }
      }
    }

    await this.workflow.close();
    console.log(`[ORCHESTRATOR] Workflow ${this.workflow.id} completo`);
  }

  private getNextState(phase: Phase): WorkflowState {
    const map: Record<Phase, WorkflowState> = {
      [Phase.REQUIREMENTS]: WorkflowState.ARCHITECTURE,
      [Phase.ARCHITECTURE]: WorkflowState.IMPLEMENT,
      [Phase.IMPLEMENT]: WorkflowState.TESTING,
      [Phase.TESTING]: WorkflowState.BUILD,
      [Phase.BUILD]: WorkflowState.DEPLOY,
      [Phase.DEPLOY]: WorkflowState.VERIFY,
      [Phase.VERIFY]: WorkflowState.COMPLETED,
    };
    return map[phase];
  }

  private getFailedState(phase: Phase): WorkflowState {
    const map: Record<Phase, WorkflowState> = {
      [Phase.REQUIREMENTS]: WorkflowState.REQ_FAILED,
      [Phase.ARCHITECTURE]: WorkflowState.ARCH_FAILED,
      [Phase.IMPLEMENT]: WorkflowState.IMPL_FAILED,
      [Phase.TESTING]: WorkflowState.TST_FAILED,
      [Phase.BUILD]: WorkflowState.BLD_FAILED,
      [Phase.DEPLOY]: WorkflowState.DPL_FAILED,
      [Phase.VERIFY]: WorkflowState.VRF_FAILED,
    };
    return map[phase];
  }

  private async executeRollback(wf: Workflow): Promise<void> {
    console.log(`[ORCHESTRATOR] Executando rollback do workflow ${wf.id}`);
    await wf.publishEvent('workflow.rollback', {
      workflowId: wf.id,
      lastStableState: wf.state,
    });
  }
}
```

### 12.2 Exemplo de Uso

```typescript
async function main() {
  const orchestrator = new Orchestrator();

  // Registra executores para cada fase
  orchestrator.registerPhase(Phase.REQUIREMENTS, new AnalystExecutor());
  orchestrator.registerPhase(Phase.ARCHITECTURE, new ArchitectExecutor());
  orchestrator.registerPhase(Phase.IMPLEMENT, new ProgrammerExecutor());
  orchestrator.registerPhase(Phase.TESTING, new TesterExecutor());
  orchestrator.registerPhase(Phase.BUILD, new DevOpsExecutor());
  orchestrator.registerPhase(Phase.DEPLOY, new DeployExecutor());
  orchestrator.registerPhase(Phase.VERIFY, new VerifyExecutor());

  // Inicia workflow
  const wf = await orchestrator.start(
    'CRUD de usuarios com autenticacao JWT',
    { autonomyLevel: 2 }
  );

  // Executa o fluxo completo
  await orchestrator.run();

  console.log('Workflow completo:', wf.context.deployReport);
}
```

### 12.3 Exemplo de Executor de Fase

```typescript
class AnalystExecutor implements PhaseExecutor {
  async execute(context: PhaseContext): Promise<Partial<PhaseContext>> {
    console.log('[ANALYST] Extraindo requisitos...');

    // 1. Classificar intencao
    const intent = await this.classifyIntent(context.input);

    // 2. Extrair entidades
    const entities = await this.extractEntities(context.input);

    // 3. Gerar user stories
    const stories = await this.generateUserStories(entities);

    // 4. Gerar criterios de aceitacao
    const criteria = await this.generateAcceptanceCriteria(stories);

    const specification = {
      title: intent.title,
      description: context.input,
      intent: intent.type,
      userStories: stories,
      acceptanceCriteria: criteria,
      entities,
    };

    return { specification };
  }

  private async classifyIntent(input: string) {
    // LLM-based intent classification
    return { type: 'feature', title: 'CRUD de usuarios com JWT' };
  }

  private async extractEntities(input: string) {
    return {
      domain: 'authentication',
      stack: ['node', 'typescript', 'postgresql'],
      requirements: ['cadastro', 'login', 'jwt'],
    };
  }

  private async generateUserStories(entities: any) {
    return [
      {
        id: 'US-001',
        role: 'visitante',
        want: 'me cadastrar no sistema',
        benefit: 'ter acesso a funcionalidades protegidas',
        priority: 'MUST',
      },
    ];
  }

  private async generateAcceptanceCriteria(stories: any[]) {
    return stories.map((story) => ({
      storyId: story.id,
      criteria: [
        {
          scenario: 'fluxo feliz',
          given: 'dados validos',
          when: 'envia requisicao',
          then: 'recebe sucesso',
        },
      ],
    }));
  }
}
```

---

## 13. Conexoes com Outros Estudos

### 13.1 Matriz de Conexoes

| Estudo | Conexao com S28 | Tipo de Dependencia |
|--------|----------------|-------------------|
| **S3 — INTENT-TO-PLAN-RESEARCH** | Classificador de intencao usado na Fase 1 | Direta — S28 consome S3 |
| **S5 — ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA** | Modelo de agentes (Analyst, Architect, Programmer, Tester, DevOps) | Direta — S28 orquestra os agentes definidos em S5 |
| **S6 — PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA** | Quality gates da Fase 4 e pipeline CI/CD da Fase 5 | Direta — S28 executa os gates definidos em S6 |
| **S16 — ESTUDO-DEPLOY-ENTREGA-CONTINUA** | Pipeline de deploy, GitOps, rollout da Fase 6 | Direta — S28 usa definicoes de S16 |
| **S26 — REALITY-MANIFEST** | Verificacao de capacidades reais durante orquestracao | Indireta — S28 consulta o manifesto |
| **S27 — Capability Registry** | Registro de capacidades consultado na Fase 2 | Direta — S28 usa para selecao de stack |
| **S1 — BARRAMENTO-EVENTOS** | NATS como barramento de comunicacao entre fases | Direta — S28 usa NATS definido em S1 |
| **S2 — MEMORIA-E-CONTEXTO** | Persistencia de contexto entre fases e sessoes | Indireta — checkpoints usam memoria |
| **S4 — SEGURANCA-PROMPT** | Validacao de saida, policy evaluation | Indireta — S28 invoca controles de S4 |
| **S7 — APRENDIZADO-ADAPTATIVO** | Feedback loop para otimizar fluxo | Indireta — metricas alimentam S7 |
| **S12 — TESTES-QUALIDADE-AUTOMATIZADA** | Framework de testes usado na Fase 4 | Direta — S28 usa estrategias de S12 |
| **S20 — PLUGINS-ECOSSISTEMA** | Fases como plugins registraveis | Direta — S28 suporta plugins no orquestrador |
| **S22 — COLABORACAO-TEMPO-REAL** | Notificacoes e aprovacao humana | Indireta — humano recebe notificacoes via S22 |

### 13.2 Diagrama de Dependencias

```
S3 ──→ S28 ──→ S16
Intent       F1: Ideia        F6: Deploy
Classif      │                │
             ▼                ▼
S5 ──→ S28 ──→ S28 ──→ S6
Agents    F2: Arch    F4: Testes
             │         Gates
             ▼
S27 ──→ S28
CapReg   F2: Stack
             │
             ▼
S1 ──→ S28 (NATS communication)
```

### 13.3 Dependencias para Implementacao

```
IMPLEMENTACAO DE S28 REQUER:
───────────────────────────
  [MANDATORIO] S1 — NATS JetStream configurado e operacional
  [MANDATORIO] S5 — Agentes implementados com contratos de entrada/saida
  [MANDATORIO] S3 — Classificador de intencao funcional
  [ALTA]       S27 — Capability Registry populado
  [MEDIA]      S6 — Quality gates definidos e testaveis
  [MEDIA]      S16 — Pipeline de deploy definido
  [BAIXA]      S12 — Framework de testes integrado
  [BAIXA]      S20 — Sistema de plugins operacional
```

---

## 14. Plano de Implementacao

### 14.1 Fases de Implementacao

```
FASE 0: Fundacao (Sprint 1 — 2 semanas)
────────────────────────────────────────
  [P0] Definir contratos (specification, architecture, artifact)
  [P0] Implementar Workflow Engine basico (state machine + transicoes)
  [P0] Implementar checkpoint manager (salvar/restaurar estado)
  [P1] Integrar NATS basico (publicar eventos de fase)
  [P1] Testes unitarios do workflow engine
  Saida: Workflow funcional com state machine, checkpoint e NATS

FASE 1: Fases 1-3 (Sprint 2 — 3 semanas)
─────────────────────────────────────────
  [P0] Implementar Fase 1: Agent Analyst (classificacao + extracao)
  [P0] Implementar Fase 2: Agent Architect (stack + ADRs)
  [P0] Implementar Fase 3: Agent Programmer (scaffold + implementacao)
  [P1] Implementar human-in-the-loop basico (terminal prompt)
  [P1] Integrar com Capability Registry (S27)
  Saida: Fluxo funcional do zero ate codigo gerado

FASE 2: Fases 4-6 (Sprint 3 — 3 semanas)
─────────────────────────────────────────
  [P0] Implementar Fase 4: Agent Tester + Agent Reviewer
  [P0] Implementar Quality Gates (cobertura, lint, types)
  [P0] Implementar Fase 5: Agent DevOps (build + docker + SBOM)
  [P0] Implementar Fase 6: Agent Deploy (local + health check)
  [P1] Implementar rollback automatizado
  Saida: Fluxo completo funcional — da ideia ao deploy

FASE 3: Robustez (Sprint 4 — 2 semanas)
────────────────────────────────────────
  [P1] Implementar retry com backoff exponencial
  [P1] Implementar timeout por fase
  [P1] Implementar notificacoes (Slack, email, Theia)
  [P2] Implementar auditoria completa (hash chain)
  [P2] Testes de integracao do fluxo completo
  Saida: Sistema robusto com retry, timeout e notificacoes

FASE 4: Polimento (Sprint 5 — 2 semanas)
────────────────────────────────────────
  [P2] Implementar dashboard de progresso (Theia widget)
  [P2] Implementar niveis de autonomia N0-N4 completos
  [P2] Implementar modo --dry-run (previa sem execucao)
  [P2] Documentacao de API e exemplos
  [P2] Modo offline (sem NATS, fallback local)
  Saida: Sistema pronto para uso geral
```

### 14.2 Estimativa de Esforco

| Componente | Esforco (dias) | Dependencias | Prioridade |
|-----------|---------------|-------------|-----------|
| Contratos e tipos | 3 | Nenhuma | P0 |
| Workflow Engine (state machine) | 5 | Contratos | P0 |
| Checkpoint Manager | 3 | Workflow Engine | P0 |
| Integracao NATS | 3 | NATS (S1) | P0 |
| Agent Analyst (F1) | 5 | S3 (classificador) | P0 |
| Agent Architect (F2) | 5 | S27 (CapRegistry) | P0 |
| Agent Programmer (F3) | 8 | Agent Architect | P0 |
| Agent Tester (F4) | 5 | Agent Programmer | P0 |
| Agent Reviewer (F4) | 3 | Agent Programmer | P0 |
| Quality Gates (F4) | 3 | S6 | P0 |
| Agent DevOps (F5) | 5 | Agent Programmer | P0 |
| Agent Deploy (F6) | 5 | S16 | P0 |
| Rollback | 3 | Agent Deploy | P1 |
| Human-in-the-loop | 3 | Workflow Engine | P1 |
| Notificacoes | 2 | NATS | P1 |
| Dashboard Theia | 5 | Workflow Engine | P2 |
| Autonomia N0-N4 | 2 | Human-in-the-loop | P2 |
| Dry-run mode | 2 | Workflow Engine | P2 |
| Testes finais | 5 | Todos | P0 |

**Total estimado: ~70 dias / ~14 semanas (3.5 meses)**

### 14.3 Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| NATS nao disponivel | Media | Alto | Fallback para EventEmitter local |
| Classificador LLM impreciso | Alta | Medio | Valvula de escape com fallback para humano |
| Agente Programmer gera codigo de baixa qualidade | Media | Alto | Quality gates obrigatorios antes de avancar |
| Humano nao responde a tempo | Alta | Medio | Timeout com aprovacao automatica (configuravel) |
| Dependencias circulares entre fases | Baixa | Alto | Validacao de DAG antes de executar |
| Cross-platform: comandos falham no Windows | Alta | Medio | Testes em matrix Windows + Linux desde o inicio |
| Workflow muito longo (horas) | Media | Medio | Checkpoints permitem retomar; timeout por fase |

### 14.4 Metricas de Sucesso

| Metrica | Alvo MVP | Alvo v1.0 | Medicao |
|---------|---------|-----------|---------|
| Tempo medio: ideia → deploy local | <15 min | <5 min | Timing do workflow |
| Taxa de sucesso na primeira tentativa | >60% | >85% | Workflows completos / workflows iniciados |
| Satisfacao do usuario (NPS) | >50 | >75 | Pesquisa pos-uso |
| Reducao de tempo comparado a manual | >50% | >80% | Benchmark com grupo de controle |
| Taxa de rollback | <20% | <5% | Rollbacks / deploys |
| Cobertura de codigo gerado | >30% | >60% | Test report |
| Precisao do classificador | >75% | >90% | Amostragem estatistica |

---

> **Este estudo define a arquitetura que transforma a IDEIA de um conjunto de ferramentas em um sistema coerente de entrega de software — realizando a promessa "De a ideia, nos entregamos a solucao."**
>
> Proxima etapa: Implementar Fase 0 (Fundacao) — contratos, Workflow Engine e checkpoint manager.

> **Registrado em:** `docs/governance/document-registry.md`
> **Estudos relacionados:** S3, S5, S6, S16, S26, S27
> **Status:** Proposto — aguardando aprovacao para implementacao
