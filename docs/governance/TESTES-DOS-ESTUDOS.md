# Testes dos Estudos — Definições por Estudo

> **Propósito:** Suprir a lacuna de testes em 12 estudos score 3 (S23-S25, T1, M1, S2, S4-S8, S11).
> Cada entrada define: testes unitários, integração, E2E e critérios de aceitação.

---

## S23 — Self-Optimization Panel

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | `InitiativeEngine.scanAll()` — cada scanner individualmente | Jest | Cada scanner retorna `FixIssue[]` válido |
| Unitário | `InitiativeEngine.canAutoFix()` — policy check | Jest | Respeita nível passive/assisted/autonomous |
| Unitário | `InitiativeEngine.applyFix()` — cada tipo de ação | Jest | file:create/write/delete/shell:exec/config:update funcionam |
| Unitário | `PathValidator.resolve()` — self vs project isolation | Jest | Path fora do escopo → `ScopeViolationError` |
| Integração | Ciclo completo scan→fix→verify em repositório temp | Jest | Taxa de acerto > 90% |
| E2E | Self-Panel carrega métricas no web UI | Playwright | Painel exibe health score |
| E2E | Technology Radar → recomendação → task | Playwright | Score ≥ 3.5 gera task |
| Aceitação | Zero auto-fixes quebram testes existentes | CI gate | Pós-auto-fix, `npm test` passa |

## S24 — Controle e Sintonia

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | Safety Circuit Breaker — 5 gatilhos | Jest | Cada gatilho dispara na condição certa |
| Unitário | BHP Protocol — 7 tipos de mensagem | Jest | HELP/STATS/PLAN/APPROVE/REJECT/CLARIFY/ADAPT |
| Unitário | E-Stop — 5 formas de acionamento | Jest | Todas param ciclos imediatamente |
| Unitário | Rollback automático — backup e restore | Jest | Rollback restaura estado anterior completo |
| Integração | Autonomy Control Tower + EventBus | Jest | Eventos `control.*` são emitidos/publicados |
| E2E | Emergency Stop via web UI | Playwright | Botão STOP para ciclos |
| E2E | BHP: IDEIA → IA → resposta → execução | Playwright | Fluxo completo de ajuda bidirecional |
| Aceitação | Zero perda de controle em produção | Chaos | Testes de caos com E-Stop |

## S25 — Perfis e Configuração

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | Config tree — 40+ parâmetros com validação Zod | Jest | Schema validation para cada parâmetro |
| Unitário | Profile presets (5) — merge global/project | Jest | Project sobrescreve global, security nunca menos restritivo |
| Unitário | Regras de segurança R1-R7 | Jest | Cada regra aplicada corretamente |
| Integração | CLI `config set/show/reset/profile/context` | Jest | Todos os subcomandos funcionam |
| E2E | Configuration Dashboard web UI | Playwright | Sliders, toggles, save, reset |
| E2E | Onboarding Wizard → profile → configuração aplicada | Playwright | Wizard completo em < 2min |
| Aceitação | Perfil adaptativo acurado após 50 interações | Teste de perfil | Match > 85% |

## T1 — Topologia de Integração

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | C1-C18 contratos — cada um com schema + validação | Jest | Schema válido, timeouts, CB config |
| Unitário | Padrões de interconexão (cache, streaming, chain) | Jest | Cada padrão implementado corretamente |
| Integração | Mapa de dependências entre packages | Jest | 66 packages, todas as conexões verificadas |
| Integração | Stacking profiles (4) — cada perfil carrega | Jest | Solo/Startup/Enterprise/Multiagente |
| E2E | Contratos novos C19-C23 | Playwright | C19 isolation, C20 ADR, C21 feedback, C22 radar, C23 chat |
| Aceitação | Matriz de velocidade (ganhos documentados) | Benchmark | Auto-fix < 217ms, ciclo < 1.3s |

## M1 — Fluxo Completo

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | Macro fluxo — cada etapa isoladamente | Jest | scan→analyze→plan→execute→verify |
| Integração | Fluxo completo: ideia → entrega | Jest | Pipeline completo sem falhas |
| E2E | Jornada do usuário completa | Playwright | Onboarding → código → commit → deploy |
| Aceitação | Todas as 7 dimensões de qualidade (E3) | CI gate | Score ≥ 80/100 |

