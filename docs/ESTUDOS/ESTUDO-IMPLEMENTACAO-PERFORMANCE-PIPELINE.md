# ESTUDO-IMP-PERF — Pipeline de Performance: 40→80/100

> **Data:** 2026-07-25
> **Versão:** 1.0
> **Nível de Profundidade:** 6 (Engenharia)
> **Área:** Performance, Infraestrutura
> **Dependências:** S54 (Performance Optimization), S13 (Performance e Escalabilidade)
> **Conexões:** ESTUDO-IMP-QUALIDADE, S69 (Edge Computing), S67 (FinOps)
> **Propósito:** Pipeline completo de performance — benchmark automatizado, cache, bundle optimization, TTFT reduction, connection pooling, performance budgets no CI.

---

## 1. FUNDAMENTOS

### 1.1 Problema e Contexto

Performance score atual: **40/100** (segundo QUALITY-IMPROVEMENT-PLAN.md)

| Métrica | Atual | Alvo | Gap |
|---------|-------|------|-----|
| TTFT (Time to First Token) P50 | ~2s | <500ms | 4x mais lento |
| TTFT P99 | ~8s | <2s | 4x mais lento |
| Bundle size | ~5MB | <2MB | 2.5x maior |
| Query time PostgreSQL | ~200ms | <50ms | 4x mais lento |
| Cache hit ratio | ~20% | ≥80% | 4x menos |
| Throughput (TPS) | ~200 | ≥1000 | 5x menos |
| Theia init time | ~8s | <3s | 2.7x mais lento |
| Connection pool hit ratio | ~60% | ≥90% | 1.5x menos |

### 1.2 Glossário

| Termo | Definição |
|-------|-----------|
| TTFT | Time to First Token — latência até primeira resposta do LLM |
| TPS | Transações por segundo |
| P50/P95/P99 | Percentis de latência |
| HNSW | Hierarchical Navigable Small World — index algorithm for vector search |
| Connection Pool | Conjunto de conexões reutilizáveis (PostgreSQL, NATS) |
| Bundle | Arquivo JS/Bundle gerado pelo bundler (esbuild/webpack) |
| Cache Hit Ratio | % de requisições servidas por cache (não pelo backend) |
| Lazy Loading | Carregamento sob demanda de módulos não críticos |
| Tree Shaking | Eliminação de código morto no bundle |

### 1.3 Pipeline de Performance

```
┌─────────────────────────────────────────────────────────────┐
│              PERFORMANCE PIPELINE (CI + Runtime)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PR                                                        │
│  ├─ Benchmark diff (comparado com main)                     │
│  ├─ Bundle size check                                       │
│  └─ Budget enforcement (fail if exceeded)                   │
│                                                              │
│  Release                                                    │
│  ├─ k6 load test (100 vus / 30s)                            │
│  ├─ TTFT measurement (all providers)                        │
│  ├─ PostgreSQL query profiling                              │
│  └─ Lighthouse scores (web)                                 │
│                                                              │
│  Runtime (monitoring contínuo)                              │
│  ├─ Cache hit ratio dashboard                               │
│  ├─ Connection pool metrics                                 │
│  ├─ Slow query logger                                       │
│  └─ Real-user monitoring (TTFT real)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. TÉCNICO

### 2.1 Benchmark Suite

```typescript
// packages/performance-monitor/src/benchmark-suite.ts
interface BenchmarkResult {
  name: string;
  duration: number; // ms
  opsPerSecond: number;
  memoryDelta: number; // MB
  percentiles: { p50: number; p95: number; p99: number };
}

class BenchmarkSuite {
  private benchmarks: Benchmark[] = [];

  register(name: string, fn: () => Promise<void>, iterations: number = 100): void {
    this.benchmarks.push({ name, fn, iterations });
  }

