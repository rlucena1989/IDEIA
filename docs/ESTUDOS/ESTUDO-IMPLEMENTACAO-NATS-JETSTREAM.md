# Estudo de Implementação — NATS JetStream (G1)

> **Tipo:** `implementation-study`
> **Status:** `planned`
> **Data:** 2026-07-21
> **Fase:** F1 — ~29h, 13 tarefas
> **Gap:** G1 — EventBus in-memory sem persistência

---

## 1. Estado Atual

O `EventBus` atual em `packages/event-bus/src/event-bus.ts` é totalmente em memória:
- `maxHistory=5000` — eventos são perdidos em crash
- Pub/Sub síncrono — sem filas duráveis
- Sem replay, sem DLQ, sem consumer groups
- Código NATS já existe em `nats-event-bus.ts`, `nats-connection.ts`, `streams.ts`, `consumers.ts`, `kv-store.ts`, `dlq.ts`, `req-reply.ts`, `object-store.ts` — mas **não integrado** ao EventBus principal

## 2. Arquivos Afetados

| Arquivo | O que fazer |
|---------|-------------|
| `packages/event-bus/src/event-bus.ts` | Adicionar factory `createEventBus({ type: 'nats' })` |
| `packages/event-bus/src/event-bus-factory.ts` | Unificar criação: in-memory vs NATS |
| `packages/event-bus/src/nats-event-bus.ts` | Implementar `EventBus` interface usando NATS JetStream |
| `packages/event-bus/src/nats-connection.ts` | Já existe — conectar via env vars |
| `packages/event-bus/src/streams.ts` | Já existe — criar streams por event type |
| `packages/event-bus/src/consumers.ts` | Já existe — consumer groups |
| `packages/event-bus/src/kv-store.ts` | Já existe — substituir MemoryStore |
| `packages/event-bus/src/dlq.ts` | Já existe — dead letter queue |
| `packages/event-bus/src/req-reply.ts` | Já existe — request/reply pattern |
| `packages/event-bus/src/object-store.ts` | Já existe — blob storage |
| `packages/event-bus/__tests__/nats-integration.test.ts` | 404 linhas — já testa tudo, mas pula se NATS_SERVER não definido |

## 3. Plano de Implementação

### Etapa 1: Factory Unificada (4h)
- Criar `createEventBus({ type: 'nats' | 'in-memory' })` em `event-bus-factory.ts`
- Fallback automático para in-memory se NATS não disponível
- Health check na inicialização

### Etapa 2: NATS EventBus Concreto (8h)
- Implementar `NatsEventBus` em `nats-event-bus.ts` implementando `EventBus` interface
- Pub/Sub via JetStream (persistente)
- Replay de eventos históricos
- Suporte a wildcard subjects (`agent.*`)

### Etapa 3: DLQ + Retry (4h)
- Integrar `DeadLetterQueue` no fluxo de publicação
- Configurar retry com backoff exponencial
- Notificar em caso de falha persistente

### Etapa 4: Consumer Groups (4h)
- Integrar `ConsumerGroupManager` para balanceamento de carga
- Garantir order-only-once delivery

### Etapa 5: KV Store + Object Store (5h)
- Substituir `MemoryStore` por `KVStore` (NATS KV)
- Substituir `fs.writeFileSync` por `ObjectStore`

### Etapa 6: Observabilidade (4h)
- Adicionar métricas de throughput por subject
- Rate limiting
- Integração com audit trail

## 4. Configuração

```env
# .env
IDEIA_EVENT_BUS_TYPE=nats          # nats | in-memory
IDEIA_NATS_SERVERS=nats://localhost:4222
IDEIA_NATS_TOKEN=
IDEIA_NATS_MAX_RECONNECT=10
IDEIA_NATS_RECONNECT_DELAY=2000
```

## 5. Testes

- `nats-integration.test.ts` — 404 linhas, 9 suites — usar `NATS_SERVER` no CI
- Testes de fallback: NATS off → in-memory automático
- Testes de persistência: crash → replay

## 6. Dependências

- NATS Server rodando (Docker: `docker run -p 4222:4222 nats`)
- @nats-io/nats-core — já em node_modules
- @nats-io/jetstream — já em node_modules

## 7. Critérios de Aceitação

- [ ] EventBus com NATS: publish + subscribe + persistência
- [ ] Fallback automático para in-memory se NATS off
- [ ] DLQ com retry exponencial
- [ ] Consumer groups com push-based delivery
- [ ] KV Store substituindo MemoryStore
- [ ] Todas as 9 suites do nats-integration.test.ts passando com NATS_SERVER