## S2 — Memória e Contexto

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | VectorSearch — cosineSimilarity, normalizeVector, search | Jest | Precisão > 95% em busca semântica |
| Unitário | PatternDetector — detecção de padrões | Jest | Taxa de detecção > 80% |
| Integração | MemoryStore + VectorSearch + AuditTrail | Jest | Append → search → retrieve |
| E2E | Chat com contexto de memória | Playwright | Respostas usam histórico |
| Aceitação | Busca < 100ms para 10K records | Benchmark | P99 < 100ms |

## S4 — Segurança

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | PolicyEngine — evaluatePolicy, evaluateBatch | Jest | Decisões auto/ask/block corretas |
| Unitário | PromptSecurity — validateGeneratedCode | Jest | Detecta 31 regras PII/injection |
| Integração | Policy + PromptSecurity + AuditTrail | Jest | Violação → block → audit |
| E2E | Prompt injection via chat → bloqueado | Playwright | Injection detectado e rejeitado |
| Aceitação | OWASP LLM Top 10 coberto | Scanner | 10/10 categorias |

## S5 — Multiagente

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | AgentGraph — DAG execution | Jest | Ordem topológica respeitada |
| Unitário | AgentCoordinator — task→agent matching | Jest | Tarefa atribuída ao agente certo |
| Integração | Supervisor → 6 agents → resultado | Jest | Pipeline completo (analyst→architect→...→devops) |
| E2E | Chat multiagente colaborativo | Playwright | Agentes debatem e chegam a consenso |
| Aceitação | Throughput > 100 tasks/min | Benchmark | Escalabilidade |

## S6 — Pipeline de Verificação

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | Quality gates (4) — cada gate individualmente | Jest | lint, test, build, security passam |
| Unitário | DeliveryOrchestrator — createRelease, deploy, rollback | Jest | Release → deploy → rollback |
| Integração | Workflow → Quality Gates → Delivery | Jest | Pipeline completo |
| E2E | PR → CI → quality gates → deploy | Playwright | Fluxo git flow completo |
| Aceitação | Deploy < 5min | Benchmark | Pipeline tempo real |

## S7 — Aprendizado Adaptativo

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | FeedbackPipeline — processamento de feedback | Jest | Feedback → recomendação |
| Unitário | PatternDetector — frequência e confiança | Jest | Padrões detectados corretamente |
| Integração | Feedback → MemoryStore → PatternDetector | Jest | Ciclo de aprendizado completo |
| E2E | IDEIA melhora sugestões ao longo do tempo | Playwright | Sugestões melhores após N iterações |
| Aceitação | Taxa de aceitação de sugestões > 70% | Métrica | Aprendizado efetivo |

## S8 — Tecnologias Emergentes

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | Technology Radar — scan de GitHub/npm/arXiv | Jest | APIs retornam dados válidos |
| Unitário | Matriz de viabilidade — 5 dimensões, score ≥ 3.5 | Jest | Score calculado corretamente |
| Integração | Tech Radar → recommendation → task creation | Jest | Score ≥ 3.5 gera TASK-IDEIA |
| E2E | Auto-estudo de tecnologia → documento gerado | Playwright | Estudo criado em docs/ESTUDOS/ |
| Aceitação | Precisão das recomendações > 70% | Métrica | Recomendações úteis |

## S11 — Theia

| Tipo | Escopo | Ferramenta | Critério |
|------|--------|-----------|----------|
| Unitário | BackendModule — Inversify bindings | Jest | Todos os serviços injetados corretamente |
| Unitário | ChatService — streamMessage, approveCheckpoint | Jest | SSE streaming + approval flow |
| Integração | Theia backend + frontend (JSON-RPC) | Jest | Conexão frontend↔backend |
| E2E | Theia widget carrega no Theia shell | Playwright | Widget exibido corretamente |
| Aceitação | Compatibilidade com Theia 1.73+ | CI gate | Build sem erros |
