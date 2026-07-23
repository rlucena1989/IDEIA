# Estudo de Implementação — PostgreSQL + pgvector (G3/G10)

> **Tipo:** `implementation-study`
> **Status:** `planned`
> **Data:** 2026-07-21
> **Fase:** F4 — ~31h, 14 tarefas
> **Gaps:** G3 (MemoryStore JSON → PostgreSQL), G10 (Busca vetorial → pgvector), G18 (Cache → Redis/NATS KV)

---

## 1. Estado Atual

- `packages/memory-store/` — JSON file-based (`memory.json`), sem índice, sem concorrência real
- `packages/vector-store/` — stub, sem implementação pgvector
- `packages/data-layer/` — SQLite via better-sqlite3 (5 testes falham)
- `packages/contracts/` — schemas Zod para validação
- Busca O(n) em array — sem índices, sem busca semântica

## 2. Arquitetura Alvo

```
┌──────────────────────────────────────────────────┐
│                  DataLayer                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │PostgreSQL│  │ pgvector │  │ Redis (cache)  │ │
│  │  (CRUD)  │  │ (embedd) │  │ (NATS KV fall)│ │
│  └────┬─────┘  └────┬─────┘  └───────┬────────┘ │
│       │              │               │          │
│       └──────────────┴───────────────┘          │
└──────────────────────────────────────────────────┘
```

## 3. Plano de Implementação

### Etapa 1: Schema e Migrações (6h)
- Definir tabelas: `sessions`, `decisions`, `memories`, `audit_events`
- Migrations com `node-pg-migrate` ou raw SQL
- Índices: B-tree + GIN para JSONB + IVFFlat para pgvector

### Etapa 2: DataLayer PostgreSQL (6h)
- Implementar `PostgresDataLayer` implementando `DataLayer` interface
- Pool de conexões com `pg-pool`
- Transações com rollback automático

### Etapa 3: pgvector + Embeddings (8h)
- Coluna `vector(1536)` em `memories` e `decisions`
- Função `search_similar(query_embedding, limit, threshold)`
- Integração com LLM provider para gerar embeddings
- Índice IVFFlat com `lists` configurável

### Etapa 4: Cache Layer (4h)
- Cache em Redis ou NATS KV (já implementado em `kv-store.ts`)
- Estratégia: cache-aside com TTL configurável
- Invalidação por evento

### Etapa 5: Migração MemoryStore (4h)
- Substituir `JSON.parse/fs.writeFileSync` por queries PostgreSQL
- Manter fallback para JSON file (desenvolvimento local)
- Backup automático

### Etapa 6: Testes e CI (3h)
- PostgreSQL + pgvector no CI (GitHub Actions service)
- Testes com `testcontainers` (PostgreSQL Docker)
- Benchmarks de query vs busca O(n)

## 4. Schema Principal

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  workspace_root TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE TABLE memories (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  category TEXT NOT NULL,
  source TEXT,
  summary TEXT NOT NULL,
  tags TEXT[],
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_memories_embedding ON memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memories_category ON memories(category);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
```

## 5. Configuração

```env
IDEIA_DATA_TYPE=postgres       # sqlite | postgres
DATABASE_URL=postgresql://user:pass@localhost:5432/ideia
IDEIA_VECTOR_DIMENSIONS=1536
IDEIA_CACHE_TYPE=redis         # redis | nats-kv | none
REDIS_URL=redis://localhost:6379
```

## 6. Dependências

- `pg` + `pg-pool` — PostgreSQL client
- `node-pg-migrate` — migrations
- `testcontainers` — testes
- Embeddings via `@ideia/llm-provider`

## 7. Critérios de Aceitação

- [ ] CRUD completo via PostgreSQL
- [ ] Busca semântica com pgvector (cosine similarity)
- [ ] Cache layer com TTL
- [ ] Fallback para SQLite/JSON em dev
- [ ] Migrações automáticas
- [ ] Testes com testcontainers
- [ ] Benchmarks: busca 100x+ mais rápida que O(n)
