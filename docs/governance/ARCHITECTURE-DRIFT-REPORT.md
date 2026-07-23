# Architecture Drift Report — IDEIA

> **Data:** 2026-07-18
> **Propósito:** Comparar a arquitetura documentada (ADRs, studies, AGENTS.md) com a implementação real, detectando desvios (drifts), inconsistências e oportunidades de alinhamento.
> **Metodologia:** Análise de código-fonte cruzada com documentos de arquitetura.

---

## 1. Stack Documentada vs Real

| Camada | Documentado | Implementado | Status |
|--------|-------------|-------------|--------|
| **Shell** | Electron/Theia/Tauri | `ai-devkit ide` (servidor HTTP + browser) | 🟡 Drift — Theia existe como projeto separado (`ideia-theia/`), Electron/Tauri não implementados |
| **Editor** | Monaco Editor via Theia | Monaco Editor standalone (`@monaco-editor/react`) | 🟡 Parcial — Monaco funciona, Theia é projeto separado |
| **Event Bus** | NATS JetStream | In-memory EventBus + NatsEventBus (criado) | 🟢 Alinhado — NatsEventBus existe, in-memory é fallback |
| **Policy Engine** | Cedar/OPA | PolicyEngine próprio com regex patterns + HIGH_RISK_ACTIONS | 🟢 Alinhado — implementação própria atende aos requisitos |
| **LLM** | Ollama + OpenAI + DeepSeek | `LLMProvider` interface + OllamaProvider + OpenAIProvider | 🟢 Alinhado — pacote `@ai-devkit/llm-provider` criado |
| **Memória** | Mem0 + SQLite + DuckDB | MemoryStore com JSON file + VectorSearch | 🟡 Alinhado — VectorSearch criado, embeddings via LLMProvider |
| **Agentes** | LangGraph | AgentRuntime + policy + audit | 🟡 Parcial — runtime existe, LangGraph não integrado |
| **Segurança** | LLM Guard + Cedar | PromptSecurity + SecurityMiddleware | 🟢 Alinhado — output validation + rate limit + sanitize |
| **Desktop** | Tauri v2 | CLI HTTP server | 🔴 Drift — sem Electron/Theia/Tauri como shell desktop |
| **Autenticação** | Auth0/Clerk/Keycloak | Não implementado | 🔴 Ausente — sem auth |
| **Observabilidade** | OpenTelemetry + LangFuse | Logging básico (console) | 🔴 Drift — sem tracing, sem métricas estruturadas |

---

## 2. ADRs vs Implementação

| ADR | Decisão | Status | Observação |
|-----|---------|--------|------------|
| ADR-001 | Theia como plataforma base | 🟡 Parcial | Theia existe como projeto separado, não como plataforma principal |
| ADR-002 | NATS JetStream como barramento | 🟢 Implementado | NatsEventBus criado, fallback in-memory |
| ADR-003 | Mem0 + SQLite + DuckDB | 🟡 Parcial | MemoryStore JSON existe, DuckDB não integrado |
| ADR-004 | LangGraph para multiagente | 🔴 Não iniciado | AgentRuntime próprio, LangGraph não integrado |
| ADR-005 | Cedar como policy engine | 🟢 Alternativa | PolicyEngine próprio cobre os casos de uso |
| ADR-006 | Dagger + GitHub Actions CI/CD | 🟡 Parcial | Scripts CI existem, Dagger não integrado |
| ADR-007 | LLM/SLM local + cloud | 🟢 Implementado | LLMProvider com Ollama + OpenAI |
| ADR-008 | ADAPT para task decomposition | 🔴 Não iniciado | Intent classification via switch-case |
| ADR-009 | OpenTelemetry + LangFuse | 🔴 Não iniciado | Logging via console apenas |
| ADR-010 | 4 Quality Gates | 🟡 Parcial | Scripts de verificação existem, automação parcial |

---

## 3. Estudos vs Implementação