  async runAll(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    
    for (const bench of this.benchmarks) {
      // Warmup
      await bench.fn();
      
      // Measurement
      const times: number[] = [];
      const memBefore = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < bench.iterations; i++) {
        const start = performance.now();
        await bench.fn();
        times.push(performance.now() - start);
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      times.sort((a, b) => a - b);
      
      results.push({
        name: bench.name,
        duration: times.reduce((a, b) => a + b, 0),
        opsPerSecond: Math.floor(1000 / (times.reduce((a, b) => a + b, 0) / times.length)),
        memoryDelta: (memAfter - memBefore) / 1024 / 1024,
        percentiles: {
          p50: times[Math.floor(times.length * 0.5)],
          p95: times[Math.floor(times.length * 0.95)],
          p99: times[Math.floor(times.length * 0.99)],
        },
      });
    }
    
    return results;
  }
}

// Benchmarks registrados
const suite = new BenchmarkSuite();
suite.register('event-bus-publish', () => eventBus.publish('test', { data: 'x'.repeat(1024) }), 1000);
suite.register('memory-store-search', () => memoryStore.search('test query'), 100);
suite.register('llm-inference-cached', () => cachedLLM.complete('Hello'), 50);
suite.register('pg-query-simple', () => pg.query('SELECT 1'), 100);
suite.register('bundle-load', () => import('@ideia/ideia-plugin'), 10);
```

### 2.2 Cache Layer Multi-Nível

```typescript
// packages/cache/src/multi-level-cache.ts
class MultiLevelCache {
  constructor(
    private l1: MemoryCache,  // Em memória (rápido, volátil)
    private l2: NatsKVCache,  // NATS KV (médio, distribuído)
    private l3: PostgresCache, // PostgreSQL (lento, persistente)
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // L1: memória (sub-milissegundo)
    const l1Result = this.l1.get<T>(key);
    if (l1Result) {
      this.l1.hit();
      return l1Result;
    }
    
    // L2: NATS KV (milissegundos)
    const l2Result = await this.l2.get<T>(key);
    if (l2Result) {
      this.l2.hit();
      this.l1.set(key, l2Result); // Promover para L1
      return l2Result;
    }
    
    // L3: PostgreSQL (dezenas de ms)
    const l3Result = await this.l3.get<T>(key);
    if (l3Result) {
      this.l3.hit();
      this.l2.set(key, l3Result); // Promover para L2
      this.l1.set(key, l3Result); // Promover para L1
    }
    
    return l3Result;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await Promise.all([
      this.l1.set(key, value, ttl),
      this.l2.set(key, value, ttl),
      this.l3.set(key, value, ttl),
    ]);
  }

  getHitRatio(): { l1: number; l2: number; l3: number; overall: number } {
    return {
      l1: this.l1.hitRatio(),
      l2: this.l2.hitRatio(),
      l3: this.l3.hitRatio(),
      overall: (this.l1.hits + this.l2.hits + this.l3.hits) /
               (this.l1.total + this.l2.total + this.l3.total),
    };
  }
}
```

### 2.3 Connection Pool Otimizado

```typescript
// packages/data-layer/src/connection-pool.ts
class AdaptiveConnectionPool {
  private pool: pg.Pool;
  private min: number = 5;
  private max: number = 50;
  private currentLoad: number = 0;
  
  constructor(private config: PoolConfig) {
    this.pool = new pg.Pool({
      min: this.min,
      max: this.max,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      maxUses: 7500, // Reciclar conexões a cada 7500 usos (evita vazamento)
    });
  }

  async query(text: string, params?: any[]): Promise<pg.QueryResult> {
    const start = performance.now();
    this.currentLoad++;
    
    try {
      const result = await this.pool.query(text, params);
      return result;
    } finally {
      this.currentLoad--;
      const duration = performance.now() - start;
      
      // Auto-scale: se fila cresce, aumentar pool
      if (duration > 100 && this.pool.totalCount < this.max) {
        this.pool.options.max = Math.min(this.max, this.pool.totalCount + 5);
      }
      
      // Cooldown: se ocioso, reduzir pool
      if (duration < 10 && this.pool.totalCount > this.min) {
        this.pool.options.max = Math.max(this.min, this.pool.totalCount - 2);
      }
    }
  }

