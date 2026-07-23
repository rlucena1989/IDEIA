# ADR 0002: NATS JetStream como Barramento de Eventos

**Status:** Proposed  
**Date:** 2026-07-20  
**Deciders:** Equipe IDEIA

## Context

Necessidade de barramento de eventos persistente, distribuído e com replay para comunicação entre agentes e serviços.

## Decision

Usar NATS JetStream como espinha dorsal de mensageria (Pub/Sub, Req/Rep, KV, DLQ).

## Consequences

- **Positivo:** Persistência, replay, alta disponibilidade, baixa latência
- **Negativo:** Dependência externa (NATS server), complexity operacional
- **Mitigação:** Fallback in-memory até Fase 1; configuração via docker-compose