| Estudo | Status | Implementação |
|--------|--------|--------------|
| S1 (Eventos) | 🟢 | EventBus + NatsEventBus |
| S2 (Memória) | 🟢 | MemoryStore + VectorSearch |
| S3 (Intenção) | 🔴 | Apenas switch-case |
| S4 (Segurança) | 🟢 | PromptSecurity + SecurityMiddleware |
| S5 (Multiagente) | 🔴 | AgentRuntime básico |
| S6 (Pipeline) | 🟡 | Scripts CI existem |
| S7 (Aprendizado) | 🔴 | Não implementado |
| S8 (Emergentes) | 🟡 | DuckDB, Wasm não implementados |
| S9 (Matriz) | 🟢 | Documento completo |
| S10 (Contratos) | 🟢 | Contract-first com Zod |
| S11 (Theia) | 🟡 | Projeto separado |
| S12 (Testes) | 🟡 | Jest configurado, coverage baixo |
| S13 (Performance) | 🔴 | Benchmark baseline existe, profiling não |
| S14 (Auth) | 🔴 | Não implementado |
| S15 (Cloud) | 🔴 | Docker/K8s não implementados |
| S16 (Deploy) | 🟡 | DeliveryOrchestrator com checks reais |
| S17 (Observabilidade) | 🔴 | Apenas console.log |
| S18 (AI Safety) | 🟢 | Output validation + prompt security |
| S19 (Prompts) | 🟡 | Templates existem, DSPy não |
| S20 (Plugins) | 🟡 | Plugin SDK existe, marketplace não |
| S21 (Terminal) | 🟡 | node-pty integrado, LSP parcial |
| S22 (Colaboração) | 🔴 | Não implementado |

---

## 4. Drifts Críticos

| # | Drift | Impacto | Prioridade | Plano |
|---|-------|---------|------------|-------|
| D1 | **Sem Theia como plataforma** | IDE não integrada com ecossistema VS Code | 🟠 Alto | Migrar para Theia Platform na Fase 3 |
| D2 | **Sem observabilidade** | Sem tracing, métricas, logging estruturado | 🟠 Alto | Implementar OpenTelemetry na Fase 4 |
| D3 | **Sem auth** | Sem multi-tenancy, sem segurança de acesso | 🟠 Alto | Adicionar auth na Fase 2 |
| D4 | **AgentRuntime sem LangGraph** | Sem orquestração multiagente real | 🟡 Médio | Integrar LangGraph na Fase 3 |
| D5 | **Sem busca semântica integrada** | VectorSearch existe mas sem embeddings | 🟡 Médio | Conectar LLMProvider.embed() ao VectorSearch |
| D6 | **Sem deploy cloud** | Docker/K8s ausentes | 🟡 Médio | Implementar na Fase 4 |

---

## 5. Score de Alinhamento Arquitetural

| Componente | Score |
|------------|-------|
| Camada de Dados | 6/10 |
| Camada de Eventos | 8/10 |
| Camada de Agentes | 5/10 |
| Camada de Segurança | 8/10 |
| Camada de Interface | 5/10 |
| Camada de Observabilidade | 2/10 |
| Camada de Infraestrutura | 3/10 |
| **Média Geral** | **5.3/10** |

> **Nota:** Este score reflete o alinhamento entre documentação e implementação.
> O Health Score (funcionalidade/correções) está em ~80/100.

---

## 6. Recomendações

1. **Fase 2 (segurança)**: Adicionar autenticação — sem isso não há multi-tenancy
2. **Fase 3 (Theia)**: Migrar Monaco standalone para Theia Platform
3. **Fase 4 (observabilidade)**: OpenTelemetry + LangFuse — sem tracing não há debugging
4. **Fase 5 (aprendizado)**: Integrar VectorSearch com LLMProvider.embed() para busca semântica real
5. **Contínuo**: Atualizar este relatório a cada sprint para monitorar drifts

---

> **IDEIA — Architecture Drift Report v1.0**
> 2026-07-18 | 6 drifts identificados | Score de alinhamento: 5.3/10
