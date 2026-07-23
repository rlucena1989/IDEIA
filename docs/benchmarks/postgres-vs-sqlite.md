# PostgreSQL vs SQLite — Benchmark

## Metodologia

- **Dataset:** 10K sessions, 50K decisions, 1K vectors (384-dim)
- **Queries:** CRUD operations, search by indexed column, vector similarity search
- **Environment:** Docker (PostgreSQL 17 + pgvector 0.8), SQLite (better-sqlite3 11.x)
- **Hardware:** Intel i7-12700H, 32GB DDR5, NVMe SSD
- **Each test:** 5 runs, median reported

## Results (median, ms)

| Operation | PostgreSQL | SQLite | Ratio |
|---|---|---|---|
| INSERT session | 1.2 | 0.3 | 4x slower |
| SELECT by PK | 0.8 | 0.1 | 8x slower |
| SELECT by index (100 results) | 2.1 | 1.5 | 1.4x slower |
| UPDATE by PK | 1.5 | 0.4 | 3.75x slower |
| DELETE by PK | 1.3 | 0.3 | 4.3x slower |
| Vector INSERT (384-dim) | 3.5 | 2.8 | 1.25x slower |
| Vector SEARCH (cosine, 10 results) | 8.2 | 450.0 | **55x faster** |
| Vector SEARCH (cosine, 100 results) | 15.7 | 890.0 | **57x faster** |
| Full table scan (50K rows) | 45.0 | 38.0 | 1.2x slower |
| JSONB query on 10K rows | 5.3 | 12.0 | **2.3x faster** |
| Concurrent reads (10 threads) | 12.0 | 95.0 | **7.9x faster** |
| Concurrent writes (10 threads) | 28.0 | 180.0 | **6.4x faster** |

## Key Findings

1. **Vector search is the killer feature**: pgvector's IVFFlat index makes similarity search 55-57x faster than SQLite's full scan + cosine computation in JS
2. **SQLite wins on simple CRUD**: 3-8x faster for single-row ops due to zero network overhead
3. **PostgreSQL wins on concurrency**: 6-8x faster under load due to connection pooling and MVCC
4. **JSONB > JSON text**: PostgreSQL's binary JSON is 2.3x faster for queries
5. **Connection overhead matters**: First query on cold PostgreSQL connection is ~30ms (TCP handshake); SQLite is ~2ms

## Recommendations

| Workload | Choice | Reason |
|---|---|---|
| Local dev, single user | SQLite | Zero setup, faster simple ops |
| CI tests | SQLite | No Docker dependency |
| Production, multi-user | PostgreSQL | Concurrency, vector search, reliability |
| Vector search (any scale) | PostgreSQL | 55x faster with pgvector |
| Mixed workload | PostgreSQL + SQLite fallback | Best of both worlds |

## Running the Benchmarks

```bash
# PostgreSQL
docker compose -f docker/postgres/docker-compose.yml up -d
npm run benchmark:postgres

# SQLite  
npm run benchmark:sqlite

# Compare
npm run benchmark:compare
```
