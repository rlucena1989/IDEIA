# Estudo de Integração Tripla — Theia + IDEIA + IA

> **Data:** 2026-07-18
> **Versão:** 1.0 — Arquitetura definitiva de três camadas integradas
> **Propósito:** Mapear contratos, fluxos, automações e gaps para que Theia, IDEIA e IA operem como um sistema único e autônomo, com total poder ao usuário de escolher o nível de autonomia.

---

## 1. Arquitetura dos Três Pilares

### 1.1 Diagrama de Relacionamento

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     THEIA (Shell + Infra)                        │   │
│  │                                                                   │   │
│  │  Fornece:                                                        │   │
│  │  ├── Interface completa (menus, painéis, editor, terminal)       │   │
│  │  ├── Serviços de IA (LanguageModel, ChatAgent, MCP, Tools)      │   │
│  │  ├── Infraestrutura (FileSystem, Debug, Preferences)            │   │
│  │  └── Extensibilidade (ViewContributions, CommandContributions)   │   │
│  │                                                                   │   │
│  │  Contrato com IDEIA: REST API + WebSocket                        │   │
│  │  Contrato com IA: ChatAgent + ToolInvocationRegistry + MCP      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                        ↕              ↕                                │
│                        REST           MCP/Tools                        │
│                        ↕              ↕                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    IDEIA (Backend + Lógica)                      │   │
│  │                                                                   │   │
│  │  Fornece:                                                        │   │
│  │  ├── API REST (35+ endpoints: fs, shell, git, memory, audit)    │   │
│  │  ├── Serviços de negócio (PolicyEngine, AgentRuntime, DataLayer)│   │
│  │  ├── Dados (diagnostics, studies, approvals, suggestions)       │   │
│  │  └── Persistência (SQLite/PG, AuditTrail, MemoryStore)          │   │
│  │                                                                   │   │
│  │  Contrato com Theia: API REST (35 endpoints) + WebSocket (5)    │   │
│  │  Contrato com IA: MCP Tools (15+ ferramentas) + REST API       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                        ↕              ↕                                │
│                        MCP Tools      REST/Chat                        │
│                        ↕              ↕                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  IA (Inteligência + Autonomia)                   │   │
│  │                                                                   │   │
│  │  Fornece:                                                        │   │
│  │  ├── Raciocínio (LLM: Ollama, OpenAI, DeepSeek, etc)            │   │
│  │  ├── Planejamento (PromptPipeline: classify, plan, execute)     │   │
│  │  ├── Execução autônoma (AgentRuntime + StepExecutor)            │   │
│  │  └── Análise (CorrectionOracle, FeedbackPipeline)               │   │
│  │                                                                   │   │
│  │  Contrato com Theia: ChatAgent + ToolInvocationRegistry         │   │
│  │  Contrato com IDEIA: MCP Tools + REST API                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Contratos e Interfaces (18 Contratos)

### 2.1 Contratos Theia → IDEIA (REST API)

| # | Contrato | Método | Endpoint | Theia Fornece | IDEIA Fornece | Frequência |
|---|----------|--------|----------|--------------|--------------|------------|
| C01 | FileSystem | GET/POST | `/api/fs/*` | Navigator UI | CRUD de arquivos | Alta |
| C02 | Shell | POST | `/api/shell` | Terminal UI | Execução de comandos | Alta |
| C03 | Chat | POST/SSE | `/api/chat/completions` | ChatAgent UI | Streaming de IA | Alta |
| C04 | Preview | GET | `/api/preview/report` | Diff Viewer | Dados de diff | Média |
| C05 | Approvals | GET/POST | `/api/approvals/*` | Approval Panel | State machine | Média |
| C06 | Diagnostics | GET | `/api/diagnostics` | Dashboard | Métricas reais | Baixa (30s) |
| C07 | Studies | GET | `/api/studies` | Studies Panel | Lista de estudos | Baixa |
| C08 | Suggestions | GET | `/api/suggestions` | Suggestions Panel | Sugestões IA | Baixa |
| C09 | Status | GET | `/api/ide/status` | StatusBar | Estado da IDEIA | Média (5s) |
| C10 | Workspace | GET/POST | `/api/workspace/config` | Preferences | Configurações | Baixa |
| C11 | Memory | GET/POST | `/api/memory` | Context Panel | Memória persistente | Média |
| C12 | Audit | GET | `/api/audit` | Dashboard | Histórico de ações | Baixa |

