# Requisitos de Implementação — Todos os Estudos (01 a 60)

> **Data**: 2026-07-15 (atualizado 2026-07-17)  
> **Propósito**: Analisar requisitos, dependências, abordagens e riscos de CADA estudo desde o primeiro (01) até o último (60)
> **Total**: 60 estudos + 3 meta-análises

---

## Partes deste documento

- [Fase 0 — Infraestrutura Compartilhada (Contratos + Eventos + Policy)](#fase-0--infraestrutura-compartilhada)
- [Fase 1 — Intenção e Produto (01-04)](#fase-1--inteno-e-produto-01-04)
- [Fase 2 — Verificação (05-06)](#fase-2--verificao-05-06)
- [Fase 3 — Entrega e Operação (07-11)](#fase-3--entrega-e-operacao-07-11)
- [Fase 4 — Governança (12-13)](#fase-4--governana-12-13)
- [Fase 5 — Recursos Transversais (14-22)](#fase-5--recursos-transversais-14-22)
- [Fase 6 — Estudos Avançados (23-32)](#fase-6--estudos-avanados-23-32)
- [Fase 7 — Workflow System (33-37)](#fase-7--workflow-system-33-37)
- [Fase 8 — Expansão da Esteira (38-48)](#fase-8--expanso-da-esteira-38-48)
- [Fase 9 — Concorrência e Gaps (53-55)](#fase-9--concorrncia-e-gaps-53-55)
- [Mapa de Dependências Global](#mapa-de-dependncias-global)
- [Ordem de Implementação Recomendada](#ordem-de-implementao-recomendada)

---

## Fase 0 — Infraestrutura Compartilhada

> **Pré-requisito para TODOS os estudos**. Sem isso, cada estudo reinventa schema próprio.

### Contratos Compartilhados (5 schemas)

| Contrato | Estudos | O que já existe | O que precisa |
|----------|---------|----------------|---------------|
| **Requirement** | 01, 02, 03, 06, 14 | Nenhum schema formal | `packages/contracts/src/requirement.ts` com Zod |
| **WorkflowTask** | 33, 34, 35, 36, 37 | `evolution-backlog.yaml` | `packages/contracts/src/workflow-task.ts` |
| **TraceLink** | 06, 14, 15 | `trace-registry` existe | Schema unificado em `packages/contracts/` |
| **FeedbackEvent** | 10, 11, 16 | Nenhum | `packages/contracts/src/feedback.ts` |
| **AgentIdentity** | 13, 22, 25, 27, 28 | `agent-types.ts` parcial | Schema completo em `packages/contracts/` |

### APIs Internas (5 APIs)

| API | Estudos | Já existe | Implementação |
|-----|---------|-----------|---------------|
| **Policy Gateway** | ALL | `policy-engine` (stub) | `POST /api/policy/evaluate` centralizado |
| **Event Bus** | 15+ estudos | `event-bus` package (Feito em Fase 0) | Pub-sub com 16 tipos de evento |
| **Trace Registry** | 06, 14, 15 | `trace-registry` package | API REST + query |
| **Schema Registry** | ALL | Nenhum | `GET /api/schemas`, `POST /api/schemas/validate` |
| **Agent Communication** | 22, 28, 31 | Nenhum | `POST /api/agents/:id/message` |

### Abordagem de Implementação (Fase 0)

```
Sem 1: Contracts Package (5 schemas Zod + tipos TS) — 2d
Sem 2: Event Bus (pub-sub + 16 tipos + WebSocket bridge) — 2d
Sem 3: Policy Gateway (middleware + endpoint) — 1d
Sem 4-5: Trace Registry + Schema Registry — 3d
```

**Status**: ✅ Fase 0.1 (Contracts) e 0.2 (Event Bus) já implementados em 15/07/2026

---

## Fase 1 — Intenção e Produto (01-04)

### 01 — Descoberta de Requisitos

**Requisitos**: Extrair requisitos estruturados de conversas com usuário via IA. Conduzir entrevista com perguntas dinâmicas. Gerar `.ai/requirements/` com entidades, regras, fluxos.

**O que já existe**: Chat central, `plan.ts`, `detect.ts`, `memory-store`, `policy-engine`

**O que precisa**: 
- Pipeline: conversa → extração → estruturação → persistência
- Schema `Requirement` (Contrato 1)
- Comando `ai-devkit requirements discover`

**Abordagem A (Recomendada)**: Usar LLM com JSON mode para extrair entidades da conversa. Estruturar em árvore: épico → feature → requisito → critério. Persistir em `.ai/requirements/` como YAML.

**Abordagem B**: Template de entrevista fixa (não dinâmica). Menos flexível, mais previsível.

**Dependências**: ChatPanel, Contracts Package, `memory-store`

**Esforço**: 3d (Grupo B — adaptação)

**Verificação**: [ ] Requisitos extraídos corretamente de conversa de 10 turnos

---

### 02 — Geração de PRD

**Requisitos**: Transformar requisitos em PRD completo: visão, personas, jornadas, funcionalidades, critérios de aceite, riscos, métricas, roadmap.

**O que já existe**: `plan.ts`, templates de documento, 01-REQUISITOS

**O que precisa**: Template engine + IA para expandir requisitos em PRD

**Abordagem**: Template markdown com seções + LLM para preencher cada seção baseado nos requisitos

**Dependências**: 01 (Requisitos), Contracts (Requirement)

**Esforço**: 4d

---

### 03 — Critérios de Aceite Verificáveis

**Requisitos**: Cada critério de aceite vira teste automatizado ou quality gate

**O que já existe**: `gate.ts`, `verify.ts`, `test-loop.ts`

**O que precisa**: Mapeamento critério → teste → gate

**Abordagem**: YAML com critérios → parser → generator de teste → integração com `gate.ts`

**Esforço**: 3d (Grupo A — implementação direta)

---

### 04 — Priorização de Escopo

**Requisitos**: Framework RICE/WSJF/MoSCoW para priorizar tarefas baseado em valor, risco, esforço

**O que já existe**: `plan.ts`, `risk.ts`, `task-run.ts`

**O que precisa**: Algoritmo de scoring + CLI `ai-devkit prioritize`

**Abordagem**: Implementar fórmulas RICE (Reach × Impact × Confidence / Effort)

**Esforço**: 2d

---

## Fase 2 — Verificação (05-06)

### 05 — Auditoria de Acessibilidade

**Requisitos**: Scanning WCAG automático, relatório, correções sugeridas

**O que já existe**: `performance.ts` (modelo similar), `verify.ts`

**Dependências novas**: `axe-core`, `puppeteer` ou `playwright`

**Abordagem**: Wrapper CLI para axe-core + Puppeteer. Gerar relatório markdown

**Esforço**: 2d (Grupo A)

---

### 06 — Validação contra Requisitos

**Requisitos**: Verificar se código atende requisitos usando cobertura semântica + testes vinculados + revisão IA

**Complexidade**: ⚠️ **Muito Alta** (Grupo D). Equivalência entre especificação e implementação é indecidível no caso geral.

**O que já existe**: `diff-engine/semantic-diff`, `test-loop.ts`, `pr-review.ts`

**Abordagem A (Parcial)**: Vincular testes a requisitos via `@requirement(id)` em comentários. Validar cobertura de requisitos por testes.

**Abordagem B (Futura)**: Análise semântica aproximada via LLM que compara requisito vs código e emite parecer.

**Esforço**: 3d (para Abordagem A — vinculação)

---

## Fase 3 — Entrega e Operação (07-11)

### 07 — Pipeline de Deploy

**Requisitos**: Deploy unificado multi-provider com staging, canary, feature flags, rollback

**O que já existe**: `ci.ts`, `publish.ts`, `release.ts`, `feature-flag.ts`

**O que precisa**: Plugin system com interface `DeployProvider` (Vercel, AWS, Docker)

**Abordagem**: Provider pattern. Cada provider implementa `deploy()`, `healthCheck()`, `rollback()`, `logs()`

**Dependências**: 08 (Rollback), Feature Flags, MCP

**Esforço**: 5d

---

### 08 — Rollback Inteligente

**Requisitos**: Detecção de falha → reversão automática → notificação → relatório

**O que já existe**: `restore.ts`, `snapshot.ts`, `checkpoint-manager.ts`

**Abordagem**: Health check pós-deploy com gatilho automático de rollback

**Esforço**: 2d

---

### 09 — Gerenciamento de Incidentes

**Requisitos**: Detectar, registrar, investigar e resolver incidentes de produção. Coleta de alerts → incidente → postmortem IA

**O que já existe**: `observability.ts`, `alerts.ts`, `snapshot.ts`

**Abordagem**: Webhook receptor de alerts (Sentry, PagerDuty) → cria incidente → investiga → postmortem

**Dependências**: 21 (Operação Produção), Event Bus

**Esforço**: 4d

---

### 10 — Ciclo de Feedback

**Requisitos**: Coletar feedback explícito/implícito do usuário, estruturar e realimentar aprendizado

**O que já existe**: `approve.ts`, `learn.ts`

**O que precisa**: Schema `FeedbackEvent` (Contrato 4), pipeline 10→11→16

**Abordagem**: Feedback submit → evento → pipeline de recomendações → memória

**Dependências**: Contracts (FeedbackEvent), Event Bus

**Esforço**: 3d

---

### 11 — Recomendações por IA

**Requisitos**: Analisar métricas + feedback + padrões para gerar recomendações acionáveis

**O que já existe**: `pattern-learner.ts`, `learning-engine.ts`, `recommendation.ts`

**O que precisa**: Pipeline de feedback → análise → recomendação → ação

**Dependências**: 10 (Feedback), 16 (Memória)

**Esforço**: 3d

---

## Fase 4 — Governança (12-13)

### 12 — Privacidade e LGPD

**Requisitos**: Scanning de dados sensíveis, mapeamento de fluxos, relatórios LGPD/GDPR, DSR

**O que já existe**: `compliance.ts`, `security.ts`, `supply-chain.ts`

**Dependências novas**: `fides` (Ethyca) ou scanning próprio

**Abordagem**: Pattern matching + contexto semântico via LLM para classificar dados

**Esforço**: 4d

---

### 13 — Identidade e RBAC

**Requisitos**: Identidade para agentes e usuários: RBAC, SSO, permissões por escopo, autenticação MCP

**O que já existe**: `authority.ts`, `governance.ts`, `policy-engine`

**O que precisa**: Schema `AgentIdentity` (Contrato 5), OIDC client, middleware auth em endpoints

**Abordagem**: Keycloak como IdP + middleware de validação em todas as APIs

**Dependências**: Policy Gateway, Contracts (AgentIdentity)

**Esforço**: 5d

---

## Fase 5 — Recursos Transversais (14-22)

### 14 — Especificação Executável

**⚠️ CRÍTICO — "Santo Graal" da engenharia**

**Requisitos**: Pipeline requisito → Gherkin → stub de teste → execução → relatório. NLP → AST → Código de teste.

**Complexidade**: **Muito Alta** (Grupo D). Transformar "o usuário recupera senha" em testes é fronteira de pesquisa.

**O que já existe**: `feature-blueprint`, `test-matrix`, `acceptance-scenarios`, `contracts` generators

**Abordagem A (Recomendada)**: Pipeline 3 estágios:
1. **Parser**: NLP → AST de especificação (Given/When/Then estruturado)
2. **Gerator**: AST → código de teste (Jest, Vitest, Pytest)
3. **Validador**: Executa teste, captura falha, ajusta, reitera

**Dependências**: 01 (Requisitos), 17 (Perguntar), Contracts (Requirement)

**Esforço**: 7d para PoC / 4-6 sem para produção

**Verificação**: [ ] 50 requisitos reais → % testes que passam na primeira tentativa

---

### 15 — Rastreabilidade Ponta a Ponta

**Requisitos**: Cadeia Requisito → Decisão → Código → Teste → Deploy → Métrica → Feedback. Grafo navegável.

**O que já existe**: `trace-registry` (package), `audit-trail`, `memory-store`, `attest`

**O que precisa**: Schema `TraceLink` (Contrato 3), API de query do grafo, UI de visualização

**Abordagem**: Grafo com `TraceNode` + `TraceLink`. Cada comando/evento registra links automaticamente

**Dependências**: Contracts (TraceLink), Event Bus. **Alimentado por**: 14 (testes), 07 (deploy), 09 (incidentes)

**Esforço**: 6d

---

### 16 — Memória de Engenharia Estruturada

**Requisitos**: "Cérebro técnico do projeto": conhecimento versionado, verificado, rastreável. 4 níveis de granularidade (L1 Stack, L2 Módulos, L3 Decisões, L4 Padrões)

**O que já existe**: `memory-store` (package, 115 linhas), `cli/src/memory/` (6 arquivos), `knowledge` (172 entradas), `hermes-loop`

**O que precisa**: Unificar os dois memory stores. Adicionar versão, fonte, validade, confiança. API semântica

**Abordagem**: 4 níveis de granularidade com versionamento. Cada entrada tem: fonte (ADR, PR, incidente), confiança, expiração

**Dependências**: 15 (Rastreabilidade), 19 (Domínio), Contracts (MemoryRecord)

**Esforço**: 6d

---

### 17 — Capacidade de Perguntar (Ambiguidade)

**Requisitos**: IA reconhece instruções ambíguas e pergunta de volta. 4 tipos: escopo, quantidade, prioridade, público

**O que já existe**: `decision-center.ts` (formato 3+1), `policy-engine`

**Abordagem**: 
1. Auto-avaliação: "Confiança 1-5?"
2. Múltiplas respostas com temperature alta → medir consistência
3. Detectar palavras de baixa confiança: "provavelmente", "talvez"

**⚠️ Limitação**: LLMs não expõem logprobs via API padrão

**Dependências**: Chat central

**Esforço**: 3d

---

### 18 — Simulação e Cenários

**Requisitos**: Testar comportamento sob condições adversas: carga, falha, concorrência, ataque, migração

**O que já existe**: `simulate.ts`, `experiment.ts`, `sandbox.ts`

**Dependências novas**: k6, Chaos Monkey (ou `chaos.js`)

**Abordagem**: Wrapper CLI para ferramentas de simulação + relatório comparativo

**Esforço**: 4d

---

### 19 — Conhecimento de Domínio Validado

**Requisitos**: Base de conhecimento de domínio com fontes validadas, regras formais, Domain Knowledge Packs

**Complexidade**: **Muito Alta** (Grupo D). Conhecimento de domínio é extremamente caro de produzir.

**O que já existe**: `knowledge.ts`, `rag.ts`, `compliance.ts`

**Abordagem (Realista)**: Formato "Domain Pack" (YAML com regras, fontes, validações) + ferramentas para times escreverem. Não tentar criar conhecimento automaticamente.

**Comandos**: `ai-devkit domain init/validate/query/share`

**Esforço**: 5d

---

### 20 — Revisão Adversarial

**Requisitos**: Múltiplos revisores especializados independentes (segurança, arquitetura, performance, UX, compliance, dados) com consenso

**O que já existe**: `review.ts` (29 linhas — STUB, broken imports), `pr-review.ts`, 6 agentes (agent-registry)

**Abordagem**: Especializar 6 agentes com prompts específicos. Executar em paralelo. Consolidar com score por área

**Dependências**: 13 (Identidade/Agentes), Agent Runtime

**Esforço**: 3d

---

### 21 — Operação Segura em Produção

**Requisitos**: SLOs, canary, feature flags, incident response, postmortem em fluxo unificado

**O que já existe**: `observability.ts`, `resilience.ts`, `alerts.ts`, `feature-flag.ts`

**O que precisa**: Dashboard de SLO, canary release pipeline, postmortem automático

**Dependências**: 07 (Deploy), 08 (Rollback), 09 (Incidentes)

**Esforço**: 4d

---

### 22 — Protocolos Multiagente

**Requisitos**: Coordenação de múltiplos agentes com handoff, consenso, revisão adversarial, memória compartilhada

**Complexidade**: **Alta** (Grupo D). Propagação de erro entre agentes é problema não resolvido.

**O que já existe**: `agents.ts`, `orchestrate.ts`, `worktree.ts`, `federation.ts`, `collaboration.ts` (350 linhas)

**Abordagem**: 
- Papéis fixos (não dinâmicos)
- Comunicação assíncrona via eventos
- Isolamento via worktree (cada agente em branch própria)
- Árbitro final (humano ou policy-engine)

**Dependências**: 13 (Identidade), 20 (Revisão Adversarial), 28 (A2A Protocol)

**Esforço**: 6d

---

## Fase 6 — Estudos Avançados (23-32)

### 23 — Roteamento Multi-Modelo

**Requisitos**: Selecionar modelo ideal por tipo de tarefa (classificação usa barato, planejamento usa forte)

**O que já existe**: `provider-router.ts` (251 linhas), `classifier.ts`, `token-economy-engine.ts`

**Abordagem**: Task→Model mapping: classificar tarefa → rotear para modelo apropriado

**Esforço**: 3d

---

### 24 — Integrações Externas (Slack/Jira)

**Requisitos**: Conectar a Slack, Jira, Linear, Notion, Figma via MCP

**O que já existe**: MCP Server (14 ferramentas), `git-provider.ts`

**Abordagem**: MCP adapters. Cada integração = 1 MCP tool

**Esforço**: 6d

---

### 25 — Detecção de Prompt Injection

**⚠️ CRÍTICO**

**Requisitos**: Detectar prompt injection direto/indireto, tool poisoning, memory poisoning, exfiltração

**O que já existe**: `policy-engine`, `sandbox.ts`, `security.ts`

**O que precisa**: Classificador de entrada/saída, rate limiter, auditoria de tool-use

**Abordagem**: 
1. Classificador ML (ou regex-based) para entrada
2. Sanitização de saída (DLP)
3. Rate limit por sessão

**Esforço**: 5d

---

### 26 — Wireframes e A/B Testing

**Requisitos**: Gerar wireframes de descrição textual + plataforma de experimentos A/B

**O que já existe**: `feature-flag.ts`, `experiment.ts`

**Abordagem**: Mermaid + IA para wireframes. Feature flags para A/B testing

**Esforço**: 5d

---

### 27 — SSO, Secrets Management, Branch Protection

**Requisitos**: SSO OIDC/SAML, detecção/rotação de segredos, enforce de branch policies

**O que já existe**: `security.ts`, `authority.ts`

**Dependências novas**: Keycloak, HashiCorp Vault (ou `dotenv-vault`)

**Esforço**: 5d

---

### 28 — Protocolo A2A

**Requisitos**: Comunicação direta entre agentes (padrão Google A2A). Agent Card, handoff, autenticação mútua

**O que já existe**: `mcp.ts`, `agents.ts`

**Abordagem**: Implementar protocolo A2A sobre MCP transport. Agent Card = JSON de capabilities

**Dependências**: 13 (Identidade), 22 (Multiagente)

**Esforço**: 6d

---

### 29 — Self-Healing Loop

**Requisitos**: Ciclo: rodou → falhou → diagnosticou → corrigiu → rodou novamente. Checkpoints, rollback parcial, máx 3 tentativas

**O que já existe**: `test-loop.ts` (99 linhas — STUB), `orchestrate.ts`, `checkpoint-manager.ts`

**Abordagem**: 
1. Executar comando
2. Capturar falha
3. Diagnosticar (parse de stack trace)
4. Enviar para LLM → sugerir correção
5. Aplicar correção com aprovação
6. Re-executar

**Dependências**: 14 (Especificação), `test-loop.ts`, `provider-router.ts`

**Esforço**: 4d

---

### 30 — Property-Based Testing e Fuzzing

**Requisitos**: Definir propriedades invariantes + geração aleatória de casos (FastCheck) + fuzzing

**O que já existe**: `test-loop.ts`, `contracts`

**Dependências novas**: `fast-check`, `jazzer.js`

**Abordagem**: Comando `ai-devkit test property` que gera testes baseados em contratos

**Esforço**: 3d

---

### 31 — Pair Programming com IA

**Requisitos**: Modos estruturados: Driver-Navigator, Ping-Pong, Mob, Teacher-Student, Adversarial, Socratic

**O que já existe**: Chat central, Editor, `session-manager.ts`

**Abordagem**: Templates de prompt por modo + alternância de papéis no ChatPanel

**Esforço**: 3d

---

### 32 — Eficiência Energética

**Requisitos**: Medir, otimizar e reportar consumo energético do código. SCI, CPU cycles, bundle size, DB queries

**O que já existe**: `performance.ts`

**Abordagem**: Comando `ai-devkit energy scan/report/optimize`

**Esforço**: 3d

---

## Fase 7 — Workflow System (33-37)

### 33 — Workflow de Controle para IA

**Requisitos**: Framework conceitual de workflow adaptado para IAs. Define por que IAs precisam de workflow

**O que já existe**: `task-run.ts`, `evolution-backlog.yaml`, `approval-flow.ts`

**Abordagem**: Estudo conceitual. Define contratos para 34-37

**Dependências**: 34, 35, 36, 37

---

### 34 — Workflow Engine

**Requisitos**: Engine completa com modelo de dados (`WorkflowTask`, `WorkflowSprint`), CRUD, transições, resolução de dependências

**O que já existe**: `task-run.ts` (parcial)

**O que precisa**: Classe `WorkflowEngine`, persistência `.ai/workflows/` (YAML), API REST, CLI

**Abordagem**: Expandir `task-run.ts` com modelo completo de dados

**Contrato**: `WorkflowTask` (Contrato 2)

**Dependências**: Event Bus, Policy Gateway, Audit Trail

**Esforço**: 4d

---

### 35 — Sprint Manager

**Requisitos**: Organizar tasks em sprints com estimativa, tracking, burndown, `suggestForSprint()`

**O que já existe**: `evolution-backlog.yaml`

**Abordagem**: Algoritmo `suggestForSprint()`: dependências resolvidas → prioridade → risco baixo → capacidade

**Dependências**: 34 (Workflow Engine)

**Esforço**: 3d

---

### 36 — Workflow Board UI

**Requisitos**: Kanban visual com 5 colunas (Backlog, Sprint, Doing, Review, Done). Drag-and-drop

**O que já existe**: `DashboardMode.tsx`, `TaskTimeline`, `TaskProgress`

**O que precisa**: `WorkflowBoard.tsx`, `TaskCard.tsx`, drag-and-drop nativo HTML5

**Abordagem**: CSS grid + HTML5 Drag API (sem libs externas). Dados via `GET /api/workflow/:id`

**Dependências**: 34, 35

**Esforço**: 4d

---

### 37 — AI Scheduler

**Requisitos**: Algoritmo que seleciona próxima task baseado em dependências, prioridade, risco, capacidade

**O que já existe**: Policy Engine, `ChatPanel`

**Abordagem**: `selectNextTask()`: P0 < P1 < P2; mesma prioridade → menor risco primeiro. 3 modos (auto, ask, manual)

**Dependências**: 34 (Workflow Engine), 35 (Sprint), Policy Engine

**Esforço**: 3d

---

## Fase 8 — Expansão da Esteira (38-48)

### 38 — Interfaces de Engenharia

**Requisitos**: Interface única e consistente entre CLI, Web IDE, VS Code, MCP, Slack/Jira

**O que já existe**: CLI 130+ comandos, Web IDE, VS Code Extension (24 comandos), MCP Server (14 tools)

**Abordagem**: Consolidar todas as interfaces sob mesmo core. Comando `ai-devkit interface`/`ui` para gerenciar

**Esforço**: 4d

---

### 39 — Compreensão de Codebase

**Requisitos**: Indexação semântica, busca por símbolos, grafo de dependências, análise de chamadas

**O que já existe**: `ast-indexer.ts`, `workspace.ts` (sharding 8K), `diff-engine/`, `rag.ts`, `embeddings.ts`, `vector-store.ts`

**O que falta**: Comando `ai-devkit codebase index`, grafo de dependências visual

**Abordagem**: Indexação incremental com tree-sitter + embeddings. Grafo visual na Web UI

**Esforço**: 4d

---

### 40 — Autonomia Confiável Ponta a Ponta

**⚠️ CRÍTICA (P0)**

**Requisitos**: Pipeline completo idea → requisitos → PRD → aceite → implementação → revisão → deploy → monitor

**O que já existe**: `orchestrate.ts` (408 linhas), `task-run.ts`, `approval-flow.ts`, `policy-engine`, `agent-runtime`, `ChatEngine`

**O que falta**: Pipeline integrado, checkpoints com rollback parcial, tratamento de ambiguidade

**Abordagem**: Unificar 01 → 02 → 14 → 07 → 08 → 09 → 10 em pipeline único com policy gates

**Dependências**: 01, 14, 33, 29, TODA a Fase 0

**Esforço**: 6d

---

### 41 — Git e Fluxo PR

**Requisitos**: Automação completa: branch → commit → PR → revisão → changelog → resposta a comentários

**O que já existe**: `commands/git.ts`, `commands/pr-review.ts`, `runtime/git-provider.ts`

**O que falta**: `ai-devkit git pr create`, `ai-devkit git changelog`, resposta automática a PR comments

**Abordagem**: Git provider como camada única. Comandos PR create/merge/changelog

**Esforço**: 4d

---

### 42 — Qualidade e Segurança de Código

**Requisitos**: Quality gate unificado: lint + typecheck + análise estática + SAST + SCA + SBOM + secrets

**O que já existe**: `commands/security.ts` (216l), `commands/compliance.ts` (181l), `commands/gate.ts`, `commands/verify.ts`, `commands/supply-chain.ts`

**O que falta**: `ai-devkit quality scan` unificado, secret scanning com rotação

**Abordagem**: Unificar todos os comandos de qualidade em `ai-devkit quality scan`. Middleware de quality gate bloqueia commit se falhar

**Esforço**: 3d

---

### 43 — Fases 26-30 Consolidadas

**Requisitos**: Documentar fases já implementadas (Memória, Explicação, Previsão, Documentação, Legado)

**O que já existe**: 41 módulos implementados + 6 Agentes + 6 Modos de Sessão

**Abordagem**: Manter como está. Sem refatoração necessária

**Esforço**: 1d (documentação)

---

### 44 — Avanços da IDE

**Requisitos**: Consolidar servidores (`server.js` + `ide-server.ts`), `start-ide.bat` funcional, onboarding, responsividade, temas

**O que já existe**: `server.js` (throwaway), `ide-server.ts` (oficial), `start-ide.bat` (quebrado)

**Abordagem**: Unificar em `ide-server.ts` apenas. Consertar `start-ide.bat`

**Esforço**: 3d

---

### 45 — Observabilidade e Telemetria

**Requisitos**: Traces distribuídos OTel, logs estruturados, métricas em tempo real, dashboard Web UI

**O que já existe**: `telemetry/` (coletor, tracer, agregador), CLI `trace/report/dashboard`, `audit-trail`

**O que falta**: Correlação entre traces (hoje silos), pipeline de métricas em tempo real, alerting

**Abordagem**: OpenTelemetry SDK → Coletor OTel → armazenamento local `.ai/trace/`

**Esforço**: 4d

---

### 46 — Data Lineage e Proveniência

**Requisitos**: Rastreamento W3C PROV-O de cada informação (prompt→código→resultado)

**O que já existe**: `audit-trail`, `explanation/decision-trace`, `memory-store`

**Abordagem**: Implementar modelo PROV-O (Entity, Activity, Agent) com captura automática via hooks

**Dependências**: 15 (Rastreabilidade), 16 (Memória)

**Esforço**: 4d

---

### 47 — Análise de Tráfego IDE

**Requisitos**: Monitorar fluxo entre módulos (CLI↔API↔LLM↔Memória↔UI): topologia, volume, latência

**O que já existe**: `telemetry/` (métricas básicas), `event-bus` (conceitual), `audit-trail`

**Abordagem**: `FlowRecord` com 5-tuple (source, destination, channel, bytes, latency). Grafo de comunicação

**Dependências**: 45 (Observabilidade)

**Esforço**: 4d

---

### 48 — Calibração de Confiança

**Requisitos**: Quantificar, calibrar e comunicar nível de confiança em cada ação. Conformal prediction, temperature scaling.

**O que já existe**: `explanation/`, `cognitive-coprocessor/`

**O que precisa**: LogitQuantifier, SelfConsistencyQuantifier, CalibrationScaler, DecisionRouter

**Abordagem**: 3 quantifiers + scaler + router. Score >0.9 auto, 0.7-0.9 review, 0.4-0.7 ask, <0.4 block

**Dependências**: 17 (Perguntar), 29 (Self-Healing)

**Esforço**: 5d

---

## Fase 9 — Concorrência e Gaps (53-55)

### 53 — Análise Comparativa Concorrência

**Já analisado em estudo anterior** (docs/ESTUDOS/53-ANALISE-COMPARATIVA-CONCORRENCIA.md)

**38 gaps vs Cursor, Windsurf, Claude Code, Copilot, Devin**

3 tarefas:
- **53-A**: MVP Infraestrutura IDE (PTY + chokidar + LSP) — 3-6 sem
- **53-B**: Inteligência de Agente (plan + diff + auto-fix + pattern + memory) — 10-15 sem
- **53-C**: Fluxo de Engenharia (issue→PR + reports + auto-resolve + onboarding) — 8-12 sem

### 54 — Gaps Universais (Nenhuma Ferramenta Resolve)

**Já analisado** (docs/ESTUDOS/54-GAPS-UNIVERSAIS-NENHUMA-FERRAMENTA-RESOLVE.md)

**12 gaps universais** onde AI-Devkit pode ser pioneiro

6 tarefas priorizadas: U9 (Incerteza) → U7 (Rollback) → U10 (Adversarial) → U2 (Memória) → U5 (Loop) → U6 (Humano)

### 55 — Requisitos de Implementação (53+54)

**Já analisado** (docs/ESTUDOS/55-REQUISITOS-IMPLEMENTACAO-ESTUDOS-53-54.md)

18 tarefas detalhadas com requisitos, código existente, dependências, abordagens A/B/C, riscos

---

## Mapa de Dependências Global

```
FASE 0 (Infra) ─────────────────────────────────────────────────────┐
  Contracts + Event Bus + Policy Gateway + Trace Registry           │
  ┌───────────────────────────────────────────────────────────────┐ │
  │                                                                │ │
  ▼                                                                ▼ ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 01   │ │ 02   │ │ 03   │ │ 04   │ │ 05   │ │ 06   │ │ 07   │ │ 08   │
│ Reqs │→│ PRD  │→│Aceite│ │Prior │ │ A11y │←│Valid │→│Deploy│←│Rollbk│
└──┬───┘ └──┬───┘ └──┬───┘ └──────┘ └──────┘ └──┬───┘ └──┬───┘ └──┬───┘
   │        │        │                           │        │        │
   ▼        ▼        ▼                           ▼        ▼        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    14 — Especificação Executável                      │
│              (o "Santo Graal" — NLP → Testes Automáticos)             │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 15 — Rastreabilidade Ponta a Ponta                    │
│              (coluna vertebral — grafo requisito→código→teste)       │
└────┬─────────────────────────────────────────────────────────┬───────┘
     │                                                         │
     ▼                                                         ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│ 16 Memória│ │17 Ambigu │ │18 Simul  │ │19 Domínio│ │20 Review Adv.   │
│ Eng.     │ │          │ │          │ │          │ │                  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┬─────────┘
                                                             │
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────▼──────────┐
│ 21 OpProd │ │22 MultiA │ │23 ModelR │ │24 Integr │ │25 Prompt Inj.   │
│          │ │          │ │          │ │          │ │                  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 26 Wiref │ │ 27 SSO  │ │ 28 A2A   │ │ 29 Heal  │ │ 30 PBT   │ │ 31 Pair  │
│ 32 Energ │ │          │ │          │ │          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

                    ┌─────────────────────────────────────┐
                    │       WORKFLOW SYSTEM (33-37)        │
                    │  33(Conceito) → 34(Engine) → 35(Sprint) │
                    │                    ↓                 │
                    │             36(Board) + 37(Scheduler)  │
                    └─────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│38 Interf │ │39 Codeb │ │40 Auton │ │41 Git PR │ │42 Qualid │ │43 Consol │
│44 IDE    │ │45 Observ│ │46 Lineag│ │47 Traffic│ │48 Calib  │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

                    ┌─────────────────────────────────────┐
                    │       ESTUDOS 53-55 (Concorrência)   │
                    │  53 (Gaps vs Mercado)                │
                    │  54 (Gaps Universais)                │
                    │  55 (Requisitos de Implementação)    │
                    └─────────────────────────────────────┘
```

---

## Ordem de Implementação Recomendada

### Fase 0 — Fundação (Semanas 1-2)
```
Ordem: Contracts → Event Bus → Policy Gateway → Trace Registry
Estudos envolvidos: Fase 0 (infra compartilhada)
Esforço: ~8 dias
Desbloqueia: TODOS os outros estudos
```

### Fase 1 — Pipeline Essencial (Semanas 3-6)
```
01 (Requisitos) → 14 (Especificação Executável) → 15 (Rastreabilidade)
   ↓                    ↓                           ↓
17 (Ambiguidade)    03 (Aceite)                 16 (Memória)
   ↓                    ↓
20 (Revisão)         29 (Self-Healing)
```

### Fase 2 — Operação (Semanas 7-10)
```
07 (Deploy) → 08 (Rollback) → 09 (Incidentes) → 21 (Operação Produção)
                      ↓
                10 (Feedback) → 11 (Recomendações)
```

### Fase 3 — Workflow + Agentes (Semanas 11-14)
```
34 (Workflow Engine) → 35 (Sprint) → 36 (Board) → 37 (Scheduler)
                                                      ↓
13 (Identidade) → 22 (Multiagente) → 28 (A2A)
```

### Fase 4 — Qualidade + Segurança (Semanas 15-18)
```
42 (Qualidade) → 25 (Prompt Injection) → 27 (SSO/Secrets)
         ↓
05 (Acessibilidade) + 12 (Privacidade) + 30 (PBT)
```

### Fase 5 — Estudos Avançados e Concorrência (Semanas 19-24)
```
23 (Model Routing) → 24 (Integrações) → 26 (Wireframes) → 31 (Pair)
38 (Interfaces) → 39 (Codebase) → 41 (Git PR) → 44 (IDE)
45 (Observabilidade) → 46 (Lineage) → 47 (Traffic) → 48 (Calibração)
```

### Fase 6 — Concorrência e Gaps (Semanas 25-32)
```
53-A (MVP IDE) → 53-B (Agentes) → 53-C (Fluxo)
54-U9 (Incerteza) → 54-U7 (Rollback) → 54-U10 (Adversarial)
54-U2 (Memória) → 54-U5 (Loop) → 54-U6 (Humano)
```

---

## Resumo de Esforço

| Fase | Estudos | Esforço | Semanas |
|------|---------|:-------:|:-------:|
| 0 — Fundação (Infra) | Contracts + Events + Policy | 8d | 1-2 |
| 1 — Pipeline Essencial | 01, 14, 15, 17, 03, 16, 20, 29 | 33d | 3-6 |
| 2 — Operação | 07, 08, 09, 21, 10, 11 | 21d | 7-10 |
| 3 — Workflow + Agentes | 34-37, 13, 22, 28 | 26d | 11-14 |
| 4 — Qualidade + Segurança | 42, 25, 27, 05, 12, 30 | 21d | 15-18 |
| 5 — Avançados | 23, 24, 26, 31, 38, 39, 41, 44, 45-48 | 34d | 19-24 |
| 6 — Concorrência | 53-A/B/C, 54-U9/U7/U10/U2/U5/U6 | 65d | 25-32 |

**Total (original 55 estudos)**: ~208 dias-homem (32 semanas) para implementação completa dos estudos 01-55  
> **Nota (2026-07-17):** Estudos 56-60 (Shadow Workspace, MCP, A2A, Telemetria, Testes de Carga) foram adicionados posteriormente. Esforço estimado individualmente em cada estudo; não incluso no total acima.
