# Estudo: Barramento de Eventos e Mensageria Distribuída

> **Data:** 2026-07-17
> **Contexto:** ai-devkit — sistema de desenvolvimento assistido por IA
> **Objetivo:** Evoluir event-bus in-memory + WebSocket para suportar fluxo completo "ideia → entrega comercial"
> **Template:** TEMPLATE-ANALISE-PERMANENTE.md (Fase 1 e 2)

---

## Sumário

1. [Metodologias e Padrões](#1-metodologias-e-padrões)
2. [Tecnologias (Maduras → Inovadoras)](#2-tecnologias-maduras--inovadoras)
3. [Estudos Técnicos e Ensaios Comparativos](#3-estudos-técnicos-e-ensaios)
4. [Riscos Técnicos e Mitigações](#4-riscos-técnicos-e-mitigações)
5. [Relevância para o Fluxo Ideia → Entrega](#5-relevância-para-o-fluxo-ideia--entrega)
6. [Reuso no ai-devkit (AVALIAÇÃO)](#6-reuso-no-ai-devkit-avaliação)
7. [Conclusão e Recomendações](#7-conclusão-e-recomendações)

---

## 1. Metodologias e Padrões

### 1.1 Event Sourcing

Armazena toda mudança de estado como eventos imutáveis em um log append-only. O estado atual é derivado por **replay** dos eventos.

| Aspecto | CRUD Tradicional | Event Sourcing |
|---------|-----------------|----------------|
| O que persiste | Estado atual (último snapshot) | Histórico completo de mudanças |
| Perda de dados | Estados anteriores perdidos | Todo histórico preservado |
| Auditoria | Requer implementação separada | Nativo |
| Debugging | Apenas estado atual visível | Time travel possível |
| Replay | N/A | Reconstrói qualquer estado |
| Espaço | Relativamente pequeno | Cresce com acúmulo de eventos |

**Prós:** Auditoria completa, time-travel debugging, generates múltiplos read models.
**Contras:** Schema evolution complexo, requer snapshots para performance, curva de aprendizado alta.
**Quando usar:** Domínios financeiros, auditoria regulatória, ledgers, workflows colaborativos.

### 1.2 CQRS (Command Query Responsibility Segregation)

Separa modelos de escrita (Commands) e leitura (Queries).

| Aspecto | Command (Write) | Query (Read) |
|---------|----------------|--------------|
| Propósito | Mudança de estado, validação | Recuperação de dados |
| Tráfego típico | 10-20% | 80-90% |
| Consistência | Consistência forte necessária | Consistência eventual aceitável |
| Complexidade | Lógica de domínio rica | Modelos denormalizados |
| Escalabilidade | Vertical principalmente | Horizontal fácil (cache, réplicas) |

**Prós:** Otimização independente de leitura/escrita, models especializados, escalabilidade.
**Contras:** Lag de consistência eventual, complexidade operacional, duplicação de dados.
**Recomendação:** Usar CQRS apenas quando leitura e escrita têm perfis significativamente diferentes.

### 1.3 Saga Pattern

Gerencia transações distribuídas multi-serviço sem 2PC, usando transações locais + compensações.

#### Coreografia vs Orquestração

| Aspecto | Coreografia | Orquestração |
|---------|-------------|--------------|
| Controle | Distribuído (cada serviço pub/sub) | Centralizado (orquestrador) |
| Acoplamento | Baixo (esquema de evento compartilhado) | Médio (orquestrador conhece serviços) |
| Visibilidade | Baixa (fluxo difícil de rastrear) | Alta (estado visível no orquestrador) |
| Complexidade | Torna-se complexa com muitos serviços | Aumenta linearmente |
| SPOF | Nenhum | Orquestrador pode ser |
| Compensação | Distribuída | Centralizada |
| Testes | Integração difícil | Unit testing do orquestrador fácil |
| Escala ideal | 2-4 serviços | 5+ serviços ou lógica complexa |
| Ferramentas | Kafka, RabbitMQ, NATS | Temporal, Camunda, AWS Step Functions |

**Padrão híbrido recomendado:** Coreografia para notificações, cache invalidation, logs; Orquestração para fluxos core (pagamento-inventário-entrega).

### 1.4 Message Broker Patterns

- **Pub/Sub:** Produtor publica em tópico, broker faz fan-out para todos os assinantes. Cobre 80% dos casos.
- **Competing Consumers:** Múltiplos consumidores competem por mensagens de uma fila (load balancing).
- **Dead Letter Queues (DLQ):** Isola mensagens que falharam após N retentativas. Essencial para isolamento de falhas.
- **Transactional Outbox:** Escreve evento + estado na mesma transação; publisher lê outbox e publica no broker. Evita o dual-write problem.

### 1.5 Stream Processing

Processamento contínuo de fluxos de dados imutáveis:

- **Kafka Streams / ksqlDB:** Processamento embutido no ecossistema Kafka.
- **Apache Flink:** Processamento stateful com exatamente-uma semântica.
- **Materialize / RisingWave:** SQL em tempo real sobre streams.

---

## 2. Tecnologias (Maduras → Inovadoras)

### 2.1 Maduras (largamente adotadas)

#### RabbitMQ (AMQP)

| Característica | Valor |
|---------------|-------|
| **Protocolo** | AMQP 0-9-1, MQTT, STOMP |
| **Performance** | ~54K msg/s (streams), 146µs latência média |
| **RAM (cold start)** | 122 MiB |
| **Persistência** | Disco (arquivos) |
| **Replay** | Não (sem log) |
| **Ordenação** | Garantida por fila |
| **Cluster** | RAFT + Quorum Queues |

**Melhor para:** Roteamento complexo, task queues, integrações brownfield, mixed workloads.
**Pior para:** High-throughput streaming, replay de eventos, event sourcing.

#### Apache Kafka

| Característica | Valor |
|---------------|-------|
| **Protocolo** | Kafka Wire Protocol |
| **Performance** | ~67K msg/s (single), 1.2M msg/s (cluster), 5.7µs latência |
| **RAM (cold start)** | 327 MiB (JVM) |
| **Persistência** | Log commit em disco |
| **Replay** | Por offset, nativo |
| **Ordenação** | Garantida por partição |
| **Cluster** | KRaft (ZooKeeper removido) |
| **Ecosistema** | Kafka Connect (1000+), Kafka Streams, ksqlDB, Schema Registry |

**Melhor para:** High-throughput streaming, event sourcing, CDC pipelines, data pipelines.
**Pior para:** Request-reply, baixa latência absoluta, equipes sem operações dedicadas.

#### Redis Streams

| Característica | Valor |
|---------------|-------|
| **Protocolo** | RESP |
| **Performance** | ~650K msg/s, 8ms p95 |
| **Persistência** | RDB snapshots + AOF |
| **Replay** | Sim (range queries) |
| **RAM** | In-memory (limitado por RAM) |

**Melhor para:** Cache, sessão, telemetria em tempo real, latência crítica.
**Pior para:** Long-term storage, eventos que precisam retenção prolongada.

### 2.2 Inovadoras / em adoção

#### Redpanda

| Característica | Valor |
|---------------|-------|
| **Linguagem** | C++ (thread-per-core) |
| **API** | Kafka 100% compatível |
| **Performance** | ~122K msg/s (single), 5.3µs latência |
| **RAM** | 40% menos que Kafka |
| **Cluster** | Single binary, Raft nativo |
| **Schema Registry** | Nativo |
| **Ops Complexity** | Baixa (sem JVM, sem ZooKeeper) |

**Melhor para:** Drop-in replacement do Kafka com performance 2x e ops simplificada.
**Pior para:** Ecossistema menor que Kafka (Kafka Connect parcial).

#### Apache Pulsar

| Característica | Valor |
|---------------|-------|
| **Arquitetura** | Compute (broker) + Storage (BookKeeper) separados |
| **Performance** | ~950K msg/s, 22ms p95 |
| **Geo-replication** | Nativa |
| **Multi-tenancy** | Excelente (nativa) |
| **Protocolos** | Kafka (KoP), MQTT (MoP), AMQP (AoP) via plugins |
| **Ops Complexity** | Alta (broker + bookie + ZK) |

**Melhor para:** Multi-tenancy, geo-replication, unified queuing + streaming.
**Pior para:** Simplicidade operacional, latência crítica.

#### NATS + JetStream

| Característica | Valor |
|---------------|-------|
| **Linguagem** | Go (single binary ~15 MB) |
| **Performance** | ~800K msg/s, <1ms p50, 15ms p95 |
| **RAM (cold start)** | 6 MiB |
| **JetStream** | Persistência opcional com replay |
| **Request-Reply** | Nativo no protocolo |
| **KV Store / Object Store** | Nativo |
| **Cluster** | Raft, superclusters, leaf nodes |
| **Patterns** | Pub/Sub, Request-Reply, Queue Groups |

**Benchmarks comparativos (request-reply P95):**

| Cenário | RabbitMQ | Kafka | NATS JS |
|---------|----------|-------|---------|
| 25K × 256B | 41.4s | 36.5s | **0.4s** |
| 10K × 1KB | 21.4s | 15.1s | **0.2s** |
| 5K × 4KB | 12.2s | 7.3s | **0.1s** |

NATS é 46-105x mais rápido que Kafka/RabbitMQ em request-reply.

**Melhor para:** Microserviços cloud-native, edge computing, IoT, baixa latência.
**Pior para:** Extreme throughput (>1M msg/s sustentados), ecossistema pequeno.

#### ZeroMQ

| Característica | Valor |
|---------------|-------|
| **Tipo** | Biblioteca (embedável), sem broker |
| **Performance** | ~2.9 GB/s throughput (TCP, payloads >128KB) |
| **Persistência** | Nenhuma |
| **Entrega** | At-most-once (sem ack) |
| **Patterns** | Pub/Sub, Push/Pull, Router/Dealer, Request/Reply |

**Melhor para:** IPC, comunicação intra-datacenter de altíssima performance.
**Pior para:** Sistemas que cruzam rede não confiável, exigem durabilidade, ou precisam de replay.

### 2.3 Matriz Comparativa Consolidada

| Tecnologia | Throughput | p95 Latency | Persistência | Replay | Ops Complexity | TCO/mês (10K msg/s) |
|---|---|---|---|---|---|---|
| RabbitMQ | 450K/s | 32ms | Disco | Não | Média | $3.100 |
| Apache Kafka | 1.2M/s | 18ms | Log commit | Sim | Alta | $4.200 |
| Redis Streams | 650K/s | 8ms | RAM+AOF | Sim | Baixa | $2.400 |
| Redpanda | 1.2M/s | 5ms | Log commit | Sim | Baixa | ~$2.800 |
| Apache Pulsar | 950K/s | 22ms | Tiered | Sim | Alta | $3.800 |
| NATS JetStream | 800K/s | 15ms | Opcional | Sim | Muito Baixa | $2.900 |
| ZeroMQ | 2.9 GB/s | <1ms | N/A | Não | N/A (lib) | $0 |

---

## 3. Estudos Técnicos e Ensaios

### 3.1 Latência vs Throughput

Hierarquia de latência (menor é melhor):
1. ZeroMQ (< 1ms) — sem broker, conexão direta
2. NATS JetStream (~1-5ms) — Go nativo, protocolo leve
3. Redpanda (~5-10ms) — C++, sem JVM GC
4. Kafka (~10-50ms) — JVM, batching, replicação
5. Redis Streams (~8-25ms) — In-memory, sem replicação síncrona
6. Apache Pulsar (~20-35ms) — Hop extra broker→BookKeeper
7. RabbitMQ (~30-150ms) — AMQP overhead, routing complexity

Hierarquia de throughput (maior é melhor):
1. Kafka / Redpanda (1.2M msg/s)
2. Pulsar (950K msg/s)
3. NATS (800K msg/s)
4. Redis Streams (650K msg/s)
5. RabbitMQ (450K msg/s)

### 3.2 Garantias de Entrega

| Nível | Descrição | Suportado por |
|-------|-----------|---------------|
| **At-most-once** | Mensagem entregue 0 ou 1 vez. Perda possível. | ZeroMQ, Core NATS |
| **At-least-once** | Mensagem entregue 1+ vezes. Duplicatas possíveis. | RabbitMQ, Kafka, NATS JS, Pulsar, Redis |
| **Exactly-once** | Mensagem entregue exatamente 1 vez. | Kafka (idempotent + transactions), Pulsar, NATS JS (com dedup ack) |

**Regra prática:** exactly-once na prática requer idempotência no consumidor. Nenhum broker garante exactly-once end-to-end sem cooperação da aplicação.

### 3.3 Ordenação de Eventos

- **Kafka:** Garantida apenas **dentro de uma partição**. Mensagens em partições diferentes não têm ordenação global.
- **NATS JetStream:** Ordenada por stream (sequência numérica). Múltiplos streams = sem ordenação global.
- **RabbitMQ:** Ordenada por fila (single consumer queue). Com múltiplos consumers, ordenação é perdida.
- **Pulsar:** Garantida por partition (dispatcher ordenado).

**Problema conhecido:** Ordenação global em sistemas distribuídos é cara e raramente necessária. Prefira partitioning por chave (ex: `agent_id`) para ordenação local.

### 3.4 Replay de Eventos

| Broker | Mecanismo de Replay | Eficiência |
|--------|--------------------|------------|
| Kafka | Offset seek | Instantâneo (offset indexado) |
| NATS JS | Sequence number / timestamp | Instantâneo (cursor-based) |
| Pulsar | Position seek | Instantâneo (segment index) |
| Redis | Range query (XRANGE) | O(n) no range |
| RabbitMQ | Não suporta | N/A |

### 3.5 Dead Letter Handling

Padrão de resiliência obrigatório:
1. **Retry policy:** N tentativas com backoff exponencial (ex: 1s, 2s, 4s, 8s, 16s)
2. **DLQ:** Mensagens exaustas vão para tópico/fila separada
3. **Correction flow:** Agente supervisor analisa DLQ e decide: reprocessar, descartar, ou notificar
4. **Monitoramento:** Deep queue depth em DLQ aciona alerta

---

## 4. Riscos Técnicos e Mitigações

| Risco | Descrição | Mitigação |
|-------|-----------|-----------|
| **Consistência eventual** | Read model pode estar desatualizado | Definir SLOs de frescura; usar CQRS sync para casos críticos |
| **Split-brain** | Partição de rede causa dois líderes | Usar RAFT (NATS, Redpanda, Kafka KRaft); evitar mirror queues |
| **Backpressure** | Produtor mais rápido que consumidor | Configurar max_in_flight; usar rate limiting; circuit breaker |
| **Perda em failover** | Líder cai antes de replicar | Ack=all (Kafka); replicação fator 3+; aguardar confirmação ISR |
| **Complexidade ops** | Cluster requer equipe dedicada | NATS (6 MiB, single binary); evitar Pulsar sem equipe experiente |
| **Event storms** | Agentes broadcastam excessivamente | Rate limiting; partitioning; priority lanes; pacing control |
| **Duplicate events** | Retry causa duplicação | Idempotency key no payload; dedup no consumer |
| **Schema evolution** | Eventos antigos incompatíveis | Schema Registry + upcasters; backward-compatibilidade obrigatória |

---

## 5. Relevância para o Fluxo Ideia → Entrega

### 5.1 Como o Event Bus Conecta os Módulos Inteligentes

```
IDEA → Requirements Engine → Workflow Engine → Delivery Orchestrator → DEPLOY
         ↓                        ↓                    ↓
      Event Bus (barramento persistente com replay)
         ↓                        ↓                    ↓
    Memory Store             Feedback Pipeline     Trace Registry
    (aprendizado)            (melhoria contínua)    (rastreabilidade)
```

**Módulos que precisam do event bus:**

| Módulo | Eventos que emite | Eventos que consome |
|--------|------------------|-------------------|
| requirements-engine | `requirement.created`, `requirement.refined` | `feedback.submitted`, `policy.evaluated` |
| workflow-engine | `cycle.started`, `cycle.completed`, `task.assigned` | `requirement.created` |
| delivery-orchestrator | `deploy.started`, `deploy.completed`, `deploy.failed` | `cycle.completed` |
| memory-store | — (puramente consumidor) | `*.completed`, `*.failed`, `decision.*` |
| feedback-pipeline | `feedback.submitted`, `recommendation.generated` | `deploy.completed`, `cycle.failed` |
| trace-registry | `trace.linked` | Todos (rastreabilidade passiva) |
| policy-engine | `policy.evaluated`, `policy.violated` | `*.*` (audita tudo) |
| event-bus | (núcleo) | (núcleo) |

### 5.2 Como Eventos Alimentam o Feedback Pipeline

```
Evento → Feedback Pipeline → Memory Store → Learning Engine → Policy Adapter
  ↑                                    ↓
  └──── replay permite análise ────────┘
```

- Eventos de falha (`deploy.failed`, `cycle.failed`) → viram `MemoryRecord` de categoria `failure`
- Eventos de sucesso (`cycle.completed`) → reforçam padrões no `PatternDetector`
- Replay de eventos permite reconstruir a trilha de decisões de qualquer ciclo anterior

### 5.3 Replay para Análise de Decisões

Com event sourcing, é possível:
- Reconstruir estado de qualquer ciclo anterior
- Reproduzir decisões do policy engine com novos parâmetros (what-if)
- Auditar quem aprovou o quê e quando
- Debugar ciclos que produziram resultados inesperados

### 5.4 WebSocket Broadcast vs Message Broker Persistente

| Aspecto | WebSocket (atual) | Message Broker (proposto) |
|---------|-------------------|--------------------------|
| Persistência | Apenas in-memory (maxHistory=1000) | Log durável + replay |
| Entrega | Fire-and-forget | At-least-once / Exactly-once |
| Consumidores off-line | Perdem eventos | Recuperam no reconnect |
| Ordering | Em ordem de emissão | Garantido por partição |
| Escalabilidade | Single process | Cluster horizontal |
| Dead letter | Não | DLQ + retry |
| Replay | Não | Sim (por offset/timestamp) |
| Caso de uso | Live UI updates | Tudo |
| Manutenção acoplada | WSBroadcast + EventBus juntos | Transport pode variar |

**Estratégia híbrida recomendada:** Broker persistente (NATS/Kafka) como backbone + WebSocket como output para UI (consumindo do broker).

---

## 6. Reuso no ai-devkit (AVALIAÇÃO)

### 6.1 Situação Atual do Event Bus

**Status:** Parcial — implementado como pacote `@ai-devkit/event-bus`

**O que existe:**
- `EventBus` — pub/sub in-memory with 16 event types, history até 1000 eventos, wildcard `*`, unsubscribe, handler error isolation
- `WSBroadcast` — WebSocket server que conecta EventBus a clientes remotos com filtro por tipo de evento
- Tipos: `BusEvent`, `EventType`, `EventHandler`, `Subscription` em `types.ts`
- Event types do contracts: `WsEventType` + extensões internas (`policy.evaluated`, `cycle.completed`, etc.)
- Audit trail integrado (opcional) — cada evento logado no `@ai-devkit/audit-trail`

**O que não existe:**
- Persistência durável (apenas in-memory, sem recovery)
- Replay de eventos
- DLQ (dead letter queue)
- Retry policy
- Consumer groups
- Entrega garantida (at-least-once / exactly-once)
- Schema Registry para evolução de eventos
- Stream processing (filtros, transformações, agregações)
- Integração com message broker externo
- Ordering garantido
- Backpressure
- Suporte a transações (outbox pattern)
- Encaminhamento de eventos entre instâncias (WS é single-node)

### 6.2 Pacotes que DEVERIAM usar o Event Bus (mas não usam)

| Pacote | Deveria | Status | Observação |
|--------|---------|--------|------------|
| `feedback-pipeline` | Consumir eventos | **Não usa** | Sem dependência do event-bus no package.json |
| `delivery-orchestrator` | Emitir/consumir eventos de deploy | **Não usa** | Sem dependência |
| `workflow-engine` | Emitir/consumir eventos de ciclo | **Não usa** | Sem dependência |
| `memory-store` | Consumir eventos para persistência | **Não usa** | Só depende de contracts |
| `trace-registry` | Consumir todos eventos | **Não usa** | Verificar |
| `policy-engine` | Auditar eventos | **Não usa** | Verificar |
| `ide-integration` | Conectar tudo | **Esqueleto** | Só descrição no package.json |

### 6.3 Avaliação de Cada Tecnologia/Padrão

#### Event Sourcing

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim, do zero |
| Complexidade de integração | **Alta** |
| Dependências | Event bus persistente + Schema Registry |
| Nota | Superpoderoso, mas caro. Recomendado APENAS para ledgers de decisão e traces de auditoria, não para fluxo inteiro |

#### CQRS

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim, do zero |
| Complexidade de integração | **Média** |
| Dependências | Event bus para projeções + read stores |
| Nota | Útil para dashboards de ciclo (leituras 10x mais frequentes que escritas). Fazer apenas para casos específicos (histórico de decisões, timeline de deploys) |

#### Saga Pattern

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim |
| Complexidade de integração | **Média** (coreografia) / **Alta** (orquestração) |
| Dependências | Event bus + compensation handlers |
| Nota | Fluxo "ideia→entrega" é uma saga natural. Recomendado coreografia simples com 4-5 steps (plan→develop→test→review→deploy) |

#### RabbitMQ

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim, integração |
| Complexidade de integração | **Média** |
| Dependências | Erlang runtime + RabbitMQ server |
| Nota | Maduro, mas pesado para o perfil. AMQP overhead. Perde para NATS e Redpanda em todos os cenários. Sem replay |

#### Apache Kafka

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim, integração e possível cluster |
| Complexidade de integração | **Alta** |
| Dependências | JVM + KRaft/ZooKeeper + client library |
| Nota | Superdimensionado para o ai-devkit. O ecossistema Kafka Connect/Streams é valioso, mas o custo operacional (JVM, tuning, cluster mínimo 3 nós) é desproporcional |

#### Redpanda

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim, integração |
| Complexidade de integração | **Média** |
| Dependências | Single binary + client Kafka |
| Nota | 2x performance do Kafka com 40% menos RAM e sem ZooKeeper. Compatível com ecossistema Kafka. Melhor custo-benefício entre os brokers de streaming. Recomendado se precisar de Kafka API |

#### Apache Pulsar

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim |
| Complexidade de integração | **Alta** |
| Dependências | Broker + Bookie + ZK (3 processos) |
| Nota | Complexidade desproporcional. Apenas se multi-tenancy for requisito essencial |

#### NATS + JetStream

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim, integração |
| Complexidade de integração | **Baixa** |
| Dependências | Single binary Go 15 MB, npm package `nats.js` |
| Nota | **Melhor custo-benefício para o perfil.** 6 MiB RAM, sub-ms latência, JetStream para persistência, request-reply nativo. Cluster simples |

#### ZeroMQ

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim |
| Complexidade de integração | **Alta** (você é o broker) |
| Dependências | libzmq + bindings |
| Nota | Inadequado. Sem persistência, sem replay, sem garantia de entrega. Usar apenas para IPC de altíssimo throughput entre módulos no mesmo processo |

#### Redis Streams

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim |
| Complexidade de integração | **Baixa** |
| Dependências | Redis server + ioredis |
| Nota | Já usado em projetos similares (AgentX). Excelente para o perfil se já usa Redis. Limitado por RAM. Nativo no Node.js |

#### Schema Registry

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Parcial** |
| Status | Esqueleto |
| Precisa criar? | Adaptar |
| Complexidade de integração | **Média** |
| Dependências | Event bus + serialização |
| Nota | Existente em `packages/schema-registry/`. Precisa ser integrado ao event bus |

#### Dead Letter Queue

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim |
| Complexidade de integração | **Média** |
| Dependências | Event bus persistente + correction flow |
| Nota | Essencial para resiliência. Prioridade alta |

#### Outbox Pattern

| Critério | Avaliação |
|----------|-----------|
| Já existe? | **Não** |
| Status | Não existe |
| Precisa criar? | Sim |
| Complexidade de integração | **Média** |
| Dependências | Event bus + banco de dados |
| Nota | Essencial para garantir que estado + evento sejam consistentes. Prioridade alta |

---

## 7. Conclusão e Recomendações

### 7.1 Qual Tecnologia se Encaixa Melhor?

**Recomendação primária: NATS + JetStream**

**Justificativa:**
- **Perfil do ai-devkit:** sistema Node.js/TypeScript modular, multi-agente, cloud-native
- **Latência:** sub-ms para pub/sub e request-reply (46-105x mais rápido que RabbitMQ/Kafka em RP)
- **Recursos:** 6 MiB RAM, single binary 15 MB — ideal para dev/mobile e CI/CD
- **JetStream:** persistência, replay, exactly-once, consumer groups — cobre requisitos de um event broker maduro
- **Request-reply nativo:** essencial para agentes que precisam de respostas síncronas (orquestrador→agente)
- **KV Store + Object Store nativos:** substitutos leves para Redis em configurações e artefatos
- **Cluster simples:** 3 nós com Raft, leaf nodes para edge
- **SDK Node.js:** `nats.js` — maduro, 1ª classe

**Recomendação secundária (para streaming pesado): Redpanda**

- Se o projeto crescer a ponto de precisar de Kafka API (Confluent Schema Registry, Kafka Connect, ksqlDB)
- Se throughput > 1M msg/s sustentados
- Compatibilidade total com Kafka permite migração gradual

**Recomendação complementar (para IPC no mesmo processo): EventBus atual + ZeroMQ**

- EventBus in-memory atual mantido para comunicação intra-processo
- ZeroMQ para canais de altíssimo throughput entre módulos específicos (ex: AST indexer → RAG)

### 7.2 Roadmap de Implementação

#### Fase 1 — Fundação (Semanas 1-3)
- [ ] **NATS JetStream integration** — novo adaptador `event-bus-nats` ou atualizar `event-bus`
- [ ] **Migrar EventBus in-memory para usar NATS como backend** (manter interface compatível)
- [ ] **Terminar `schema-registry`** — registrar/validar schemas de eventos
- [ ] **Adicionar `event-bus` como dependência** nos 6 pacotes que precisam consumir eventos
- [ ] **Conectar `feedback-pipeline`** aos eventos de ciclo/deploy
- [ ] **Retirar maxHistory=1000** — substituir por consumer groups no NATS

#### Fase 2 — Fluxo Core (Semanas 4-6)
- [ ] **Eventos de ciclo:** `requirements-engine` → `workflow-engine` → `delivery-orchestrator` via NATS
- [ ] **CQRS para dashboards:** projeção de eventos para `memory-store` + Decision History
- [ ] **DLQ + Retry:** política de retry com backoff exponencial (1s, 2s, 4s, 8s, 16s, DLQ)
- [ ] **Correction flow:** agente supervisor consome DLQ e decide ação corretiva
- [ ] **Outbox Pattern:** `delivery-orchestrator` usa transactional outbox ao atualizar estado de deploy

#### Fase 3 — Saga e Replay (Semanas 7-9)
- [ ] **Saga coreografada:** plan→develop→test→review→deploy como saga de 5 steps
- [ ] **Compensation handlers:** rollback de deploy, reversão de merge, notificação de falha
- [ ] **Replay de eventos:** API para reconstruir estado de qualquer ciclo anterior
- [ ] **Time-travel debugging:** interface para navegar pelo histórico de eventos
- [ ] **Analytics pipeline:** eventos de ciclo alimentam dashboards de performance

#### Fase 4 — Escala e Resiliência (Semanas 10-12)
- [ ] **Cluster NATS:** 3 nós para HA
- [ ] **Leaf nodes:** agentes remotos conectam via leaf node (sem latência WAN)
- [ ] **Backpressure automático:** consumer groups com `max_ack_pending`
- [ ] **Encaminhamento multi-instância:** WebSocket broadcast passa a consumir do NATS
- [ ] **Event sourcing (seletivo):** ledgers de decisão e trace de auditoria como event streams

### 7.3 Trade-offs Principais

| Decisão | Opção A | Opção B | Vencedor |
|---------|---------|---------|----------|
| Broker | NATS JS | Kafka/Redpanda | **NATS** (perfil do projeto, 6MiB RAM, sub-ms) |
| Persistência | JetStream (opt-in) | Broker de log | **JetStream** (seletivo) |
| Request-Reply | NATS nativo | 4 operações via Kafka | **NATS** (105x mais rápido) |
| Cluster | 3 nós NATS | 3+ nós Kafka | **NATS** (mais simples) |
| CQRS | Sim (seletivo) | Não | **CQRS** (mas só para dashboards) |
| Event Sourcing | Sim (ledgers apenas) | Não | **Event Sourcing** (apenas para auditoria) |
| Single-node | NATS roda em 6MiB | Kafka 327MiB+ | **NATS** |
| Multi-idioma | NATS tem 48+ clients | Kafka 18+ clients | Ambos ok |
| Ecossistema | Pequeno | Kafka enorme | Kafka vence, mas NATS cobre 90% |

### 7.4 Score Final (Metodologia de 5 Dimensões)

| Dimensão | Peso | Nota | Ponderado |
|----------|------|------|-----------|
| Valor para o fluxo ideia→entrega | 3× | 5 | 15 |
| Diferenciação vs concorrentes | 2× | 4 | 8 |
| Sinergia com módulos existentes | 2× | 5 | 10 |
| Custo-benefício | 2× | 5 | 10 |
| Maturidade da tecnologia | 1× | 4 | 4 |
| **Total** | | | **47/50 → Score 4.7** |

> **Score ≥ 3.5 → Gera TASK obrigatória:** TASK-IDE-14 (Integração NATS JetStream) + TASK-IDE-15 (Saga Coreografada) + TASK-IDE-16 (DLQ + Retry + Outbox)

---

## Referências

1. Event-Driven Architecture Practical Guide (2026) — CQRS, ES, Saga patterns
2. Benchmark independente: Kafka vs RabbitMQ vs Redpanda (100K msg, 2026)
3. NATS JetStream Performance Report — Synadia (2025–2026)
4. Apache Pulsar vs Kafka vs Redpanda — Simor Consulting (2026)
5. Event-Driven Architecture for AI Agents — Zylos Research (2026)
6. HookBus: Governance-Aware Event Bus for AI Agents (2026)
7. AgentX Architecture — Redis Streams como backbone (2026)
8. NATS vs ZeroMQ vs Kafka — Architectural Roles (2025)
9. Message Broker Throughput: RabbitMQ vs Kafka vs NATS (2026)
10. arXiv:2510.04404 — Next-Gen Event-Driven Architectures (2025)