### 2.2 Contratos Theia ↔ IA (Theia AI APIs)

| # | Contrato | API Theia | Fornece | IA Usa | Finalidade |
|---|----------|-----------|---------|--------|------------|
| C13 | LanguageModel | `LanguageModelService` | Modelos LLM | Gerar código, analisar, planejar | Toda interação de IA |
| C14 | ChatAgent | `ChatAgentService` | Canal de chat | Conversar com o usuário | Interface principal da IA |
| C15 | ToolRegistry | `ToolInvocationRegistry` | Ferramentas MCP | Chamar serviços da IDEIA | IA executa ações |
| C16 | ChangeSet | `ChangeSet` | Mudanças em arquivos | Editar código com undo | Edição segura |
| C17 | VariableService | `VariableService` | Variáveis de contexto | Acessar contexto do projeto | IA informada |
| C18 | PromptService | `PromptService` | Templates de prompt | Receber prompts otimizados | Economia de tokens |

### 2.3 Contratos IDEIA → IA (MCP Tools)

| # | Ferramenta MCP | Descrição | Serviço IDEIA | Input | Output |
|---|---------------|-----------|--------------|-------|--------|
| T01 | `read_file` | Ler arquivo | `FileService.readFile()` | `{ path }` | `{ content }` |
| T02 | `write_file` | Escrever arquivo | `FileService.writeFile()` | `{ path, content }` | `{ success }` |
| T03 | `run_command` | Executar comando | `ShellService.run()` | `{ command }` | `{ stdout, stderr }` |
| T04 | `search_code` | Buscar no código | `FileSearchService.search()` | `{ pattern }` | `{ results }` |
| T05 | `run_tests` | Executar testes | `TaskRunner.test()` | `{ suite? }` | `{ passed, failed }` |
| T06 | `get_diagnostics` | Métricas do projeto | `DiagnosticsService.get()` | `{}` | `{ tests, coverage }` |
| T07 | `list_studies` | Listar estudos | `StudiesService.list()` | `{ filter? }` | `{ studies }` |
| T08 | `get_suggestions` | Sugestões de IA | `SuggestionsService.get()` | `{}` | `{ suggestions }` |
| T09 | `approve_action` | Aprovar ação | `ApprovalsService.approve()` | `{ id }` | `{ success }` |
| T10 | `reject_action` | Rejeitar ação | `ApprovalsService.reject()` | `{ id, reason? }` | `{ success }` |
| T11 | `create_study` | Criar estudo | `StudiesService.create()` | `{ title, desc }` | `{ id }` |
| T12 | `get_git_status` | Status git | `GitService.status()` | `{}` | `{ branch, changes }` |
| T13 | `commit_changes` | Commitar | `GitService.commit()` | `{ message }` | `{ hash }` |
| T14 | `deploy` | Deployar | `DeliveryOrchestrator.deploy()` | `{ env, version }` | `{ status }` |
| T15 | `run_diagnostics` | Rodar diagnóstico | `DiagnosticsService.run()` | `{}` | `{ report }` |

---

## 3. Fluxos de Autonomia (N0-N4)

### 3.1 Níveis de Autonomia

| Nível | Nome | Theia faz | IDEIA faz | IA faz | Usuário faz |
|-------|------|-----------|-----------|--------|-------------|
| **N0** | Assistido | Mostra UI | Fornece dados | Sugere código | TUDO |
| **N1** | Supervisionado | Mostra UI + resultados | Executa com aprovação | Planeja + sugere | Aprova cada passo |
| **N2** | Semi-autônomo | Mostra UI + timeline | Executa módulos | Planeja + executa | Aprova módulos |
| **N3** | Autônomo (supervisão) | Mostra UI + relatório | Executa completo | Planeja + executa + verifica | Revisa resultado |
| **N4** | Autônomo total | Mostra UI + notificação | Executa + deploya | Tudo | Só dá a ideia |

### 3.2 Fluxo N0 (Assistido)

```
Usuário: "Como faço para criar um CRUD?"
  ↓
Theia: Abre IDEIA Chat, mostra campo de texto
  ↓
IA: Sugere código, explica conceitos
  ↓
Usuário: Clica em "Aplicar sugestão"
  ↓
IDEIA: Cria arquivo, mostra diff no Theia
  ↓
Usuário: Revisa, ajusta, salva manualmente
```

### 3.3 Fluxo N1 (Supervisionado)

