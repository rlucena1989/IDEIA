# Malha de Integração — AI-Devkit v2 IDE

> **Análise completa de todas as conexões entre componentes**, contratos formais,
> gaps identificados e ações de reparo para garantir coesão funcional total.

---

## 1. Mapa de Integração Atual

### 1.1 Grafo de Dependências Entre Pacotes

```
@ai-devkit/contracts  (6 tipos-base)
  ├──▶ @ai-devkit/policy-engine  (evaluatePolicy)
  ├──▶ @ai-devkit/audit-trail    (AuditTrail class)
  ├──▶ @ai-devkit/memory-store   (MemoryStore class)
  └──▶ @ai-devkit/diff-engine    (autônomo — sem deps internas)

@ai-devkit/agent-runtime  (ORQUESTRADOR CENTRAL)
  ├── contracts + policy-engine + audit-trail + memory-store
  └── **NÃO CONECTADO** à IDE Server

apps/api  (Express — approval remoto)
  ├── policy-engine + audit-trail + memory-store
  └── 3 rotas: POST /preview, /approve, /reject

@ai-devkit/cli  (IDE SERVER — api-router.ts)
  ├── @ai-devkit/policy-engine  ✔ (em cada ação)
  ├── @ai-devkit/audit-trail    ✔ (em cada ação)
  ├── @ai-devkit/diff-engine    ✔ (preview/report, preview/file)
  ├── ./session-manager         ✔ (estado da sessão)
  ├── ./file-bridge             ✔ (operações FS)
  ├── ./terminal-bridge         ✔ (shell exec)
  ├── ./memory/memory-store     ⚠ (local — diferente de @ai-devkit/memory-store)
  ├── ./governance/approval-flow✔
  ├── ./local-ai/config         ✔
  ├── ./local-ai/provider-router✔
  ├── ./sandbox                 ✔
  └── ./local-ai/chat           ✔ (chat-bridge.ts)

@ai-devkit/web-ui  (frontend React)
  └── api.ts → 16 chamadas HTTP ao api-router  ✔
      ⚠ SEM CONTRATO FORMAL — chamadas por convenção

vscode-extension
  └── cliBridge.ts → executa CLI via subprocess  ✔
      ⚠ SEM TIPAGEM — parseia stdout como JSON
```

### 1.2 Contratos Formais vs. Implícitos

| Conexão                        | Tipo              | Status             |    Risco    |
| ------------------------------ | ----------------- | ------------------ | :---------: |
| contracts → policy-engine      | `import` TS       | ✔ Formal           |    Baixo    |
| contracts → audit-trail        | `import` TS       | ✔ Formal           |    Baixo    |
| contracts → memory-store       | `import` TS       | ✔ Formal           |    Baixo    |
| policy-engine → agent-runtime  | `import` TS       | ✔ Formal           |    Baixo    |
| audit-trail → agent-runtime    | `import` TS       | ✔ Formal           |    Baixo    |
| memory-store → agent-runtime   | `import` TS       | ✔ Formal           |    Baixo    |
| api-router → policy-engine     | `import` TS       | ✔ Formal           |    Baixo    |
| api-router → audit-trail       | `import` TS       | ✔ Formal           |    Baixo    |
| api-router → diff-engine       | `import` TS       | ✔ Formal           |    Baixo    |
| **api-router → web-ui**        | **HTTP REST**     | ⚠ **Implícito**    |  **Alto**   |
| **web-ui → chat-bridge**       | **SSE**           | ⚠ **Implícito**    |  **Alto**   |
| **vscode-ext → CLI**           | **subprocess**    | ⚠ **Implícito**    |  **Médio**  |
| **agent-runtime → IDE Server** | **NÃO CONECTADO** | ❌ **Inexistente** | **Crítico** |

---

## 2. Gaps Identificados

### 🔴 GAP-01 — Dois MemoryStores Incompatíveis

**Problema**: Existem duas implementações de MemoryStore com interfaces diferentes:

