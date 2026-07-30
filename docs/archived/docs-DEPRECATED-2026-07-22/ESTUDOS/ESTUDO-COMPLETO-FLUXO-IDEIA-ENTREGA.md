# Estudo Completo: Fluxo "Ideia → Entrega Comercial" no ai-devkit

> **Data:** 2026-07-17
> **Propósito:** Consolidar 8 pesquisas modulares em um estudo unificado sobre o que falta para o ai-devkit conduzir do prompt do usuário até a entrega de um sistema comercial/industrial.
> **Estudos-base:** BARRAMENTO-EVENTOS, MEMORIA-E-CONTEXTO, INTENT-TO-PLAN, SEGURANCA-PROMPT, ORQUESTRACAO-MULTIAGENTE, PIPELINE-VERIFICACAO-QUALIDADE, APRENDIZADO-ADAPTATIVO, TECNOLOGIAS-EMERGENTES
> **Template:** TEMPLATE-ANALISE-PERMANENTE.md

---

## Sumário

1. [Macro Fluxo: Ideia → Entrega](#1-macro-fluxo-ideia--entrega)
2. [Gaps Consolidados por Camada](#2-gaps-consolidados-por-camada)
3. [Matriz de Reuso no ai-devkit](#3-matriz-de-reuso-no-ai-devkit)
4. [Roadmap de Implementação por Fases](#4-roadmap-de-implementação-por-fases)
5. [Riscos Técnicos e Mitigações](#5-riscos-técnicos-e-mitigações)
6. [Recomendações Finais](#6-recomendações-finais)
7. [Índice dos Estudos Modulares](#7-índice-dos-estudos-modulares)

---

## 1. Macro Fluxo: Ideia → Entrega

### 1.1 Cadeia Completa

```
FASE 0: IDEIA BRUTA
   Usuário: "Quero um SaaS de assinaturas com billing mensal"
   │
   ▼
FASE 1: RESOLUÇÃO DE INTENÇÃO  ← INTENT-TO-PLAN-RESEARCH.md
   ├── Intent Classification (LLM-based, substitui switch-case atual)
   ├── Extração de entidades (stack, domínio, requisitos implícitos)
   ├── Decomposição em módulos (ADAPT-style, as-needed)
   ├── Geração de Plano Mestre com checkpoints
   └── Apresentação para aprovação humana ← approval-flow existente
   │
   ▼
FASE 2: ESPECIFICAÇÃO EXECUTÁVEL  ← INTENT-TO-PLAN-RESEARCH.md + MEMORIA-E-CONTEXTO
   ├── Geração de ADRs (architecture decision records) ← skeleton
   ├── Definição de contratos (schemas, interfaces)
   ├── Mapeamento de dependências entre módulos
   ├── Identificação de riscos iniciais ← risk CLI command
   └── Memória: salva decisões e contexto ← memory-store existe, sem persistência cross-session
   │
   ▼
FASE 3: ORQUESTRAÇÃO MULTIAGENTE  ← ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA.md
   ├── Agente Arquiteto: define estrutura e stack ← agent-runtime existe
   ├── Agente Programador: implementa código ← autonomous-editor existe
   ├── Agente Revisor: verifica qualidade ← correction-oracle existe
   ├── Agente Testador: gera e executa testes ← verification-layer existe
   ├── Agente DevOps: pipeline de deploy ← delivery-orchestrator existe
   └── Coordenação via message pool + event bus ← event-bus existe, sem persistência
   │
   ▼
FASE 4: EXECUÇÃO COM GOVERNANÇA  ← SEGURANCA-PROMPT-GOVERNADOR-AI.md
   ├── Policy evaluation a cada ação ← policy-engine existe (27 patterns)
   ├── Autonomia adaptativa por agente ← autonomy-policy existe
   ├── Prompt security scanning ← prompt-security é esqueleto
   ├── Auditoria criptográfica ← audit-trail existe, sem hash chain
   ├── Checkpoints de aprovação humana ← approval-flow existe
   └── Output validation (schema, PII, safety) ← não existe
   │
   ▼
FASE 5: VERIFICAÇÃO CONTÍNUA  ← PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA.md
   ├── Quality gates: lint → typecheck → test → build → security → contract
   ├── Snapshots de estado a cada checkpoint ← snapshot.ts existe
   ├── Self-heal em caso de falha ← self-heal.js existe
   ├── Drift detection ← drift command existe
   └── CI/CD pipeline gerado pela IA ← templates existem, sem GitOps
   │
   ▼
FASE 6: ENTREGA PROGRESSIVA
   ├── Feature flags para liberação gradual ← não existe
   ├── Canary / blue-green deployment ← não existe
   ├── GitOps com ArgoCD/Flux ← não existe
   ├── IaC com Terraform/OpenTofu ← não existe
   ├── Observabilidade do sistema entregue ← não existe
   └── Rollback automático ← delivery-orchestrator existe
   │
   ▼
FASE 7: FEEDBACK E APRENDIZADO  ← APRENDIZADO-ADAPTATIVO-EVOLUCAO-CROSS-PROJETO
   ├── Feedback pipeline: submit → recommendation → memory ← feedback-pipeline existe
   ├── Pattern detection cross-projeto ← pattern-detector existe, heurístico
   ├── Adaptive autonomy (confiança → mais autonomia) ← não existe
   ├── Fine-tuning seletivo com preferências ← não existe
   ├── Reflection do agente sobre erros ← não existe
   └── Memory persistente entre sessões ← memory-store in-memory
   │
   ▼
ENTREGA: SISTEMA EM PRODUÇÃO
   ├── Código-fonte completo
   ├── Testes (unit + integration + e2e)
   ├── Pipeline CI/CD funcional
   ├── Documentação gerada
   ├── Infraestrutura como código
   ├── Monitoramento e alertas
   └── Auditoria completa de todo o processo
```

### 1.2 Ciclo da Informação (Prompt → Tarefa)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CICLO COMPLETO: PROMPT DO USUÁRIO → RETORNO DA IA → TAREFA EXECUTADA   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ① Usuário envia prompt                                                    │
│    → Intent Router + Prompt Security Scan (INSEGURO → block)             │
│    → Classificação: explorar, editar, refatorar, testar, documentar      │
│                                                                          │
│ ② Context Builder                                                         │
│    → MemoryStore + PatternDetector + LearningEngine                      │
│    → Recupera decisões anteriores, padrões do projeto, preferências      │
│    → Constrói contexto para o LLM                                       │
│                                                                          │
│ ③ Planejamento                                                           │
│    → ADAPT-style: decompõe em tarefas somente quando necessário          │
│    → Gera steps com checkpoints de aprovação                            │
│    → Identifica riscos por step                                         │
│                                                                          │
| ④ Orquestração                                                           |
|    → Event Bus coordena fluxo entre agentes                              |
|    → Trace Registry rastreia cada operação                               |
|    → Policy Gateway valida permissões                                    |
|    → Execution Layer gerencia retry/circuit breaker                      |
|                                                                          |
| ⑤ Execução                                                               |
|    → Agent Runtime interpreta e executa (com/sem aprovação)              |
|    → Autonomous Editor aplica mudanças com backup/safety                 |
|    → Terminal Sandbox executa comandos                                   |
|    → Workflow Engine atualiza progresso                                  |
|                                                                          |
| ⑥ Verificação                                                            |
|    → Correction Oracle analisa código                                    |
|    → Verification Layer roda suites (syntax, lint, test, build)          |
|    → Quality Gate avalia resultados                                      |
|                                                                          |
| ⑦ Registro                                                               |
|    → Audit Trail registra decisão + ação                                 |
|    → Feedback Pipeline gera recomendação + memória                       |
|    → Memory Store persiste contexto                                      |
|    → Event Bus emite evento de conclusão                                 |
|                                                                          |
| ⑧ Retorno ao Usuário                                                     |
|    → Chat UI exibe resultado                                             |
|    → Diff Preview mostra mudanças                                        |
|    → Dashboard atualiza métricas                                         |
|    → Notificação se aprovacão pendente                                   |
|                                                                          |
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Gaps Consolidados por Camada

### 2.1 Camada de Interface (Web UI)

| Gap | Estudo | Status | Impacto | Prioridade |
|-----|--------|--------|---------|------------|
| Chat com streaming SSE | INTENT-TO-PLAN | ❌ Não implementado | Crítico | 🔴 Alta |
| Chat UI component | INTENT-TO-PLAN | ❌ Não implementado | Crítico | 🔴 Alta |
| xterm.js (terminal real) | PIPELINE-VERIFICACAO | ❌ Substituir div atual | Alto | 🔴 Alta |
| Quick Open (Ctrl+P) | INTENT-TO-PLAN | ❌ Não implementado | Médio | 🟠 Média |
| Status Bar | INTENT-TO-PLAN | ❌ Não implementado | Médio | 🟠 Média |
| Context menu na árvore | INTENT-TO-PLAN | ❌ Não implementado | Alto | 🔴 Alta |
| Memory viewer/editor | MEMORIA-E-CONTEXTO | ❌ Não implementado | Médio | 🟡 Baixa |
| Dashboard com dados reais | INTENT-TO-PLAN | ❌ SAMPLE_DATA ainda | Alto | 🔴 Alta |

### 2.2 Camada de Orquestração

| Gap | Estudo | Status | Impacto | Prioridade |
|-----|--------|--------|---------|------------|
| Intent classifier LLM-based | INTENT-TO-PLAN | ⚠️ Switch-case 6 palavras | Crítico | 🔴 Alta |
| Task decomposition ADAPT | INTENT-TO-PLAN | ❌ Não implementado | Alto | 🔴 Alta |
| Plan-and-Solve prompting | INTENT-TO-PLAN | ❌ Não implementado | Alto | 🔴 Alta |
| Cognitive Coprocessor hub | INTENT-TO-PLAN | ⚠️ Não referenciado no código | Alto | 🔴 Alta |
| Multi-agent coordenação | ORQUESTRACAO-MULTIAGENTE | ⚠️ agent-runtime single-agent | Alto | 🟠 Média |
| Agent Registry real | ORQUESTRACAO-MULTIAGENTE | ⚠️ Existe, não integrado | Médio | 🟠 Média |
| Agent Collaboration | ORQUESTRACAO-MULTIAGENTE | ❌ Não implementado | Alto | 🔴 Alta |
| Message pool / blackboard | ORQUESTRACAO-MULTIAGENTE | ❌ Não implementado | Alto | 🟠 Média |

### 2.3 Camada de Eventos e Mensageria

| Gap | Estudo | Status | Impacto | Prioridade |
|-----|--------|--------|---------|------------|
| Event Bus persistente | BARRAMENTO-EVENTOS | ⚠️ In-memory only | Crítico | 🔴 Alta |
| Dead Letter Queue | BARRAMENTO-EVENTOS | ❌ Não implementado | Alto | 🟠 Média |
| Replay de eventos | BARRAMENTO-EVENTOS | ❌ Não implementado | Alto | 🟠 Média |
| Consumer groups | BARRAMENTO-EVENTOS | ❌ Não implementado | Médio | 🟡 Baixa |
| Saga pattern | BARRAMENTO-EVENTOS | ❌ Não implementado | Médio | 🟡 Baixa |
| Outbox pattern | BARRAMENTO-EVENTOS | ❌ Não implementado | Alto | 🟠 Média |
| Módulos conectados ao bus | BARRAMENTO-EVENTOS | ❌ Nenhum depende do event-bus | Crítico | 🔴 Alta |

### 2.4 Camada de Memória e Contexto

| Gap | Estudo | Status | Impacto | Prioridade |
|-----|--------|--------|---------|------------|
| Persistência cross-session | MEMORIA-E-CONTEXTO | ❌ Tudo in-memory | Crítico | 🔴 Alta |
| LLM no PatternDetector | MEMORIA-E-CONTEXTO | ❌ Heurístico | Alto | 🔴 Alta |
| LLM no LearningEngine | MEMORIA-E-CONTEXTO | ❌ Heurístico | Alto | 🔴 Alta |
| Knowledge Graph | MEMORIA-E-CONTEXTO | ❌ Não implementado | Alto | 🟠 Média |
| RAG com LLM real | MEMORIA-E-CONTEXTO | ⚠️ vector-store existe, heurístico | Alto | 🔴 Alta |
| GraphRAG | MEMORIA-E-CONTEXTO | ❌ Não implementado | Médio | 🟡 Baixa |
| CAG (Cache-Augmented Gen) | MEMORIA-E-CONTEXTO | ❌ Não implementado | Médio | 🟡 Baixa |
| Hierarchical summarization | MEMORIA-E-CONTEXTO | ❌ Não implementado | Médio | 🟡 Baixa |
| Embedding drift handling | MEMORIA-E-CONTEXTO | ❌ Não implementado | Médio | 🟠 Média |

### 2.5 Camada de Segurança e Governança

| Gap | Estudo | Status | Impacto | Prioridade |
|-----|--------|--------|---------|------------|
| Prompt injection detector real | SEGURANCA-PROMPT | ⚠️ 10 regex superficiais | Crítico | 🔴 Alta |
| Cryptographic audit chain | SEGURANCA-PROMPT | ⚠️ Append-only sem hash | Alto | 🔴 Alta |
| Output validation (schema/PII) | SEGURANCA-PROMPT | ❌ Não implementado | Alto | 🔴 Alta |
| Red teaming contínuo | SEGURANCA-PROMPT | ❌ Não implementado | Médio | 🟠 Média |
| Security middleware | SEGURANCA-PROMPT | ❌ Vazio | Alto | 🔴 Alta |
| Autonomia adaptativa | SEGURANCA-PROMPT | ❌ Não implementado | Médio | 🟠 Média |
| Policy Engine com OPA/Cedar | SEGURANCA-PROMPT | ⚠️ Caseiro, 27 patterns | Médio | 🟠 Média |

### 2.6 Camada de Pipeline e Entrega

| Gap | Estudo | Status | Impacto | Prioridade |
|-----|--------|--------|---------|------------|
| GitOps (ArgoCD/Flux) | PIPELINE-VERIFICACAO | ❌ Não implementado | Alto | 🟠 Média |
| Progressive delivery | PIPELINE-VERIFICACAO | ❌ Não implementado | Alto | 🟠 Média |
| Feature flags | PIPELINE-VERIFICACAO | ❌ Não implementado | Alto | 🟠 Média |
| IaC (Terraform/OpenTofu) | PIPELINE-VERIFICACAO | ❌ Não implementado | Alto | 🟠 Média |
| Observabilidade do sistema | PIPELINE-VERIFICACAO | ❌ Só telemetria da IA | Alto | 🟠 Média |
| Dagger (pipeline code) | PIPELINE-VERIFICACAO | ❌ Não implementado | Médio | 🟡 Baixa |
| Canary/blue-green deploy | PIPELINE-VERIFICACAO | ❌ Não implementado | Médio | 🟡 Baixa |

### 2.7 Camada de Aprendizado Adaptativo

| Gap | Estudo | Status | Impacto | Prioridade |
|-----|--------|--------|---------|------------|
| Reflection (aprender com erros) | APRENDIZADO-ADAPTATIVO | ❌ Não implementado | Alto | 🟠 Média |
| Feedback com LLM real | APRENDIZADO-ADAPTATIVO | ❌ feedback-pipeline heurístico | Alto | 🔴 Alta |
| Adaptive autonomy | APRENDIZADO-ADAPTATIVO | ❌ Não implementado | Alto | 🟠 Média |
| Cross-project learning | APRENDIZADO-ADAPTATIVO | ❌ Não implementado | Alto | 🟠 Média |
| Fine-tuning seletivo | APRENDIZADO-ADAPTATIVO | ❌ Não implementado | Médio | 🟡 Baixa |
| KTO/ORPO/GRPO | APRENDIZADO-ADAPTATIVO | ❌ Não implementado | Baixo | 🟡 Baixa |

### 2.8 Oportunidades de Diferenciação (Tecnologias Emergentes)

| Tecnologia | Estudo | Status | Diferenciação | Esforço |
|-----------|--------|--------|---------------|---------|
| SLMs locais (Phi-4, Qwen-Coder) | TECNOLOGIAS-EMERGENTES | ⚠️ Provider Ollama existe | Alta (offline) | Baixo |
| DuckDB para analytics local | TECNOLOGIAS-EMERGENTES | ❌ Não implementado | Média | Baixo |
| LangGraph para orquestração | TECNOLOGIAS-EMERGENTES | ❌ Não implementado | Alta | Médio |
| Tauri para desktop nativo | TECNOLOGIAS-EMERGENTES | ❌ Não implementado | Alta | Alto |
| Wasm para agentes seguros | TECNOLOGIAS-EMERGENTES | ❌ Não implementado | Muito alta | Alto |
| OpenTelemetry + LangFuse | TECNOLOGIAS-EMERGENTES | ⚠️ trace-propagation existe | Média | Baixo |
| Semantic caching | TECNOLOGIAS-EMERGENTES | ❌ Não implementado | Alta | Baixo |
| Modelos de raciocínio (o1/R1) | TECNOLOGIAS-EMERGENTES | ❌ Provider não implementado | Alta | Médio |

---

## 3. Matriz de Reuso no ai-devkit

### 3.1 O Que Já Existe e Funciona (Pode Reusar)

| Componente | Módulo | Uso no Fluxo | Precisa Adaptar? |
|-----------|--------|-------------|-------------------|
| Monaco Editor (20 langs) | web-ui | Editor de código | Não |
| FileExplorer tree view | web-ui | Navegação de projeto | Não |
| DiffViewer side-by-side | web-ui | Revisão de mudanças | Não |
| PatchPreview (approve/reject) | web-ui | Aprovação de patches | Integrar com chat |
| DecisionHistory | web-ui | Auditoria visual | Não |
| Dashboard stats cards | web-ui | Métricas do projeto | Substituir SAMPLE_DATA |
| Provider Router + Ollama | local-ai | Conexão com LLM | Adicionar streaming |
| MemoryStore | memory-store | Persistência de contexto | Adicionar persistência real |
| PatternDetector | memory-store | Detecção de padrões | Trocar heurística por LLM |
| LearningEngine | memory-store | Recomendações | Trocar heurística por LLM |
| Agent Runtime | agent-runtime | Execução de tarefas | Evoluir para multi-agent |
| Agent Identity | agent-identity | RBAC | Não |
| Policy Engine | policy-engine | Governança | Evoluir para OPA/Cedar |
| Policy Gateway | policy-gateway | Guard endpoints | Não |
| Autonomous Editor | autonomous-editor | Edição segura | Não |
| Correction Oracle | correction-oracle | Análise estática | Adicionar mais regras |
| Verification Layer | verification-layer | Suites de verificação | Não |
| Workflow Engine | workflow-engine | Gestão de tarefas | Não |
| Delivery Orchestrator | delivery-orchestrator | Release/deploy | Adicionar GitOps |
| Event Bus | event-bus | Pub/sub + WebSocket | Adicionar persistência |
| Audit Trail | audit-trail | Log append-only | Adicionar hash chain |
| Execution Layer | execution-layer | Circuit breaker/retry | Não |
| Trace Registry | trace-registry | Rastreamento | Não |
| Trace Propagation | trace-propagation | OpenTelemetry compat | Não |
| Feedback Pipeline | feedback-pipeline | Feedback → recomendação | Trocar heurística por LLM |
| Resilience Engine | resilience-engine | Bulkhead/degradation | Não |
| Economic Control | economic-control | Budget tracking | Não |
| Trusted Context | trusted-context | File integrity | Não |
| Persistent Instructions | persistent-instructions | Versioned instructions | Não |
| Requirements Engine | requirements-engine | CRUD de requisitos | Não |
| Contracts (shared types) | contracts | Schemas, APIs | Não |
| RAG Engine + Vector Store | local-ai | RAG pipeline | Adicionar LLM real |
| Schema Registry | schema-registry | Schema versioning | Não |
| Contract CDC | contract-cdc | Contract diff | Não |
| Observability Engine | observability-engine | Métricas/custos | Não |
| Self-Heal | .ai/bin | Correção automática | Não |
| Self-Debugging | .ai/bin | Debug automático | Não |
| CLIs (130+ commands) | cli | Interface de comando | Não |

### 3.2 O Que Existe Parcialmente (Precisa Adaptar)

| Componente | Status | O Que Falta | Complexidade |
|-----------|--------|-------------|-------------|
| Chat Panel UI | Esqueleto (AgentMode) | Streaming SSE, Markdown, code blocks | Alta |
| Chat → Task Runner | Não integrado | Conectar chat ao task-run.ts | Média |
| Chat → Engineer Pipeline | Não integrado | Conectar chat ao engineer.ts | Média |
| Stream nos Providers | Interface sem streamQuery | Adicionar streamQuery() à interface | Média |
| File CRUD endpoints | rotas existem | POST/PATCH/DELETE /api/fs/* | Baixa |
| File Watcher | não implementado | chokidar + SSE event | Média |
| Terminal (xterm.js) | div simples | Substituir por xterm.js + node-pty | Alta |
| ANSI + Ctrl+C | não tratado | xterm.js trata ANSI, PTY mata processo | Média |
| Memory → Chat Context | não integrado | PatternDetector + MemoryStore → ContextStore | Média |
| Intents Router | switch-case 6 palavras | Classificador semântico real | Média |
| Spec Generator | skeleton | Conectar ao workflow engine | Alta |
| Docs Generator | skeleton | Gerar documentação automaticamente | Média |
| Cognitive Coprocessor | não referenciado | Implementar como hub de pré-processamento | Alta |
| Agent Registry | existe, não integrado | Integrar com orquestração | Média |
| Autonomy Policy | existe | Adicionar adaptive autonomy | Média |

### 3.3 O Que Não Existe (Criar do Zero)

| Componente | Estudo | Complexidade | Prioridade |
|-----------|--------|-------------|------------|
| Chat UI Component (ChatMessage, ChatInput) | INTENT-TO-PLAN | Alta | 🔴 Crítica |
| Intent Classifier LLM-based | INTENT-TO-PLAN | Média | 🔴 Crítica |
| Task Decomposition (ADAPT-style) | INTENT-TO-PLAN | Alta | 🔴 Crítica |
| Multi-agent coordination | ORQUESTRACAO-MULTIAGENTE | Alta | 🟠 Alta |
| Agent Collaboration (message pool) | ORQUESTRACAO-MULTIAGENTE | Alta | 🟠 Alta |
| Prompt Injection Scanner real | SEGURANCA-PROMPT | Média | 🔴 Crítica |
| Output Validation | SEGURANCA-PROMPT | Média | 🔴 Crítica |
| Cryptographic audit chain | SEGURANCA-PROMPT | Média | 🔴 Crítica |
| Security Middleware | SEGURANCA-PROMPT | Média | 🟠 Alta |
| Red Teaming pipeline (Garak/PyRIT) | SEGURANCA-PROMPT | Baixa | 🟠 Média |
| NATS JetStream integration | BARRAMENTO-EVENTOS | Média | 🔴 Crítica |
| Dead Letter Queue | BARRAMENTO-EVENTOS | Baixa | 🟠 Média |
| Event Replay | BARRAMENTO-EVENTOS | Média | 🟠 Média |
| Outbox Pattern | BARRAMENTO-EVENTOS | Média | 🟠 Média |
| Saga Pattern | BARRAMENTO-EVENTOS | Alta | 🟡 Baixa |
| LLM no PatternDetector | MEMORIA-E-CONTEXTO | Média | 🔴 Crítica |
| LLM no LearningEngine | MEMORIA-E-CONTEXTO | Média | 🔴 Crítica |
| Cross-session persistência | MEMORIA-E-CONTEXTO | Média | 🔴 Crítica |
| Knowledge Graph | MEMORIA-E-CONTEXTO | Alta | 🟠 Média |
| GraphRAG | MEMORIA-E-CONTEXTO | Alta | 🟡 Baixa |
| CAG (Cache-Augmented Gen) | MEMORIA-E-CONTEXTO | Baixa | 🟡 Baixa |
| Reflection (aprender com erros) | APRENDIZADO-ADAPTATIVO | Média | 🟠 Média |
| Adaptive Autonomy | APRENDIZADO-ADAPTATIVO | Alta | 🟠 Média |
| Cross-project learning | APRENDIZADO-ADAPTATIVO | Alta | 🟠 Média |
| Fine-tuning pipeline | APRENDIZADO-ADAPTATIVO | Alta | 🟡 Baixa |
| GitOps (ArgoCD/Flux) | PIPELINE-VERIFICACAO | Média | 🟠 Média |
| Progressive delivery | PIPELINE-VERIFICACAO | Alta | 🟡 Baixa |
| Feature flags | PIPELINE-VERIFICACAO | Média | 🟠 Média |
| IaC generation | PIPELINE-VERIFICACAO | Alta | 🟠 Média |
| Dagger pipelines | PIPELINE-VERIFICACAO | Média | 🟡 Baixa |
| DuckDB integration | TECNOLOGIAS-EMERGENTES | Baixa | 🟡 Baixa |
| Semantic caching | TECNOLOGIAS-EMERGENTES | Média | 🟠 Média |
| SLM provider local | TECNOLOGIAS-EMERGENTES | Média | 🟠 Média |
| Reasoning model router | TECNOLOGIAS-EMERGENTES | Média | 🟠 Média |

---

## 4. Roadmap de Implementação por Fases

### Fase 1 — Núcleo Funcional (Semanas 1-4)
**Foco:** Fechar o MVP da IDE + conectar componentes existentes

| Tarefa | Estudo Relacionado | Dependências |
|--------|-------------------|-------------|
| Chat streaming SSE + UI | INTENT-TO-PLAN | Provider Router |
| Chat → Task Runner | INTENT-TO-PLAN | Chat + Task Runner |
| Chat → Engineer Pipeline | INTENT-TO-PLAN | Chat + Engineer |
| Memory → Chat Context | MEMORIA-E-CONTEXTO | MemoryStore + ContextStore |
| File CRUD endpoints | INTENT-TO-PLAN | Server web-ui |
| File Watcher | INTENT-TO-PLAN | chokidar + SSE |
| Context menu na árvore | INTENT-TO-PLAN | File CRUD |
| Substituir SAMPLE_DATA | INTENT-TO-PLAN | Dashboard |
| Quick Open (Ctrl+P) | INTENT-TO-PLAN | Monaco + file index |
| Status Bar | INTENT-TO-PLAN | N/A |

**Entregável:** MVP funcional — usuário consegue pedir mudança no chat, ver plano, aprovar diff, ver resultado.

### Fase 2 — Infraestrutura e Governança (Semanas 5-8)
**Foco:** Segurança, persistência e orquestração

| Tarefa | Estudo Relacionado | Dependências |
|--------|-------------------|-------------|
| NATS JetStream integration | BARRAMENTO-EVENTOS | Event Bus |
| Conectar 6 módulos ao event bus | BARRAMENTO-EVENTOS | NATS |
| DLQ + Retry + Outbox | BARRAMENTO-EVENTOS | NATS |
| Prompt injection scanner (LLM Guard/Rebuff) | SEGURANCA-PROMPT | N/A |
| Output validation | SEGURANCA-PROMPT | N/A |
| Cryptographic audit chain | SEGURANCA-PROMPT | Audit Trail |
| Cross-session persist memory | MEMORIA-E-CONTEXTO | Memory Store |
| LLM no PatternDetector | MEMORIA-E-CONTEXTO | Provider Router |
| LLM no LearningEngine | MEMORIA-E-CONTEXTO | Provider Router |
| Intent classifier LLM-based | INTENT-TO-PLAN | Provider Router |
| Task decomposition ADAPT | INTENT-TO-PLAN | Intent + Planner |

**Entregável:** Sistema com memória entre sessões, segurança contra injection, auditoria confiável, eventos persistentes.

### Fase 3 — Multiagente e Pipeline (Semanas 9-16)
**Foco:** Orquestração multiagente + pipeline de entrega

| Tarefa | Estudo Relacionado | Dependências |
|--------|-------------------|-------------|
| Multi-agent coordination | ORQUESTRACAO-MULTIAGENTE | Event Bus |
| Agent Registry integrado | ORQUESTRACAO-MULTIAGENTE | Agent Identity |
| Message pool / blackboard | ORQUESTRACAO-MULTIAGENTE | Event Bus |
| Cognitive Coprocessor hub | INTENT-TO-PLAN | Provider Router |
| GitOps (ArgoCD/Flux) | PIPELINE-VERIFICACAO | Delivery Orchestrator |
| IaC generation | PIPELINE-VERIFICACAO | Stack detection |
| Feature flags | PIPELINE-VERIFICACAO | N/A |
| xterm.js + node-pty | PIPELINE-VERIFICACAO | Terminal div |
| Semantic caching | TECNOLOGIAS-EMERGENTES | Embedding pipeline |
| SLM provider local | TECNOLOGIAS-EMERGENTES | Provider Router |

**Entregável:** IDE com agentes especializados colaborando, pipeline de entrega automatizado, deploy progressivo.

### Fase 4 — Inteligência e Aprendizado (Semanas 17-24)
**Foco:** Aprendizado cross-projeto, adaptação contínua

| Tarefa | Estudo Relacionado | Dependências |
|--------|-------------------|-------------|
| Reflection (aprender com erros) | APRENDIZADO-ADAPTATIVO | Memory Store |
| Feedback com LLM real | APRENDIZADO-ADAPTATIVO | Feedback Pipeline |
| Adaptive autonomy | APRENDIZADO-ADAPTATIVO | Policy Engine |
| Cross-project learning | APRENDIZADO-ADAPTATIVO | Memory + Feedback |
| Knowledge Graph | MEMORIA-E-CONTEXTO | Vector Store |
| GraphRAG | MEMORIA-E-CONTEXTO | KG + RAG |
| Hierarchical summarization | MEMORIA-E-CONTEXTO | N/A |
| DuckDB analytics | TECNOLOGIAS-EMERGENTES | N/A |
| Tauri desktop app | TECNOLOGIAS-EMERGENTES | Web UI |
| Reasoning model router | TECNOLOGIAS-EMERGENTES | Provider Router |

**Entregável:** Sistema que melhora com cada projeto, aprende padrões, adapta autonomia, entrega sistemas completos.

---

## 5. Riscos Técnicos e Mitigações

### 5.1 Riscos do Fluxo Completo

| Risco | Fase | Probabilidade | Impacto | Mitigação |
|-------|------|--------------|---------|-----------|
| Intent hallucination (plano errado) | 1 - Resolução | Alta | Crítico | ADAPT-style + checkpoints humanos |
| Cascading errors (erro propaga) | 3 - Execução | Alta | Crítico | Self-heal + snapshots a cada etapa |
| Event loss (mensagens perdidas) | 2 - Infra | Média | Crítico | NATS JetStream persistente + Outbox |
| Prompt injection (via arquivos) | 2 - Segurança | Alta | Crítico | LLM Guard scanning input/output |
| Memory staleness (contexto obsoleto) | 4 - Memória | Média | Alto | Timestamps + valid_at/invalid_at |
| Agent deadlock (coordenação) | 3 - Multiagente | Média | Alto | Supervisor com timeout + fallback |
| Cost explosion (N agents × N calls) | 3 - Multiagente | Alta | Alto | Economic Control + budget por agente |
| Model collapse (dados contaminados) | 4 - Aprendizado | Baixa | Crítico | Fine-tuning com validação humana |
| Cold start (primeiro projeto) | 1 - Tudo | Alta | Alto | Few-shot com templates + SBL |
| Embedding drift (modelo muda) | 4 - Memória | Média | Médio | Versionar embedding model + re-index |

### 5.2 Decisões Arquiteturais Críticas

| Decisão | Opções | Recomendação | Justificativa |
|---------|--------|-------------|---------------|
| Event broker | Kafka / NATS / RabbitMQ | **NATS JetStream** | 6 MB RAM, 15 MB binary, request-reply nativo, Node.js first-class |
| Memory store | Neo4j / SQLite / Mem0 | **SQLite + JSONL + Mem0** (fases) | F1: JSONL append-only, F2: SQLite + FTS5, F3: Mem0 |
| Multi-agent framework | LangGraph / CrewAI / AG2 | **LangGraph** | Grafos de estado, checkpointing, deploy comprovado em escala |
| Policy engine | OPA / Cedar / Custom | **Cedar** (AWS) | Mais leve que OPA, policy-as-code, integração Node.js |
| CI/CD | GitHub Actions / Dagger | **Dagger + GitHub Actions** | Pipeline as code (TypeScript), transition suave |
| Desktop | Electron / Tauri | **Electron (MVP) → Tauri (v2)** | Electron para MVP (rápido), Tauri para produção (nativo) |
| SLM local | Phi-4 / Qwen-Coder | **Phi-4-mini (3.8B)** + **Qwen2.5-Coder-7B** | Phi-4 para reasoning, Qwen-Coder para código |
| Vector store | ChromaDB / pgvector / DuckDB | **DuckDB** (fase 1-2), **pgvector** (fase 3+) | DuckDB para analytics local, pgvector para escala |

---

## 6. Recomendações Finais

### 6.1 Ordem de Prioridade (Critical Path)

```
SEMANA 1-2: Fundação do MVP
├── Chat streaming SSE + UI (desbloqueia tudo)
├── File CRUD + Context Menu (usabilidade)
├── Memory → Chat Context (continuidade)
└── Substituir SAMPLE_DATA (credibilidade)

SEMANA 3-4: Conexão dos módulos existentes
├── Chat → Task Runner
├── Chat → Engineer Pipeline
├── Status Bar + Quick Open
└── File Watcher

SEMANA 5-6: Segurança e persistência
├── Prompt injection scanner
├── Output validation
├── Cross-session memory persist
└── Audit hash chain

SEMANA 7-8: Event bus maduro
├── NATS JetStream
├── Conectar 6 módulos ao bus
├── DLQ + Retry + Outbox
└── Event replay

SEMANA 9-12: Inteligência real
├── LLM no PatternDetector
├── LLM no LearningEngine
├── Intent classifier real
├── Task decomposition ADAPT
└── Feedback com LLM real

SEMANA 13-16: Multiagente
├── Agent Collaboration
├── Message pool
├── Cognitive Coprocessor
└── Multi-agent coordination

SEMANA 17-24: Pipeline e aprendizado
├── GitOps + IaC
├── Progressive delivery
├── Cross-project learning
├── Adaptive autonomy
└── Knowledge Graph
```

### 6.2 Diferenciais Competitivos

1. **SLMs Locais + offline-first** — Nenhum concorrente (Cursor, Windsurf, Copilot) oferece execução local completa
2. **Multiagente especializado** — MetaGPT-like com agentes Analista→Arquiteto→Programador→Revisor→Testador→DevOps
3. **Memória cross-projeto** — Sistema aprende padrões entre projetos diferentes
4. **Auditoria criptográfica** — Garantia de rastreabilidade para compliance
5. **Pipeline de entrega completo** — Da ideia ao deploy em produção, passando por quality gates
6. **Autonomia adaptativa** — Sistema ganha mais autonomia conforme demonstra confiabilidade

### 6.3 O Que NÃO Fazer (Evitar)

- ❌ **Multi-modal (imagens)** — Requer Anthropic/Gemini, custo alto, baixo retorno para MVP
- ❌ **Plugin system** — Complexidade alta, validar produto primeiro
- ❌ **Multi-root workspace** — <5% dos usuários precisam
- ❌ **Blockchain attestation** — Hype, baixo valor prático
- ❌ **Custom LLM training** — Fine-tuning de modelos próprios é caro e arriscado
- ❌ **Multi-agent conversation viewer** — Complexidade de UX alta, confuso para usuário comum

---

## 7. Índice dos Estudos Modulares

| # | Estudo | Arquivo | Escopo |
|---|--------|---------|--------|
| 1 | Barramento de Eventos e Mensageria Distribuída | `docs/ESTUDOS/BARRAMENTO-EVENTOS-MENSAGERIA-DISTRIBUIDA.md` | Event sourcing, CQRS, Saga, NATS, Kafka, RabbitMQ, Pulsar, ZeroMQ |
| 2 | Gerenciamento de Contexto e Memória Persistente | `docs/ESTUDOS/MEMORIA-E-CONTEXTO-PESQUISA.md` | Knowledge Graphs, Vector DBs, RAG, GraphRAG, CAG, Mem0, Zep, Letta |
| 3 | Resolução de Intenção e Geração de Especificação | `docs/ESTUDOS/INTENT-TO-PLAN-RESEARCH.md` | Intent classification, CoT, ToT, ADAPT, MetaGPT, SWE-Agent |
| 4 | Segurança de Prompt e Governança Avançada | `docs/ESTUDOS/SEGURANCA-PROMPT-GOVERNADOR-AI.md` | OWASP LLM Top 10, MITRE ATLAS, NeMo Guardrails, OPA/Cedar, LLM Guard |
| 5 | Orquestração Multiagente e Cognição Distribuída | `docs/ESTUDOS/ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA.md` | LangGraph, CrewAI, AG2, MetaGPT, ChatDev, RTADev, SPOQ |
| 6 | Pipeline de Verificação, Qualidade e Entrega | `docs/ESTUDOS/PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA.md` | CI/CD, GitOps, Dagger, ArgoCD, Progressive Delivery, Feature Flags |
| 7 | Aprendizado Adaptativo e Feedback Loop | `docs/ESTUDOS/ESTUDO-APRENDIZADO-ADAPTATIVO-FEEDBACK-LOOP-EVOLUCAO-CROSS-PROJETO.md` | RLHF, DPO, KTO, ORPO, GRPO, Reflection, Constitutional AI |
| 8 | Tecnologias Emergentes e Inovadoras | `docs/ESTUDOS/TECNOLOGIAS-EMERGENTES.md` | SLMs (Phi-4, Qwen-Coder), SSM/Mamba, Wasm agents, DuckDB, LangGraph |

---

## Anexo: Contratos de Integração entre Módulos

### A.1 Event Flow (Event Bus → Módulos)

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Event Bus   │────▶│  Schema Registry     │────▶│  Audit Trail     │
│  (NATS/Jet)  │     │  (valida schema)     │     │  (registra tudo) │
└──────┬───────┘     └──────────────────────┘     └──────────────────┘
       │
       ├──────────────────┬──────────────────┬──────────────────┐
       ▼                  ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Memory Store │  │ Feedback     │  │ Workflow     │  │ Delivery     │
│ (persiste)   │  │ Pipeline     │  │ Engine       │  │ Orchestrator │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### A.2 Dados Compartilhados (Message Pool Schema)

```typescript
// Artefato que trafega entre agentes
interface AgentArtifact {
  id: string;
  type: 'specification' | 'architecture' | 'code' | 'test' | 'review' | 'deploy';
  source: string;          // agent-runtime:agent-id
  target?: string;         // agent-runtime:target-id | 'orchestrator'
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'done';
  content: unknown;        // schema validado por ArtifactSchema
  decisions: Decision[];   // ligações com audit trail
  risk: RiskAssessment;    // avaliação de risco
  timestamp: string;
  parentId?: string;       // chain de artefatos
}

// Evento padrão do barramento
interface BusEvent {
  id: string;
  type: EventType;         // 'artifact.created' | 'policy.evaluated' | ...
  timestamp: string;
  source: string;
  traceId: string;         // OpenTelemetry trace
  payload?: EventPayload;
  metadata?: Record<string, unknown>;
}
```

### A.3 Matriz de Dependências entre Módulos

```
                  Event  Memory Policy Agent  Workflow  Delivery  Feedback
                  Bus    Store  Engine Runtime Engine   Orchestr. Pipeline
Event Bus         ───    need   need   need   need     need      need
Memory Store      emit   ───    ───    need   ───      ───       ───
Policy Engine     emit   need   ───    need   ───      ───       ───
Agent Runtime     emit   need   need   ───   need     ───       ───
Workflow Engine   emit   need   ───    ───   ───      need      ───
Delivery Orchest. emit   need   need   ───   need     ───       ───
Feedback Pipeline emit   need   ───    ───   ───      ───       ───
```

**Legenda:** `emit` = publica eventos no bus | `need` = consome do módulo

---

> **Estudo completo.** Consulte cada estudo modular para detalhes técnicos aprofundados, benchmarks, riscos específicos e recomendações de implementação.
