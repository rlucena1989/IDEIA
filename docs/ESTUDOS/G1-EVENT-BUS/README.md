# G1 — Event Bus / Pub-Sub Centralizado

> **Tipo**: `structural-gap`  
> **Status**: ✅ `IMPLEMENTED` — Verificado em 2026-07-22  
> **Data**: 2026-07-15  
> **Metodologia**: Template Permanente de Análise (Fases 1-4)

---

## Fase 1 — Pesquisa e Fundamentação

### 1.1 Resumo Executivo

15+ estudos no ecossistema AI-Devkit precisam publicar ou assinar eventos (agent-runtime, audit-trail, memory-store, policy-engine, web-ui, CLI commands) mas não existe barramento compartilhado. Cada módulo implementa sua própria notificação (WebSocket, callbacks, polling, logs). Um pacote `packages/event-bus/` existe com implementação parcial. A centralização elimina acoplamento direto entre publishers e subscribers, permite observabilidade completa do fluxo de eventos e viabiliza padrões como saga, CQRS e event sourcing.

**Decisão recomendada**: ✅ FAZER — Score 4.0, prioridade máxima.

### 1.2 Pesquisa Acadêmica e de Mercado

- **Padrões**: Observer (GoF), Event-Driven Architecture (EDA), Message Bus, Pub-Sub — amplamente documentados em "Enterprise Integration Patterns" (Hohpe & Woolf).
- **Concorrentes**: Cursor usa um EventBus interno para comunicação entre Composer Agent, Background Agents e WebView. Windsurf tem um sistema de eventos proprietário para Cascade Agent e Parallel Agents. VS Code tem seu próprio `EventEmitter` + `Event` pattern.
- **Open source**: `EventEmitter2` (Node.js), `RxJS` (ReactiveX), `nats.ws` (NATS), `bull`/`bullmq` (Redis-backed), `eventemitter3` (high-performance).
- **Papers**: "On the Design of a Publish/Subscribe System" (Eugster et al., ACM Computing Surveys), "The Many Faces of Publish/Subscribe" (Eugster, ACM CSUR 2003).

### 1.3 Análise Técnica

**Arquitetura proposta**:
```
Publisher → EventBus.emit(event) → Middleware Pipeline → Subscribers
                                    ├── AuditTrail (log all events)
                                    ├── PolicyEngine (filter/block events)
                                    ├── MetricsCollector (latency, count)
                                    └── RateLimiter (throttle)
```

**Dependências**: `packages/event-bus/` (já existe, scaffold básico). Precisa integrar com `packages/audit-trail/`, `packages/policy-engine/`, `packages/contracts/` (tipos de evento).

**Padrões envolvidos**: Event sourcing opcional, CQRS para comandos vs queries, Middleware chain para cross-cutting concerns.

### 1.4 Riscos e Limitações

- **Performance**: Event bus como single point of failure — mitigação com backpressure + buffer + fallback para direct call.
- **Escalabilidade**: Em processo (single thread) vs. multi-processo — para MVP, in-process com EventEmitter2; futuro: NATS ou Redis.
- **Memory leak**: Subscribers não removidos — exigir unsubscribe pattern (disposable).
- **Debugging**: Eventos assíncronos são mais difíceis de debugar — audit trail obrigatório com eventId + correlationId.

---

## Fase 2 — Matriz de Viabilidade

| Dimensão | Peso | Nota | Pontos |
|----------|:----:|:----:|:------:|
| **Valor para IDE** | 3 | 4 | 12 |
| **Diferenciação** | 2 | 4 | 8 |
| **Sinergia c/ arquitetura** | 2 | 5 | 10 |
| **Custo-benefício** | 2 | 3 | 6 |
| **Maturidade** | 1 | 4 | 4 |

**Score = (12 + 8 + 10 + 6 + 4) / 10 = 4.0** ✅ FAZER

| Esforço | Semanas | Justificativa |
|:-------:|:-------:|---------------|
| **M** | 3-4 | Event Bus já scaffolded; requer integração com 4+ módulos |

---

## Fase 3 — Artefatos

### 3.1 TASK-IDE-14 — Event Bus Unificado