| Aspecto      | `@ai-devkit/memory-store` (package)                                                       | `cli/src/memory/memory-store.ts` (local)                                        |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Interface    | `MemoryState` (sessionId, workspaceRoot, activeTask, preferences, lastDecisions, context) | `MemoryRecord` (memoryId, category, source, summary, tags, createdAt, severity) |
| Métodos      | `load(), save(), pushDecision(), updateContext()`                                         | `list(), append(), count(), remove()`                                           |
| Usado por    | agent-runtime, apps/api                                                                   | api-router (IDE Server)                                                         |
| Persistência | `MemoryStore(filePath)`                                                                   | `MemoryStore()` — path implícito                                                |

**Impacto**: Se agent-runtime for conectado à IDE Server, os dados de memória vão divergir.

**Solução**: Unificar os dois em uma única interface (`@ai-devkit/memory-store`) e eliminar o local.

---

### 🔴 GAP-02 — AgentRuntime Desconectado da IDE

**Problema**: `@ai-devkit/agent-runtime` é o orquestrador central mas **não está integrado** ao fluxo da IDE Server:

- Não há chamada a `AgentRuntime.run()` em nenhum endpoint da IDE
- O agent-runtime não recebe os eventos do api-router
- O ciclo decisão→ação→auditoria→memória não passa pelo agent-runtime

**Impacto**: O policy-engine é chamado diretamente pelo api-router, sem a camada de orquestração que planeja, coordena e reflete sobre ações.

**Solução**:

```
Fluxo atual:     User → API Router → PolicyEngine → Ação
Fluxo correto:   User → API Router → AgentRuntime → PolicyEngine → Plano → Aprovação → Ação → Audit → Memória
```

---

### 🔴 GAP-03 — Sem Contrato Formal Web UI ↔ IDE Server

**Problema**: O frontend (`packages/web-ui/src/lib/api.ts`) chama os endpoints da IDE Server por convenção de nomes. **Não há**:

- Validação de tipos no frontend (o `fetch` retorna `any`)
- Geração de cliente a partir do OpenAPI
- Contrato versionado entre frontend e backend

**Impacto**: Se o backend mudar um endpoint, o frontend quebra silenciosamente.

**Solução**: OpenAPI completo da IDE → gerar cliente TypeScript → importar no frontend.

---

### 🔴 GAP-04 — OpenAPI/AsyncAPI Incompletos

**Problema**: A especificação OpenAPI atual tem **apenas 2 endpoints** (`/health`, `/version`). A IDE tem **30+ endpoints**. AsyncAPI tem **apenas 1 canal** (`ai/events`). A IDE tem **8+ tipos de evento**.

**Impacto**: Sem documentação de API, qualquer integrador externo (e nós mesmos) não sabe quais contratos seguir.

**Solução**: Gerar OpenAPI completo da IDE Server com todos os 30+ endpoints e schemas.

---

### 🟡 GAP-05 — VS Code Extension Sem Tipagem

**Problema**: `cliBridge.ts` executa o CLI como subprocesso e parseia stdout como JSON sem validação de schema.

**Impacto**: Se o CLI mudar o formato de output, a extensão VS Code quebra silenciosamente.

**Solução**: CLI deve suportar `--json` em todos os comandos com schema validável. VS Code deve validar com Zod.

---

### 🟡 GAP-06 — ChatBridge Sem Integração com AgentRuntime

**Problema**: `chat-bridge.ts` cria `ChatEngine` diretamente, chamando LLMs sem passar pelo `AgentRuntime`. Isso significa que o chat não tem acesso a:

- Memória de sessão
- Políticas de governança
- Plano de ações
- Histórico de decisões

**Impacto**: O chat é "cego" — não sabe o contexto do projeto nem as decisões anteriores.

**Solução**: ChatBridge deve usar AgentRuntime como intermediário entre o usuário e o LLM.

---

### 🟡 GAP-07 — Eventos WebSocket Subnotificados

**Problema**: O WebSocket broadcast só cobre `file:change` e `terminal:execution`. Eventos importantes não são broadcastados:

- `approval:request` / `approval:respond`
- `preview:approve` / `preview:reject`
- `memory:update`
- `policy:change`
- `task:update`
- `diagnostics:update`

**Impacto**: A UI não reflete mudanças em tempo real para aprovações, tarefas, etc.

**Solução**: Expandir broadcast para todos os tipos de evento.

---

### 🟡 GAP-08 — Sandbox Subutilizado