  getMetrics(): PoolMetrics {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      currentLoad: this.currentLoad,
      hitRatio: this.pool.totalCount > 0 
        ? (this.pool.totalCount - this.pool.waitingCount) / this.pool.totalCount 
        : 1,
    };
  }
}
```

---

## 3. ENGENHARIA

### 3.1 Plano de Ação Detalhado

**TTFT Reduction (impacto: alto)**

| # | Ação | Esforço | Ganho Esperado | Técnica |
|---|------|---------|----------------|---------|
| T1 | Cache de respostas de LLM (NATS KV + Redis) | 16h | -60% TTFT (2s → 800ms) | Cache key = prompt_hash + model |
| T2 | Streaming prioritário (primeiro token mais rápido) | 8h | -40% TTFT (800ms → 480ms) | Prompt prefix caching |
| T3 | Model routing inteligente (simples → rápido, complexo → poderoso) | 8h | -30% TTFT médio | Complexity router |
| T4 | Connection keep-alive + HTTP/2 multiplexing | 4h | -20% TTFT | Reutilizar conexões TCP |
| T5 | Prompt compression (remover whitespace, encurtar contexto) | 4h | -10% TTFT | prompt-economy integration |
| T6 | Fallback para modelo local (Ollama) para tarefas simples | 8h | -70% TTFT para 40% das tasks | Local AI inference |

**Bundle Optimization (impacto: médio)**

| # | Ação | Esforço | Ganho Esperado | Técnica |
|---|------|---------|----------------|---------|
| B1 | Bundle analyzer + tree shaking | 8h | -30% (5MB → 3.5MB) | esbuild + manual tree shaking |
| B2 | Code splitting por widget Theia | 4h | -20% (3.5MB → 2.8MB) | Dynamic imports |
| B3 | Lazy loading de widgets não críticos | 4h | -15% (2.8MB → 2.4MB) | React.lazy + Suspense |
| B4 | Remover dependências não utilizadas | 4h | -10% (2.4MB → 2.1MB) | depcheck + manual review |
| B5 | Compressão Brotli no servidor | 2h | -40% transferidos | nginx brotli module |

**Query Optimization (impacto: médio)**

| # | Ação | Esforço | Ganho Esperado | Técnica |
|---|------|---------|----------------|---------|
| Q1 | Adicionar índices faltantes (EXPLAIN ANALYZE em queries lentas) | 8h | -70% (200ms → 60ms) | Análise de query plan |
| Q2 | HNSW index tuning para vector search | 4h | -50% (100ms → 50ms) | efConstruction + M parameters |
| Q3 | Query result cache (resultados frequentes) | 4h | -80% para queries repetidas | Redis + TTL |
| Q4 | Paginação com keyset (cursor-based) | 4h | -50% em queries paginadas | WHERE + LIMIT ao invés de OFFSET |
| Q5 | Materialized views para relatórios frequentes | 4h | -90% em queries de relatório | pg materialized views |

**Throughput (impacto: alto)**

| # | Ação | Esforço | Ganho Esperado | Técnica |
|---|------|---------|----------------|---------|
| H1 | Connection pooling (NATS + PostgreSQL) | 4h | +200% TPS | Pool adaptativo |
| H2 | Batch processing de eventos | 8h | +300% em eventos | Agregação + flush periódico |
| H3 | Assíncrono não-bloqueante em todas as operações I/O | 8h | +100% geral | Revisão de await síncronos |
| H4 | Rate limiting por tenant para evitar abuso | 4h | Proteção contra degradação | Token bucket |

### 3.2 Performance Budget

```json
{
  "version": "1.0",
  "budgets": [
    {
      "name": "TTFT P50",
      "threshold": 500,
      "unit": "ms",
      "source": "benchmark",
      "action": "warning"
    },
    {
      "name": "TTFT P99",
      "threshold": 2000,
      "unit": "ms",
      "source": "benchmark",
      "action": "error"
    },
    {
      "name": "Bundle size (total)",
      "threshold": 2.5,
      "unit": "MB",
      "source": "bundle-analyzer",
      "action": "error"
    },
    {
      "name": "PostgreSQL query P50",
      "threshold": 50,
      "unit": "ms",
      "source": "pg-profile",
      "action": "warning"
    },
    {
      "name": "PostgreSQL query P99",
      "threshold": 200,
      "unit": "ms",
      "source": "pg-profile",
      "action": "error"
    },
    {
      "name": "Cache hit ratio",
      "threshold": 80,
      "unit": "%",
      "source": "cache-metrics",
      "action": "warning"
    },
    {
      "name": "Throughput (TPS)",
      "threshold": 500,
      "unit": "req/s",
      "source": "k6",
      "action": "warning"
    },
    {
      "name": "Memory leak check",
      "threshold": 10,
      "unit": "MB/gc-cycle",
      "source": "mem-profile",
      "action": "error"
    },
    {
      "name": "Theia init time",
      "threshold": 3000,
      "unit": "ms",
      "source": "lighthouse",
      "action": "error"
    }
  ]
}
```

### 3.3 Pipeline CI/CD

```yaml
# .github/workflows/performance.yml
name: Performance Pipeline
on:
  pull_request:
    paths:
      - 'packages/**/*.ts'
      - 'packages/**/*.tsx'

