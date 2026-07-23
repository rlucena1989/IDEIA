---
id: ADR-002
title: NATS JetStream como Barramento de Eventos
status: Approved
date: 2026-07-17
deciders: Arquiteto, Tech Lead
consulted: Equipe de Infraestrutura
---

# ADR-002: NATS JetStream como Barramento de Eventos

**Status:** Approved

## Contexto

O event-bus atual do ai-devkit é uma implementação in-memory com WebSocket para comunicação em tempo real. Embora funcional para uma instância single-process, essa abordagem não atende aos requisitos de resiliência, persistência e escalabilidade do IDEIA: não há replay de eventos, não há garantia de entrega (at-least-once ou exactly-once), não há suporte a consumer groups para balanceamento de carga entre múltiplas instâncias de agentes, e não há dead letter queue para tratamento de falhas.

O IDEIA exige um barramento de eventos que sirva como espinha dorsal da comunicação entre todas as camadas — agentes, política, memória, execução, auditoria. Todos os eventos críticos (agent.task.completed, policy.evaluated, memory.updated, file.changed) precisam cruzar esse barramento com garantias de entrega, ordenação e persistência. Além disso, o barramento deve ser leve o suficiente para rodar em ambiente local (desktop) e escalável para deploy em nuvem.

Quatro opções foram consideradas: (1) NATS + JetStream, (2) Apache Kafka/Redpanda, (3) RabbitMQ, (4) Redis Streams.

## Decisão

Adotar NATS JetStream como barramento de eventos do IDEIA. Utilizar Pub/Sub para broadcasting de eventos, Request/Reply para comunicação síncrona entre agentes, KV Store para configuração e estado compartilhado, Queue Groups para balanceamento de carga entre consumidores, e DLQ para eventos com falha de processamento. NATS será executado como processo sidecar no desktop e como cluster gerenciado em produção.

## Consequências

**Positivas:**
- Binário leve (~15MB) e consumo de RAM mínimo (~6MB), viável para ambiente local
- Persistência nativa com JetStream (at-least-once e exactly-once via dedup)
- Suporte a replay de eventos e consumer groups
- Native request-reply (elimina necessidade de implementar padrão próprio)
- KV Store integrada (config, leader election, state sharing)
- Object Store para artefatos grandes (diffs, snapshots)
- Cliente Node.js first-class (`nats.js`) com tipos TypeScript
- Suporte a super-cluster e leaf nodes para edge computing

**Negativas:**
- Novo componente operacional (NATS server precisa ser gerenciado)
- Complexidade adicional de configuração (streams, consumers, políticas de retenção)
- Overhead de embedar NATS no desktop (versus event-bus in-memory atual)
- Sem suporte nativo a schemas (Schema Registry precisa ser implementado externamente)
- Latência adicional (~1-5ms) comparado a chamadas in-memory

## Decision

Adopt NATS JetStream as the IDEIA event bus backbone. Use Pub/Sub for event broadcasting, Request/Reply for synchronous agent communication, KV Store for shared configuration/state, Queue Groups for consumer load balancing, and DLQ for failed event handling. NATS runs as a sidecar process on desktop and as a managed cluster in production.

## Consequences

**Positive:** Lightweight binary (~15MB) with minimal RAM (~6MB), viable for local desktop; native JetStream persistence with at-least-once and exactly-once via dedup; event replay and consumer group support; native request-reply pattern eliminates custom implementation; integrated KV Store for config, leader election, and state sharing; Object Store for large artifacts; first-class Node.js client (`nats.js`) with TypeScript types; super-cluster and leaf node support for edge computing.

**Negative:** New operational component requiring NATS server management; added configuration complexity (streams, consumers, retention policies); overhead versus current in-memory event bus; no native schema registry (must be implemented externally).

**Risk:** ~1-5ms latency penalty versus in-memory calls may affect latency-sensitive agent operations; NATS server becomes a single point of failure if not clustered properly in production.

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| Apache Kafka / Redpanda | Streaming distribuído com log imutável | Overhead operacional alto (precisa ZooKeeper/KRaft, ~1GB RAM mínimo); excessivo para ambiente local desktop; latência maior que NATS |
| RabbitMQ | Message broker com roteamento flexível (AMQP) | Mais pesado que NATS (~40MB); sem suporte nativo a request-reply; persistência menos performática que JetStream; não escala tão bem quanto NATS em cenário de muitos tópicos |
| Redis Streams | Log append-only com consumer groups | Sem garantias de persistência fortes (RDB/AOF têm janelas de perda); sem DLQ nativa; sem suporte a exactly-once; operação mais complexa para HA |

## Referências

- `docs/ESTUDOS/BARRAMENTO-EVENTOS-MENSAGERIA-DISTRIBUIDA.md` — Estudo completo de barramento de eventos
- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Categoria E (Mensageria e Eventos), seção E1 (NATS + JetStream)
- `docs/ESTUDOS/IDEIA-MASTER.md` — Diagrama de arquitetura com NATS como camada de mensageria
- `docs/ESTUDOS/ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES.md` — Camada 3 (Mensageria), contratos entre camadas
- NATS Docs: https://docs.nats.io/
- NATS JetStream: https://docs.nats.io/nats-concepts/jetstream
