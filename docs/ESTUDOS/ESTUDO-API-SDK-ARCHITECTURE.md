# ESTUDO S32 -- IDEIA API & SDK Architecture

> **Data:** 2026-07-22
> **Versao:** 1.0
> **Contexto:** IDEIA -- plataforma de desenvolvimento assistido por IA composta por 65+ packages, 6 agentes especializados, 51 comandos CLI, barramento de eventos e arquitetura de 15 camadas.
> **Problema:** Ausencia de API publica documentada e SDK para integracao externa -- nao existem endpoints REST formais, referencias de API, SDK client, ou guias de integracao para consumidores externos.
> **Solucao:** API publica RESTful + Event-Driven com SDK TypeScript, documentacao OpenAPI 3.1, autenticacao por API Keys/JWT, webhooks, e compatibilidade MCP.

---

## Sumario

1. [Introducao](#1-introducao)
2. [API Design Principles](#2-api-design-principles)
3. [Endpoints da API Publica](#3-endpoints-da-api-publica)
4. [Autenticacao e Autorizacao](#4-autenticacao-e-autorizacao)
5. [SDK Client](#5-sdk-client)
6. [Event-Driven API](#6-event-driven-api)
7. [MCP Integration](#7-mcp-integration)
8. [CLI como API](#8-cli-como-api)
9. [Exemplos Completos](#9-exemplos-completos)
10. [Documentacao](#10-documentacao)
11. [Conexoes com Outros Estudos](#11-conexoes-com-outros-estudos)
12. [Plano de Implementacao](#12-plano-de-implementacao)

---

## 1. Introducao

### 1.1 O Problema da Ausencia de API Publica

A IDEIA e um sistema complexo com capacidades de orquestracao multiagente, execucao de workflows, chat com LLMs, analise de contexto, e automacao de pipelines. Apesar de possuir uma CLI rica (51 comandos), um barramento de eventos interno (NATS em memoria), e interfaces Theia, **nao existe uma API publica documentada** que permita:

| Cenario | Impacto da Ausencia de API |
|---------|---------------------------|
| Integracao CI/CD | Pipeline nao pode iniciar agentes ou workflows programaticamente |
| Plugins de terceiros | Desenvolvedores precisam hackear a CLI com `exec` e parse de stdout |
| Agentes externos | Outros sistemas de IA nao podem consultar capacidades ou estado |
| Automacao de tarefas | Scripts externos dependem de chamadas shell fr ageis |
| Monitoramento | Ferramentas de observabilidade nao tem acesso a metricas via REST |
| Integracao com IDEs | Editors externos (Vim, JetBrains) nao tem acesso a recursos da IDEIA |

### 1.2 Casos de Uso Prioritarios

```
PRIORIDADE    CASO DE USO                    CONSUMIDOR               FREQUENCIA
──────────    ──────────                     ──────────               ─────────
P0            Iniciar execucao de agente     CI/CD (GitHub Actions)   100/dia
P0            Consultar status de workflow   Dashboard externo         50/dia
P0            Enviar mensagem para chat      Chatbot customizado       200/dia
P1            Criar/gerenciar projetos       CLI alternativa           30/dia
P1            Consultar capacidades          LLM externo               20/dia
P1            Stream de eventos (SSE)        Monitores em tempo real   10/dia
P2            Webhooks de conclusao          Slack/Teams/Discord        5/dia
P2            CRUD completo de recursos      Admin panel               15/dia
```

### 1.3 Principios de Design

```
PRINCIPIOS DA API IDEIA
────────────────────────
1. CONSISTENCIA: Toda resposta segue mesmo envelope { data, meta, error }.
   Nomeclatura kebab-case para paths, camelCase para campos JSON.

2. VERSIONAMENTO: URL prefixada com /api/v1/. Mudancas quebrarem
   requerem /api/v2/. Backward compatibility garantida por 2 versoes.

3. AUTO-DESCRICAO: OpenAPI 3.1 spec gerada automaticamente pelo Manifest
   System (S26). Toda rota tem schema de request/response.

4. STATELESS: API sem estado de sessao. Toda requisicao carrega
   autenticacao (API Key ou JWT). Escalabilidade horizontal.

5. EVENT-DRIVEN: Operacoes longas (workflows, agentes) retornam
   202 Accepted + ticket de acompanhamento via SSE ou webhook.

6. PAGINACAO CONSISTENTE: Cursor-based pagination com limit/next.
   Respostas incluem meta.pagination com next cursor.

7. RATE LIMITING: Por chave de API, por escopo, com headers
   X-RateLimit-*. Limites via sliding window.

8. SEGURANCA POR DEFAULT: TLS obrigatorio, autenticacao em toda rota,
   scopes granulares, audit trail de toda chamada.
```

### 1.4 Arquitetura Geral

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        IDEIA PUBLIC API ARCHITECTURE                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────┐    ┌─────────────────────┐    ┌────────────────────────────┐  │
│  │  External     │    │  API Gateway         │    │  Internal Services        │  │
│  │  Consumers    │───▶│                      │───▶│                           │  │
│  │               │    │  ┌─────────────────┐ │    │  ┌─────────────────────┐ │  │
│  │  - SDK Client │    │  │ Auth (API Key/  │ │    │  │ Agent Runtime       │ │  │
│  │  - curl       │    │  │ JWT/OAuth2)     │ │    │  │ (start/stop/stream) │ │  │
│  │  - Postman    │    │  ├─────────────────┤ │    │  ├─────────────────────┤ │  │
│  │  - Webhook    │    │  │ Rate Limiter    │ │    │  │ Workflow Engine     │ │  │
│  │  - MCP Client │    │  │ (sliding window)│ │    │  │ (DAG execution)     │ │  │
│  │               │    │  ├─────────────────┤ │    │  ├─────────────────────┤ │  │
│  │               │    │  │ Request Logger  │ │    │  │ Chat Service        │ │  │
│  │               │    │  │ (audit trail)   │ │    │  │ (LLM orchestration) │ │  │
│  │               │    │  ├─────────────────┤ │    │  ├─────────────────────┤ │  │
│  │               │    │  │ Router/Fastify  │ │    │  │ Project Manager     │ │  │
│  │               │    │  │ (v1, v2, ...)   │ │    │  │ (CRUD + workspace)  │ │  │
│  │               │    │  └─────────────────┘ │    │  ├─────────────────────┤ │  │
│  │               │    └──────────┬──────────┘    │  │ Capability Registry  │ │  │
│  │               │               │               │  │ (S27 query/match)   │ │  │
│  │               │               │               │  ├─────────────────────┤ │  │
│  │               │               │               │  │ Context Engine      │ │  │
│  │               │               │               │  │ (workspace context) │ │  │
│  │               │               │               │  └─────────────────────┘ │  │
│  │               │               │               └────────────────────────────┘  │
│  │               │               │                                               │
│  │               │    ┌──────────▼──────────┐    ┌────────────────────────────┐  │
│  │               │    │  NATS JetStream Bus  │    │  Event Streams             │  │
│  │               │    │  (eventos internos)  │───▶│                           │  │
│  │               │    └─────────────────────┘    │  ┌──────────────────────┐ │  │
│  │               │                                │  │ SSE / WebSocket     │ │  │
│  │               │                                │  │ (eventos ao vivo)   │ │  │
│  │               │                                │  ├──────────────────────┤ │  │
│  │               │                                │  │ Webhook Dispatcher  │ │  │
│  │               │                                │  │ (callbacks HTTP)    │ │  │
│  │               │                                │  └──────────────────────┘ │  │
│  │               │                                └────────────────────────────┘  │
│  └──────────────┘    └─────────────────────┘                                      │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. API Design Principles

### 2.1 RESTful + Event-Driven

A API IDEIA adota um modelo hibrido:

| Aspecto | Abordagem | Justificativa |
|---------|-----------|---------------|
| Operacoes CRUD | REST classico (GET/POST/PUT/DELETE) | Projetos, agents, contexts -- operacoes sincronas |
| Operacoes longas | 202 Accepted + Location header | Workflows, agentes -- podem levar minutos |
| Eventos em tempo real | SSE (Server-Sent Events) | Stream de status, logs, resultados parciais |
| Notificacoes | Webhooks (POST para URL configurada) | Eventos assincronos para sistemas externos |
| Consultas complexas | POST com filtro no body (evita URL gigante) | Search, query de capacidades |

### 2.2 Versionamento Semantico

```
URL Pattern:  /api/v{major}/

Regras:
- MAJOR: Mudanca que quebra compatibilidade (campos removidos, endpoints renomeados)
- MINOR: Adicao de campos/endpoints (backward compatible)
- PATCH: Correcao de bugs, docs (sem mudanca de contrato)

Headers de versao:
  Accept: application/vnd.ideia.v1+json    (versao explicita)
  Accept: application/json                  (ultima estavel)

Deprecation:
  - Header: Sunset: Sat, 31 Dec 2027 23:59:59 GMT
  - Header: Deprecation: true
  - Response body inclui deprecation warning
```

### 2.3 HATEOAS

Toda resposta inclui links para navegacao da API:

```typescript
interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
  links: {
    self: string;
    next?: string;
    prev?: string;
    related?: Record<string, string>;
  };
  error?: ApiError;
}

// Exemplo:
// GET /api/v1/projects/abc-123
{
  "data": {
    "id": "abc-123",
    "name": "meu-projeto",
    "status": "active",
    "createdAt": "2026-07-22T10:00:00Z"
  },
  "meta": {
    "requestId": "req_7x8y9z",
    "timestamp": "2026-07-22T10:00:01Z",
    "version": "1.0"
  },
  "links": {
    "self": "/api/v1/projects/abc-123",
    "agents": "/api/v1/projects/abc-123/agents",
    "workflows": "/api/v1/projects/abc-123/workflows"
  }
}
```

### 2.4 Rate Limiting

| Escopo | Limite | Janela | Headers |
|--------|--------|--------|---------|
| Global (por API Key) | 1000 req/min | 1 min sliding | X-RateLimit-Global-* |
| `/api/v1/chat` | 100 req/min | 1 min | X-RateLimit-Chat-* |
| `/api/v1/agents` | 50 req/min | 1 min | X-RateLimit-Agents-* |
| `/api/v1/workflows` | 30 req/min | 1 min | X-RateLimit-Workflows-* |
| `/api/v1/events` | 1 conexao simultanea | N/A | X-RateLimit-Events-* |

Resposta 429 Too Many Requests:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Reset at 2026-07-22T10:01:00Z",
    "retryAfter": 45
  }
}
```

### 2.5 Paginacao

Cursor-based pagination para consistencia em listas dinamicas:

```typescript
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    pagination: {
      cursor: string | null;     // cursor para proxima pagina
      previous?: string | null;  // cursor para pagina anterior
      limit: number;             // items por pagina
      total?: number;            // total estimado (opcional, caro de calcular)
      hasMore: boolean;
    };
  };
}

// Request:  GET /api/v1/projects?limit=20&cursor=abc
// Response:
{
  "data": [ ... ],
  "meta": {
    "pagination": {
      "cursor": "def",
      "previous": "abc",
      "limit": 20,
      "hasMore": true
    }
  },
  "links": {
    "self": "/api/v1/projects?limit=20&cursor=abc",
    "next": "/api/v1/projects?limit=20&cursor=def"
  }
}
```

### 2.6 Codigos de Erro

| Codigo | Significado | Uso |
|--------|-------------|-----|
| `INVALID_REQUEST` | Erro de validacao de input | Campos obrigatorios faltando, tipos invalidos |
| `UNAUTHORIZED` | Autenticacao ausente ou invalida | API Key faltando, JWT expirado |
| `FORBIDDEN` | Scope insuficiente | Chave nao tem permissao para o recurso |
| `NOT_FOUND` | Recurso inexistente | ID invalido, path inexistente |
| `RATE_LIMIT_EXCEEDED` | Rate limit atingido | Muitas requisicoes |
| `CONFLICT` | Conflito de estado | Recurso ja existe, lock |
| `DEPENDENCY_FAILURE` | Falha em servico interno | LLM indisponivel, NATS fora |
| `INTERNAL_ERROR` | Erro interno nao categorizado | Bug, fallback generico |

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "code": "REQUIRED",
        "message": "Project name is required"
      }
    ]
  }
}
```

---

## 3. Endpoints da API Publica

### 3.1 Visao Geral

| Metodo | Path | Descricao | Autenticacao |
|--------|------|-----------|--------------|
| `GET` | `/api/v1/health` | Health check | Nao |
| `GET` | `/api/v1` | Root com links HATEOAS | Nao |
| `GET` | `/api/v1/openapi.json` | OpenAPI 3.1 spec | Nao |

### 3.2 Projects

CRUD de projetos IDEIA. Um projeto e a unidade organizacional que agrupa agentes, workflows, contexto e configuracao.

| Metodo | Path | Descricao | Scopes |
|--------|------|-----------|--------|
| `POST` | `/api/v1/projects` | Criar projeto | `projects:write` |
| `GET` | `/api/v1/projects` | Listar projetos | `projects:read` |
| `GET` | `/api/v1/projects/:id` | Obter projeto | `projects:read` |
| `PUT` | `/api/v1/projects/:id` | Atualizar projeto | `projects:write` |
| `DELETE` | `/api/v1/projects/:id` | Remover projeto | `projects:delete` |
| `GET` | `/api/v1/projects/:id/status` | Status do projeto | `projects:read` |
| `POST` | `/api/v1/projects/:id/archive` | Arquivar projeto | `projects:write` |

**POST /api/v1/projects**

```typescript
// Request
{
  "name": "meu-projeto",
  "description": "Projeto de exemplo",
  "template": "node-typescript",    // opcional: template inicial
  "tags": ["backend", "api"],
  "config": {
    "language": "typescript",
    "agentAutonomy": "guided"       // N1-N4
  }
}

// Response 201
{
  "data": {
    "id": "proj_abc123",
    "name": "meu-projeto",
    "description": "Projeto de exemplo",
    "status": "initializing",
    "workspacePath": "/workspaces/meu-projeto",
    "config": { ... },
    "tags": ["backend", "api"],
    "createdAt": "2026-07-22T10:00:00Z",
    "updatedAt": "2026-07-22T10:00:00Z"
  },
  "meta": { ... },
  "links": {
    "self": "/api/v1/projects/proj_abc123",
    "agents": "/api/v1/projects/proj_abc123/agents",
    "workflows": "/api/v1/projects/proj_abc123/workflows"
  }
}
```

### 3.3 Agents

Execucao e gerenciamento de agentes IDEIA (Analyst, Architect, Programmer, Reviewer, Tester, DevOps).

| Metodo | Path | Descricao | Scopes |
|--------|------|-----------|--------|
| `GET` | `/api/v1/agents` | Listar agentes disponiveis | `agents:read` |
| `GET` | `/api/v1/agents/:type` | Detalhes de um agente | `agents:read` |
| `POST` | `/api/v1/agents/:type/execute` | Executar agente | `agents:execute` |
| `GET` | `/api/v1/agents/executions/:id` | Status de execucao | `agents:read` |
| `POST` | `/api/v1/agents/executions/:id/cancel` | Cancelar execucao | `agents:execute` |
| `GET` | `/api/v1/agents/executions/:id/logs` | Logs da execucao | `agents:read` |
| `GET` | `/api/v1/agents/executions/:id/result` | Resultado final | `agents:read` |

**POST /api/v1/agents/:type/execute**

```typescript
// Request
{
  "task": "Implemente autenticacao JWT no modulo de usuarios",
  "projectId": "proj_abc123",
  "config": {
    "model": "ollama/llama3",
    "temperature": 0.2,
    "maxSteps": 50,
    "autonomyLevel": "guided"
  },
  "context": {
    "files": ["src/auth/login.ts", "src/auth/types.ts"],
    "constraints": ["usar bcrypt para senhas"]
  },
  "webhookUrl": "https://meusistema.com/webhooks/ideia"
}

// Response 202
{
  "data": {
    "executionId": "exec_xyz789",
    "agentType": "programmer",
    "status": "queued",
    "position": 3,              // fila de espera
    "estimatedDuration": "30s"
  },
  "meta": { ... },
  "links": {
    "self": "/api/v1/agents/executions/exec_xyz789",
    "status": "/api/v1/agents/executions/exec_xyz789/status",
    "result": "/api/v1/agents/executions/exec_xyz789/result",
    "logs": "/api/v1/agents/executions/exec_xyz789/logs",
    "cancel": "/api/v1/agents/executions/exec_xyz789/cancel"
  }
}
```

**GET /api/v1/agents (lista de tipos disponiveis)**

```json
{
  "data": [
    {
      "type": "analyst",
      "name": "Analyst Agent",
      "description": "Analisa requisitos e produz documentacao",
      "version": "1.2.0",
      "capabilities": ["requirements-analysis", "documentation-generation"],
      "models": ["ollama/llama3", "openai/gpt-4", "deepseek/deepseek-coder"]
    },
    {
      "type": "architect",
      "name": "Architect Agent",
      "description": "Propoe arquitetura e design patterns",
      "version": "1.1.0",
      "capabilities": ["architecture-design", "technology-selection"],
      "models": ["ollama/llama3", "openai/gpt-4"]
    }
  ]
}
```

### 3.4 Chat

Interface programatica para chat com LLMs via IDEIA.

| Metodo | Path | Descricao | Scopes |
|--------|------|-----------|--------|
| `POST` | `/api/v1/chat/completions` | Enviar mensagem e receber resposta | `chat:write` |
| `POST` | `/api/v1/chat/stream` | Stream de resposta SSE | `chat:write` |
| `GET` | `/api/v1/chat/sessions` | Listar sessoes ativas | `chat:read` |
| `GET` | `/api/v1/chat/sessions/:id` | Obter historico da sessao | `chat:read` |
| `DELETE` | `/api/v1/chat/sessions/:id` | Limpar sessao | `chat:write` |

**POST /api/v1/chat/completions**

```typescript
// Request
{
  "model": "ollama/llama3",
  "messages": [
    { "role": "system", "content": "Voce e um assistente senior de TypeScript." },
    { "role": "user", "content": "Explique generics em TypeScript com exemplos." }
  ],
  "temperature": 0.7,
  "maxTokens": 2048,
  "sessionId": "sess_456",        // opcional: continuar sessao existente
  "tools": ["search", "read-file"] // opcional: MCP tools habilitadas
}

// Response 200
{
  "data": {
    "id": "msg_789",
    "sessionId": "sess_456",
    "model": "ollama/llama3",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "Generics em TypeScript permitem... (texto completo)"
        },
        "finishReason": "stop"
      }
    ],
    "usage": {
      "promptTokens": 45,
      "completionTokens": 320,
      "totalTokens": 365
    }
  }
}
```

**POST /api/v1/chat/stream (SSE Stream)**

```
Request:
POST /api/v1/chat/stream
Content-Type: application/json
Authorization: Bearer <token>

{ "model": "ollama/llama3", "messages": [...] }

Response (text/event-stream):
event: message
data: {"delta": {"content": "Generics"}, "index": 0}

event: message
data: {"delta": {"content": " em TypeScript"}, "index": 0}

event: done
data: {"usage": {"promptTokens": 45, "completionTokens": 320}}

event: error
data: {"code": "MODEL_UNAVAILABLE", "message": "Modelo temporariamente indisponivel"}
```

### 3.5 Context

Consulta de contexto do workspace, projeto e sistema.

| Metodo | Path | Descricao | Scopes |
|--------|------|-----------|--------|
| `GET` | `/api/v1/context` | Contexto completo do workspace | `context:read` |
| `GET` | `/api/v1/context/project` | Contexto do projeto atual | `context:read` |
| `GET` | `/api/v1/context/search` | Busca contextual semantica | `context:read` |
| `GET` | `/api/v1/context/gaps` | Gaps ativos do projeto | `context:read` |
| `POST` | `/api/v1/context/enrich` | Enriquecer prompt com contexto | `context:write` |
| `GET` | `/api/v1/context/:resource` | Contexto de recurso especifico | `context:read` |

**GET /api/v1/context/search?q=autenticacao+jwt**

```json
{
  "data": [
    {
      "type": "file",
      "path": "src/auth/login.ts",
      "relevance": 0.95,
      "snippet": "export async function login(credentials: Credentials) { ... }",
      "tags": ["auth", "jwt", "login"]
    },
    {
      "type": "doc",
      "title": "ESTUDO-AUTENTICACAO-AUTORIZACAO.md",
      "relevance": 0.88,
      "snippet": "JWT com refresh token e revogacao via Redis",
      "tags": ["jwt", "security"]
    }
  ]
}
```

### 3.6 Capabilities

Descoberta de capacidades do sistema (Registry S27).

| Metodo | Path | Descricao | Scopes |
|--------|------|-----------|--------|
| `GET` | `/api/v1/capabilities` | Listar todas as capacidades | `capabilities:read` |
| `GET` | `/api/v1/capabilities/:id` | Detalhe de capacidade | `capabilities:read` |
| `POST` | `/api/v1/capabilities/match` | Buscar capacidades por requisito | `capabilities:read` |
| `GET` | `/api/v1/capabilities/categories` | Categorias disponiveis | `capabilities:read` |

**POST /api/v1/capabilities/match**

```typescript
// Request
{
  "requirement": "Gerar codigo TypeScript com autenticacao",
  "filters": {
    "category": "agent",
    "status": "active"
  },
  "limit": 5
}

// Response
{
  "data": [
    {
      "id": "agent.programmer.v1",
      "name": "Programmer Agent",
      "score": 0.92,
      "category": "agent",
      "subcategory": "implementation",
      "description": "Implementa codigo TypeScript com autenticacao e autorizacao",
      "inputs": [
        { "name": "task", "type": "string", "required": true }
      ],
      "outputs": [
        { "name": "code", "type": "FileContent[]" }
      ]
    },
    {
      "id": "tool.codegen.auth",
      "name": "Auth Code Generator",
      "score": 0.78,
      "category": "tool",
      "subcategory": "codegen"
    }
  ]
}
```

### 3.7 Workflows

Execucao de workflows orquestrados (DAG de tarefas multi-agente).

| Metodo | Path | Descricao | Scopes |
|--------|------|-----------|--------|
| `POST` | `/api/v1/workflows` | Criar e iniciar workflow | `workflows:write` |
| `GET` | `/api/v1/workflows` | Listar workflows | `workflows:read` |
| `GET` | `/api/v1/workflows/:id` | Obter workflow | `workflows:read` |
| `GET` | `/api/v1/workflows/:id/status` | Status detalhado | `workflows:read` |
| `POST` | `/api/v1/workflows/:id/cancel` | Cancelar workflow | `workflows:write` |
| `POST` | `/api/v1/workflows/:id/retry` | Retentar workflow | `workflows:write` |
| `GET` | `/api/v1/workflows/:id/nodes` | Nos do DAG | `workflows:read` |
| `GET` | `/api/v1/workflows/:id/nodes/:nodeId/logs` | Logs de um no | `workflows:read` |

**POST /api/v1/workflows**

```typescript
// Request
{
  "name": "Implementar modulo de usuarios",
  "projectId": "proj_abc123",
  "definition": {
    "nodes": [
      {
        "id": "analisar",
        "agent": "analyst",
        "task": "Analise os requisitos de autenticacao JWT",
        "dependsOn": []
      },
      {
        "id": "implementar",
        "agent": "programmer",
        "task": "Implemente autenticacao JWT com base na analise",
        "dependsOn": ["analisar"]
      },
      {
        "id": "testar",
        "agent": "tester",
        "task": "Crie testes para o modulo de autenticacao",
        "dependsOn": ["implementar"]
      },
      {
        "id": "revisar",
        "agent": "reviewer",
        "task": "Revise o codigo e os testes",
        "dependsOn": ["testar"]
      }
    ]
  },
  "webhookUrl": "https://meusistema.com/webhooks/ideia"
}

// Response 202
{
  "data": {
    "id": "wf_def456",
    "name": "Implementar modulo de usuarios",
    "status": "running",
    "progress": {
      "total": 4,
      "completed": 0,
      "failed": 0,
      "running": 1
    },
    "currentNode": "analisar",
    "createdAt": "2026-07-22T10:00:00Z"
  },
  "meta": { ... },
  "links": {
    "self": "/api/v1/workflows/wf_def456",
    "status": "/api/v1/workflows/wf_def456/status",
    "events": "/api/v1/events?resource=workflow:wf_def456"
  }
}
```

### 3.8 Events

Stream de eventos em tempo real via SSE.

| Metodo | Path | Descricao | Scopes |
|--------|------|-----------|--------|
| `GET` | `/api/v1/events` | Stream SSE de eventos | `events:read` |
| `GET` | `/api/v1/events?resource=workflow:wf_123` | Stream filtrado por recurso | `events:read` |
| `GET` | `/api/v1/events?type=agent.status` | Stream filtrado por tipo | `events:read` |
| `GET` | `/api/v1/webhooks` | Listar webhooks configurados | `webhooks:read` |
| `POST` | `/api/v1/webhooks` | Registrar webhook | `webhooks:write` |
| `DELETE` | `/api/v1/webhooks/:id` | Remover webhook | `webhooks:write` |
| `GET` | `/api/v1/webhooks/:id/deliveries` | Historico de entregas | `webhooks:read` |

**Event Types**

| Tipo | Descricao | Payload |
|------|-----------|---------|
| `agent.started` | Agente iniciou execucao | `{ executionId, agentType, task }` |
| `agent.progress` | Progresso parcial do agente | `{ executionId, step, total }` |
| `agent.completed` | Agente concluiu | `{ executionId, result }` |
| `agent.failed` | Agente falhou | `{ executionId, error }` |
| `workflow.started` | Workflow iniciou | `{ workflowId, name }` |
| `workflow.node.completed` | No do DAG concluiu | `{ workflowId, nodeId, agent }` |
| `workflow.completed` | Workflow concluiu | `{ workflowId, status }` |
| `workflow.failed` | Workflow falhou | `{ workflowId, error }` |
| `project.created` | Projeto criado | `{ projectId, name }` |
| `project.updated` | Projeto atualizado | `{ projectId, changes }` |
| `system.alert` | Alerta do sistema | `{ severity, message }` |

**SSE Stream**

```
GET /api/v1/events?resource=workflow:wf_def456
Authorization: Bearer <token>
Accept: text/event-stream

event: workflow.started
data: {"workflowId":"wf_def456","name":"Implementar modulo de usuarios"}

event: agent.started
data: {"executionId":"exec_111","agentType":"analyst","step":"analisar"}

event: agent.completed
data: {"executionId":"exec_111","result":"Analise completa em documentos/analise.md"}

event: workflow.node.completed
data: {"workflowId":"wf_def456","nodeId":"analisar","status":"completed"}

event: agent.started
data: {"executionId":"exec_222","agentType":"programmer","step":"implementar"}

event: workflow.completed
data: {"workflowId":"wf_def456","status":"completed","duration":"2m34s"}
```

**Webhook Registration**

```typescript
POST /api/v1/webhooks
{
  "url": "https://meusistema.com/webhooks/ideia",
  "events": ["agent.completed", "workflow.completed", "workflow.failed"],
  "secret": "whsec_abc123",           // usado para HMAC signature
  "filters": {
    "projectId": "proj_abc123"        // opcional: filtrar por projeto
  },
  "retryConfig": {
    "maxRetries": 3,
    "backoffMs": 1000
  }
}

// Response 201
{
  "data": {
    "id": "wh_789",
    "url": "https://meusistema.com/webhooks/ideia",
    "events": ["agent.completed", "workflow.completed", "workflow.failed"],
    "status": "active",
    "createdAt": "2026-07-22T10:00:00Z"
  }
}
```

---

## 4. Autenticacao e Autorizacao

### 4.1 Modelo de Autenticacao

Tres mecanismos de autenticacao suportados:

| Mecanismo | Uso | Header | Expiracao |
|-----------|-----|--------|-----------|
| **API Key** | Automacao CI/CD, scripts | `X-API-Key: ideia_sk_...` | Nao expira (revogavel manualmente) |
| **JWT** | SDK Client, sessoes de usuario | `Authorization: Bearer <jwt>` | 1h (refresh via /auth/refresh) |
| **OAuth2** | Integracao com GitHub/GitLab | `Authorization: Bearer <oauth_token>` | Conforme provider |

### 4.2 Scopes por Recurso

| Scope | Recursos | Descricao |
|-------|----------|-----------|
| `projects:read` | GET /projects/* | Ler projetos e metadados |
| `projects:write` | POST/PUT /projects/* | Criar e atualizar projetos |
| `projects:delete` | DELETE /projects/* | Remover projetos |
| `agents:read` | GET /agents/* | Listar e consultar agentes |
| `agents:execute` | POST /agents/*/execute | Executar agentes |
| `chat:read` | GET /chat/* | Ler historico de chat |
| `chat:write` | POST /chat/* | Enviar mensagens |
| `context:read` | GET /context/* | Consultar contexto |
| `context:write` | POST /context/* | Enriquecer e modificar contexto |
| `capabilities:read` | GET /capabilities/* | Descobrir capacidades |
| `workflows:read` | GET /workflows/* | Ler workflows |
| `workflows:write` | POST /workflows/* | Criar e gerenciar workflows |
| `events:read` | GET /events | Stream de eventos |
| `webhooks:read` | GET /webhooks/* | Listar webhooks |
| `webhooks:write` | POST/DELETE /webhooks/* | Gerenciar webhooks |
| `admin:all` | Todos | Acesso administrativo completo |

### 4.3 Geracao de API Keys

```typescript
// POST /api/v1/auth/keys
// (endpoint administrativo, scope: admin:all)

{
  "name": "CI/CD GitHub Actions",
  "scopes": ["projects:read", "agents:execute", "workflows:write"],
  "expiresAt": "2027-07-22T00:00:00Z"   // opcional
}

// Response 201
{
  "data": {
    "id": "key_456",
    "name": "CI/CD GitHub Actions",
    "key": "ideia_sk_abc123def456...",   // mostrado apenas na criacao
    "keyPrefix": "ideia_sk_abc",
    "scopes": ["projects:read", "agents:execute", "workflows:write"],
    "createdAt": "2026-07-22T10:00:00Z",
    "lastUsedAt": null
  }
}
```

### 4.4 Rate Limit por Chave

Cada API Key tem rate limits configuraveis:

```typescript
interface RateLimitConfig {
  global: { limit: number; windowMs: number };
  perEndpoint: Record<string, { limit: number; windowMs: number }>;
}
```

Headers de resposta:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1721653200
X-RateLimit-Scope: global
```

### 4.5 Fluxo de Autenticacao JWT

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Client      │     │  API Gateway      │     │  Auth Service    │
│  (SDK/curl)  │     │                   │     │                  │
└──────┬───────┘     └────────┬─────────┘     └────────┬─────────┘
       │                      │                        │
       │  POST /auth/token    │                        │
       │  { apiKey }          │                        │
       ├─────────────────────▶│                        │
       │                      │  validate API Key      │
       │                      ├───────────────────────▶│
       │                      │                        │── verify key
       │                      │                        │── check scopes
       │                      │                        │── generate JWT
       │                      │  { token, expiresIn }  │
       │                      │◀───────────────────────┤
       │  { accessToken,      │                        │
       │    expiresIn: 3600 } │                        │
       │◀─────────────────────┤                        │
       │                      │                        │
       │  GET /api/v1/projects│                        │
       │  Authorization: Bearer <jwt>                   │
       ├─────────────────────▶│                        │
       │                      │  validate JWT          │
       │                      │  check scopes          │
       │                      │  check rate limit      │
       │                      │                        │
       │  200 { data: [...] } │                        │
       │◀─────────────────────┤                        │
```

---

## 5. SDK Client

### 5.1 SDK TypeScript/JavaScript

O SDK client oficial para TypeScript fornece tipagem completa, autenticacao automatica, retry, paginacao e streaming.

```typescript
// packages/sdk-ideia/src/index.ts

import { IdeiaClient, IdeiaClientConfig } from '@ideia/sdk';

const client = new IdeiaClient({
  apiKey: 'ideia_sk_...',
  baseUrl: 'https://api.ideia.ai/v1',
  timeout: 30000,
  retry: {
    maxRetries: 3,
    backoff: 'exponential',
    retryOn: [429, 500, 502, 503]
  }
});

// ============================================================
// Tipos exportados pelo SDK
// ============================================================

export interface IdeiaClientConfig {
  apiKey?: string;
  accessToken?: string;
  baseUrl: string;
  timeout?: number;
  retry?: RetryConfig;
  headers?: Record<string, string>;
}

export interface RetryConfig {
  maxRetries: number;
  backoff: 'linear' | 'exponential';
  retryOn: number[];
}

// ============================================================
// Metodos do SDK
// ============================================================

export class IdeiaClient {
  // Projects
  async createProject(params: CreateProjectParams): Promise<Project>
  async listProjects(params?: PaginationParams): Promise<PaginatedResponse<Project>>
  async getProject(id: string): Promise<Project>
  async updateProject(id: string, params: UpdateProjectParams): Promise<Project>
  async deleteProject(id: string): Promise<void>

  // Agents
  async listAgents(): Promise<AgentType[]>
  async getAgent(type: string): Promise<AgentType>
  async executeAgent(type: string, params: ExecuteAgentParams): Promise<Execution>
  async getExecution(id: string): Promise<Execution>
  async cancelExecution(id: string): Promise<void>
  async getExecutionLogs(id: string): Promise<string[]>
  async getExecutionResult(id: string): Promise<ExecutionResult>
  async streamExecution(id: string): Promise<EventStream>

  // Chat
  async chat(params: ChatParams): Promise<ChatResponse>
  async chatStream(params: ChatParams): Promise<EventStream>

  // Context
  async getContext(): Promise<Context>
  async searchContext(query: string): Promise<ContextResult[]>
  async enrichContext(params: EnrichContextParams): Promise<string>

  // Capabilities
  async listCapabilities(): Promise<Capability[]>
  async matchCapability(requirement: string): Promise<CapabilityMatch[]>

  // Workflows
  async createWorkflow(params: CreateWorkflowParams): Promise<Workflow>
  async listWorkflows(params?: PaginationParams): Promise<PaginatedResponse<Workflow>>
  async getWorkflow(id: string): Promise<Workflow>
  async getWorkflowStatus(id: string): Promise<WorkflowStatus>
  async cancelWorkflow(id: string): Promise<void>
  async retryWorkflow(id: string): Promise<void>

  // Events
  async streamEvents(filter?: EventFilter): Promise<EventStream>
  async registerWebhook(params: WebhookParams): Promise<Webhook>
  async listWebhooks(): Promise<Webhook[]>
  async deleteWebhook(id: string): Promise<void>

  // Auth
  async createApiKey(params: CreateApiKeyParams): Promise<ApiKey>
  async listApiKeys(): Promise<ApiKey[]>
  async revokeApiKey(id: string): Promise<void>
}
```

### 5.2 Autenticacao Automatica

```typescript
// O SDK gerencia autenticacao automaticamente:
// - Se apiKey for fornecida: gera JWT internamente via /auth/token
// - Se accessToken for fornecido: usa diretamente
// - Se JWT expirar: faz refresh automatico

export class IdeiaClient {
  private tokenManager: TokenManager;

  constructor(config: IdeiaClientConfig) {
    this.tokenManager = new TokenManager({
      apiKey: config.apiKey,
      initialToken: config.accessToken,
      authUrl: `${config.baseUrl}/auth/token`,
      refreshUrl: `${config.baseUrl}/auth/refresh`
    });
  }

  private async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    const token = await this.tokenManager.getValidToken();
    const url = `${this.config.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': `ideia-sdk-js/${VERSION}`
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: options?.signal
    });

    if (!response.ok) {
      throw await IdeiaError.fromResponse(response);
    }

    return response.json();
  }
}

// Gerenciamento de token com refresh automatico
class TokenManager {
  private currentToken: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<string> | null = null;

  async getValidToken(): Promise<string> {
    if (this.currentToken && Date.now() < this.expiresAt - 60000) {
      return this.currentToken;
    }
    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<string> {
    if (this.apiKey) {
      const res = await fetch(this.authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: this.apiKey })
      });
      const data = await res.json();
      this.currentToken = data.accessToken;
      this.expiresAt = Date.now() + data.expiresIn * 1000;
      return this.currentToken!;
    }
    throw new Error('No authentication method available');
  }
}
```

### 5.3 Retry com Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof IdeiaError && config.retryOn.includes(error.status)) {
        if (attempt === config.maxRetries) break;

        const delay = config.backoff === 'exponential'
          ? Math.min(1000 * Math.pow(2, attempt), 30000)
          : 1000 * (attempt + 1);

        // Jitter para evitar thundering herd
        const jitter = Math.random() * 100;
        await sleep(delay + jitter);
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}
```

### 5.4 Paginacao no SDK

```typescript
// Iterator assincrono para paginacao automatica
async function* paginate<T>(
  client: IdeiaClient,
  path: string,
  params?: Record<string, unknown>
): AsyncGenerator<T, void, undefined> {
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const queryParams = { ...params, limit: params?.limit ?? 100 };
    if (cursor) {
      queryParams.cursor = cursor;
    }

    const response = await client.request<PaginatedResponse<T>>('GET', path, {
      body: queryParams
    });

    for (const item of response.data) {
      yield item;
    }

    cursor = response.meta.pagination.cursor;
    hasMore = response.meta.pagination.hasMore;
  }
}

// Uso:
// for await (const project of paginate(client, '/projects')) {
//   console.log(project.name);
// }
```

### 5.5 Stream de Eventos

```typescript
export class EventStream {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private abortController: AbortController;
  private buffer: string = '';

  constructor(response: Response, abortController: AbortController) {
    this.reader = response.body!.getReader();
    this.abortController = abortController;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<SSEEvent, void, undefined> {
    try {
      while (true) {
        const { done, value } = await this.reader.read();
        if (done) break;

        this.buffer += new TextDecoder().decode(value);
        const events = this.buffer.split('\n\n');
        this.buffer = events.pop() || '';

        for (const raw of events) {
          const parsed = this.parseSSE(raw);
          if (parsed) yield parsed;
        }
      }
    } finally {
      this.reader.releaseLock();
    }
  }

  cancel(): void {
    this.abortController.abort();
  }

  private parseSSE(raw: string): SSEEvent | null {
    const lines = raw.split('\n');
    let event = 'message';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        event = line.slice(7);
      } else if (line.startsWith('data: ')) {
        data = line.slice(6);
      }
    }

    if (!data) return null;
    return { event, data: JSON.parse(data) };
  }
}
```

### 5.6 SDK em Python (Exemplo)

```python
# packages/sdk-ideia-python/ideia/client.py

from typing import AsyncGenerator, Optional
import httpx
import jwt
import time

class IdeiaClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.ideia.ai/v1",
        timeout: int = 30
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout
        self._token: Optional[str] = None
        self._token_expires: float = 0

    async def _get_token(self) -> str:
        if self._token and time.time() < self._token_expires - 60:
            return self._token

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/auth/token",
                json={"apiKey": self.api_key}
            )
            data = resp.json()
            self._token = data["accessToken"]
            self._token_expires = time.time() + data["expiresIn"]
            return self._token

    async def create_project(self, name: str, **kwargs) -> dict:
        token = await self._get_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/projects",
                json={"name": name, **kwargs},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=self.timeout
            )
            resp.raise_for_status()
            return resp.json()["data"]

    async def execute_agent(
        self,
        agent_type: str,
        task: str,
        project_id: str
    ) -> dict:
        token = await self._get_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/agents/{agent_type}/execute",
                json={
                    "task": task,
                    "projectId": project_id
                },
                headers={"Authorization": f"Bearer {token}"},
                timeout=self.timeout
            )
            resp.raise_for_status()
            return resp.json()["data"]

    async def stream_events(
        self,
        resource: Optional[str] = None
    ) -> AsyncGenerator[dict, None]:
        token = await self._get_token()
        params = {"resource": resource} if resource else {}

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "GET",
                f"{self.base_url}/events",
                params=params,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "text/event-stream"
                },
                timeout=None
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        yield json.loads(line[6:])


# Uso:
# import asyncio
# client = IdeiaClient(api_key="ideia_sk_...")
#
# async def main():
#     project = await client.create_project("meu-projeto")
#     execution = await client.execute_agent(
#         "programmer",
#         "Implemente login JWT",
#         project["id"]
#     )
#     print(f"Execucao: {execution['executionId']}")
#
# asyncio.run(main())
```

---

## 6. Event-Driven API

### 6.1 Arquitetura de Eventos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       EVENT-DRIVEN ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────────────┐    ┌──────────────────┐  │
│  │  Internal     │    │  Event Bus (NATS)     │    │  External        │  │
│  │  Services     │───▶│                       │───▶│  Consumers       │  │
│  │               │    │  ┌─────────────────┐  │    │                  │  │
│  │  Agent        │    │  │ topics:          │  │    │  SSE Stream     │  │
│  │  Runtime      │    │  │ - agent.*        │  │    │  (GET /events)  │  │
│  │               │    │  │ - workflow.*     │  │    │                  │  │
│  │  Workflow     │    │  │ - project.*      │  │    │  Webhook POST   │  │
│  │  Engine       │    │  │ - system.*       │  │    │  (callback URL) │  │
│  │               │    │  └─────────────────┘  │    │                  │  │
│  │  Chat         │    │  ┌─────────────────┐  │    │  NATS Bridge    │  │
│  │  Service      │    │  │ subjects:        │  │    │  (direct NATS) │  │
│  │               │    │  │ api.events.>     │  │    │                  │  │
│  │  Project      │    │  │ api.webhook.>    │  │    └──────────────────┘  │
│  │  Manager      │    │  └─────────────────┘  │                          │
│  │               │    └──────────────────────┘                          │
│  └──────────────┘                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 SSE vs WebSocket vs Webhook

| Tecnologia | Uso | Direcao | Estado | Complexidade |
|------------|-----|---------|--------|-------------|
| **SSE** | Stream unidirecional de eventos do servidor | Servidor -> Cliente | Stateless | Baixa |
| **WebSocket** | Comunicacao bidirecional em tempo real | Ambos | Stateful | Media |
| **Webhook** | Notificacao assincrona via HTTP POST | Servidor -> URL externa | Stateless | Baixa |

### 6.3 NATS Bridge (Fase 2)

Para consumidores avancados que precisam de acesso direto ao barramento NATS:

```typescript
// Configuracao do bridge NATS para API
interface NATSBridgeConfig {
  enabled: boolean;
  credentials: NATSCredentials;
  permissions: {
    subscribe: string[];    // subjects permitidos
    publish: string[];      // subjects permitidos
  };
}

// Subjects expostos via bridge
// api.events.agent.{executionId}.>
// api.events.workflow.{workflowId}.>
// api.events.project.{projectId}.>
// api.events.system.>
```

### 6.4 Formato do Evento

```typescript
interface IdeiaEvent {
  id: string;                    // unique event ID
  specversion: string;           // CloudEvents 1.0
  source: string;                // /agents/programmer
  type: string;                  // agent.completed
  subject: string;               // exec_xyz789
  time: string;                  // 2026-07-22T10:00:00Z
  datacontenttype: string;       // application/json
  data: Record<string, unknown>;
  extensions?: {
    projectId?: string;
    workflowId?: string;
    traceId?: string;
  };
}

// Exemplo completo:
{
  "id": "evt_abc123",
  "specversion": "1.0",
  "source": "/agents/programmer",
  "type": "agent.completed",
  "subject": "exec_xyz789",
  "time": "2026-07-22T10:05:00Z",
  "datacontenttype": "application/json",
  "data": {
    "executionId": "exec_xyz789",
    "agentType": "programmer",
    "status": "completed",
    "result": {
      "files": ["src/auth/jwt.ts", "src/auth/middleware.ts"],
      "summary": "Implementacao de autenticacao JWT completa"
    },
    "duration": 120000
  },
  "extensions": {
    "projectId": "proj_abc123",
    "traceId": "trace_456"
  }
}
```

### 6.5 Webhook Delivery

```typescript
// Sistema de entrega de webhooks com retry

interface WebhookDelivery {
  webhookId: string;
  event: IdeiaEvent;
  url: string;
  secret: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
}

// Assinatura HMAC para verificacao
function signWebhookPayload(payload: string, secret: string): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Headers enviados no webhook POST
// X-Ideia-Event-Id: evt_abc123
// X-Ideia-Event-Type: agent.completed
// X-Ideia-Signature: sha256=abc123def456...
// X-Ideia-Delivery-Attempt: 1
// Content-Type: application/cloudevents+json
```

---

## 7. MCP Integration

### 7.1 MCP Tools Expostos como API

O Model Context Protocol (MCP) permite que LLMs descubram e chamem ferramentas. A API IDEIA expoe os MCP tools como endpoints REST, permitindo que tanto LLMs quanto consumidores HTTP usem as mesmas ferramentas.

```typescript
// GET /api/v1/mcp/tools
{
  "data": [
    {
      "name": "read_file",
      "description": "Read contents of a file in the workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "File path relative to workspace" }
        },
        "required": ["path"]
      }
    },
    {
      "name": "write_file",
      "description": "Write content to a file in the workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "content": { "type": "string" }
        },
        "required": ["path", "content"]
      }
    },
    {
      "name": "search_code",
      "description": "Search codebase using regex patterns",
      "inputSchema": {
        "type": "object",
        "properties": {
          "pattern": { "type": "string" },
          "include": { "type": "string", "description": "File glob pattern" }
        },
        "required": ["pattern"]
      }
    },
    {
      "name": "execute_command",
      "description": "Execute a shell command in the workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "command": { "type": "string" },
          "timeout": { "type": "number" }
        },
        "required": ["command"]
      }
    },
    {
      "name": "run_agent",
      "description": "Execute an IDEIA agent with a task description",
      "inputSchema": {
        "type": "object",
        "properties": {
          "agentType": {
            "type": "string",
            "enum": ["analyst", "architect", "programmer", "reviewer", "tester", "devops"]
          },
          "task": { "type": "string" },
          "projectId": { "type": "string" }
        },
        "required": ["agentType", "task"]
      }
    }
  ]
}

// POST /api/v1/mcp/tools/call
{
  "name": "run_agent",
  "arguments": {
    "agentType": "programmer",
    "task": "Implement JWT authentication middleware",
    "projectId": "proj_abc123"
  }
}

// Response 200
{
  "data": {
    "content": [
      {
        "type": "text",
        "text": "Agent execution started. ID: exec_xyz789"
      },
      {
        "type": "resource",
        "resource": {
          "uri": "ideia://agents/executions/exec_xyz789",
          "mimeType": "application/json",
          "text": "{\"executionId\":\"exec_xyz789\",\"status\":\"running\"}"
        }
      }
    ],
    "isError": false
  }
}
```

### 7.2 Compatibilidade com MCP Spec

A API IDEIA segue a especificacao MCP (Model Context Protocol) da Anthropic:

| MCP Primitiva | Endpoint IDEIA | Descricao |
|---------------|---------------|-----------|
| `tools/list` | `GET /api/v1/mcp/tools` | Lista ferramentas disponiveis |
| `tools/call` | `POST /api/v1/mcp/tools/call` | Executa uma ferramenta |
| `resources/list` | `GET /api/v1/mcp/resources` | Lista recursos disponiveis |
| `resources/read` | `GET /api/v1/mcp/resources/:uri` | Le um recurso |
| `prompts/list` | `GET /api/v1/mcp/prompts` | Lista templates de prompt |
| `prompts/get` | `GET /api/v1/mcp/prompts/:name` | Obtem template de prompt |

### 7.3 Transporte MCP

Dois transportes suportados:

```
Transporte STDIO (para LLMs locais):
  npx @ideia/mcp-server
  → tools/list, tools/call via stdin/stdout JSON-RPC

Transporte SSE (para LLMs remotos):
  GET /api/v1/mcp/events
  → Stream de ferramentas e chamadas via SSE
  POST /api/v1/mcp/tools/call
  → Chamada direta de ferramenta via HTTP
```

---

## 8. CLI como API

### 8.1 Comando `--json` Universal

Todo comando CLI da IDEIA possui flag `--json` para saida estruturada parseavel:

```bash
# Listar projetos como JSON
IDEIA project list --json
{
  "data": [
    { "id": "proj_abc123", "name": "meu-projeto", "status": "active" }
  ],
  "meta": {
    "total": 1,
    "executionMs": 45
  }
}

# Executar agente com saida JSON
IDEIA agent run programmer "Implemente login" --json --project proj_abc123
{
  "data": {
    "executionId": "exec_xyz789",
    "status": "queued",
    "position": 1
  }
}

# Pipear saida JSON para jq
IDEIA project list --json | jq '.data[].name'
"meu-projeto"
```

### 8.2 Comandos Pipeaveis

```bash
# Pipeline de automacao via CLI
IDEIA project create --name "teste" --json \
  | jq -r '.data.id' \
  | xargs -I {} IDEIA agent run programmer "Task" --project {} --json

# Stream de eventos via CLI
IDEIA events stream --project proj_abc123 --json \
  | jq --unbuffered 'select(.type == "agent.completed") | .data'

# Workflow pipeline
IDEIA workflow create --file workflow.yaml --json \
  | jq -r '.data.id' \
  | xargs -I {} IDEIA workflow status {} --json
```

### 8.3 Formatos de Saida

| Flag | Formato | Uso |
|------|---------|-----|
| `--json` | JSON formatado | Integracao programatica, pipe |
| `--json-compact` | JSON em uma linha | Performance, logs |
| `--yaml` | YAML | Configuracao, versionamento |
| `--csv` | CSV | Planilhas, analise |
| (default) | Tabela colorida | Uso interativo humano |

### 8.4 CLI como Gateway para API

A CLI internamente se torna um cliente da API REST:

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Usuario     │     │  CLI (IDEIA)      │     │  API REST        │
│  (terminal)  │────▶│                   │────▶│  (localhost:     │
│              │     │  ┌──────────────┐ │     │   9399)          │
│              │     │  │ CLI Engine   │ │     │                  │
│              │     │  │              │ │     │  /api/v1/        │
│              │     │  │ Parse args   │ │     │  projects        │
│              │     │  │ Validate     │ │     │  agents          │
│              │     │  │ Call API     │ │     │  workflows       │
│              │     │  │ Format output│ │     │  ...             │
│              │     │  └──────────────┘ │     └──────────────────┘
│              │     └──────────────────┘
└──────────────┘
```

---

## 9. Exemplos Completos

### 9.1 SDK Usage: Criar Projeto e Executar Agente

```typescript
// exemplo-completo.ts
import { IdeiaClient } from '@ideia/sdk';
import { writeFileSync } from 'fs';

async function main() {
  const client = new IdeiaClient({
    apiKey: process.env.IDEIA_API_KEY!,
    baseUrl: 'https://api.ideia.ai/v1'
  });

  // 1. Criar projeto
  const project = await client.createProject({
    name: 'api-auth',
    description: 'Projeto de autenticacao JWT',
    template: 'node-typescript',
    tags: ['backend', 'auth']
  });
  console.log(`Projeto criado: ${project.id}`);

  // 2. Executar Analyst para analisar requisitos
  const analysisExec = await client.executeAgent('analyst', {
    task: 'Analise os requisitos para autenticacao JWT com refresh token',
    projectId: project.id
  });
  console.log(`Analyst executando: ${analysisExec.executionId}`);

  // 3. Aguardar conclusao com stream de eventos
  const events = await client.streamEvents({
    resource: `execution:${analysisExec.executionId}`
  });

  for await (const event of events) {
    console.log(`[${event.type}] ${JSON.stringify(event.data)}`);

    if (event.type === 'agent.completed') {
      const result = await client.getExecutionResult(analysisExec.executionId);
      writeFileSync('analise.md', result.summary);
      console.log('Analise salva em analise.md');
      break;
    }

    if (event.type === 'agent.failed') {
      console.error(`Falha: ${event.data.error}`);
      process.exit(1);
    }
  }

  // 4. Executar Programmer com base na analise
  const progExec = await client.executeAgent('programmer', {
    task: 'Implemente autenticacao JWT com refresh token baseado na analise em analise.md',
    projectId: project.id,
    config: {
      model: 'ollama/llama3',
      temperature: 0.2
    }
  });

  console.log(`Programmer executando: ${progExec.executionId}`);

  // 5. Stream de logs durante execucao
  const logStream = await client.streamLogs(progExec.executionId);
  for await (const log of logStream) {
    console.log(`[LOG] ${log.message}`);
  }
}

main().catch(console.error);
```

### 9.2 SDK Usage: Workflow Multi-Agente

```typescript
// workflow-completo.ts
import { IdeiaClient } from '@ideia/sdk';

async function deployWorkflow() {
  const client = new IdeiaClient({
    apiKey: process.env.IDEIA_API_KEY!,
    baseUrl: 'https://api.ideia.ai/v1'
  });

  // Criar workflow com DAG de 4 agentes
  const workflow = await client.createWorkflow({
    name: 'Implementar modulo de usuarios',
    projectId: 'proj_abc123',
    definition: {
      nodes: [
        {
          id: 'analisar',
          agent: 'analyst',
          task: 'Analise requisitos do modulo de usuarios (CRUD + autenticacao)',
          dependsOn: []
        },
        {
          id: 'arquitetar',
          agent: 'architect',
          task: 'Defina arquitetura do modulo baseado na analise',
          dependsOn: ['analisar']
        },
        {
          id: 'implementar',
          agent: 'programmer',
          task: 'Implemente o modulo seguindo a arquitetura definida',
          dependsOn: ['arquitetar']
        },
        {
          id: 'testar',
          agent: 'tester',
          task: 'Crie suite de testes para o modulo implementado',
          dependsOn: ['implementar']
        }
      ]
    },
    webhookUrl: 'https://meusistema.com/webhooks/ideia'
  });

  console.log(`Workflow iniciado: ${workflow.id}`);

  // 6. Acompanhar progresso via eventos
  const eventStream = await client.streamEvents({
    resource: `workflow:${workflow.id}`
  });

  for await (const event of eventStream) {
    switch (event.type) {
      case 'workflow.node.completed':
        console.log(`No concluido: ${event.data.nodeId}`);
        break;

      case 'workflow.completed':
        console.log(`Workflow concluido! Duracao: ${event.data.duration}`);

        // Buscar resultados de cada no
        for (const nodeId of ['analisar', 'arquitetar', 'implementar', 'testar']) {
          const nodeResult = await client.getWorkflowNodeResult(
            workflow.id, nodeId
          );
          console.log(`Resultado ${nodeId}:`, nodeResult.files);
        }
        return;

      case 'workflow.failed':
        console.error(`Workflow falhou: ${event.data.error}`);
        process.exit(1);
    }
  }
}
```

### 9.3 Webhook Callback Handler

```typescript
// servidor-webhook.ts
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// Webhook secret configurado no registro do webhook
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

function verifySignature(payload: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}

app.post('/webhooks/ideia', (req, res) => {
  const signature = req.headers['x-ideia-signature'] as string;
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature)) {
    console.error('Assinatura invalida!');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log(`[Webhook] Evento recebido: ${event.type}`);

  switch (event.type) {
    case 'agent.completed':
      // Agente concluiu - processar resultado
      console.log(`Agente ${event.data.agentType} concluiu:
        Execucao: ${event.data.executionId}
        Resultado: ${JSON.stringify(event.data.result)}`);
      break;

    case 'workflow.completed':
      // Workflow completo - notificar equipe
      console.log(`Workflow ${event.data.workflowId} concluido!
        Duracao: ${event.data.duration}`);
      // Enviar notificacao para Slack
      break;

    case 'workflow.failed':
      // Workflow falhou - alertar
      console.error(`Workflow ${event.data.workflowId} FALHOU:
        Erro: ${event.data.error}`);
      break;
  }

  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook handler rodando na porta 3000');
});
```

### 9.4 curl Examples

```bash
# ============================================================
# Autenticacao
# ============================================================

# Obter JWT a partir de API Key
curl -X POST https://api.ideia.ai/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "ideia_sk_abc123"}'

# ============================================================
# Projects
# ============================================================

# Criar projeto
curl -X POST https://api.ideia.ai/v1/projects \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "meu-projeto",
    "template": "node-typescript",
    "tags": ["api"]
  }'

# Listar projetos com paginacao
curl "https://api.ideia.ai/v1/projects?limit=20&cursor=abc" \
  -H "Authorization: Bearer <jwt>"

# ============================================================
# Agents
# ============================================================

# Executar agente
curl -X POST https://api.ideia.ai/v1/agents/programmer/execute \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Implement JWT authentication",
    "projectId": "proj_abc123"
  }'

# Obter resultado da execucao
curl https://api.ideia.ai/v1/agents/executions/exec_xyz789/result \
  -H "Authorization: Bearer <jwt>"

# ============================================================
# Chat
# ============================================================

# Chat completions
curl -X POST https://api.ideia.ai/v1/chat/completions \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ollama/llama3",
    "messages": [
      {"role": "user", "content": "Explique generics em TypeScript"}
    ]
  }'

# Chat streaming
curl -N -X POST https://api.ideia.ai/v1/chat/stream \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ollama/llama3",
    "messages": [{"role": "user", "content": "Explique generics"}]
  }'

# ============================================================
# Workflows
# ============================================================

# Criar workflow
curl -X POST https://api.ideia.ai/v1/workflows \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Implementar modulo",
    "projectId": "proj_abc123",
    "definition": {
      "nodes": [
        {"id": "analisar", "agent": "analyst", "task": "Analise requisitos", "dependsOn": []},
        {"id": "implementar", "agent": "programmer", "task": "Implemente codigo", "dependsOn": ["analisar"]}
      ]
    }
  }'

# ============================================================
# Events (SSE Stream)
# ============================================================

curl -N https://api.ideia.ai/v1/events?resource=workflow:wf_def456 \
  -H "Authorization: Bearer <jwt>" \
  -H "Accept: text/event-stream"

# ============================================================
# MCP Tools
# ============================================================

# Listar MCP tools
curl https://api.ideia.ai/v1/mcp/tools \
  -H "Authorization: Bearer <jwt>"

# Chamar MCP tool
curl -X POST https://api.ideia.ai/v1/mcp/tools/call \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "run_agent",
    "arguments": {
      "agentType": "programmer",
      "task": "Implement JWT",
      "projectId": "proj_abc123"
    }
  }'
```

### 9.5 Python SDK Uso

```python
# exemplo_python.py
import asyncio
from ideia_client import IdeiaClient

async def main():
    client = IdeiaClient(
        api_key="ideia_sk_...",
        base_url="https://api.ideia.ai/v1"
    )

    # Criar projeto
    project = await client.create_project(
        name="api-auth",
        description="Projeto de autenticacao"
    )
    print(f"Projeto: {project['id']}")

    # Executar agente
    execution = await client.execute_agent(
        agent_type="programmer",
        task="Implement JWT authentication",
        project_id=project["id"]
    )
    print(f"Execucao: {execution['executionId']}")

    # Stream de eventos
    async for event in client.stream_events(
        resource=f"execution:{execution['executionId']}"
    ):
        print(f"Evento: {event['type']}")
        if event['type'] == 'agent.completed':
            print("Agente concluiu!")
            break

asyncio.run(main())
```

---

## 10. Documentacao

### 10.1 OpenAPI 3.1 Spec

A especificacao OpenAPI 3.1 e gerada automaticamente pelo Manifest System (S26) e disponivel em:

```
GET /api/v1/openapi.json
GET /api/v1/openapi.yaml
```

Estrutura da spec:

```yaml
openapi: 3.1.0
info:
  title: IDEIA API
  version: 1.0.0
  description: API publica da plataforma IDEIA para integracao com agentes de IA,
    execucao de workflows, chat com LLMs e automacao de pipelines.
  contact:
    name: IDEIA Team
    url: https://ideia.ai
servers:
  - url: https://api.ideia.ai/v1
    description: Producao
  - url: https://staging.api.ideia.ai/v1
    description: Staging
  - url: http://localhost:9399/v1
    description: Desenvolvimento
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
  schemas:
    Project:
      type: object
      properties:
        id:
          type: string
          pattern: '^proj_[a-z0-9]+$'
        name:
          type: string
          minLength: 3
          maxLength: 100
        status:
          type: string
          enum: [initializing, active, archived, deleted]
        createdAt:
          type: string
          format: date-time
    AgentExecution:
      type: object
      properties:
        executionId:
          type: string
        agentType:
          type: string
        status:
          type: string
          enum: [queued, running, completed, failed, cancelled]
        task:
          type: string
    Workflow:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        status:
          type: string
          enum: [running, completed, failed, cancelled]
        nodes:
          type: array
          items:
            $ref: '#/components/schemas/WorkflowNode'
    Error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: array
          items:
            type: object
paths:
  /projects:
    get:
      summary: Listar projetos
      security: [{ bearerAuth: [] }]
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
        - name: cursor
          in: query
          schema: { type: string }
      responses:
        '200':
          description: Lista de projetos
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Project'
    post:
      summary: Criar projeto
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectRequest'
      responses:
        '201':
          description: Projeto criado
  /agents/{agentType}/execute:
    post:
      summary: Executar agente
      security: [{ bearerAuth: [] }]
      parameters:
        - name: agentType
          in: path
          required: true
          schema:
            type: string
            enum: [analyst, architect, programmer, reviewer, tester, devops]
      responses:
        '202':
          description: Execucao iniciada
  /events:
    get:
      summary: Stream de eventos SSE
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: SSE event stream
          content:
            text/event-stream:
              schema:
                type: string
```

### 10.2 Postman Collection

Gerada automaticamente a partir da OpenAPI spec:

```bash
# Gerar collection Postman
IDEIA api generate-postman --output ideia-api.postman_collection.json

# A collection inclui:
# - Environment: API Key, Base URL
# - Pastas por recurso (Projects, Agents, Chat, Workflows, Events)
# - Exemplos pre-preenchidos
# - Variaveis de autenticacao automatica
```

### 10.3 Documentacao Interativa

```bash
# Servidor de documentacao Swagger UI
IDEIA api docs --port 4000
# Abre http://localhost:4000/docs

# Ou via Docker
docker run -p 4000:80 \
  -e SPEC_URL=https://api.ideia.ai/v1/openapi.json \
  swaggerapi/swagger-ui
```

---

## 11. Conexoes com Outros Estudos

### 11.1 Matriz de Conexoes

| Estudo | Conexao | Descricao |
|--------|---------|-----------|
| **S26** (Manifest) | API auto-descricao | O Manifest System (S26) gera automaticamente a OpenAPI spec e alimenta o endpoint `GET /self` com capacidades da API |
| **S27** (Capability Registry) | Descoberta de capacidades | O Capability Registry fornece o backend para `GET /capabilities` e `POST /capabilities/match` |
| **S28** (Zero-to-Deploy) | Pipeline CI/CD | A API permite que pipelines CI/CD (S28) iniciem workflows e agentes programaticamente via `POST /agents/:type/execute` |
| **S20** (Plugins) | Plugin SDK consome API | Plugins (S20) usam a API IDEIA como backend para estender funcionalidades; MCP tools da API sao expostas como plugin tools |
| **S19** (Prompts) | Chat endpoint | `POST /chat/completions` expoe o Prompt Engine (S19) como API REST |
| **S1** (Event Bus) | Eventos da API | O barramento NATS (S1) alimenta os endpoints SSE e Webhook com eventos internos traduzidos para formato CloudEvents |
| **S4** (Seguranca) | Auth e scopes | O modelo de autenticacao (API Key, JWT, OAuth2) e scopes segue as politicas definidas no estudo de seguranca (S4) |
| **S13** (Performance) | Rate limiting | As estrategias de rate limiting e paginacao cursor-based seguem as recomendacoes do estudo de performance (S13) |
| **S16** (Deploy) | CI/CD integration | A API e consumida por pipelines de entrega continua (S16) para automacao de deploy |
| **S11** (Theia) | Theia como consumer | O Theia IDE consome a API internamente para operacoes de agente e workflow |
| **S10v2** (Contratos) | Contratos de API | Os schemas de request/response seguem os contratos definidos em S10v2; schemas sao registrados no Schema Registry |
| **S25** (Testes) | Testes de API | Os endpoints sao testados via contratos Pact (S25) para compatibilidade entre modulos |
| **S32** (Este estudo) | Referencia central | Este estudo e a fonte unica para design e implementacao da API/SDK |

### 11.2 Diagrama de Dependencias

```
S19 (Prompts) ──────────┐
                        │
S27 (Capability Reg) ───┤
                        │
S1  (Event Bus) ────────┤
                        ├──▶ S32 (API & SDK) ──▶ S20 (Plugins)
S26 (Manifest) ─────────┤                        │
                        │                        ├──▶ S28 (Zero-to-Deploy)
S4  (Seguranca) ────────┤                        │
                        │                        ├──▶ S11 (Theia)
S10v2 (Contratos) ──────┘                        │
                                                   └──▶ S16 (Deploy)
```

### 11.3 Contratos de Integracao (S10v2)

| Contrato | Origem | Destino | Schema |
|----------|--------|---------|--------|
| C-API-01 | API Gateway | Agent Runtime | `AgentExecutionRequest` |
| C-API-02 | API Gateway | Workflow Engine | `WorkflowDefinition` |
| C-API-03 | API Gateway | Chat Service | `ChatRequest` |
| C-API-04 | API Gateway | Context Engine | `ContextQuery` |
| C-API-05 | SSE Stream | External Consumer | `IdeiaEvent` (CloudEvents) |
| C-API-06 | Webhook Dispatcher | External URL | `WebhookDelivery` |

---

## 12. Plano de Implementacao

### 12.1 Estrutura de Packages

```
packages/
  api-gateway/              # API Gateway (Fastify + auth + rate limit)
    src/
      server.ts             # Server bootstrap
      router.ts             # Route registration
      middleware/
        auth.ts             # JWT/API Key validation
        rate-limit.ts       # Rate limiting middleware
        audit.ts            # Request logging
      config/
        scopes.ts           # Scope definitions
        limits.ts           # Rate limit configs
    test/
      e2e/                  # End-to-end API tests
      integration/          # Integration tests

  sdk-ideia/                # SDK TypeScript/JavaScript
    src/
      client.ts             # Main client class
      resources/
        projects.ts         # Project resource
        agents.ts           # Agent resource
        chat.ts             # Chat resource
        workflows.ts        # Workflow resource
        events.ts           # Event stream
        capabilities.ts     # Capability resource
        webhooks.ts         # Webhook resource
      auth/
        token-manager.ts    # Automatic token management
      transport/
        http.ts             # HTTP transport
        sse.ts              # SSE stream parser
      types/
        index.ts            # All TypeScript types
    package.json
    README.md

  sdk-ideia-python/         # SDK Python
    ideia/
      __init__.py
      client.py
      resources.py
      types.py
    setup.py
    README.md

  api-docs/                 # Documentation
    openapi/
      spec.yaml             # OpenAPI 3.1 spec
      spec.json
    postman/
      collection.json       # Postman collection
    examples/
      curl/                 # curl examples
      typescript/           # TypeScript examples
      python/               # Python examples
```

### 12.2 Tasks de Implementacao

```
FASE 0: FUNDACAO (2 semanas, P0)
─────────────────────────────────
ID         TAREFA                                    ESFORCO     DEPENDENCIAS
T-API-01   Criar package api-gateway com Fastify      3d          Nenhuma
T-API-02   Middleware de autenticacao JWT/API Key     2d          T-API-01
T-API-03   Middleware de rate limiting                1d          T-API-01
T-API-04   Middleware de audit logging                1d          T-API-01
T-API-05   Schema validation com Zod + OpenAPI gen    2d          T-API-01
T-API-06   Paginacao cursor-based                     1d          T-API-05
T-API-07   Formato de erro padronizado                1d          T-API-05
Total Fase 0: 11d

FASE 1: ENDPOINTS CORE (3 semanas, P0)
────────────────────────────────────────
ID         TAREFA                                    ESFORCO     DEPENDENCIAS
T-API-08   GET/POST /projects CRUD completo           3d          T-API-05
T-API-09   GET /projects/:id/status                   1d          T-API-08
T-API-10   POST /agents/:type/execute                 3d          T-API-05, Agent Runtime
T-API-11   GET /agents/executions/:id                  1d          T-API-10
T-API-12   GET /agents/executions/:id/result           1d          T-API-10
T-API-13   POST /chat/completions                     2d          T-API-05, Chat Service
T-API-14   POST /chat/stream                          2d          T-API-13
T-API-15   GET /capabilities                          2d          T-API-05, S27 Registry
T-API-16   POST /workflows                            2d          T-API-05, Workflow Engine
T-API-17   GET /workflows/:id/status                  1d          T-API-16
T-API-18   POST /auth/token (JWT generation)          2d          T-API-02
Total Fase 1: 20d

FASE 2: EVENTOS E WEBHOOKS (2 semanas, P1)
────────────────────────────────────────────
ID         TAREFA                                    ESFORCO     DEPENDENCIAS
T-API-19   GET /events SSE stream                     3d          T-API-01, NATS bus
T-API-20   Formatador CloudEvents                     1d          T-API-19
T-API-21   CRUD /webhooks                             2d          T-API-01
T-API-22   Webhook dispatcher com retry               3d          T-API-21
T-API-23   HMAC signature para webhooks               1d          T-API-22
T-API-24   GET /events filtering                       1d          T-API-19
Total Fase 2: 11d

FASE 3: SDK TYPESCRIPT (2 semanas, P1)
────────────────────────────────────────
ID         TAREFA                                    ESFORCO     DEPENDENCIAS
T-API-25   Estrutura base do SDK (IdeiaClient)        1d          T-API-01
T-API-26   TokenManager com refresh automatico        2d          T-API-18
T-API-27   Resource: Projects                         1d          T-API-08
T-API-28   Resource: Agents                           1d          T-API-10
T-API-29   Resource: Chat                             1d          T-API-13
T-API-30   Resource: Workflows                        1d          T-API-16
T-API-31   Resource: Events (SSE client)              2d          T-API-19
T-API-32   Resource: Capabilities                     1d          T-API-15
T-API-33   Resource: Webhooks                         1d          T-API-21
T-API-34   Paginacao automatica (AsyncGenerator)      1d          T-API-06
T-API-35   Retry com backoff + jitter                 1d          T-API-25
T-API-36   Tipos TypeScript completos                 2d          T-API-25
T-API-37   Testes unitarios do SDK                    3d          T-API-25..36
Total Fase 3: 18d

FASE 4: MCP E DOCUMENTACAO (2 semanas, P1)
─────────────────────────────────────────────
ID         TAREFA                                    ESFORCO     DEPENDENCIAS
T-API-38   GET /mcp/tools                             2d          T-API-05, S20 MCP
T-API-39   POST /mcp/tools/call                        2d          T-API-05, S20 MCP
T-API-40   Gerador OpenAPI spec (integrado S26)        3d          T-API-05
T-API-41   Postman collection generator                1d          T-API-40
T-API-42   Documentacao interativa Swagger UI          1d          T-API-40
T-API-43   Exemplos curl completos                    1d          T-API-08..18
T-API-44   CLI --json universal (integracao API)       2d          T-API-01
Total Fase 4: 12d

FASE 5: SDK PYTHON (1 semana, P2)
────────────────────────────────────
ID         TAREFA                                    ESFORCO     DEPENDENCIAS
T-API-45   Estrutura base Python SDK                  1d          T-API-01
T-API-46   Resources em Python                        3d          T-API-45
T-API-47   Testes Python SDK                          2d          T-API-46
Total Fase 5: 6d

FASE 6: NATS BRIDGE E OAUTH (2 semanas, P2)
──────────────────────────────────────────────
ID         TAREFA                                    ESFORCO     DEPENDENCIAS
T-API-48   NATS bridge para consumidores avancados   3d          T-API-01, NATS bus
T-API-49   OAuth2 integration (GitHub, GitLab)        2d          T-API-02
T-API-50   API Key management UI                      2d          T-API-18
T-API-51   Audit trail completo de chamadas API       2d          T-API-04
T-API-52   Testes E2E completos                       3d          T-API-08..51
Total Fase 6: 12d
```

### 12.3 Cronograma

```
Fase 0: Fundacao       │ Sem 1-2  │ ████████░░░░░░░░░░░░  (11d, P0)
Fase 1: Endpoints Core │ Sem 3-5  │ ░░░░░░░░████████░░░░  (20d, P0)
Fase 2: Eventos        │ Sem 6-7  │ ░░░░░░░░░░░░░░████░░  (11d, P1)
Fase 3: SDK TS         │ Sem 7-9  │ ░░░░░░░░░░░░░░░░████  (18d, P1)
Fase 4: MCP + Docs     │ Sem 9-10 │ ░░░░░░░░░░░░░░░░░░██  (12d, P1)
Fase 5: SDK Python     │ Sem 11   │ ░░░░░░░░░░░░░░░░░░░░  (6d, P2)
Fase 6: NATS + OAuth   │ Sem 12-13│ ░░░░░░░░░░░░░░░░░░░░  (12d, P2)
─────────────────────────────────────────────────────────────
Total: 13 semanas (90 dias uteis) ~ 90d de esforco agregado
```

### 12.4 Riscos de Implementacao

| Risco | Impacto | Probabilidade | Mitigacao |
|-------|---------|---------------|-----------|
| **Mudancas no MCP spec** | Medio | Media | Abstrair MCP atras de interface `ToolRegistry`; adapter pattern para protocolo |
| **Performance do rate limiting** | Baixo | Baixa | Usar sliding window em Redis; fallback para memoria com limits mais conservadores |
| **Compatibilidade OpenAPI 3.1 com ferramentas** | Medio | Baixa | Testar contra Swagger UI, Redoc, Postman, Stoplight |
| **Webhook retry storm** | Alto | Baixa | Jitter exponencial, deduplicacao por event ID, dead letter queue |
| **Token refresh race condition** | Medio | Media | Lock no TokenManager; deduplicacao de refresh requests |
| **Python SDK sync vs async** | Medio | Alta | Oferecer ambos: sync (httpx sync) e async (httpx async); documentar escolha |

### 12.5 Metricas de Sucesso

| Metrica | Alvo | Metodo de Medicao |
|---------|------|-------------------|
| Cobertura de testes da API | >85% | Jest + Supertest |
| Cobertura de tipos SDK | 100% | TypeScript strict mode |
| Latencia P95 (chat) | <5s | K6 load testing |
| Latencia P95 (CRUD) | <200ms | K6 load testing |
| Taxa de erro < 500 | <0.1% | Monitoramento continuo |
| Documentacao OpenAPI | 100% endpoints | Validacao automatica contra router |
| Exemplos funcionais | Cobrir 100% endpoints | Testes E2E com exemplos |
| SDK NPM downloads (3 meses) | >1000/semana | NPM stats |

---

## Referencias

1. **OpenAPI 3.1 Specification** — https://spec.openapis.org/oas/v3.1.0
2. **CloudEvents 1.0** — https://cloudevents.io
3. **MCP Specification (Anthropic)** — https://modelcontextprotocol.io
4. **Fastify** — https://fastify.dev
5. **Zod** — https://zod.dev
6. **JSON Web Tokens (RFC 7519)** — https://datatracker.ietf.org/doc/html/rfc7519
7. **OAuth 2.0 (RFC 6749)** — https://datatracker.ietf.org/doc/html/rfc6749
8. **Server-Sent Events (RFC 8895)** — https://html.spec.whatwg.org/multipage/server-sent-events.html
9. **NATS JetStream** — https://docs.nats.io/nats-concepts/jetstream
10. **S26** — ESTUDO-MANIFEST-SELF-DESCRIPTION.md
11. **S27** — ESTUDO-CAPABILITY-REGISTRY.md
12. **S28** — ESTUDO-ZERO-TO-DEPLOY.md
13. **S20** — ESTUDO-PLUGINS-ECOSSISTEMA.md
14. **S19** — ESTUDO-ENGENHARIA-PROMPTS-AGENTES.md
15. **S10v2** — ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES-V2-SUPLEMENTO.md