jobs:
  benchmark-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2 # Precisa do commit anterior para diff
      - run: npm ci
      
      # Rodar benchmarks no código atual
      - run: npx tsx packages/performance-monitor/src/benchmark-suite.ts --json current.json
      
      # Rodar benchmarks no main (cached)
      - uses: actions/cache@v4
        id: cache-baseline
        with:
          path: baseline.json
          key: perf-baseline-${{ github.base_ref }}
      
      - name: Compare benchmarks
        run: |
          npx tsx scripts/compare-benchmarks.ts \
            --baseline baseline.json \
            --current current.json \
            --budget performance-budget.json \
            --fail-on-violation

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx tsx packages/performance-monitor/src/bundle-analyzer.ts --json bundle.json
      - name: Check bundle budget
        run: |
          npx tsx scripts/check-bundle-budget.ts \
            --bundle bundle.json \
            --budget performance-budget.json

  k6-load-test:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: docker compose up -d nats postgres
      - name: Run k6
        run: npx k6 run tests/performance/k6-script.js --out json=k6-results.json
      - name: Check k6 results
        run: npx tsx scripts/check-k6-results.ts --results k6-results.json
```

---

## 4. INOVAÇÃO

### 4.1 Adaptive Performance Optimizer

```typescript
class AdaptivePerformanceOptimizer {
  private history: PerformanceSnapshot[] = [];
  