**Problema**: `POST /api/sandbox/exec` existe mas não é usado pelo chat nem pelo terminal. Só funciona como API standalone.

**Impacto**: O terminal executa comandos diretamente sem sandbox. O chat não pode executar código com segurança.

**Solução**: TerminalBridge deve usar Sandbox como fallback. ChatEngine deve poder chamar sandbox para execução de código.

---

### 🟢 GAP-09 — Approval Flow Não Integrado ao Policy Engine

**Problema**: `approval-flow.ts` tem sua própria interface (`ApprovalRequest`, `ApprovalResult`) que não usa os tipos de `@ai-devkit/contracts` (como `Decision`, `ApprovalStatus`).

**Impacto**: Duplicação de tipos e possível divergência.

**Solução**: `approval-flow.ts` deve importar e usar `Decision`, `ApprovalStatus`, `Actor` de `@ai-devkit/contracts`.

---

### 🟢 GAP-10 — Contracts Subutilizados Fora dos Pacotes Core

**Problema**: Os tipos de `@ai-devkit/contracts` (`Decision`, `RiskLevel`, `Actor`, etc.) são usados apenas nos pacotes core. O CLI local, approval-flow, memory local e web-ui têm suas próprias versões desses tipos.

**Impacto**: Inconsistência semântica. Ex: `RiskLevel` no contracts é `'low' | 'medium' | 'high'`, mas o sandbox local não usa.

**Solução**: Todos os componentes devem importar tipos de `@ai-devkit/contracts`.

---

## 3. Plano de Reparo da Malha de Integração

### 3.1 Mapa de Intervenções Prioritárias

```
ID     GAP                    CAMADA          IMPACTO    ESFORÇO   PRIORIDADE
───    ───                    ──────          ──────     ───────   ──────────
GAP-02 AgentRuntime off       Orquestração    Crítico    L (4 sem) 🔴 1
GAP-01 Memory duplicado       Persistência    Crítico    M (2 sem) 🔴 2
GAP-03 Sem contrato FE↔BE    Interface       Alto       M (3 sem) 🔴 3
GAP-04 OpenAPI incompleto     Documentação    Alto       M (3 sem) 🔴 4
GAP-06 Chat sem AgentRuntime  Chat            Alto       L (4 sem) 🟡 5
GAP-07 WebSocket parcial      Eventos         Alto       M (2 sem) 🟡 6
GAP-05 VS Code sem tipos      Extensão        Médio      M (2 sem) 🟡 7
GAP-08 Sandbox subutilizado   Execução        Médio      M (3 sem) 🟡 8
GAP-09 Approval sem contracts Governança      Baixo      P (1 sem) 🟢 9
GAP-10 Contracts subutilizado Todos           Baixo      P (2 sem) 🟢 10
```

### 3.2 Dependências entre Reparos

```
GAP-02 (AgentRuntime) ──────┐
                             ├── GAP-06 (Chat integrado)
GAP-01 (Memory unify) ──────┘

GAP-04 (OpenAPI) ──────▶ GAP-03 (FE contrato)

GAP-07 (WebSocket) ──── independe
GAP-05 (VS Code) ────── independe
GAP-08 (Sandbox) ────── após GAP-06
GAP-09 (Approval) ───── após GAP-01
GAP-10 (Contracts) ──── após GAP-01
```

---

## 4. Contratos e Interfaces — Estado Alvo

### 4.1 Contratos Formais por Conexão

Cada conexão entre dois módulos deve ter:

1. **Contrato de tipos** (TypeScript interface) — o que um módulo exporta e o outro importa
2. **Contrato de API** (HTTP → OpenAPI) — para conexões rede
3. **Contrato de eventos** (WebSocket → AsyncAPI) — para eventos assíncronos
4. **Contrato de CLI** (stdout JSON schema) — para subprocessos

#### Tabela de Contratos-Alvo