```
Usuário: "Crie um CRUD de usuários com autenticação JWT"
  ↓ PromptPipeline
IA: classifica como 'feature|module|urg=medium'
  ↓ PromptPipeline.plan()
IA: Gera plano: 4 steps (model, controller, service, test)
  ↓
Theia: Mostra plano no Chat, cada step com [Approve] [Reject]
  ↓
Usuário: Approve step 1
  ↓ ToolInvocationRegistry → MCP
IA: Chama Tool.write_file('User.ts', code) → IDEIA cria arquivo
  ↓
Theia: Monaco Editor mostra diff do arquivo criado
  ↓
Usuário: Approve step 2 → IA continua...
```

### 3.4 Fluxo N4 (Autônomo Total)

```
Usuário: "Quero um SaaS de assinaturas com billing mensal"
  ↓ PromptPipeline
IA: Classifica como 'feature|project|urg=medium'
  ↓ PromptPipeline.plan()
IA: Gera plano completo (12 módulos, 3 sprints)
  ↓ IDEIA PolicyEngine
IA: PolicyEngine avalia riscos → 'auto' (autonomia N4)
  ↓ ToolInvocationRegistry → MCP
IA: Para CADA módulo:
    1. Tool.read_file → lê estrutura existente
    2. Tool.write_file → escreve código
    3. Tool.run_command('npm test') → valida
    4. Tool.get_diagnostics → verifica qualidade
    5. Repete até passar
  ↓
IA: Tool.commit_changes('feat: billing system')
  ↓
IA: Tool.deploy('staging')
  ↓
Theia: Mostra resumo final no Dashboard
  ↓
Usuário: "Obrigado" (ou "Ajuste o CSS da página de login")
```

---

## 4. Automações e Testes

### 4.1 Pipeline de Testes Automatizados

```
CADA COMMIT:
  reality-check.ps1          →  Valida documentação vs código (30s)
  jest --passWithNoTests     →  209+ testes unitários (2min)
  tsc --noEmit               →  Typecheck de 48 packages (3min)
  eslint                     →  Lint de código (1min)

CADA PR:
  + test:e2e                  →  Testes end-to-end (10min)
  + test:contract             →  Pact CDC (5min)
  + npm audit                 →  Segurança de dependências (1min)

CADA RELEASE:
  + performance baseline      →  k6 load tests (15min)
  + security audit            →  CodeQL + Snyk (10min)
  + sbom generation           →  SBOM + signature (2min)
```

### 4.2 Automações da IA

| Automação | Gatilho | Ação da IA |
|-----------|---------|-----------|
| **Auto-estudo** | Novo diretório em `docs/` | IA lê, classifica, adiciona ao índice |
| **Auto-gap** | Código novo commitado | IA verifica GAPS-PRODUCAO-IDE.md, atualiza se necessário |
| **Auto-test** | Código novo detectado | IA gera testes, executa, reporta cobertura |
| **Auto-doc** | Função pública nova | IA gera JSDoc, atualiza README |
| **Auto-review** | PR aberto | IA revisa código, aponta problemas |
| **Auto-deploy** | Tag de versão criada | IA executa pipeline de deploy |
| **Auto-suggest** | Dashboard ocioso | IA analisa métricas, sugere melhorias |

### 4.3 Testes de Integração Tripla

| Teste | O que verifica | Ferramenta | Responsável |
|-------|---------------|-----------|-------------|
| **Theia ↔ IDEIA** | Chamadas REST funcionam | Jest + supertest | IDEIA |
| **Theia ↔ IA** | ChatAgent responde | Playwright | Theia |
| **IDEIA ↔ IA** | MCP Tools executam | Pact CDC | IDEIA + IA |
| **Triplo** | Fluxo N0-N4 completos | Playwright + Jest | Tudo |

---

## 5. Gaps Identificados

### 5.1 Gaps Técnicos

| Gap | Onde | Impacto | Solução |
|-----|------|---------|---------|
| **Theia 1.73 AI packages não instalados** | `ideia-theia/package.json` | 🔴 Bloqueia integração IA | Adicionar 11 dependências `@theia/ai-*` |
| **MCP Tools não implementadas** | `apps/api` | 🟡 IA não chama serviços | Criar 15 tools MCP |
| **Contratos REST não documentados** | `apps/api/src/` | 🟡 Time não sabe endpoints | Gerar OpenAPI spec |
| **Testes de integração Theia zero** | `ideia-theia/` | 🟠 Regressões passam | Criar teste de bootstrap |
| **Níveis de autonomia não implementados** | `AgentRuntime` | 🟠 IA não respeita N0-N4 | Integrar `autonomy-policy.ts` |
| **Audit trail não conectado ao Theia** | `AuditTrail` | 🟡 Ações não auditadas | `auditTrail.append()` no backend |
| **ChangeSet não integrado** | `@theia/ai-chat` | 🟡 Edições sem undo | Usar ChangeSet nativo do Theia |

