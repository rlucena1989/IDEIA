# ADR-015: Memory & Context Architecture

**Status:** Approved  
**Date:** 2026-07-18  
**Deciders:** Architecture Team  

## Context
IDEIA needs persistent, context-aware memory that spans sessions, captures decisions, enables semantic search, and feeds pattern detection for adaptive learning. Multiple storage technologies exist (SQLite, DuckDB, PostgreSQL+pgvector, Neo4j) and must work together.

## Decision
- **Primary:** SQLite + FTS5 for structured memory, decisions, audit
- **Analytics:** DuckDB for OLAP queries on historical data  
- **Vector:** PostgreSQL+pgvector for production, sqlite-vec for local dev
- **Knowledge Graph:** Neo4j for entity relationships (future, optional)
- **Cache:** Redis for session context, LLM response cache (future)
- **Isolation:** Self-space and project-space have separate storage paths
- **Integration:** MemoryStore connects via EventBus to all consumers

## Consequences
- Positive: Rich memory across all IDEIA components
- Positive: Graceful degradation (SQLite fallback)
- Negative: Multiple storage engines increase maintenance
- Risk: Data consistency across stores requires careful sync