| Conexão                       | Tipo       | Contrato Atual                 | Contrato Alvo                |
| ----------------------------- | ---------- | ------------------------------ | ---------------------------- |
| web-ui ↔ api-router           | HTTP REST  | Implícito                      | OpenAPI + cliente gerado     |
| web-ui ↔ chat-bridge          | SSE        | Implícito                      | OpenAPI + tipos eventos      |
| vscode-ext ↔ CLI              | subprocess | Implícito                      | JSON Schema por comando      |
| api-router → agent-runtime    | TS import  | **Não existe**                 | `AgentRequest` + `AgentPlan` |
| api-router → policy-engine    | TS import  | `PolicyInput` + `PolicyResult` | ✅ OK                        |
| api-router → audit-trail      | TS import  | `AuditEvent`                   | ✅ OK                        |
| api-router → memory-store     | TS import  | ⚠ Duplicado                    | 1 só `MemoryStore`           |
| api-router → approval-flow    | TS import  | ⚠ Tipos próprios               | Usar `@ai-devkit/contracts`  |
| agent-runtime → memory-store  | TS import  | `MemoryState`                  | ✅ OK                        |
| agent-runtime → audit-trail   | TS import  | `AuditEvent`                   | ✅ OK                        |
| agent-runtime → policy-engine | TS import  | `PolicyInput`                  | ✅ OK                        |

### 4.2 OpenAPI Alvo (30+ endpoints)

```yaml
paths:
  /api/health: GET # ✅ Existe
  /api/version: GET # ✅ Existe
  /api/ide/status: GET # ⚠ Não documentado
  /api/fs/list: GET # ⚠ Não documentado
  /api/fs/read: GET # ⚠ Não documentado
  /api/fs/write: POST # ⚠ Não documentado
  /api/fs/create: POST # ⚠ Não documentado
  /api/fs/rename: PATCH# ⚠ Não documentado
  /api/fs/delete: DELETE# ⚠ Não documentado
  /api/fs/search: GET # ⚠ Não documentado
  /api/shell: POST # ⚠ Não documentado
  /api/session: GET # ⚠ Não documentado
  /api/session: POST # ⚠ Não documentado
  /api/approval/request: POST # ⚠ Não documentado
  /api/approval/respond: POST # ⚠ Não documentado
  /api/preview/report: GET # ⚠ Não documentado
  /api/preview/file: GET # ⚠ Não documentado
  /api/preview/approve: POST # ⚠ Não documentado
  /api/preview/reject: POST # ⚠ Não documentado
  /api/memory: GET # ⚠ Não documentado
  /api/memory: POST # ⚠ Não documentado
  /api/chat/completions: POST # ⚠ Não documentado (SSE)
  /api/commands: GET # ⚠ Não documentado
  /api/audit: GET # ⚠ Não documentado
  /api/tasks: GET # ⚠ Não documentado
  /api/tasks: POST # ⚠ Não documentado
  /api/settings/providers: GET # ⚠ Não documentado
  /api/diagnostics: GET # ⚠ Não documentado
  /api/workspace/config: GET # ⚠ Não documentado
  /api/git/status: GET # ⚠ Não documentado
  /api/git/diff: GET # ⚠ Não documentado
  /api/sandbox/exec: POST # ⚠ Não documentado
```

### 4.3 AsyncAPI Alvo (8+ canais de evento)

```yaml
channels:
  ai/events: subscribe # ✅ Existe (genérico)
  file/change: publish # ⚠ Implementado mas não documentado
  terminal/execution: publish # ⚠ Implementado mas não documentado
  approval/request: publish # ⚠ Implementado mas não documentado
  approval/respond: publish # ⚠ Implementado mas não documentado
  preview/approve: publish # ⚠ Implementado mas não documentado
  preview/reject: publish # ⚠ Implementado mas não documentado
  memory/update: publish # ⚠ Implementado mas não documentado
  task/update: publish # ⚠ Implementado mas não documentado
  diagnostics/update: publish # ❌ Não implementado
```

---

## 5. Métricas de Coesão da Malha

### 5.1 Indicadores Atuais

| Indicador                   | Atual | Alvo | Cálculo        |
| --------------------------- | :---: | :--: | -------------- |
| Contratos formais (TS)      |  12   |  12  | 100%           |
| Contratos formais (HTTP)    | 2/30  |  30  | **7%**         |
| Contratos formais (Eventos) |  1/8  |  8   | **12%**        |
| Contratos formais (CLI)     |  0/5  |  5   | **0%**         |
| Duplicação de tipos         |   3   |  1   | 67% duplicados |
| Componentes com contrato    |  4/6  | 6/6  | 67%            |
| Eventos broadcastados       |  2/8  |  8   | **25%**        |
| Rotas documentadas          | 2/30  |  30  | **7%**         |

