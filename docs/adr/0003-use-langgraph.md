# ADR 0003: LangGraph para Orquestração Multiagente

**Status:** Accepted  
**Date:** 2026-07-20  
**Deciders:** Equipe IDEIA

## Context

Agentes precisam ser orquestrados com state machine, paralelismo, checkpointing e ciclos de feedback.

## Decision

Usar LangGraph (LangChain) para o grafo de agentes, com nós, arestas condicionais e execução paralela.

## Consequences

- **Positivo:** State machine nativa, checkpointing, paralelismo, integração com LLM providers
- **Negativo:** Dependência do ecossistema LangChain
- **Mitigação:** Abstraction layer em `agent-runtime` para trocar de engine se necessário