### 5.2 Gaps de Automação

| Automação | Existe? | Prioridade |
|-----------|---------|-----------|
| Reality check automático | ✅ `pre-flight.ps1` | 🔴 |
| Auto-sync de documentação | ✅ `sync-docs.ps1` | 🔴 |
| Auto-geração de testes | ❌ **FALTA** | 🟠 |
| Auto-deploy | ❌ **FALTA** | 🟡 |
| Auto-suggest de código | ❌ **FALTA** (Theia AI code-completion faz) | 🟢 |

---

## 6. Melhorias Propostas

### 6.1 Melhorias Imediatas

| Melhoria | Esforço | Impacto |
|----------|---------|---------|
| Instalar `@theia/ai-ollama`, `@theia/ai-openai`, `@theia/ai-mcp` | 1h | 🔴 Elimina 859 linhas de código |
| Criar MCP Tools para 15 endpoints | 4h | 🟠 IA chama serviços IDEIA |
| Documentar 35 endpoints como OpenAPI | 2h | 🟡 Contratos claros |
| Adicionar testes de bootstrap Theia | 2h | 🟠 Regressões detectadas |
| Integrar `autonomy-policy.ts` no AgentRuntime | 2h | 🟠 Níveis N0-N4 funcionam |

### 6.2 Melhorias Estruturais

| Melhoria | Esforço | Impacto |
|----------|---------|---------|
| Unificar apps/api + CLI ide server | 2 dias | 🔴 Backend único |
| Conectar DAP bridge ao WebSocket | 4h | 🔴 Debug funcional |
| Create Dashboard/Studies/Approvals/Suggestions panels | 4 dias | 🔴 Mockup = Realidade |
| Implementar ChangeSet do Theia | 1 dia | 🟡 Edições com undo |
| Auto-gerar testes via IA | 2 dias | 🟠 Cobertura >80% |

---

## 7. Plano de Implementação Final

### Sprint 1 — Fundação (1 semana)

```
D1: Instalar @theia/ai-* packages (11 dependências)
D2: Configurar LanguageModelService (Ollama + OpenAI)
D3: Criar MCP Tools server (15 ferramentas)
D4: Conectar ChatAgent do Theia
D5: Testar fluxo N1 (Supervisionado)
```

### Sprint 2 — Painéis + Backend (1 semana)

```
D6: DashboardPanel + GET /api/diagnostics
D7: StudiesPanel + GET /api/studies
D8: ApprovalsPanel + GET/POST /api/approvals/*
D9: SuggestionsPanel + GET /api/suggestions
D10: Conectar DAP bridge
```

### Sprint 3 — Autonomia + Testes (1 semana)

```
D11: Implementar N0-N4 no AgentRuntime
D12: Pipeline de testes automatizados
D13: Testes de integração tripla
D14: Auto-deploy + auto-suggest
D15: Release candidate
```

---

## 8. Resumo Final

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SISTEMA TRIPLA INTEGRADO                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THEIA ◄── REST + WebSocket ──► IDEIA ◄── MCP Tools ──► IA        │
│    │                              │                   │             │
│    └────── ChatAgent ─────────────┴──── MCP ──────────┘             │
│                                                                      │
│  18 Contratos   │   15 MCP Tools   │   4 Níveis Autonomia           │
│  35 Endpoints   │   12 Painéis     │   3 Fluxos (N0/N1/N4)          │
│  209 Testes     │   5 WebSockets   │   7 Automações                 │
│                                                                      │
│  "Dê a ideia, nós entregamos a solução."                            │
└─────────────────────────────────────────────────────────────────────┘
```

> **Os três pilares — Theia, IDEIA e IA — operam como um sistema único.**
> O usuário escolhe o nível de autonomia (N0-N4).
> A IA age através de MCP Tools que chamam serviços da IDEIA.
> A Theia fornece a interface e a infraestrutura de IA.
> Tudo é integrado, testado e automatizado.
