# ADR-012: Integration Topology & Contract Architecture

**Status:** Approved
**Date:** 2026-07-18
**Deciders:** Architecture Team

## Context
With 66 packages, 18 contracts, 16 event types, and 130+ CLI commands, a comprehensive integration topology is needed to map all connections, identify gaps, and guide future integrations.

## Decision
- Maintain C1-C18 contracts with resilience patterns per contract
- All contracts must have: schema, timeout, circuit breaker, retry, fallback
- Three new contract categories: Self↔Project isolation (C19), Self-Chat (C23), Technology Radar (C22)
- Integrations follow 9 standard patterns (cache, streaming, event sourcing, etc.)
- Topology documented in T1 study

## Consequences
- Positive: Clear map of all integrations
- Positive: Resilience patterns standardized
- Negative: C16-C18 (Schema Registry, Contract Testing, SLO Monitoring) still unimplemented
