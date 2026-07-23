---
id: ADR-003
title: Mem0 + SQLite + DuckDB como Stack de Memória
status: Approved
date: 2026-07-17
deciders: Arquiteto, Tech Lead, Engenheiro de IA
consulted: Equipe de Dados
---

# ADR-003: Mem0 + SQLite + DuckDB como Stack de Memória

**Status:** Approved

## Contexto

O memory-store atual do ai-devkit é uma implementação in-memory baseada em JSON, sem persistência cross-session. Cada sessão do chat começa sem contexto de sessões anteriores, o que limita a capacidade de aprendizado contínuo e a qualidade das respostas dos agentes. Não há suporte a busca textual full-text, busca semântica por embeddings, ou análises agregadas sobre o histórico de interações.

O IDEIA requer uma stack de memória em três camadas: (1) memória operacional de curto prazo para contexto da sessão atual; (2) memória de longo prazo para fatos, decisões e padrões identificados cross-sessão; (3) analytics para métricas de desempenho dos agentes e identificação de tendências. A solução precisa ser leve para rodar localmente (desktop) e escalável para ambientes server-side.

Quatro opções foram consideradas: (1) SQLite + FTS5 como base, evoluindo para Mem0 e DuckDB; (2) PostgreSQL + pgvector como solução única; (3) Neo4j como knowledge graph central; (4) Redis + ChromaDB para cache + vetores.

## Decisão

Implementar a stack de memória em três fases. **Fase 1 (P0):** SQLite + extensão FTS5 para memória operacional e busca textual, com `better-sqlite3` como driver síncrono. **Fase 2 (P1):** Mem0 como camada de memória gerenciada para agentes (entidades, fatos, relacionamentos cross-sessão), com sqlite-vec para busca vetorial. **Fase 3 (P2):** DuckDB para analytics e queries OLAP sobre histórico de interações, métricas de agentes e telemetria. Neo4j/Knowledge Graph permanece como evolução futura se GraphRAG se justificar.

## Consequências

**Positivas:**
- SQLite oferece persistência zero-config, embarcada, sem servidor externo — ideal para desktop
- FTS5 permite busca textual full-text eficiente sem dependência externa
- sqlite-vec viabiliza busca semântica local sem ChromaDB
- Mem0 gerencia memória de agentes com entidades, fatos, atualização incremental
- DuckDB é 100x mais rápido que SQLite em queries analíticas (columnar, vetorizado)
- DuckDB pode ler diretamente arquivos SQLite via `sqlite_scanner`, integrando as camadas
- Toda a stack roda localmente, sem necessidade de serviços externos no desktop

**Negativas:**
- Múltiplos sistemas de storage aumentam complexidade operacional
- SQLite não é ideal para concorrência alta (WAL mitiga parcialmente, mas single-writer)
- Mem0 adiciona dependência Python (ou bridge HTTP), aumentando latência
- DuckDB não suporta escrita concorrente (single-writer, similar a SQLite)
- Necessidade de sincronização entre as três camadas (consistência eventual)
- sqlite-vec tem comunidade menor que ChromaDB ou pgvector

## Decision

Implement a 3-phase memory stack. Phase 1 (P0): SQLite + FTS5 extension for operational memory and full-text search via `better-sqlite3`. Phase 2 (P1): Mem0 as managed agent memory layer (entities, facts, cross-session relationships) with sqlite-vec for vector search. Phase 3 (P2): DuckDB for analytics and OLAP queries over interaction history, agent metrics, and telemetry. Neo4j/Knowledge Graph remains a future evolution if GraphRAG is justified.

## Consequences

**Positive:** SQLite provides zero-config, embedded persistence with no external server — ideal for desktop; FTS5 enables efficient full-text search without external dependencies; sqlite-vec enables local semantic search without ChromaDB; Mem0 manages agent memory with entities, facts, and incremental updates; DuckDB is 100x faster than SQLite for analytical queries (columnar, vectorized); DuckDB can read SQLite files directly via `sqlite_scanner`; entire stack runs locally with no external services needed on desktop.

**Negative:** Multiple storage systems increase operational complexity; SQLite is not ideal for high concurrency (WAL mitigates partially, but single-writer); Mem0 adds a Python dependency (or HTTP bridge), increasing latency; DuckDB does not support concurrent writes (single-writer, similar to SQLite); synchronization needed between the three layers (eventual consistency).

**Risk:** sqlite-vec has a smaller community than ChromaDB or pgvector, potentially affecting long-term maintenance; three-layer synchronization may lead to data inconsistency if not properly designed.

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| PostgreSQL + pgvector | Solução única para SQL + vetores | Overhead operacional alto (precisa servidor PostgreSQL); não é embarcável para desktop; custo de manutenção para ambiente local |
| Neo4j + GraphRAG | Knowledge graph como storage central | Overhead de schema e operacional; complexidade desnecessária para Fase 0/1; ideal apenas quando relações entre entidades são críticas (P2+) |
| Redis + ChromaDB | Cache + vector store | Redis não persiste por padrão (RDB/AOF têm limitações); ChromaDB adiciona complexidade Python; sem capacidade analítica nativa |

## Referências

- `docs/ESTUDOS/MEMORIA-E-CONTEXTO-PESQUISA.md` — Estudo completo de memória e contexto
- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Categoria D (Memória e Conhecimento), seções D1-D8
- `docs/ESTUDOS/IDEIA-MASTER.md` — Camada de Memória e Conhecimento no diagrama de arquitetura
- `docs/ESTUDOS/ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES.md` — Camada 5 (Memória e Conhecimento), contratos
- SQLite FTS5: https://www.sqlite.org/fts5.html
- Mem0: https://mem0.ai/
- DuckDB: https://duckdb.org/