```markdown
# Tarefa — Event Bus Unificado

## ID: TASK-IDE-14 | Módulo: event-bus | Tipo: feature

## Objetivo: Completar implementação do Event Bus com middleware pipeline, tipagem forte e integração com audit-trail + policy-engine.

## Dependências
- TASK-IDE-06 (Contract Types) — tipos de evento precisam estar definidos

## Critérios de aceite
### Subtarefa 14.1 — Core EventBus
- [ ] `EventBus.emit(event)` dispara para todos subscribers do tipo
- [ ] `EventBus.on(type, handler)` retorna `Disposable` (unsubscribe automático)
- [ ] Suporte a eventos síncronos e assíncronos (Promise<boolean>)
- [ ] Middleware pipeline executado antes dos subscribers

### Subtarefa 14.2 — Tipagem forte
- [ ] `EventMap` em `packages/contracts` definindo todos os eventos do sistema
- [ ] `TypedEventBus<EventMap>` com inferência automática de payload
- [ ] EventId + correlationId + timestamp obrigatórios em todo evento

### Subtarefa 14.3 — Integrações
- [ ] `audit-trail` como middleware obrigatório (log all events)
- [ ] `policy-engine` como middleware condicional (filtro por tipo de evento)
- [ ] WebSocket bridge: eventos broadcastados para web-ui

## Arquivos que PODEM ser alterados
- `packages/event-bus/src/` (core implementation)
- `packages/contracts/src/events/` (tipos de evento)
- `packages/audit-trail/src/` (integração)
- `packages/cli/src/ide/` (WebSocket bridge)

## Riscos
- Subscribers não descartados causam memory leak — `Disposable` obrigatório
- Sobrecarga de eventos em alta frequência — throttling via middleware

## Verificação
- [ ] Testes de unidade: emit + on + disposable + middleware
- [ ] Teste de integração: fluxo completo com audit-trail + policy-engine
- [ ] Teste de stress: 10k eventos em 1s sem perda
```

### 3.2 Contratos

**Contrato: event-bus → audit-trail**
- `AuditTrailMiddleware` implementa `EventMiddleware`
- Consome evento, extrai `eventId, type, timestamp, payload` e persiste

**Contrato: event-bus → policy-engine**
- `PolicyMiddleware` implementa `EventMiddleware`
- Consulta `policyEngine.evaluate({ resource: event.type, action: 'emit' })`
- Se `block`, evento não propaga

**Contrato: event-bus → web-ui**
- `WebSocketBridge` escuta eventos específicos e broadcasta via WS

### 3.3 CHANGELOG Entry

```markdown
## 2026-07-15 — G1: Event Bus / Pub-Sub Centralizado

### Arquivos novos
| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `docs/ESTUDOS/G1-EVENT-BUS/README.md` | Análise completa do gap estrutural |
```

---

## Fase 4 — Ciclo de Vida

```
[CRIAÇÃO] docs/ESTUDOS/G1-EVENT-BUS/README.md
  │
  ├──> PESQUISA (Fase 1) → 15+ estudos afetados, já existe scaffold
  │
  ├──> ANÁLISE (Fase 2) → Score 4.0 — ✅ FAZER
  │     │
  │     └──> GERA TAREFA → TASK-IDE-14
  │           │
  │           └──> IMPLEMENTA → Event Bus completo + integrações
  │
  └──> REVISÃO PERIÓDICA → a cada 3 meses (próximo: 2026-10-15)
```

---

## Integração com Código (2026-07-22)

**Status:** ✅ **Implementado** (F1 — NATS JetStream)

Este gap foi completamente resolvido como parte da **Fase 1 (Barramento NATS JetStream)**:

| Componente | Package | Status |
|-----------|---------|--------|
| Event Bus core | `packages/event-bus/` | `IEventBus` unificada, factory com fallback in-memory |
| NATS JetStream | `packages/event-bus/src/nats-connection.ts` | Connection manager, streams, DLQ, KV, Object Store |
| Health check | `packages/event-bus/src/health-check.ts` | Monitoramento de conexão |
| Testes | `packages/event-bus/src/__tests__/` | 8+ testes de integração |

**Próxima evolução:** Migração do fallback in-memory para NATS JetStream como default.

---

## Referências

- `packages/event-bus/` — implementação completa
- `packages/contracts/src/` — tipos base
- `packages/audit-trail/src/` — integração com auditoria
- "Enterprise Integration Patterns" — Hohpe & Woolf
- "The Many Faces of Publish/Subscribe" — Eugster et al., ACM CSUR 2003