### 5.2 Meta para Fase 1

| Indicador              | Atual | Alvo Fase 1 |
| ---------------------- | :---: | :---------: |
| Contratos HTTP         |  7%   |    100%     |
| Contratos Eventos      |  12%  |    100%     |
| Rotas documentadas     |  7%   |    100%     |
| MemoryStores           |   2   |      1      |
| AgentRuntime conectado |  ❌   |     ✅      |
| Chat via AgentRuntime  |  ❌   |     ✅      |

---

## 6. Ações Imediatas por Componente

### packages/contracts/

- [ ] Adicionar `ApprovalRequest`, `ApprovalResult` aos tipos base
- [ ] Adicionar `MemoryRecord` (unificar com versão do CLI)
- [ ] Adicionar `WsEventType` union type (todos os eventos WebSocket)

### packages/agent-runtime/

- [ ] Conectar `AgentRuntime.run()` ao fluxo do api-router
- [ ] AgentRuntime deve mediar todas as ações do usuário, não só as do chat
- [ ] Adicionar callback de broadcast WebSocket

### packages/cli/src/ide/

- [ ] `api-router.ts`: Substituir `cli/src/memory/memory-store` por `@ai-devkit/memory-store`
- [ ] `api-router.ts`: Integrar `AgentRuntime.run()` antes de cada ação
- [ ] `api-router.ts`: Expandir broadcast para todos os tipos de evento
- [ ] `chat-bridge.ts`: Usar AgentRuntime como intermediário
- [ ] `terminal-bridge.ts`: Opção de executar via Sandbox
- [ ] `approval-flow.ts`: Importar tipos de `@ai-devkit/contracts`

### apps/api/

- [ ] ApprovalContext deve usar MemoryStore do pacote (já usa)

### packages/web-ui/

- [ ] Gerar cliente HTTP a partir do OpenAPI
- [ ] Validar respostas com Zod contra schemas do OpenAPI

### vscode-extension/

- [ ] Validar resposta do CLI com schema Zod
- [ ] Tipar retorno de todos os comandos `get*()`

### docs/

- [ ] Gerar OpenAPI completo da IDE Server
- [ ] Gerar AsyncAPI completo com todos os eventos
- [ ] Documentar contratos formais em `.ai/contracts/`

---

## 7. Diagrama de Fluxo Alvo (Pós-Reparo)

```
Usuário                    IDE Server (.ai/ide/)
│                            │
├──▶ Web UI (React) ──── HTTP ──▶ api-router.ts
├──▶ VS Code Ext. ─── subprocess ─▶ CLI ──▶ api-router.ts
├──▶ Terminal ─────────── HTTP ──▶ api-router.ts
└──▶ Chat ────────────── SSE ──▶ chat-bridge.ts
                                       │
                          ┌────────────┴──────────────┐
                          │     AgentRuntime.run()     │
                          │   ┌────────────────────┐   │
                          │   │ 1. Interpreta       │   │
                          │   │ 2. Política (P.E.)  │   │
                          │   │ 3. Plano de ação    │   │
                          │   │ 4. Aprovação?       │   │
                          │   │ 5. Executa          │   │
                          │   │ 6. Registra (Audit) │   │
                          │   │ 7. Memória (M.Store)│   │
                          │   │ 8. Broadcast (WS)   │   │
                          │   └────────────────────┘   │
                          └────────────────────────────┘
                                      │
                          ┌───────────┴────────────┐
                          │    Bridges              │
                          │ File │ Terminal │ Sandbox│
                          └─────────────────────────┘
                                      │
                          ┌───────────┴────────────┐
                          │   Infraestrutura         │
                          │ Audit │ Memory │ Session │
                          └─────────────────────────┘
                                      │
                          ┌───────────┴────────────┐
                          │   WebSocket (tempo real)│
                          │ file:change │ task:updt │
                          │ approval:* │ memory:*  │
                          └─────────────────────────┘
```
