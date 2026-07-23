# Arquitetura da Plataforma — v3

---

## Visão Geral

```
┌──────────────────────────────────────────────────────────┐
│                    Clientes                               │
│  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌─────────────┐  │
│  │ CLI      │  │ VS Code  │  │ Web  │  │ MCP Client  │  │
│  │ (thin)   │  │ Extension│  │ UI   │  │ (IDE plugin)│  │
│  └────┬─────┘  └────┬─────┘  └──┬───┘  └──────┬──────┘  │
│       │             │           │              │         │
│       └─────────────┼───────────┼──────────────┘         │
│                     │           │                        │
│              ┌──────▼───────────▼──────────────┐         │
│              │       API Gateway (REST)         │         │
│              │  Auth · Rate Limit · Routing     │         │
│              └──────┬───────────┬──────────────┘         │
│                     │           │                        │
│        ┌────────────┼───────────┼────────────┐           │
│        │            │           │            │           │
│  ┌─────▼────┐ ┌─────▼────┐ ┌───▼────┐ ┌─────▼────┐     │
│  │Governance│ │ Planning │ │Autonomy│ │Security  │     │
│  │ Service  │ │ Service  │ │Service │ │ Service  │     │
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └────┬─────┘     │
│       │            │           │            │           │
│  ┌────▼────────────▼───────────▼────────────▼─────┐     │
│  │              Core Engine                        │     │
│  │  Task Queue · State Manager · Audit Logger      │     │
│  │  Plugin Registry · Event Bus                    │     │
│  └────────────────────┬───────────────────────────┘     │
│                       │                                  │
│  ┌────────────────────▼───────────────────────────┐     │
│  │           Storage Layer                          │     │
│  │  SQLite (local) · PostgreSQL (remote) · FS fallb.│     │
│  └──────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

---

## Camadas

### 1. Clientes

| Cliente           | Função                             | Tecnologia             |
| ----------------- | ---------------------------------- | ---------------------- |
| CLI (thin)        | Apenas encaminha comandos para API | Node.js, commander     |
| VS Code Extension | Cliente HTTP da API                | TypeScript, vscode API |
| Web UI            | Dashboard web                      | React (existente)      |
| MCP Client        | Integração com IDEs                | Model Context Protocol |

### 2. API Gateway

- Roteamento REST para serviços internos
- Autenticação (token API ou OAuth2)
- Rate limiting por cliente
- Logging centralizado

### 3. Serviços (domínios)

| Serviço    | Responsabilidade                   | Estado      |
| ---------- | ---------------------------------- | ----------- |
| Governance | Registry, resolver, policy, audit  | Persistente |
| Planning   | TaskSpec, ExecutionPlan, validação | Persistente |
| Autonomy   | Coverage, gaps, repair loop        | Persistente |
| Security   | Políticas, identidade, compliance  | Persistente |

### 4. Core Engine

- Task Queue: fila de execução assíncrona
- State Manager: contratos de estado por domínio
- Audit Logger: log imutável de operações
- Plugin Registry: cadastro e ciclo de vida de plugins
- Event Bus: pub/sub para eventos entre serviços

### 5. Storage Layer

| Provider      | Uso                          | Quando      |
| ------------- | ---------------------------- | ----------- |
| SQLite        | Desenvolvimento, single-user | Local       |
| PostgreSQL    | Produção, multi-usuário      | Servidor    |
| FS (fallback) | Config legada, migração      | Transitório |

---

## Decisões Arquiteturais

| Decisão                    | Opção escolhida                  | Alternativa rejeitada                          |
| -------------------------- | -------------------------------- | ---------------------------------------------- |
| Comunicação entre serviços | Event Bus + REST síncrono        | GraphQL (overkill para v3)                     |
| State store por domínio    | Cada serviço gerencia seu estado | State store global (acoplamento)               |
| Plugin SDK                 | TypeScript-first, WASM futuro    | Apenas JS (limitação de performance)           |
| CLI vs API                 | Ambos coexistem; CLI vira thin   | CLI removida (quebra compatibilidade)          |
| Banco de dados             | SQLite local, PostgreSQL remoto  | MongoDB (schema-less arriscado para contratos) |
| Autenticação               | API Key + JWT opcional           | OAuth2 complexo (adiado para v3.1)             |