  async optimize(): Promise<OptimizationSuggestion[]> {
    const current = await this.captureSnapshot();
    this.history.push(current);
    
    const suggestions: OptimizationSuggestion[] = [];
    
    // 1. Detectar degradação
    if (this.history.length >= 5) {
      const trend = this.analyzeTrend('ttft', this.history);
      if (trend.slope > 0.1) { // TTFT aumentando
        suggestions.push({
          type: 'ttft',
          severity: 'warning',
          message: `TTFT aumentando ${trend.slope.toFixed(1)}ms/dia`,
          recommendedAction: 'Verificar cache hit ratio e latência dos providers',
          autoFixCommand: 'ideia optimize cache --warmup',
        });
      }
    }
    
    // 2. Sugerir otimizações baseadas em padrões
    if (current.cacheHitRatio < 0.6) {
      suggestions.push({
        type: 'cache',
        severity: 'warning',
        message: `Cache hit ratio baixo (${(current.cacheHitRatio * 100).toFixed(0)}%)`,
        recommendedAction: 'Aumentar TTL dos caches ou pré-aquecer',
        autoFixCommand: 'ideia optimize cache --ttl 3600',
      });
    }
    
    return suggestions;
  }
}
```

### 4.2 Diferenciação Competitiva

| Aspecto | IDEIA (alvo) | Concorrência |
|---------|-------------|--------------|
| Performance budget no CI | Budget com falha automática | Raro |
| Cache multi-nível (L1/L2/L3) | Memória + NATS + PostgreSQL | Apenas Redis |
| Adaptive pool sizing | Auto-scale baseado em carga | Pool fixo |
| Performance regression detection | Benchmark diff automático por PR | Manual |
| TTFT routing inteligente | Roteia para modelo adequado | Modelo fixo |

---

## 5. PESQUISA

### 5.1 Referências Técnicas

| Fonte | Ano | Contribuição |
|-------|-----|-------------|
| "LLM Inference Performance Optimization" (vLLM) | 2024 | PagedAttention, continuous batching |
| "Prompt Cache: Modular Attention Reuse" | 2024 | Prefix caching para LLM |
| "HNSW Algorithm for Approximate Nearest Neighbor Search" (Malkov & Yashunin) | 2016 | Vector search index |
| k6 Documentation (Grafana) | 2024 | Load testing |
| "Advanced Connection Pooling" (PgPool) | 2023 | Pool strategies |

---

## 6. FRONTEIRAS

### 6.1 Problemas em Aberto

| Problema | Impacto | Abordagens Atuais | Gap |
|----------|---------|-------------------|-----|
| Predição de performance degradação | Alto | Trend analysis | Non-linear detection |
| Otimização automática de cache TTL | Médio | Heurística fixa | Reinforcement learning |
| Cold start de LLM providers | Alto | Keep-alive | Pre-warming adaptativo |

### 6.2 Roteiro

| Horizonte | Tópico | Esforço | Risco |
|-----------|--------|---------|-------|
| Curto | Benchmark suite + CI budget | 16h | Baixo |
| Médio | Cache multi-nível + connection pool | 24h | Baixo |
| Longo | Adaptive optimizer + ML prediction | 60h | Alto |

---

## 7. ANÁLISE PARA IDEIA

### 7.1 O Que Existe

| Componente | Status |
|------------|--------|
| packages/performance-monitor | ✅ 8 files, benchmark básico |
| packages/cache | ✅ 11 files, NATS KV + LRU |
| packages/acceleration | ✅ 104 files, HPC engine |
| performance-budget.json | ✅ Existe |
| k6 scripts | ❌ Não integrados |
| Bundle analyzer | ❌ Não existe |
| Adaptive pool | ❌ Pool fixo |

### 7.2 Plano de Implementação

| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 1 | Benchmark suite completa + CI | 16h |
| 2 | Cache multi-nível (L1+L2+L3) | 16h |
| 3 | Connection pool adaptativo | 8h |
| 4 | Bundle analyzer + code splitting | 8h |
| 5 | Performance budget enforcement | 4h |
| 6 | k6 load test integration | 8h |
| 7 | TTFT reduction (streaming + caching) | 16h |
| 8 | Query optimization (índices + HNSW) | 12h |
| 9 | Lazy loading Theia widgets | 4h |

### 7.3 Métricas de Sucesso

| Métrica | Atual | 30 dias | 60 dias | 90 dias |
|---------|-------|---------|---------|---------|
| Performance score | 40/100 | 55/100 | 70/100 | 80/100 |
| TTFT P50 | 2s | 1.2s | 800ms | <500ms |
| Bundle size | 5MB | 3.5MB | 2.5MB | <2MB |
| Cache hit ratio | 20% | 50% | 70% | ≥80% |
| Throughput | 200 TPS | 400 TPS | 700 TPS | ≥1000 TPS |

---

> **Score de Maturidade:** 78/100 ✅
> **Próximo passo:** Implementar benchmark suite + CI budget (16h)
