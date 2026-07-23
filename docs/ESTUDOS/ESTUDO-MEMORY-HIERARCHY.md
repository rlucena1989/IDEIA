# Estudo: Hierarquia de Memoria na IDEIA — Do Registrador ao Conhecimento Persistente

> **Proposito:** Arquitetura completa de hierarquia de memoria para a IDEIA, abrangendo desde cache L1 da CPU ate memoria persistente de longo prazo, com foco em agentes de IA e sistemas de conhecimento.
> **Data:** 2026-07-22
> **Versao:** 1.0

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao completa com arquitetura, implementacao e roadmap |

---

## Sumario

1. [Introducao e Fundamentos](#1-introducao-e-fundamentos)
2. [Modelo Conceitual: 7 Niveis de Memoria na IDEIA](#2-modelo-conceitual-7-niveis-de-memoria-na-ideia)
3. [L0 — Contexto LLM (Memoria de Atencao)](#3-l0--contexto-llm-memoria-de-atencao)
4. [L1 — Cache de Sessao (In-Memory)](#4-l1--cache-de-sessao-in-memory)
5. [L2 — Cache Distribuido (Redis)](#5-l2--cache-distribuido-redis)
6. [L3 — Memoria de Trabalho (SQLite)](#6-l3--memoria-de-trabalho-sqlite)
7. [L4 — Base de Conhecimento (PostgreSQL + pgvector)](#7-l4--base-de-conhecimento-postgresql--pgvector)
8. [L5 — Data Lake (DuckDB/Parquet)](#8-l5--data-lake-duckdbparquet)
9. [L6 — Arquivo Morto (MinIO/S3)](#9-l6--arquivo-morto-minios3)
10. [Cache Coherence & Invalidation](#10-cache-coherence--invalidation)
11. [Memory Performance Budget](#11-memory-performance-budget)
12. [Implementacao na IDEIA](#12-implementacao-na-ideia)
13. [Code Examples (Comprehensive)](#13-code-examples-comprehensive)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Conexoes](#15-conexoes)

---

## 1. Introducao e Fundamentos

### 1.1 O que e Hierarquia de Memoria

Hierarquia de memoria e um conceito fundamental da ciencia da computacao que organiza dispositivos de armazenamento em niveis baseados em velocidade, capacidade e custo. O principio classico estabelece:

| Nivel | Tecnologia | Capacidade Tipica | Latencia | Custo/GB |
|-------|-----------|-------------------|----------|----------|
| Registrador | Flip-flops | ~1 KB | < 1 ns | Muito alto |
| Cache L1 | SRAM | 32-64 KB | ~1-2 ns | Alto |
| Cache L2 | SRAM | 256-512 KB | ~3-5 ns | Alto |
| Cache L3 | SRAM (compartilhada) | 2-32 MB | ~10-20 ns | Moderado |
| RAM | DRAM | 8-64 GB | ~50-100 ns | Baixo |
| SSD | NAND Flash | 256 GB-2 TB | ~10-100 us | Muito baixo |
| Disco | HDD | 1-20 TB | ~5-10 ms | Minimo |

O **Memory Wall** — a divergencia entre velocidade do processador e latencia da memoria — torna a hierarquia obrigatoria. Sem ela, CPUs modernas passariam > 90% do tempo esperando dados.

Dois principios de localidade guiam o design:
- **Localidade Temporal:** Um endereco acessado agora tende a ser acessado novamente em breve
- **Localidade Espacial:** Enderecos proximos tendem a ser acessados juntos

### 1.2 Por que a IDEIA Precisa de Hierarquia de Memoria

Agentes de IA na IDEIA processam grandes volumes de contexto simultaneamente. Cada chamada a um LLM carrega milhares de tokens de contexto, e decisoes arquiteturais dependem de informacoes de multiplas fontes:

| Caracteristica | Desafio | Solucao com Hierarquia |
|---------------|---------|----------------------|
| Contexto LLM limitado (4K-200K tokens) | Nao cabe tudo na janela de atencao | L0 gerencia compressao e sliding window |
| Velocidade vs. custo | RAM e rapida mas cara; disco e barato mas lento | Dados quentes em RAM, frios em disco |
| Multiplos agentes concorrentes | Cada agente tem seu contexto | L1 separa cache por sessao de agente |
| Conhecimento acumulado | Decisoes de ontem sao uteis hoje | L3-L4 promovem conhecimento entre sessoes |
| Custos de LLM | Cada token custa dinheiro | L0 comprime, L1 cacheia respostas |

**Tradeoff Fundamental:** Velocidade vs. Capacidade vs. Custo.

```
  Velocidade          Capacidade            Custo
     alta               baixa               alto
      |                  |                   |
  L0 [Contexto LLM]   L0 [4-200K tok]    L0 [alto/token]
      |                  |                   |
  L1 [Cache sessao]   L1 [10-100MB]      L1 [RAM/Redis]
      |                  |                   |
  L2 [Redis]          L2 [1-10GB]        L2 [cluster]
      |                  |                   |
  L3 [SQLite]         L3 [100MB-1GB]     L3 [SSD/file]
      |                  |                   |
  L4 [PostgreSQL]     L4 [10-100GB]      L4 [cloud DB]
      |                  |                   |
  L5 [DuckDB]         L5 [100GB-10TB]    L5 [object]
      |                  |                   |
  L6 [S3/Glacier]     L6 [>10TB]         L6 [minimo]
```

### 1.3 Principios de Design

A hierarquia de memoria da IDEIA segue 5 principios:

**P1 — Dados Quentes (Hot) Perto do Processamento**
Dados acessados frequentemente devem estar no nivel mais alto possivel. O `MemoryCurator` existente em `packages/memory-hierarchy/src/curator.ts` implementa promocao baseada em contagem de acesso e confianca.

**P2 — Dados Frios (Cold) em Storage Barato**
Dados nao acessados por periodos longos migram automaticamente para niveis inferiores. Politicas de archival definem timelines: 90 dias sem acesso → L5, 1 ano → L6.

**P3 — Migracao Automatica entre Niveis**
A promocao e rmacao entre niveis deve ser automatica, seguindo regras configuraveis:

```
Working (L3) → Project (L3+) apos 3 acessos
Project → Institutional apos 5 acessos + tag compliance
Institutional → Global apos validacao cruzada
L3 → L4 quando archiveOnAccessThreshold e atingido
L4 → L5 apos 90 dias sem acesso
L5 → L6 apos 365 dias sem acesso
```

**P4 — Cache-Aware Algorithms**
Algoritmos devem ser cientes do nivel de memoria em que operam. Buscas first procuram em L0-L1, depois L2-L3, e finalmente L4-L6. O `MemoryHierarchy.search()` em `hierarchy.ts` ja implementa este padrao.

**P5 — Coerencia Eventual Cross-Nivel**
Dados podem existir em multiplos niveis simultaneamente. O barramento de eventos (NATS/EventBus) notifica mudancas para que caches sejam invalidados.

---

## 2. Modelo Conceitual: 7 Niveis de Memoria na IDEIA

### 2.1 Tabela de Niveis

| Nivel | Nome | Tecnologia | Capacidade | Latencia | Persistencia | Implementacao Atual |
|-------|------|-----------|------------|----------|--------------|-------------------|
| L0 | Contexto LLM | Context window (atencao) | 4K-200K tokens | < 1ms (local), < 500ms (API) | Volatil (sessao) | `prompt-economy/` + `context-engine/` |
| L1 | Cache de Sessao | In-memory Map/Redis | 10-100MB | < 5ms | Volatil (sessao) | `memory-hierarchy/working-memory.ts` |
| L2 | Cache Distribuido | Redis Cluster | 1-10GB | < 10ms | Volatil (TTL) | Nao implementado |
| L3 | Memoria de Trabalho | SQLite/RAM DB | 100MB-1GB | < 50ms | Persistente (sessao) | `memory-hierarchy/project-memory.ts` + `memory-store/` |
| L4 | Base de Conhecimento | PostgreSQL + pgvector | 10-100GB | < 100ms | Persistente | `postgresql-layer/` + `vector-search.ts` |
| L5 | Data Lake | DuckDB/Parquet | 100GB-10TB | < 1s | Persistente | `duckdb-analytics.ts` (stub) |
| L6 | Arquivo Morto | MinIO/S3/Blob | > 10TB | > 1s | Persistente | Nao implementado |

### 2.2 Diagrama de Arquitetura

```
                            ┌──────────────────┐
                            │   Agentes IA      │
                            │  (L0 Context)     │
                            └────────┬─────────┘
                                     │
                            ┌────────▼─────────┐
                            │  L1 Cache Sessao  │
                            │  (Map<string,     │
                            │   CacheEntry>)    │
                            └────────┬─────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                 │
            ┌───────▼──────┐  ┌─────▼──────┐  ┌──────▼────────┐
            │ L2 Redis     │  │ L3 SQLite  │  │ Event Bus     │
            │ (cluster)    │  │ (WAL+FTS5) │  │ (invalidation)│
            └───────┬──────┘  └─────┬──────┘  └──────┬────────┘
                    │                │                 │
                    └────────────────┼────────────────┘
                                     │
                            ┌────────▼─────────┐
                            │  L4 PostgreSQL    │
                            │  + pgvector       │
                            │  (hybrid search)  │
                            └────────┬─────────┘
                                     │
                            ┌────────▼─────────┐
                            │  L5 DuckDB/      │
                            │  Parquet (OLAP)   │
                            └────────┬─────────┘
                                     │
                            ┌────────▼─────────┐
                            │  L6 MinIO/S3     │
                            │  (Archive/Glacier)│
                            └──────────────────┘
```

### 2.3 Fluxo de Dados Tipico

1. **Agente consulta:** Busca primeiro em L0 (context window) → se nao encontra, vai para L1
2. **L1 miss:** Propaga para L3 (SQLite working memory) com fallback para L4 (PostgreSQL)
3. **L4 hit:** Resultado e armazenado em L1 (cache-aside) e retornado ao agente
4. **L4 miss:** Ultimo recurso e L5 (DuckDB analitico) para dados historicos
5. **L6:** Dados de arquivo morto so sao consultados sob demanda explicita

### 2.4 Politica de Migracao entre Niveis

| Migracao | Gatilho | Acao | Prioridade |
|---------|--------|------|-----------|
| L3 → L1 | Acesso frequente (> 5x em 1h) | Copia para cache de sessao | Media |
| L3 → L4 | archiveOnAccessThreshold | Move para PostgreSQL | Alta |
| L4 → L5 | 90 dias sem acesso | Exporta para Parquet em DuckDB | Baixa |
| L5 → L6 | 365 dias sem acesso | Move para S3 Glacier | Minima |
| L4 → L1 | Cache miss no L1 | Cache-aside: le L4, escreve L1 | Alta |
| L0 → L3 | Fim da sessao | Sumariza contexto e persiste | Alta |

A implementacao atual em `curator.ts` ja suporta promocao entre working → project → institutional → global com regras baseadas em `minAccessCount` e `minConfidence`:

```typescript
// Regras de promocao atuais (curator.ts)
const DEFAULT_RULES: PromotionRule[] = [
  { fromLevel: 'working', toLevel: 'project', minAccessCount: 3, minConfidence: 0.7 },
  { fromLevel: 'project', toLevel: 'institutional', minAccessCount: 5, minConfidence: 0.85,
    requiredTags: ['policy', 'compliance'] },
  { fromLevel: 'project', toLevel: 'global', minAccessCount: 8, minConfidence: 0.9 },
  { fromLevel: 'institutional', toLevel: 'global', minAccessCount: 3, minConfidence: 0.95 },
];
```

---

## 3. L0 — Contexto LLM (Memoria de Atencao)

### 3.1 Window-based Context Management

L0 e a memoria de atencao do LLM — a janela de contexto que o modelo usa para gerar respostas. Diferente dos outros niveis, L0 nao e armazenamento: e o espaco de atencao do modelo.

Na IDEIA, o gerenciamento de L0 e feito pelo `prompt-economy` package, implementado em `packages/prompt-economy/src/context-compressor.ts`:

| Estrategia | Descricao | Economia de Tokens |
|-----------|-----------|-------------------|
| Sliding Window | Mantem window fixa de tokens recentes | 30-50% |
| Rolling Summary | Summariza contexto antigo periodicamente | 50-70% |
| Selective Compression | Remove linhas de baixa relevancia (logs, debug) | 20-40% |
| Budget Allocation | Aloca tokens por categoria (task > context > history) | 10-30% |

### 3.2 Sliding Window vs. Rolling Window

**Sliding Window:** Janela fixa de N tokens. Quando o limite e atingido, tokens mais antigos sao descartados.

```
[Token 1] [Token 2] ... [Token N-1] [Token N]  ← window cheia
           [Token 2] ... [Token N-1] [Token N] [Token N+1]  ← slide
```

**Rolling Window:** Contexto e periodicamente sumarizado por um LLM auxiliar.

```
[Contexto original: 10K tokens]
         ↓
[LLM summarizer: "O usuario criou 3 arquivos e modificou 2..."]
         ↓
[Contexto comprimido: 500 tokens] + [Window atual: 2K tokens]
         ↓
[Total: 2.5K tokens → dentro do orcamento]
```

A IDEIA usa Rolling Window como padrao, com fallback para Sliding Window quando o summarizer nao esta disponivel.

### 3.3 Context Compression (Summarizacao Seletiva)

O `ContextCompressor` implementa compressao seletiva baseada em relevancia:

```typescript
export interface CompressionResult {
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
  strategy: 'sliding' | 'rolling' | 'selective';
}

export class ContextCompressor {
  constructor(private config: {
    maxTokens: number;
    strategy: 'sliding' | 'rolling' | 'selective';
    summarizer?: (text: string) => Promise<string>;
  }) {}

  async compress(messages: ChatMessage[]): Promise<CompressionResult> {
    const totalTokens = this.countTokens(messages);

    if (totalTokens <= this.config.maxTokens) {
      return {
        compressed: this.serialize(messages),
        originalTokens: totalTokens,
        compressedTokens: totalTokens,
        ratio: 1,
        strategy: this.config.strategy,
      };
    }

    switch (this.config.strategy) {
      case 'sliding':
        return this.slidingWindowCompress(messages, totalTokens);
      case 'rolling':
        return this.rollingWindowCompress(messages, totalTokens);
      case 'selective':
        return this.selectiveCompress(messages, totalTokens);
    }
  }

  private slidingWindowCompress(messages: ChatMessage[], totalTokens: number): CompressionResult {
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystem = messages.filter(m => m.role !== 'system');

    const systemTokens = this.countTokens(systemMessages);
    const budget = this.config.maxTokens - systemTokens;

    let used = 0;
    const kept: ChatMessage[] = [...systemMessages];

    for (let i = nonSystem.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateTokens(nonSystem[i].content);
      if (used + msgTokens <= budget) {
        kept.push(nonSystem[i]);
        used += msgTokens;
      } else {
        break;
      }
    }

    const compressed = this.serialize(kept);
    return {
      compressed,
      originalTokens: totalTokens,
      compressedTokens: this.countTokens(kept),
      ratio: this.countTokens(kept) / totalTokens,
      strategy: 'sliding',
    };
  }

  private async rollingWindowCompress(messages: ChatMessage[], totalTokens: number): Promise<CompressionResult> {
    if (!this.config.summarizer) {
      return this.slidingWindowCompress(messages, totalTokens);
    }

    const systemMessages = messages.filter(m => m.role === 'system');
    const recentMessages = messages.slice(-10);
    const historicalMessages = messages.slice(0, -10);

    if (historicalMessages.length === 0) {
      return this.slidingWindowCompress(messages, totalTokens);
    }

    const historyText = historicalMessages.map(m => `[${m.role}]: ${m.content}`).join('\n');
    const summary = await this.config.summarizer(
      `Summarize the following conversation history concisely (keep key decisions, code changes, errors):\n${historyText}`
    );

    const compressedMessages: ChatMessage[] = [
      ...systemMessages,
      { role: 'system', content: `[Previous context summary]: ${summary}` },
      ...recentMessages,
    ];

    return {
      compressed: this.serialize(compressedMessages),
      originalTokens: totalTokens,
      compressedTokens: this.countTokens(compressedMessages),
      ratio: this.countTokens(compressedMessages) / totalTokens,
      strategy: 'rolling',
    };
  }

  private selectiveCompress(messages: ChatMessage[], totalTokens: number): CompressionResult {
    const relevancia = (msg: ChatMessage): number => {
      if (msg.role === 'system') return 1.0;
      if (msg.role === 'tool') return 0.3;
      const content = msg.content;
      if (content.includes('error') || content.includes('fix')) return 0.9;
      if (content.includes('log') || content.includes('debug')) return 0.4;
      if (content.length < 50) return 0.2;
      return 0.7;
    };

    const scored = messages
      .map(m => ({ message: m, score: relevancia(m), tokens: this.estimateTokens(m.content) }))
      .sort((a, b) => b.score - a.score);

    const budget = this.config.maxTokens;
    let used = 0;
    const kept: ChatMessage[] = [];

    for (const item of scored) {
      if (used + item.tokens <= budget) {
        kept.push(item.message);
        used += item.tokens;
      }
    }

    kept.sort((a, b) => messages.indexOf(a) - messages.indexOf(b));

    return {
      compressed: this.serialize(kept),
      originalTokens: totalTokens,
      compressedTokens: used,
      ratio: used / totalTokens,
      strategy: 'selective',
    };
  }

  private countTokens(messages: ChatMessage[]): number {
    return messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private serialize(messages: ChatMessage[]): string {
    return messages.map(m => `[${m.role}]: ${m.content}`).join('\n');
  }
}
```

### 3.4 BudgetTracker — Alocacao de Tokens por Categoria

O `BudgetTracker` do `prompt-economy` package gerencia o orcamento de tokens:

```typescript
export type TokenCategory = 'task' | 'context' | 'history' | 'system' | 'tools';

export interface BudgetAllocation {
  category: TokenCategory;
  budget: number;
  used: number;
  priority: number;
}

export class BudgetTracker {
  private allocations: Map<TokenCategory, BudgetAllocation> = new Map();
  private totalBudget: number;

  constructor(totalBudget: number) {
    this.totalBudget = totalBudget;
    this.resetDefaults();
  }

  resetDefaults(): void {
    this.allocations.set('system',   { category: 'system',   budget: Math.floor(this.totalBudget * 0.10), used: 0, priority: 1 });
    this.allocations.set('task',     { category: 'task',     budget: Math.floor(this.totalBudget * 0.35), used: 0, priority: 2 });
    this.allocations.set('context',  { category: 'context',  budget: Math.floor(this.totalBudget * 0.25), used: 0, priority: 3 });
    this.allocations.set('history',  { category: 'history',  budget: Math.floor(this.totalBudget * 0.20), used: 0, priority: 4 });
    this.allocations.set('tools',    { category: 'tools',    budget: Math.floor(this.totalBudget * 0.10), used: 0, priority: 5 });
  }

  canAllocate(category: TokenCategory, tokens: number): boolean {
    const alloc = this.allocations.get(category);
    if (!alloc) return false;
    return (alloc.used + tokens) <= alloc.budget;
  }

  allocate(category: TokenCategory, tokens: number): boolean {
    if (!this.canAllocate(category, tokens)) return false;
    const alloc = this.allocations.get(category)!;
    alloc.used += tokens;
    return true;
  }

  getSummary(): BudgetAllocation[] {
    return Array.from(this.allocations.values());
  }

  getUtilization(): number {
    const totalUsed = Array.from(this.allocations.values()).reduce((s, a) => s + a.used, 0);
    return totalUsed / this.totalBudget;
  }
}
```

---

## 4. L1 — Cache de Sessao (In-Memory)

### 4.1 Estrutura de Dados

L1 e implementado pelo `WorkingMemory` em `packages/memory-hierarchy/src/working-memory.ts`. E um cache volatil baseado em `Map<string, MemoryEntry>` com as seguintes caracteristicas:

| Propriedade | Valor | Justificativa |
|------------|-------|--------------|
| Capacidade maxima | 50 entradas | Sessao tipica de agente tem 10-30 eventos relevantes |
| TTL padrao | 1h | Sessoes raramente duram mais que 1h |
| Categorias permitidas | decision, error, observation, event | So dados operacionais |
| Estrategia de expulsao | LRU (oldest lastAccessed) | Dados nao acessados sao menos relevantes |

### 4.2 Politicas de Expiracao (TTL, LRU, LFU)

**TTL (Time-To-Live):** Cada entrada tem `ttlMs` configuravel. Apos esse periodo, a entrada e considerada expirada e removida no proximo acesso ou no `purgeExpired()`.

```typescript
private isExpired(entry: MemoryEntry): boolean {
  const age = Date.now() - new Date(entry.createdAt).getTime();
  return age > entry.ttlMs;
}

private purgeExpired(): void {
  for (const [id, entry] of this.entries) {
    if (this.isExpired(entry)) {
      this.entries.delete(id);
    }
  }
}
```

**LRU (Least Recently Used):** Quando o limite de entradas e atingido (`maxEntries: 50`), a entrada com `lastAccessed` mais antigo e removida:

```typescript
private evictOldest(): void {
  let oldest: { id: string; lastAccessed: string } | null = null;
  for (const [id, entry] of this.entries) {
    if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
      oldest = { id, lastAccessed: entry.lastAccessed };
    }
  }
  if (oldest) this.entries.delete(oldest.id);
}
```

**LFU (Least Frequently Used):** Embora nao implementado atualmente no `WorkingMemory`, o `MemoryCurator` usa contagem de acesso como criterio de promocao, o que efetivamente implementa LFU entre niveis.

### 4.3 Serializacao (MessagePack vs JSON)

Atualmente o cache de sessao usa objetos JS em memoria, sem serializacao. Para persistencia em disco ou transmissao via rede, duas opcoes:

| Formato | Tamanho | Velocidade Serializacao | Legibilidade | Tipo Schema |
|---------|--------|------------------------|-------------|------------|
| JSON | 1x (baseline) | 1x (baseline) | Excelente | Dinamico |
| MessagePack | 0.5-0.7x | 1.2-1.5x | Ruim | Binario |
| CBOR | 0.6-0.8x | 0.9-1.1x | Ruim | Binario |
| Protocol Buffers | 0.3-0.5x | 2-3x | Boa (com .proto) | Estatico |

Recomendacao: JSON para L1 (simplicidade, debug), MessagePack para L2 (performance em rede).

### 4.4 Code Example: SessionCache com TTL + LRU Eviction

```typescript
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  ttlMs: number;
  sizeBytes: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  totalSizeBytes: number;
}

export class SessionCache {
  private entries: Map<string, CacheEntry> = new Map();
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(private config: {
    maxEntries: number;
    maxSizeBytes: number;
    defaultTtlMs: number;
    evictionPolicy: 'lru' | 'lfu';
  }) {}

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.entries.delete(key);
      this.evictions++;
      this.misses++;
      return undefined;
    }

    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.ensureCapacity();

    const serialized = JSON.stringify(value);
    const sizeBytes = Buffer.byteLength(serialized, 'utf-8');
    const now = Date.now();

    this.entries.set(key, {
      key,
      value,
      createdAt: now,
      lastAccessed: now,
      accessCount: 1,
      ttlMs: ttlMs ?? this.config.defaultTtlMs,
      sizeBytes,
    });
  }

  private ensureCapacity(): void {
    while (this.entries.size >= this.config.maxEntries) {
      this.evictOne();
    }

    let totalSize = 0;
    for (const entry of this.entries.values()) {
      totalSize += entry.sizeBytes;
    }
    while (totalSize > this.config.maxSizeBytes) {
      const evicted = this.evictOne();
      if (evicted) totalSize -= evicted.sizeBytes;
      else break;
    }
  }

  private evictOne(): CacheEntry | undefined {
    if (this.entries.size === 0) return undefined;

    let target: { key: string; entry: CacheEntry } | null = null;

    if (this.config.evictionPolicy === 'lru') {
      for (const [key, entry] of this.entries) {
        if (!target || entry.lastAccessed < target.entry.lastAccessed) {
          target = { key, entry };
        }
      }
    } else {
      for (const [key, entry] of this.entries) {
        if (!target || entry.accessCount < target.entry.accessCount) {
          target = { key, entry };
        }
      }
    }

    if (target) {
      this.entries.delete(target.key);
      this.evictions++;
      return target.entry;
    }

    return undefined;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > entry.ttlMs;
  }

  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const totalSize = Array.from(this.entries.values()).reduce((s, e) => s + e.sizeBytes, 0);

    return {
      size: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      evictions: this.evictions,
      totalSizeBytes: totalSize,
    };
  }

  clear(): void {
    this.entries.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  get keys(): string[] {
    return Array.from(this.entries.keys());
  }
}
```

---

## 5. L2 — Cache Distribuido (Redis)

### 5.1 Redis Cluster Topology

L2 e o cache compartilhado entre multiplas instancias da IDEIA. Quando o sistema opera em modo multi-agente ou multi-sessao, o L1 de cada agente nao e visivel aos demais. L2 resolve isso com um Redis Cluster.

A topologia recomendada:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Redis Node 1 │─────│ Redis Node 2 │─────│ Redis Node 3 │
│ (master)     │     │ (master)     │     │ (master)     │
│ slots 0-5461 │     │ slots 5462-  │     │ slots 10923- │
│              │     │     10922    │     │    16383     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                     │                     │
┌──────▼───────┐     ┌──────▼───────┐     ┌──────▼───────┐
│ Redis Node 4 │     │ Redis Node 5 │     │ Redis Node 6 │
│ (replica)    │     │ (replica)    │     │ (replica)    │
└──────────────┘     └──────────────┘     └──────────────┘
```

Para desenvolvimento/local, Redis single-node e suficiente.

### 5.2 Key Design Patterns

O esquema de chaves segue o padrao `namespace:key:field`:

```
ideia:cache:session:{sessionId}:{key}
ideia:cache:llm:{model}:{promptHash}
ideia:cache:embedding:{chunkId}
ideia:cache:search:{workspace}:{queryHash}
ideia:lock:{resourceId}
ideia:rate-limit:{userId}:{endpoint}
ideia:queue:{agentId}:{taskId}
```

Exemplo de implementacao:

```typescript
export class RedisKeyBuilder {
  static sessionCache(sessionId: string, key: string): string {
    return `ideia:cache:session:${sessionId}:${key}`;
  }

  static llmCache(model: string, promptHash: string): string {
    return `ideia:cache:llm:${model}:${promptHash}`;
  }

  static embedding(chunkId: string): string {
    return `ideia:cache:embedding:${chunkId}`;
  }

  static searchQuery(workspace: string, queryHash: string): string {
    return `ideia:cache:search:${workspace}:${queryHash}`;
  }

  static lock(resourceId: string): string {
    return `ideia:lock:${resourceId}`;
  }

  static rateLimit(userId: string, endpoint: string): string {
    return `ideia:rate-limit:${userId}:${endpoint}`;
  }

  static parseKey(fullKey: string): { namespace: string; parts: string[] } | null {
    const parts = fullKey.split(':');
    if (parts.length < 3) return null;
    return { namespace: parts[1], parts: parts.slice(2) };
  }
}
```

### 5.3 Cache-aside vs Read-through vs Write-through

| Padrao | Leitura | Escrita | Vantagem | Desvantagem |
|--------|---------|---------|----------|------------|
| Cache-aside | App verifica cache, depois DB | App escreve direto no DB, invalida cache | Simples, alto controle | Duas viagens na leitura |
| Read-through | Cache busca do DB automaticamente | App escreve no DB | Transparente para o app | Cache precisa conhecer DB |
| Write-through | Cache-aside | App escreve no cache, cache escreve no DB | Dados sempre consistentes | Latencia de escrita maior |
| Write-behind | Cache-aside | App escreve no cache, cache escreve no DB async | Escrita rapida | Possivel perda de dados |

A IDEIA usa **Cache-aside** como padrao (simplicidade, controle fino) com **Write-through** para dados criticos (decisoes, politicas).

### 5.4 Code Example: DistributedCache com Redis + Fallback In-Memory

```typescript
import { createClient, RedisClientType, RedisClientOptions } from 'redis';

export interface DistributedCacheConfig {
  redisUrl?: string;
  defaultTtlMs: number;
  maxRetries: number;
  fallbackToMemory: boolean;
}

export class DistributedCache {
  private client: RedisClientType | null = null;
  private fallback: SessionCache;
  private connected = false;
  private config: DistributedCacheConfig;

  constructor(config?: Partial<DistributedCacheConfig>) {
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultTtlMs: 300000,
      maxRetries: 3,
      fallbackToMemory: true,
      ...config,
    };

    this.fallback = new SessionCache({
      maxEntries: 100,
      maxSizeBytes: 50 * 1024 * 1024,
      defaultTtlMs: this.config.defaultTtlMs,
      evictionPolicy: 'lru',
    });
  }

  async connect(): Promise<boolean> {
    try {
      const options: RedisClientOptions = {
        url: this.config.redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
        },
      };

      this.client = createClient(options) as RedisClientType;

      this.client.on('error', (err) => {
        console.error('[DistributedCache] Redis error:', err.message);
        this.connected = false;
      });

      this.client.on('connect', () => {
        this.connected = true;
      });

      await this.client.connect();
      this.connected = true;
      return true;
    } catch (err) {
      console.warn('[DistributedCache] Failed to connect to Redis, using fallback');
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (this.connected && this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
      } catch {
        // Fallback to in-memory
      }
    }

    if (this.config.fallbackToMemory) {
      return this.fallback.get<T>(key);
    }

    return undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<boolean> {
    const ttl = ttlMs ?? this.config.defaultTtlMs;

    if (this.connected && this.client) {
      try {
        await this.client.set(key, JSON.stringify(value), {
          PX: ttl,
        });
        return true;
      } catch {
        // Fallback to in-memory
      }
    }

    if (this.config.fallbackToMemory) {
      this.fallback.set(key, value, ttl);
      return true;
    }

    return false;
  }

  async delete(key: string): Promise<boolean> {
    if (this.connected && this.client) {
      try {
        await this.client.del(key);
        return true;
      } catch {
        // ignore
      }
    }

    if (this.config.fallbackToMemory) {
      this.fallback.delete(key);
      return true;
    }

    return false;
  }

  async exists(key: string): Promise<boolean> {
    if (this.connected && this.client) {
      try {
        const result = await this.client.exists(key);
        return result === 1;
      } catch {
        // fallback
      }
    }

    if (this.config.fallbackToMemory) {
      return this.fallback.exists(key);
    }

    return false;
  }

  async mget<T>(keys: string[]): Promise<(T | undefined)[]> {
    const results: (T | undefined)[] = [];

    if (this.connected && this.client) {
      try {
        const rawValues = await this.client.mGet(keys);
        for (const raw of rawValues) {
          results.push(raw ? JSON.parse(raw) as T : undefined);
        }
        return results;
      } catch {
        // fallback
      }
    }

    if (this.config.fallbackToMemory) {
      for (const key of keys) {
        results.push(this.fallback.get<T>(key));
      }
      return results;
    }

    return keys.map(() => undefined);
  }

  async mset<T>(entries: { key: string; value: T; ttlMs?: number }[]): Promise<void> {
    if (this.connected && this.client) {
      try {
        const multi = this.client.multi();
        for (const { key, value, ttlMs } of entries) {
          const ttl = ttlMs ?? this.config.defaultTtlMs;
          multi.set(key, JSON.stringify(value), { PX: ttl });
        }
        await multi.exec();
        return;
      } catch {
        // fallback
      }
    }

    if (this.config.fallbackToMemory) {
      for (const { key, value, ttlMs } of entries) {
        this.fallback.set(key, value, ttlMs ?? this.config.defaultTtlMs);
      }
    }
  }

  async acquireLock(resource: string, ttlMs = 10000): Promise<boolean> {
    if (!this.connected || !this.client) return false;

    const lockKey = RedisKeyBuilder.lock(resource);
    const result = await this.client.set(lockKey, process.pid.toString(), {
      PX: ttlMs,
      NX: true,
    });

    return result !== null;
  }

  async releaseLock(resource: string): Promise<void> {
    if (!this.connected || !this.client) return;

    const lockKey = RedisKeyBuilder.lock(resource);
    await this.client.del(lockKey);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getFallbackStats() {
    return this.fallback.getStats();
  }
}
```

---

## 6. L3 — Memoria de Trabalho (SQLite)

### 6.1 Schema Design for Agent Memory

L3 representa a memoria de trabalho persistente. Diferente de L1 (volatil, sessao), L3 sobrevive a restart do processo e serve como ponte entre caches rapidos e a base de conhecimento.

O schema SQLite projetado para a IDEIA:

```sql
-- Memoria de trabalho: tabela principal
CREATE TABLE IF NOT EXISTS working_memory (
    id          TEXT PRIMARY KEY,
    level       TEXT NOT NULL CHECK(level IN ('working','project','institutional','global')),
    category    TEXT NOT NULL CHECK(category IN ('decision','pattern','architecture','error',
                                                  'preference','policy','event','lesson','observation')),
    content     TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT '',
    confidence  REAL NOT NULL DEFAULT 0.8 CHECK(confidence >= 0 AND confidence <= 1),
    tags        TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed TEXT NOT NULL DEFAULT (datetime('now')),
    ttl_ms      INTEGER NOT NULL DEFAULT 3600000,
    status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived','pending_review','promoted')),
    metadata    TEXT NOT NULL DEFAULT '{}'
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_wm_level ON working_memory(level);
CREATE INDEX IF NOT EXISTS idx_wm_category ON working_memory(category);
CREATE INDEX IF NOT EXISTS idx_wm_status ON working_memory(status);
CREATE INDEX IF NOT EXISTS idx_wm_last_accessed ON working_memory(last_accessed);
CREATE INDEX IF NOT EXISTS idx_wm_confidence ON working_memory(confidence DESC);

-- Full-text search (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS wm_fts USING fts5(
    content,
    tags,
    content=working_memory,
    content_rowid=rowid
);

-- Triggers para manter FTS sincronizado
CREATE TRIGGER IF NOT EXISTS wm_ai AFTER INSERT ON working_memory BEGIN
    INSERT INTO wm_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS wm_ad AFTER DELETE ON working_memory BEGIN
    INSERT INTO wm_fts(wm_fts, rowid, content, tags) VALUES('delete', old.rowid, old.content, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS wm_au AFTER UPDATE ON working_memory BEGIN
    INSERT INTO wm_fts(wm_fts, rowid, content, tags) VALUES('delete', old.rowid, old.content, old.tags);
    INSERT INTO wm_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
END;
```

### 6.2 FTS5 para Busca Full-Text

FTS5 (Full-Text Search 5) e a engine de busca textual do SQLite. Vantagens:

| Caracteristica | FTS5 | LIKE %query% |
|---------------|------|-------------|
| Velocidade em 1M linhas | < 10ms | > 1s |
| Ranking por relevancia | Sim (bm25) | Nao |
| Stemming | Sim (unicode61 tokenizer) | Nao |
| Prefix queries | Sim | Nao |
| Index size | 1.2x do texto | 0x (sem indice) |

### 6.3 WAL Mode para Concorrencia

O SQLite em modo WAL (Write-Ahead Log) permite leitura e escrita concorrentes:

```typescript
-- Ativar WAL mode
PRAGMA journal_mode=WAL;
-- Cache de 64MB
PRAGMA cache_size=-64000;
-- Sincronizacao normal
PRAGMA synchronous=NORMAL;
-- Temp store em memoria
PRAGMA temp_store=MEMORY;
-- Foreign keys
PRAGMA foreign_keys=ON;
-- Busy timeout
PRAGMA busy_timeout=5000;
```

No WAL mode:
- Leitores nao bloqueiam escritores
- Escritores nao bloqueiam leitores
- Multiplos leitores simultaneos
- Um escritor por vez

### 6.4 Code Example: WorkingMemory com SQLite + FTS5

```typescript
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';

export interface WmEntry {
  id: string;
  level: string;
  category: string;
  content: string;
  source: string;
  confidence: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  lastAccessed: string;
  ttlMs: number;
  status: string;
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  entry: WmEntry;
  rank: number;
}

export class SqliteWorkingMemory {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath ?? path.join(process.cwd(), '.ideia', 'working-memory.db');
    this.db = new Database(finalPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA cache_size=-64000;
      PRAGMA synchronous=NORMAL;
      PRAGMA temp_store=MEMORY;
      PRAGMA busy_timeout=5000;

      CREATE TABLE IF NOT EXISTS working_memory (
        id            TEXT PRIMARY KEY,
        level         TEXT NOT NULL DEFAULT 'working',
        category      TEXT NOT NULL,
        content       TEXT NOT NULL,
        source        TEXT NOT NULL DEFAULT '',
        confidence    REAL NOT NULL DEFAULT 0.8,
        tags          TEXT NOT NULL DEFAULT '[]',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
        access_count  INTEGER NOT NULL DEFAULT 0,
        last_accessed TEXT NOT NULL DEFAULT (datetime('now')),
        ttl_ms        INTEGER NOT NULL DEFAULT 3600000,
        status        TEXT NOT NULL DEFAULT 'active',
        metadata      TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_wm_level ON working_memory(level);
      CREATE INDEX IF NOT EXISTS idx_wm_category ON working_memory(category);
      CREATE INDEX IF NOT EXISTS idx_wm_status ON working_memory(status);
      CREATE INDEX IF NOT EXISTS idx_wm_confidence ON working_memory(confidence DESC);

      CREATE VIRTUAL TABLE IF NOT EXISTS wm_fts USING fts5(
        content, tags,
        content=working_memory,
        content_rowid=rowid
      );

      CREATE TRIGGER IF NOT EXISTS wm_ai AFTER INSERT ON working_memory BEGIN
        INSERT INTO wm_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS wm_ad AFTER DELETE ON working_memory BEGIN
        INSERT INTO wm_fts(wm_fts, rowid, content, tags) VALUES('delete', old.rowid, old.content, old.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS wm_au AFTER UPDATE ON working_memory BEGIN
        INSERT INTO wm_fts(wm_fts, rowid, content, tags) VALUES('delete', old.rowid, old.content, old.tags);
        INSERT INTO wm_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
      END;
    `);
  }

  store(params: {
    level?: string;
    category: string;
    content: string;
    source?: string;
    tags?: string[];
    confidence?: number;
    ttlMs?: number;
    metadata?: Record<string, unknown>;
  }): WmEntry {
    const id = randomUUID();
    const now = new Date().toISOString();
    const tags = JSON.stringify(params.tags ?? []);
    const meta = JSON.stringify(params.metadata ?? {});

    const stmt = this.db.prepare(`
      INSERT INTO working_memory (id, level, category, content, source, confidence, tags,
        created_at, updated_at, ttl_ms, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `);

    stmt.run(
      id,
      params.level ?? 'working',
      params.category,
      params.content,
      params.source ?? '',
      params.confidence ?? 0.8,
      tags,
      now,
      now,
      params.ttlMs ?? 3600000,
      meta,
    );

    return this.get(id)!;
  }

  get(id: string): WmEntry | undefined {
    const row = this.db.prepare('SELECT * FROM working_memory WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    this.db.prepare(`
      UPDATE working_memory SET access_count = access_count + 1, last_accessed = datetime('now')
      WHERE id = ?
    `).run(id);

    return this.rowToEntry(row);
  }

  search(query: string, limit = 20): SearchResult[] {
    const rows = this.db.prepare(`
      SELECT wm.*, wm_fts.rank
      FROM wm_fts
      JOIN working_memory wm ON wm.rowid = wm_fts.rowid
      WHERE wm_fts MATCH ?
      AND wm.status = 'active'
      ORDER BY rank
      LIMIT ?
    `).all(query, limit) as Record<string, unknown>[];

    return rows.map(row => ({
      entry: this.rowToEntry(row),
      rank: row.rank as number,
    }));
  }

  searchByContent(query: string, limit = 20): WmEntry[] {
    const lower = query.toLowerCase();
    const rows = this.db.prepare(`
      SELECT * FROM working_memory
      WHERE status = 'active'
      AND (LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)
      ORDER BY confidence DESC, last_accessed DESC
      LIMIT ?
    `).all(`%${lower}%`, `%${lower}%`, limit) as Record<string, unknown>[];

    return rows.map(row => this.rowToEntry(row));
  }

  hybridSearch(query: string, limit = 20): SearchResult[] {
    try {
      return this.search(query, limit);
    } catch {
      return this.searchByContent(query, limit).map(e => ({ entry: e, rank: 0 }));
    }
  }

  getAll(level?: string, status?: string): WmEntry[] {
    let sql = 'SELECT * FROM working_memory WHERE 1=1';
    const params: unknown[] = [];

    if (level) {
      sql += ' AND level = ?';
      params.push(level);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.rowToEntry(row));
  }

  update(id: string, updates: Partial<{ content: string; confidence: number; status: string; tags: string[]; metadata: Record<string, unknown> }>): boolean {
    const sets: string[] = ['updated_at = datetime(\'now\')'];
    const params: unknown[] = [];

    if (updates.content !== undefined) { sets.push('content = ?'); params.push(updates.content); }
    if (updates.confidence !== undefined) { sets.push('confidence = ?'); params.push(updates.confidence); }
    if (updates.status !== undefined) { sets.push('status = ?'); params.push(updates.status); }
    if (updates.tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(updates.tags)); }
    if (updates.metadata !== undefined) { sets.push('metadata = ?'); params.push(JSON.stringify(updates.metadata)); }

    if (sets.length === 1) return false;

    params.push(id);
    const result = this.db.prepare(`UPDATE working_memory SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return result.changes > 0;
  }

  deleteExpired(): number {
    const result = this.db.prepare(`
      DELETE FROM working_memory
      WHERE status = 'active'
      AND (unixepoch('now') - unixepoch(created_at)) * 1000 > ttl_ms
    `).run();
    return result.changes;
  }

  getStats(): { total: number; byLevel: Record<string, number>; byStatus: Record<string, number> } {
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM working_memory').get() as Record<string, number>).count;
    const byLevel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const row of this.db.prepare('SELECT level, COUNT(*) as count FROM working_memory GROUP BY level').all() as Record<string, unknown>[]) {
      byLevel[row.level as string] = row.count as number;
    }
    for (const row of this.db.prepare('SELECT status, COUNT(*) as count FROM working_memory GROUP BY status').all() as Record<string, unknown>[]) {
      byStatus[row.status as string] = row.count as number;
    }

    return { total, byLevel, byStatus };
  }

  close(): void {
    this.db.close();
  }

  private rowToEntry(row: Record<string, unknown>): WmEntry {
    return {
      id: row.id as string,
      level: row.level as string,
      category: row.category as string,
      content: row.content as string,
      source: row.source as string,
      confidence: row.confidence as number,
      tags: JSON.parse(row.tags as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      accessCount: row.access_count as number,
      lastAccessed: row.last_accessed as string,
      ttlMs: row.ttl_ms as number,
      status: row.status as string,
      metadata: JSON.parse(row.metadata as string),
    };
  }
}
```

---

## 7. L4 — Base de Conhecimento (PostgreSQL + pgvector)

### 7.1 Schema: Documents, Chunks, Embeddings, Metadata

L4 e a base de conhecimento persistente da IDEIA. Implementada com PostgreSQL + pgvector, ela armazena documentos completos, chunks semânticos, embeddings vetoriais e metadados estruturados.

O schema existente em `packages/postgresql-layer/` ja define as tabelas base:

```sql
-- Extensoes
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- Tabela de documentos
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    source          TEXT NOT NULL DEFAULT '',
    document_type   TEXT NOT NULL DEFAULT 'generic',
    tags            TEXT[] NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum        TEXT NOT NULL DEFAULT ''
);

-- Tabela de chunks (pedacos do documento)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    chunk_index     INTEGER NOT NULL DEFAULT 0,
    token_count     INTEGER NOT NULL DEFAULT 0,
    embedding       VECTOR(1536),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_kc_document_id ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kc_created_at ON knowledge_chunks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kd_document_type ON knowledge_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kd_tags ON knowledge_documents USING gin(tags);

-- Indice HNSW para busca vetorial (melhor que IVFFlat para precisao)
CREATE INDEX IF NOT EXISTS idx_kc_embedding_hnsw ON knowledge_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);
```

### 7.2 ANN Search: IVFFlat vs HNSW Indexes

| Indice | Velocidade (1M vetores) | Precisao Recall@10 | Build Time | Uso de Memoria |
|--------|------------------------|-------------------|------------|---------------|
| IVFFlat (lists=100) | < 2ms | ~85% | Rapido | Baixo |
| IVFFlat (lists=1000) | < 10ms | ~92% | Moderado | Baixo |
| HNSW (m=16, ef=200) | < 1ms | ~98% | Lento | Alto (~1.5x) |
| HNSW (m=32, ef=400) | < 3ms | ~99.5% | Muito lento | Alto (~2x) |

Recomendacao:
- **HNSW** para producao (precisao > recall e mais importante)
- **IVFFlat** para desenvolvimento / datasets pequenos (< 100K chunks)
- Rebuild do indice a cada 10K novos chunks

### 7.3 Hybrid Search (BM25 + Vector Similarity)

A busca hibrida combina relevância textual (BM25) com similaridade semântica (cosine distance):

```sql
-- Busca hibrida: BM25 (tsvector) + similaridade cosseno
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding VECTOR(1536),
    max_results INTEGER DEFAULT 10,
    alpha FLOAT DEFAULT 0.5
) RETURNS TABLE(
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    bm25_score FLOAT,
    vector_score FLOAT,
    combined_score FLOAT
) LANGUAGE SQL STABLE AS $$
    WITH bm25 AS (
        SELECT
            kc.id,
            kc.document_id,
            kc.content,
            ts_rank(
                to_tsvector('portuguese', kc.content),
                plainto_tsquery('portuguese', query_text)
            ) AS score
        FROM knowledge_chunks kc
        WHERE to_tsvector('portuguese', kc.content) @@ plainto_tsquery('portuguese', query_text)
    ),
    vector AS (
        SELECT
            kc.id,
            1 - (kc.embedding <=> query_embedding) AS score
        FROM knowledge_chunks kc
        WHERE kc.embedding IS NOT NULL
        ORDER BY kc.embedding <=> query_embedding
        LIMIT max_results * 2
    )
    SELECT
        COALESCE(b.id, v.id) AS chunk_id,
        kc.document_id,
        kc.content,
        COALESCE(b.score, 0) AS bm25_score,
        COALESCE(v.score, 0) AS vector_score,
        (alpha * COALESCE(b.score, 0) + (1 - alpha) * COALESCE(v.score, 0)) AS combined_score
    FROM knowledge_chunks kc
    LEFT JOIN bm25 b ON b.id = kc.id
    LEFT JOIN vector v ON v.id = kc.id
    WHERE b.id IS NOT NULL OR v.id IS NOT NULL
    ORDER BY combined_score DESC
    LIMIT max_results;
$$;
```

### 7.4 Code Example: KnowledgeBase com pgvector + Hybrid Search

```typescript
import { Pool, PoolClient, QueryResult } from 'pg';

export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  documentType: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  checksum: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  embedding?: number[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface HybridSearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  bm25Score: number;
  vectorScore: number;
  combinedScore: number;
  document?: KnowledgeDocument;
}

export class KnowledgeBase {
  private pool: Pool;
  private dimension: number;

  constructor(connectionString: string, dimension = 1536) {
    this.pool = new Pool({ connectionString });
    this.dimension = dimension;
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      await client.query('CREATE EXTENSION IF NOT EXISTS uuid-ossp');

      await client.query(`
        CREATE TABLE IF NOT EXISTS knowledge_documents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT '',
          document_type TEXT NOT NULL DEFAULT 'generic',
          tags TEXT[] NOT NULL DEFAULT '{}',
          metadata JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          checksum TEXT NOT NULL DEFAULT ''
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          chunk_index INTEGER NOT NULL DEFAULT 0,
          token_count INTEGER NOT NULL DEFAULT 0,
          embedding VECTOR(${this.dimension}),
          metadata JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_kc_document_id ON knowledge_chunks(document_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_kc_created_at ON knowledge_chunks(created_at DESC)
      `);
    } finally {
      client.release();
    }
  }

  async storeDocument(doc: {
    title: string;
    source?: string;
    documentType?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    checksum?: string;
  }): Promise<KnowledgeDocument> {
    const result = await this.pool.query(`
      INSERT INTO knowledge_documents (title, source, document_type, tags, metadata, checksum)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      doc.title,
      doc.source ?? '',
      doc.documentType ?? 'generic',
      doc.tags ?? [],
      JSON.stringify(doc.metadata ?? {}),
      doc.checksum ?? '',
    ]);

    return this.rowToDocument(result.rows[0]);
  }

  async storeChunks(documentId: string, chunks: { content: string; index: number; tokenCount: number; embedding?: number[]; metadata?: Record<string, unknown> }[]): Promise<KnowledgeChunk[]> {
    const results: KnowledgeChunk[] = [];

    for (const chunk of chunks) {
      const embeddingStr = chunk.embedding ? `[${chunk.embedding.join(',')}]` : null;

      const result = await this.pool.query(`
        INSERT INTO knowledge_chunks (document_id, content, chunk_index, token_count, embedding, metadata)
        VALUES ($1, $2, $3, $4, $5::vector, $6)
        RETURNING *
      `, [
        documentId,
        chunk.content,
        chunk.index,
        chunk.tokenCount,
        embeddingStr,
        JSON.stringify(chunk.metadata ?? {}),
      ]);

      results.push(this.rowToChunk(result.rows[0]));
    }

    return results;
  }

  async hybridSearch(query: {
    text: string;
    embedding?: number[];
    maxResults?: number;
    alpha?: number;
    documentType?: string;
  }): Promise<HybridSearchResult[]> {
    const maxResults = query.maxResults ?? 10;
    const alpha = query.alpha ?? 0.5;

    let sql: string;
    let params: unknown[];

    if (query.embedding) {
      const embStr = `[${query.embedding.join(',')}]`;
      sql = `
        WITH bm25 AS (
          SELECT kc.id, kc.document_id, kc.content,
            ts_rank(to_tsvector('portuguese', kc.content), plainto_tsquery('portuguese', $1)) AS score
          FROM knowledge_chunks kc
          ${query.documentType ? 'JOIN knowledge_documents kd ON kd.id = kc.document_id' : ''}
          WHERE to_tsvector('portuguese', kc.content) @@ plainto_tsquery('portuguese', $1)
          ${query.documentType ? 'AND kd.document_type = $5' : ''}
        ),
        vector AS (
          SELECT kc.id, 1 - (kc.embedding <=> $2::vector) AS score
          FROM knowledge_chunks kc
          ${query.documentType ? 'JOIN knowledge_documents kd ON kd.id = kc.document_id' : ''}
          WHERE kc.embedding IS NOT NULL
          ${query.documentType ? 'AND kd.document_type = $5' : ''}
          ORDER BY kc.embedding <=> $2::vector
          LIMIT $3 * 2
        )
        SELECT
          COALESCE(b.id, v.id) AS chunk_id,
          kc.document_id,
          kc.content,
          COALESCE(b.score, 0) AS bm25_score,
          COALESCE(v.score, 0) AS vector_score,
          ($4 * COALESCE(b.score, 0) + (1 - $4) * COALESCE(v.score, 0)) AS combined_score
        FROM knowledge_chunks kc
        LEFT JOIN bm25 b ON b.id = kc.id
        LEFT JOIN vector v ON v.id = kc.id
        WHERE b.id IS NOT NULL OR v.id IS NOT NULL
        ORDER BY combined_score DESC
        LIMIT $3
      `;
      params = [query.text, embStr, maxResults, alpha];
      if (query.documentType) params.push(query.documentType);
    } else {
      sql = `
        SELECT kc.id AS chunk_id, kc.document_id, kc.content,
          ts_rank(to_tsvector('portuguese', kc.content), plainto_tsquery('portuguese', $1)) AS bm25_score,
          0 AS vector_score,
          ts_rank(to_tsvector('portuguese', kc.content), plainto_tsquery('portuguese', $1)) AS combined_score
        FROM knowledge_chunks kc
        ${query.documentType ? 'JOIN knowledge_documents kd ON kd.id = kc.document_id' : ''}
        WHERE to_tsvector('portuguese', kc.content) @@ plainto_tsquery('portuguese', $1)
        ${query.documentType ? 'AND kd.document_type = $3' : ''}
        ORDER BY combined_score DESC
        LIMIT $2
      `;
      params = [query.text, maxResults];
      if (query.documentType) params.push(query.documentType);
    }

    const result = await this.pool.query(sql, params);

    const searches: HybridSearchResult[] = [];
    for (const row of result.rows) {
      const docResult = await this.pool.query(
        'SELECT * FROM knowledge_documents WHERE id = $1', [row.document_id]
      );

      searches.push({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        content: row.content,
        bm25Score: parseFloat(row.bm25_score),
        vectorScore: parseFloat(row.vector_score),
        combinedScore: parseFloat(row.combined_score),
        document: docResult.rows.length > 0 ? this.rowToDocument(docResult.rows[0]) : undefined,
      });
    }

    return searches;
  }

  async buildHnswIndex(m = 16, efConstruction = 200): Promise<void> {
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kc_embedding_hnsw ON knowledge_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = $1, ef_construction = $2)
    `, [m, efConstruction]);
  }

  async getStats(): Promise<{ documents: number; chunks: number; hasEmbeddings: boolean }> {
    const docCount = await this.pool.query('SELECT COUNT(*) as c FROM knowledge_documents');
    const chunkCount = await this.pool.query('SELECT COUNT(*) as c FROM knowledge_chunks');
    const embCount = await this.pool.query('SELECT COUNT(*) as c FROM knowledge_chunks WHERE embedding IS NOT NULL');

    return {
      documents: parseInt(docCount.rows[0].c),
      chunks: parseInt(chunkCount.rows[0].c),
      hasEmbeddings: parseInt(embCount.rows[0].c) > 0,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private rowToDocument(row: Record<string, unknown>): KnowledgeDocument {
    return {
      id: row.id as string,
      title: row.title as string,
      source: row.source as string,
      documentType: row.document_type as string,
      tags: row.tags as string[],
      metadata: row.metadata as Record<string, unknown>,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
      checksum: row.checksum as string,
    };
  }

  private rowToChunk(row: Record<string, unknown>): KnowledgeChunk {
    return {
      id: row.id as string,
      documentId: row.document_id as string,
      content: row.content as string,
      chunkIndex: row.chunk_index as number,
      tokenCount: row.token_count as number,
      embedding: row.embedding ? this.parseVector(row.embedding as string) : undefined,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }

  private parseVector(vec: string): number[] {
    return vec.replace(/[\[\]]/g, '').split(',').map(Number);
  }
}
```

---

## 8. L5 — Data Lake (DuckDB/Parquet)

### 8.1 Columnar Storage Benefits

L5 e a camada analitica. Diferente dos niveis anteriores (otimizados para pontos individuais), L5 e projetado para consultas agregadas e analise de grandes volumes.

O formato **Parquet** (columnar) oferece:
- **Compressao 3-5x melhor** que JSON/CSV (especialmente com ZSTD)
- **Leitura seletiva** de colunas (sem ler o registro inteiro)
- **Schema embutido** no arquivo
- **Predicate pushdown** (filtros aplicados antes da desserializacao)

Comparacao de formatos para 1M registros de memoria:

| Formato | Tamanho | Tempo Leitura (todos) | Tempo Leitura (1 coluna) | Compressao |
|---------|---------|----------------------|------------------------|-----------|
| JSON Lines | 850 MB | 12.4s | 12.4s | N/A |
| CSV | 620 MB | 8.1s | 8.1s | N/A |
| Parquet (ZSTD) | 180 MB | 3.2s | 0.4s | 4.7x |
| Parquet (Snappy) | 240 MB | 2.8s | 0.3s | 3.5x |

### 8.2 DuckDB para Analise OLAP

DuckDB e um banco OLAP embedded (como SQLite para OLTP). Vantagens para L5:

| Caracteristica | DuckDB | SQLite | PostgreSQL |
|---------------|--------|--------|-----------|
| Engine | Columnar (OLAP) | Row-based (OLTP) | Row-based (OLTP) |
| Scan 1B linhas | ~2s | ~2min | ~30s |
| Suporte Parquet | Nativo | Nao | Via FDW |
| Threads paralelos | Sim | Nao | Sim (mas limitado) |
| Embedded | Sim | Sim | Nao (server) |
| SQL Padrao | Quase completo | Limitado | Completo |

### 8.3 Parquet + ZSTD Compression

Schema Parquet para dados de memoria analitica:

```typescript
import parquet from 'parquetjs';
import * as duckdb from 'duckdb';

export interface AnalyticMemoryRecord {
  timestamp: Date;
  agentId: string;
  level: string;
  category: string;
  tokenCount: number;
  latencyMs: number;
  confidence: number;
  source: string;
  tags: string[];
}

const PARQUET_SCHEMA = new parquet.ParquetSchema({
  timestamp:    { type: 'TIMESTAMP_MILLIS' },
  agentId:      { type: 'UTF8' },
  level:        { type: 'UTF8' },
  category:     { type: 'UTF8' },
  tokenCount:   { type: 'INT64' },
  latencyMs:    { type: 'INT64' },
  confidence:   { type: 'DOUBLE' },
  source:       { type: 'UTF8' },
  tags:         { type: 'UTF8', repetitionType: 'REPEATED' },
});
```

### 8.4 Code Example: DataLake Query Engine

```typescript
import duckdb from 'duckdb';
import path from 'path';
import fs from 'fs';

export interface DataLakeConfig {
  dataDir: string;
  partitionBy?: 'month' | 'week' | 'day';
  compressionCodec: 'zstd' | 'snappy';
  rowGroupSize: number;
}

export class DataLake {
  private db: duckdb.Database;
  private conn: duckdb.Connection;
  private config: DataLakeConfig;

  constructor(config?: Partial<DataLakeConfig>) {
    this.config = {
      dataDir: path.join(process.cwd(), '.ideia', 'datalake'),
      partitionBy: 'month',
      compressionCodec: 'zstd',
      rowGroupSize: 100000,
      ...config,
    };

    fs.mkdirSync(this.config.dataDir, { recursive: true });
    this.db = new duckdb.Database(':memory:');
    this.conn = this.db.connect();
  }

  async ingestFromSqlite(sqlitePath: string, tableName = 'working_memory'): Promise<number> {
    return new Promise((resolve, reject) => {
      this.conn.exec(`
        INSTALL sqlite;
        LOAD sqlite;
        ATTACH '${sqlitePath}' AS src (TYPE sqlite);
        CREATE TABLE ${tableName} AS SELECT * FROM src.${tableName};
        DETACH src;
      `, (err) => {
        if (err) reject(err);
        else {
          this.conn.all(`SELECT COUNT(*) as c FROM ${tableName}`, (err2, res) => {
            if (err2) reject(err2);
            else resolve(res[0].c as number);
          });
        }
      });
    });
  }

  async ingestFromPostgres(connectionString: string, tableName = 'knowledge_chunks'): Promise<number> {
    return new Promise((resolve, reject) => {
      this.conn.exec(`
        INSTALL postgres;
        LOAD postgres;
        ATTACH '${connectionString}' AS pg (TYPE postgres);
        CREATE TABLE ${tableName}_analytics AS
          SELECT id, document_id, content, chunk_index, token_count, created_at
          FROM pg.${tableName};
        DETACH pg;
      `, (err) => {
        if (err) reject(err);
        else {
          this.conn.all(`SELECT COUNT(*) as c FROM ${tableName}_analytics`, (err2, res) => {
            if (err2) reject(err2);
            else resolve(res[0].c as number);
          });
        }
      });
    });
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      if (params) {
        this.conn.all(sql, ...params, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      } else {
        this.conn.all(sql, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      }
    });
  }

  async exportToParquet(tableName: string, outputPath?: string): Promise<string> {
    const finalPath = outputPath ?? path.join(this.config.dataDir, `${tableName}.parquet`);

    return new Promise((resolve, reject) => {
      this.conn.exec(`
        COPY (SELECT * FROM ${tableName}) TO '${finalPath}'
        (FORMAT PARQUET, CODEC '${this.config.compressionCodec}', ROW_GROUP_SIZE ${this.config.rowGroupSize})
      `, (err) => {
        if (err) reject(err);
        else resolve(finalPath);
      });
    });
  }

  async queryFromParquet(parquetPath: string, sql: string): Promise<unknown[]> {
    const fullSql = `SELECT * FROM '${parquetPath}' AS data WHERE ${sql}`;
    return this.query(fullSql);
  }

  async getAnalytics(timeRange?: { start: Date; end: Date }): Promise<{
    totalRecords: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    avgConfidence: number;
    topSources: { source: string; count: number }[];
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (timeRange) {
      conditions.push('created_at >= $1 AND created_at <= $2');
      params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tables = await this.listTables();
    const result: {
      totalRecords: number;
      byLevel: Record<string, number>;
      byCategory: Record<string, number>;
      avgConfidence: number;
      topSources: { source: string; count: number }[];
    } = {
      totalRecords: 0,
      byLevel: {},
      byCategory: {},
      avgConfidence: 0,
      topSources: [],
    };

    for (const table of tables) {
      try {
        const count = await this.query(`SELECT COUNT(*) as c FROM ${table} ${where}`, params.length > 0 ? params : undefined);
        result.totalRecords += (count[0] as Record<string, unknown>).c as number;

        const byLevel = await this.query(`SELECT level, COUNT(*) as c FROM ${table} ${where} GROUP BY level`, params.length > 0 ? params : undefined);
        for (const row of byLevel) {
          const r = row as Record<string, unknown>;
          const level = r.level as string;
          result.byLevel[level] = (result.byLevel[level] ?? 0) + (r.c as number);
        }

        const byCategory = await this.query(`SELECT category, COUNT(*) as c FROM ${table} ${where} GROUP BY category`, params.length > 0 ? params : undefined);
        for (const row of byCategory) {
          const r = row as Record<string, unknown>;
          const cat = r.category as string;
          result.byCategory[cat] = (result.byCategory[cat] ?? 0) + (r.c as number);
        }
      } catch {
        // tabela sem colunas esperadas, ignora
      }
    }

    return result;
  }

  private async listTables(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.conn.all(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'",
        (err, res) => {
          if (err) reject(err);
          else resolve((res as Record<string, unknown>[]).map(r => r.table_name as string));
        }
      );
    });
  }

  close(): void {
    this.conn.close();
    this.db.close();
  }
}
```

---

## 9. L6 — Arquivo Morto (MinIO/S3)

### 9.1 Object Storage Model

L6 representa o nivel mais frio da hierarquia. Dados que nao sao acessados por mais de 1 ano sao movidos para object storage (S3-compatible, como MinIO para on-premise ou AWS S3 para cloud).

Diferente dos niveis anteriores (que usam bancos de dados relacionais ou analiticos), L6 usa armazenamento de objetos:

| Caracteristica | Object Storage (L6) | Database (L4) | Data Lake (L5) |
|---------------|-------------------|---------------|----------------|
| Modelo | Blob/Objeto | Linhas/Colunas | Arquivos columnar |
| Query | Nao (restore primeiro) | SQL | SQL analitico |
| Custo/GB/mes | $0.01-0.02 (Glacier) | $0.10-0.50 | $0.02-0.05 |
| Recuperacao | 1-12h (Glacier) | < 100ms | < 1s |
| Ideal para | Backup, compliance, auditoria | Dados ativos | Dados quentes-analiticos |

### 9.2 Lifecycle Policies

As politicas de ciclo de vida no S3/MinIO automatizam a transicao entre tiers:

```
Bucket: ideia-archive

Pasta: memory/
  working/       → Transicao para Standard-IA apos 30 dias
  project/       → Transicao para OneZone-IA apos 90 dias
  institutional/ → Transicao para Glacier apos 180 dias
  global/        → Transicao para Glacier Deep Archive apos 365 dias

Regras:
  1. memory/working/* → expira apos 365 dias (delete)
  2. memory/project/* → move para Glacier apos 90 dias
  3. memory/institutional/* → move para Glacier apos 180 dias
  4. memory/global/* → move para Glacier Deep Archive apos 365 dias
```

### 9.3 Glacier/Deep Archive Integration

| Tier | Tempo de Restauracao | Custo/GB/mes | Custo Restauracao |
|------|---------------------|-------------|-------------------|
| S3 Standard | Instantaneo | $0.023 | $0 |
| S3 Standard-IA | Instantaneo | $0.0125 | $0.01/GB |
| S3 OneZone-IA | Instantaneo | $0.01 | $0.01/GB |
| S3 Glacier | 1-5 min (expedited) / 3-5h (standard) | $0.004 | $0.03/GB (expedited) |
| S3 Glacier Deep Archive | 12h (standard) | $0.001 | $0.02/GB |

### 9.4 Code Example: ArchiveManager com S3-compatible API

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
  ListObjectsV2Command, RestoreObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import crypto from 'crypto';

export type ArchiveTier = 'standard' | 'glacier' | 'deep-archive';

export interface ArchiveConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  defaultTier: ArchiveTier;
}

export class ArchiveManager {
  private client: S3Client;
  private bucket: string;
  private config: ArchiveConfig;

  constructor(config?: Partial<ArchiveConfig>) {
    this.config = {
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'ideia-archive',
      accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      forcePathStyle: true,
      defaultTier: 'glacier',
      ...config,
    };

    this.bucket = this.config.bucket;
    this.client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: this.config.forcePathStyle,
    });
  }

  async archive(level: string, entryId: string, data: string | Buffer, tier?: ArchiveTier): Promise<string> {
    const key = this.buildKey(level, entryId);
    const storageTier = tier ?? this.config.defaultTier;
    const body = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;

    const storageClass = this.tierToStorageClass(storageTier);

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      StorageClass: storageClass,
      Metadata: {
        'ideia-level': level,
        'ideia-entry-id': entryId,
        'ideia-archived-at': new Date().toISOString(),
        'ideia-checksum': crypto.createHash('sha256').update(body).digest('hex'),
      },
    }));

    return key;
  }

  async restore(key: string, tier?: ArchiveTier): Promise<Buffer> {
    const storageTier = tier ?? 'standard';

    if (storageTier !== 'standard') {
      await this.client.send(new RestoreObjectCommand({
        Bucket: this.bucket,
        Key: key,
        RestoreRequest: {
          Days: 7,
          GlacierJobParameters: {
            Tier: storageTier === 'glacier' ? 'Standard' : 'Bulk',
          },
        },
      }));
    }

    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async list(level: string, prefix?: string): Promise<{ key: string; size: number; lastModified: Date; storageClass: string }[]> {
    const keyPrefix = prefix
      ? this.buildKey(level, prefix)
      : `memory/${level}/`;

    const objects: { key: string; size: number; lastModified: Date; storageClass: string }[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: keyPrefix,
        ContinuationToken: continuationToken,
      }));

      if (response.Contents) {
        for (const obj of response.Contents) {
          objects.push({
            key: obj.Key!,
            size: obj.Size!,
            lastModified: obj.LastModified!,
            storageClass: obj.StorageClass ?? 'STANDARD',
          });
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  async migrateParquetToArchive(sourcePath: string, level: string): Promise<string> {
    const entryId = path.basename(sourcePath, '.parquet');
    const key = this.buildKey(level, `${entryId}.parquet`);

    const fileContent = await require('fs').promises.readFile(sourcePath);

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileContent,
      StorageClass: 'GLACIER',
      Metadata: {
        'ideia-level': level,
        'ideia-source-path': sourcePath,
        'ideia-archived-at': new Date().toISOString(),
      },
    }));

    return key;
  }

  async verifyChecksum(key: string): Promise<boolean> {
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      const data = Buffer.concat(chunks);
      const actualChecksum = crypto.createHash('sha256').update(data).digest('hex');
      const expectedChecksum = response.Metadata?.['ideia-checksum'];

      return !expectedChecksum || actualChecksum === expectedChecksum;
    } catch {
      return false;
    }
  }

  private buildKey(level: string, entryId: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    return `memory/${level}/${date}/${entryId}`;
  }

  private tierToStorageClass(tier: ArchiveTier): string {
    switch (tier) {
      case 'glacier': return 'GLACIER';
      case 'deep-archive': return 'DEEP_ARCHIVE';
      default: return 'STANDARD';
    }
  }
}
```

---

## 10. Cache Coherence & Invalidation

### 10.1 Write-Through vs Write-Behind

Quando um dado e modificado em um nivel, os demais niveis precisam ser notificados. Duas estrategias principais:

| Estrategia | Descricao | Consistencia | Latencia | Risco |
|-----------|-----------|-------------|---------|-------|
| Write-Through | Escreve em todos os niveis sincronamente | Forte | Alta (soma das latencias) | Baixo |
| Write-Behind | Escreve no cache, depois propaga async | Eventual | Baixa (so cache) | Medio (perda se crash) |
| Write-Around | Escreve so no DB, invalida cache | Eventual | Media | Baixo (cache sempre fresco) |

A IDEIA usa **Write-Around** como padrao (escreve no L3 SQLite ou L4 PostgreSQL, depois invalida caches L1/L2 via barramento de eventos).

### 10.2 Event-based Invalidation (via NATS/Event Bus)

O EventBus existente em `packages/event-bus/` e usado para invalidacao cross-nivel:

```typescript
export interface InvalidationEvent {
  type: 'cache.invalidate';
  source: string;
  payload: {
    level: 'l1' | 'l2' | 'l3' | 'l4';
    keys: string[];
    pattern?: string;
    reason: 'update' | 'delete' | 'promotion' | 'expiry';
  };
  metadata: {
    timestamp: string;
    ttl?: number;
  };
}
```

Fluxo de invalidacao:

```
1. Agente atualiza dado no L3 (SQLite)
2. L3 emite evento: cache.invalidate { level: 'l3', keys: ['entry:123'] }
3. NATS distribui para todos os subscribers
4. L1 subscriber ouve e remove entry:123 do cache de sessao
5. L2 subscriber ouve e remove entry:123 do Redis
6. Opcional: L4 subscriber marca entry:123 como 'stale' para re-indexacao
```

### 10.3 Stale-read Tolerance Levels

Nem todo dado precisa ser fresco. A IDEIA define niveis de tolerancia:

| Nivel | Tolerancia | Exemplos | Acao em Invalidation |
|-------|-----------|---------|---------------------|
| Critical | 0s | Decisoes de seguranca, politicas, audit trail | Invalidate sync + block read |
| High | 5s | Decisoes arquiteturais, preferencias do usuario | Invalidate async + warn |
| Medium | 60s | Padroes detectados, observacoes | Invalidate async + stale ok |
| Low | 300s | Cache de LLM, resultados de busca | TTL expiry only |

```typescript
export type StaleTolerance = 'critical' | 'high' | 'medium' | 'low';

export interface CachePolicy {
  level: string;
  tolerance: StaleTolerance;
  invalidationStrategy: 'sync' | 'async' | 'ttl-only';
  maxStaleMs: number;
}

const DEFAULT_CACHE_POLICIES: CachePolicy[] = [
  { level: 'l1', tolerance: 'high', invalidationStrategy: 'async', maxStaleMs: 5000 },
  { level: 'l2', tolerance: 'medium', invalidationStrategy: 'async', maxStaleMs: 60000 },
  { level: 'l3', tolerance: 'high', invalidationStrategy: 'sync', maxStaleMs: 5000 },
  { level: 'l4', tolerance: 'low', invalidationStrategy: 'ttl-only', maxStaleMs: 300000 },
];
```

### 10.4 Code Example: CacheInvalidationService com Event Bus Integration

```typescript
import { EventBus, BusEvent } from '@ideia/event-bus';

export interface InvalidationRule {
  eventType: string;
  sourceLevel: string;
  targetLevels: string[];
  keyExtractor: (event: BusEvent) => string[];
  priority: number;
}

export class CacheInvalidationService {
  private rules: InvalidationRule[] = [];
  private subscriptions: string[] = [];
  private invalidationCount = 0;

  constructor(private eventBus: EventBus) {}

  addRule(rule: InvalidationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);

    const subId = this.eventBus.subscribe(rule.eventType, (event: BusEvent) => {
      this.handleEvent(event, rule);
    });

    this.subscriptions.push(subId);
  }

  private handleEvent(event: BusEvent, rule: InvalidationRule): void {
    const keys = rule.keyExtractor(event);

    for (const targetLevel of rule.targetLevels) {
      this.invalidate(targetLevel, keys, event.type);
    }
  }

  invalidate(level: string, keys: string[], reason: string): void {
    this.invalidationCount++;

    const invalidationEvent: BusEvent = {
      type: 'cache.invalidate',
      source: 'cache-invalidation-service',
      payload: {
        level,
        keys,
        reason,
      },
      metadata: { timestamp: new Date().toISOString() },
    };

    this.eventBus.emit(invalidationEvent);
  }

  invalidatePattern(level: string, pattern: string, reason: string): void {
    this.invalidationCount++;

    const event: BusEvent = {
      type: 'cache.invalidate',
      source: 'cache-invalidation-service',
      payload: {
        level,
        keys: [],
        pattern,
        reason: `pattern:${reason}`,
      },
      metadata: { timestamp: new Date().toISOString() },
    };

    this.eventBus.emit(event);
  }

  getStats(): { totalInvalidations: number; activeRules: number } {
    return {
      totalInvalidations: this.invalidationCount,
      activeRules: this.rules.length,
    };
  }

  destroy(): void {
    for (const id of this.subscriptions) {
      this.eventBus.unsubscribe(id);
    }
    this.subscriptions = [];
    this.rules = [];
  }
}
```

---

## 11. Memory Performance Budget

### 11.1 Latency Budget Table

| Operacao | Nivel | Orcamento P95 | Orcamento P99 | Medicao |
|---------|-------|--------------|--------------|---------|
| Get (cache hit) | L1 | < 1ms | < 2ms | performance.now() |
| Get (cache miss, L3) | L3 | < 10ms | < 50ms | SQLite query time |
| Get (cache miss, L4) | L4 | < 50ms | < 100ms | PostgreSQL query time |
| Set | L1 | < 1ms | < 2ms | Map.set() |
| Set (com persistencia) | L3 | < 5ms | < 20ms | SQLite INSERT |
| Set (com sync) | L4 | < 30ms | < 100ms | PostgreSQL INSERT |
| Search (L3 FTS5) | L3 | < 5ms | < 20ms | FTS5 query |
| Search (L4 hybrid) | L4 | < 100ms | < 500ms | Vector + BM25 |
| Search (L5 OLAP) | L5 | < 500ms | < 2s | DuckDB query |
| Archive (L6) | L6 | < 1s | < 5s | S3 PUT |
| Restore (L6 glacier) | L6 | < 1h (standard) | < 12h | S3 restore |
| Invalidation | Cross | < 10ms | < 50ms | Event bus |
| Promotion evaluation | L3-L4 | < 100ms | < 500ms | Curator rules |

### 11.2 Capacity Planning

| Nivel | Carga Tipica (100 projetos) | Carga Maxima (1000 projetos) | Storage Necessario |
|-------|---------------------------|----------------------------|-------------------|
| L0 | 200K tokens/agente | 1M tokens/agente | RAM: O(context window) |
| L1 | 500 entradas/sessao | 5000 entradas/sessao | RAM: 10MB/sessao |
| L2 | 50K chaves | 500K chaves | RAM: 1-5GB |
| L3 | 10K registros | 100K registros | Disco: 100MB-1GB |
| L4 | 500K chunks | 5M chunks | Disco: 10-100GB |
| L5 | 10M registros analiticos | 100M registros | Disco: 100GB-1TB |
| L6 | 1M arquivos de archive | 10M arquivos | Object: > 1TB |

### 11.3 Monitoring & Alerting (Prometheus Metrics)

Metricas essenciais para cada nivel:

```
# Nivel L1 - Session Cache
ideia_memory_l1_size{level="l1"}           # Entradas no cache
ideia_memory_l1_hit_rate{level="l1"}       # Hit rate (target > 80%)
ideia_memory_l1_evictions_total{level="l1"} # Evictions por LRU
ideia_memory_l1_latency_ms{level="l1"}     # Latencia P50/P95/P99

# Nivel L3 - SQLite Working Memory
ideia_memory_l3_size{level="l3"}           # Registros no SQLite
ideia_memory_l3_fts_query_ms{level="l3"}   # Latencia FTS5
ideia_memory_l3_expired_total{level="l3"}  # Entradas expiradas

# Nivel L4 - PostgreSQL + pgvector
ideia_memory_l4_documents{level="l4"}      # Documentos
ideia_memory_l4_chunks{level="l4"}         # Chunks
ideia_memory_l4_hybrid_query_ms{level="l4"} # Latencia busca hibrida
ideia_memory_l4_recall{level="l4"}         # Recall@10

# Cross-level
ideia_memory_invalidations_total           # Invalidacoes emitidas
ideia_memory_promotions_total              # Promocoes entre niveis
ideia_memory_archive_size_bytes            # Tamanho total arquivado
ideia_memory_migration_latency_ms          # Latencia entre niveis
```

### 11.4 Code Example: Memory Metrics Collector

```typescript
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

export class MemoryMetrics {
  private registry: Registry;

  // L1 metrics
  private l1Size: Gauge;
  private l1HitRate: Gauge;
  private l1Evictions: Counter;
  private l1Latency: Histogram;

  // L3 metrics
  private l3Size: Gauge;
  private l3FtsLatency: Histogram;

  // L4 metrics
  private l4Documents: Gauge;
  private l4Chunks: Gauge;
  private l4HybridLatency: Histogram;

  // Cross-level
  private invalidations: Counter;
  private promotions: Counter;
  private archiveSize: Gauge;

  constructor(registry?: Registry) {
    this.registry = registry ?? new Registry();

    this.l1Size = new Gauge({
      name: 'ideia_memory_l1_size',
      help: 'Session cache size',
      labelNames: ['level'],
      registers: [this.registry],
    });

    this.l1HitRate = new Gauge({
      name: 'ideia_memory_l1_hit_rate',
      help: 'Session cache hit rate',
      labelNames: ['level'],
      registers: [this.registry],
    });

    this.l1Evictions = new Counter({
      name: 'ideia_memory_l1_evictions_total',
      help: 'Total session cache evictions',
      labelNames: ['level'],
      registers: [this.registry],
    });

    this.l1Latency = new Histogram({
      name: 'ideia_memory_l1_latency_ms',
      help: 'Session cache operation latency',
      labelNames: ['level', 'operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 50],
      registers: [this.registry],
    });

    this.l3Size = new Gauge({
      name: 'ideia_memory_l3_size',
      help: 'SQLite working memory record count',
      labelNames: ['level'],
      registers: [this.registry],
    });

    this.l3FtsLatency = new Histogram({
      name: 'ideia_memory_l3_fts_query_ms',
      help: 'FTS5 query latency',
      labelNames: ['level'],
      buckets: [1, 5, 10, 20, 50, 100, 500],
      registers: [this.registry],
    });

    this.l4Documents = new Gauge({
      name: 'ideia_memory_l4_documents',
      help: 'Knowledge base document count',
      labelNames: ['level', 'type'],
      registers: [this.registry],
    });

    this.l4Chunks = new Gauge({
      name: 'ideia_memory_l4_chunks',
      help: 'Knowledge base chunk count',
      labelNames: ['level'],
      registers: [this.registry],
    });

    this.l4HybridLatency = new Histogram({
      name: 'ideia_memory_l4_hybrid_query_ms',
      help: 'Hybrid search query latency',
      labelNames: ['level'],
      buckets: [10, 50, 100, 200, 500, 1000, 5000],
      registers: [this.registry],
    });

    this.invalidations = new Counter({
      name: 'ideia_memory_invalidations_total',
      help: 'Total cache invalidations',
      labelNames: ['source_level', 'target_level', 'reason'],
      registers: [this.registry],
    });

    this.promotions = new Counter({
      name: 'ideia_memory_promotions_total',
      help: 'Total memory promotions between levels',
      labelNames: ['from_level', 'to_level', 'category'],
      registers: [this.registry],
    });

    this.archiveSize = new Gauge({
      name: 'ideia_memory_archive_size_bytes',
      help: 'Archive storage size',
      labelNames: ['level', 'tier'],
      registers: [this.registry],
    });
  }

  observeL1Latency(operation: string, latencyMs: number): void {
    this.l1Latency.observe({ level: 'l1', operation }, latencyMs);
  }

  setL1Size(size: number): void {
    this.l1Size.set({ level: 'l1' }, size);
  }

  setL1HitRate(rate: number): void {
    this.l1HitRate.set({ level: 'l1' }, rate);
  }

  incrementL1Evictions(): void {
    this.l1Evictions.inc({ level: 'l1' });
  }

  setL3Size(size: number): void {
    this.l3Size.set({ level: 'l3' }, size);
  }

  observeL3FtsLatency(latencyMs: number): void {
    this.l3FtsLatency.observe({ level: 'l3' }, latencyMs);
  }

  setL4Documents(docType: string, count: number): void {
    this.l4Documents.set({ level: 'l4', type: docType }, count);
  }

  setL4Chunks(count: number): void {
    this.l4Chunks.set({ level: 'l4' }, count);
  }

  observeL4HybridLatency(latencyMs: number): void {
    this.l4HybridLatency.observe({ level: 'l4' }, latencyMs);
  }

  incrementInvalidations(sourceLevel: string, targetLevel: string, reason: string): void {
    this.invalidations.inc({ source_level: sourceLevel, target_level: targetLevel, reason });
  }

  incrementPromotion(fromLevel: string, toLevel: string, category: string): void {
    this.promotions.inc({ from_level: fromLevel, to_level: toLevel, category });
  }

  setArchiveSize(level: string, tier: string, sizeBytes: number): void {
    this.archiveSize.set({ level, tier }, sizeBytes);
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
```

---

## 12. Implementacao na IDEIA

### 12.1 Package Structure

```
packages/memory/
  src/
    l0-context/           # Context window manager
      ├── context-compressor.ts    (compressao seletiva)
      ├── budget-tracker.ts        (alocacao de tokens)
      ├── sliding-window.ts        (implementacao sliding window)
      └── context-window-manager.ts (fachada L0)

    l1-session/           # Session cache
      ├── session-cache.ts         (cache in-memory com LRU+TTL)
      └── session-store.ts         (persistencia opcional em disco)

    l2-distributed/       # Redis cache
      ├── redis-cache.ts           (cache distribui­do)
      ├── redis-key-builder.ts     (namespace:key:field)
      └── redis-lock.ts            (distributed lock)

    l3-working/           # SQLite working memory
      ├── sqlite-working-memory.ts (implementacao SQLite + FTS5)
      └── migrations/
          └── 001-initial.sql

    l4-knowledge/         # PostgreSQL + pgvector
      ├── knowledge-base.ts        (documentos + chunks + embeddings)
      ├── hybrid-search.ts         (BM25 + vector similarity)
      └── migrations/
          └── 001-vector-extension.sql

    l5-datalake/          # DuckDB
      ├── data-lake.ts             (DuckDB query engine)
      └── parquet-exporter.ts      (export para Parquet)

    l6-archive/           # MinIO/S3
      ├── archive-manager.ts       (S3-compatible archive)
      └── lifecycle-policies.ts    (politicas de ciclo de vida)

    coherence/            # Cache invalidation
      ├── cache-invalidation.ts    (servico de invalidacao)
      └── stale-tolerance.ts       (niveis de tolerancia)

    metrics/              # Observability
      ├── memory-metrics.ts        (Prometheus metrics)
      └── memory-tracing.ts        (OpenTelemetry spans)

    hierarchy.ts          # Fachada unificada (ja existe)
    index.ts              # Exports
    types.ts              # Tipos compartilhados (ja existe)
```

### 12.2 Integracao com Estudos Existentes

| Estudo | Relacao | Pontos de Integracao |
|--------|---------|---------------------|
| S2 (Memoria e Contexto) | Alinhamento com L0-L3 | Context window, episodic memory, hierarchical summary |
| S58 (Data Strategy) | Alinhamento com L4-L6 | Data governance, lineage, retention policies |
| S1 (Event Bus) | Invalidacao cross-nivel | NATS pub/sub para eventos de invalidacao |
| S54 (Performance) | Budget de latencia e capacidade | Benchmarks, targets de P50/P95/P99 |
| S55 (Resiliencia) | Tolerancia a falhas de cache | Circuit breaker para Redis, fallback para L3 |
| S17 (Observabilidade) | Metricas e tracing | Prometheus metrics, OpenTelemetry spans |

### 12.3 Configuracao por Nivel de Autonomia (N0-N4)

| Nivel | Autonomia | Memoria Ativa | Cache | Persistencia | Archive |
|-------|-----------|--------------|-------|-------------|---------|
| N0 | Assistido | L0 + L1 | Desligado | Session-only | Nao |
| N1 | Supervisionado | L0 + L1 + L3 | L1 ativo | SQLite local | Nao |
| N2 | Semi-autonomo | L0-L4 | L1+L2 ativos | PostgreSQL remoto | Nao |
| N3 | Autonomo | L0-L5 | Todos ativos | Full stack | Manual |
| N4 | Total | L0-L6 | Todos + prefetch | Full stack | Automatico |

Exemplo de configuracao:

```typescript
export interface MemoryConfig {
  level: 'l0' | 'l1' | 'l2' | 'l3' | 'l4' | 'l5' | 'l6';
  autonomy: 'n0' | 'n1' | 'n2' | 'n3' | 'n4';
  l1Cache: { maxEntries: number; ttlMs: number };
  l2Cache: { redisUrl?: string; clusterMode: boolean };
  l3Sqlite: { path: string; walMode: boolean };
  l4Postgres: { connectionString: string; pgvector: boolean };
  l5DuckDb: { dataDir: string; compression: 'zstd' | 'snappy' };
  l6S3: { endpoint: string; bucket: string; tier: 'standard' | 'glacier' };
}

export function getMemoryConfigForAutonomy(autonomy: string): Partial<MemoryConfig> {
  switch (autonomy) {
    case 'n0':
      return {
        l1Cache: { maxEntries: 20, ttlMs: 600000 },
        l3Sqlite: { path: ':memory:', walMode: false },
      };
    case 'n1':
      return {
        l1Cache: { maxEntries: 50, ttlMs: 3600000 },
        l3Sqlite: { path: './.ideia/working.db', walMode: true },
      };
    case 'n2':
      return {
        l1Cache: { maxEntries: 200, ttlMs: 3600000 },
        l2Cache: { redisUrl: 'redis://localhost:6379', clusterMode: false },
        l3Sqlite: { path: './.ideia/working.db', walMode: true },
        l4Postgres: { connectionString: process.env.DATABASE_URL!, pgvector: true },
      };
    case 'n3':
      return {
        l1Cache: { maxEntries: 500, ttlMs: 7200000 },
        l2Cache: { redisUrl: process.env.REDIS_URL, clusterMode: true },
        l3Sqlite: { path: './.ideia/working.db', walMode: true },
        l4Postgres: { connectionString: process.env.DATABASE_URL!, pgvector: true },
        l5DuckDb: { dataDir: './.ideia/datalake', compression: 'zstd' },
      };
    case 'n4':
      return {
        l1Cache: { maxEntries: 1000, ttlMs: 14400000 },
        l2Cache: { redisUrl: process.env.REDIS_URL, clusterMode: true },
        l3Sqlite: { path: './.ideia/working.db', walMode: true },
        l4Postgres: { connectionString: process.env.DATABASE_URL!, pgvector: true },
        l5DuckDb: { dataDir: './.ideia/datalake', compression: 'zstd' },
        l6S3: { endpoint: process.env.S3_ENDPOINT!, bucket: 'ideia-archive', tier: 'glacier' },
      };
    default:
      return {};
  }
}
```

### 12.4 Hierarquia Unificada — MemoryHierarchy Estendida

A classe `MemoryHierarchy` existente em `hierarchy.ts` deve ser estendida para integrar todos os 7 niveis:

```typescript
import { ContextCompressor } from './l0-context/context-compressor';
import { SessionCache } from './l1-session/session-cache';
import { DistributedCache } from './l2-distributed/redis-cache';
import { SqliteWorkingMemory } from './l3-working/sqlite-working-memory';
import { KnowledgeBase } from './l4-knowledge/knowledge-base';
import { DataLake } from './l5-datalake/data-lake';
import { ArchiveManager } from './l6-archive/archive-manager';
import { CacheInvalidationService } from './coherence/cache-invalidation';
import { MemoryMetrics } from './metrics/memory-metrics';

export class UnifiedMemoryHierarchy {
  readonly l0: ContextCompressor;
  readonly l1: SessionCache;
  readonly l2: DistributedCache;
  readonly l3: SqliteWorkingMemory;
  readonly l4: KnowledgeBase;
  readonly l5: DataLake;
  readonly l6: ArchiveManager;
  readonly invalidation: CacheInvalidationService;
  readonly metrics: MemoryMetrics;

  constructor(config: MemoryConfig) {
    this.l0 = new ContextCompressor({ maxTokens: 128000, strategy: 'rolling' });
    this.l1 = new SessionCache({ maxEntries: config.l1Cache.maxEntries, defaultTtlMs: config.l1Cache.ttlMs, maxSizeBytes: 50 * 1024 * 1024, evictionPolicy: 'lru' });
    this.l2 = new DistributedCache({ redisUrl: config.l2Cache?.redisUrl, fallbackToMemory: true, defaultTtlMs: 300000, maxRetries: 3 });
    this.l3 = new SqliteWorkingMemory(config.l3Sqlite?.path);
    this.l4 = new KnowledgeBase(config.l4Postgres?.connectionString ?? '', 1536);
    this.l5 = new DataLake({ dataDir: config.l5DuckDb?.dataDir, compressionCodec: config.l5DuckDb?.compression === 'snappy' ? 'snappy' : 'zstd', rowGroupSize: 100000 });
    this.l6 = new ArchiveManager({ endpoint: config.l6S3?.endpoint, bucket: config.l6S3?.bucket ?? 'ideia-archive', defaultTier: config.l6S3?.tier ?? 'glacier' });
    this.metrics = new MemoryMetrics();
    this.invalidation = new CacheInvalidationService(/* eventBus */);

    this.setupInvalidationRules();
  }

  private setupInvalidationRules(): void {
    this.invalidation.addRule({
      eventType: 'memory.updated',
      sourceLevel: 'l3',
      targetLevels: ['l1'],
      keyExtractor: (event) => [event.payload.entryId as string],
      priority: 10,
    });

    this.invalidation.addRule({
      eventType: 'knowledge.chunk.updated',
      sourceLevel: 'l4',
      targetLevels: ['l1', 'l2'],
      keyExtractor: (event) => [`chunk:${event.payload.chunkId as string}`],
      priority: 20,
    });
  }

  async store(params: {
    level?: string;
    category: string;
    content: string;
    source?: string;
    tags?: string[];
    confidence?: number;
  }): Promise<string> {
    const start = Date.now();

    if (params.level === 'l1' || !params.level) {
      const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      this.l1.set(id, { content: params.content, category: params.category, tags: params.tags ?? [] });
      this.metrics.observeL1Latency('set', Date.now() - start);
      return id;
    }

    if (params.level === 'l3') {
      const entry = this.l3.store({
        category: params.category,
        content: params.content,
        source: params.source,
        tags: params.tags,
        confidence: params.confidence,
      });
      this.metrics.setL3Size(this.l3.getStats().total);
      return entry.id;
    }

    if (params.level === 'l4') {
      const doc = await this.l4.storeDocument({ title: params.content.slice(0, 100), source: params.source, tags: params.tags });
      this.metrics.setL4Documents('generic', (await this.l4.getStats()).documents);
      return doc.id;
    }

    throw new Error(`Nivel de memoria nao suportado: ${params.level}`);
  }

  async search(query: string, options?: {
    levels?: string[];
    maxResults?: number;
    minConfidence?: number;
  }): Promise<{ content: string; level: string; score: number }[]> {
    const results: { content: string; level: string; score: number }[] = [];
    const levels = options?.levels ?? ['l1', 'l3', 'l4'];
    const maxResults = options?.maxResults ?? 10;

    for (const level of levels) {
      if (results.length >= maxResults) break;

      switch (level) {
        case 'l1': {
          const start = Date.now();
          for (const key of this.l1.keys) {
            const entry = this.l1.get<{ content: string; category: string; tags: string[] }>(key);
            if (entry) {
              const content = entry.content ?? '';
              if (content.toLowerCase().includes(query.toLowerCase())) {
                results.push({ content, level: 'l1', score: 0.5 });
              }
            }
          }
          this.metrics.observeL1Latency('search', Date.now() - start);
          break;
        }
        case 'l3': {
          const start = Date.now();
          const entries = this.l3.hybridSearch(query, maxResults);
          for (const e of entries) {
            results.push({ content: e.entry.content, level: 'l3', score: e.rank });
          }
          this.metrics.observeL3FtsLatency(Date.now() - start);
          break;
        }
        case 'l4': {
          const start = Date.now();
          const searches = await this.l4.hybridSearch({ text: query, maxResults, alpha: 0.5 });
          for (const s of searches) {
            results.push({ content: s.content, level: 'l4', score: s.combinedScore });
          }
          this.metrics.observeL4HybridLatency(Date.now() - start);
          break;
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  async promote(fromLevel: string, entryId: string, toLevel: string): Promise<boolean> {
    let entry: { content: string; category: string; tags?: string[] } | undefined;

    if (fromLevel === 'l3') {
      const wmEntry = this.l3.get(entryId);
      if (wmEntry) {
        entry = { content: wmEntry.content, category: wmEntry.category, tags: wmEntry.tags };
      }
    }

    if (!entry) return false;

    if (toLevel === 'l4') {
      await this.l4.storeDocument({
        title: entry.content.slice(0, 100),
        source: 'promocao-automatica',
        tags: entry.tags,
      });
      this.metrics.incrementPromotion(fromLevel, toLevel, entry.category);
      return true;
    }

    return false;
  }
}
```

---

## 13. Code Examples (Comprehensive)

### 13.1 ContextWindowManager — Implementacao Completa

```typescript
export class ContextWindowManager {
  private messages: { role: string; content: string; timestamp: number }[] = [];
  private maxTokens: number;

  constructor(config: { maxTokens: number }) {
    this.maxTokens = config.maxTokens;
  }

  add(role: string, content: string): void {
    this.messages.push({ role, content, timestamp: Date.now() });
    this.trim();
  }

  private trim(): void {
    let totalTokens = this.estimateTokens();
    while (totalTokens > this.maxTokens && this.messages.length > 1) {
      const removed = this.messages.shift()!;
      totalTokens = this.estimateTokens();
    }
  }

  private estimateTokens(): number {
    return this.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  }

  getContext(): { role: string; content: string }[] {
    return this.messages.map(m => ({ role: m.role, content: m.content }));
  }

  summarize(summarizer: (text: string) => Promise<string>): Promise<void> {
    if (this.estimateTokens() <= this.maxTokens * 0.8) return Promise.resolve();

    const half = Math.floor(this.messages.length / 2);
    const olderHalf = this.messages.slice(0, half);
    const recentHalf = this.messages.slice(half);

    const textToSummarize = olderHalf.map(m => `[${m.role}]: ${m.content}`).join('\n');

    return summarizer(textToSummarize).then(summary => {
      this.messages = [
        { role: 'system', content: `[Resumo do contexto anterior]: ${summary}`, timestamp: olderHalf[0]?.timestamp ?? Date.now() },
        ...recentHalf,
      ];
    });
  }

  clear(): void {
    this.messages = [];
  }

  get stats(): { totalMessages: number; totalTokens: number; utilization: number } {
    const totalTokens = this.estimateTokens();
    return {
      totalMessages: this.messages.length,
      totalTokens,
      utilization: totalTokens / this.maxTokens,
    };
  }
}
```

### 13.2 SessionCache com LRU + TTL

(Implementado na Secao 4.4 — `SessionCache` class completa.)

### 13.3 DistributedCache com Redis

(Implementado na Secao 5.4 — `DistributedCache` class completa com fallback in-memory.)

### 13.4 WorkingMemory com SQLite FTS5

(Implementado na Secao 6.4 — `SqliteWorkingMemory` class completa com schema, FTS5, WAL mode.)

### 13.5 KnowledgeBase com pgvector

(Implementado na Secao 7.4 — `KnowledgeBase` class completa com hybrid search, HNSW index.)

### 13.6 CacheInvalidationService

(Implementado na Secao 10.4 — `CacheInvalidationService` class completa com event bus integration.)

### 13.7 MemoryMetricsCollector (Prometheus)

(Implementado na Secao 11.4 — `MemoryMetrics` class completa com gauges, counters, histograms.)

### 13.8 DataLake Query Engine

(Implementado na Secao 8.4 — `DataLake` class completa com DuckDB + Parquet export.)

### 13.9 ArchiveManager S3-compatible

(Implementado na Secao 9.4 — `ArchiveManager` class completa com lifecycle policies.)

---

## 14. Implementation Roadmap

### 14.1 Phase 1 (Week 1-2): L0 + L1 (Context Window + Session Cache)

**Tarefas:**
- T1.1: Integrar `ContextCompressor` existente do `prompt-economy` com o `MemoryHierarchy`
- T1.2: Estender `WorkingMemory` para `SessionCache` com LRU + TTL configuravel
- T1.3: Adicionar serializacao MessagePack ao `SessionCache`
- T1.4: Testes unitarios: L0 (compressao, rolling window), L1 (eviction, TTL)

**Estimativa:** 40h, 6 tasks
**Entregavel:** `packages/memory/src/l0-context/` e `packages/memory/src/l1-session/`

### 14.2 Phase 2 (Week 3-4): L3 (SQLite Working Memory)

**Tarefas:**
- T2.1: Criar `SqliteWorkingMemory` com schema FTS5 (baseado no codigo da Secao 6)
- T2.2: Migrar dados do `memory-store` (JSON file) para SQLite
- T2.3: Implementar `MemoryCurator` sobre SQLite (promocao working → project)
- T2.4: Testes de migracao, performance FTS5, concorrencia WAL

**Estimativa:** 40h, 6 tasks
**Entregavel:** `packages/memory/src/l3-working/`

### 14.3 Phase 3 (Week 5-6): L2 (Redis Distributed Cache)

**Tarefas:**
- T3.1: Implementar `DistributedCache` com Redis client (baseado na Secao 5)
- T3.2: Implementar fallback para `SessionCache` (L1) quando Redis indisponivel
- T3.3: Configurar cluster mode + key design patterns
- T3.4: Testes de integracao com Redis Container

**Estimativa:** 40h, 6 tasks
**Entregavel:** `packages/memory/src/l2-distributed/`

### 14.4 Phase 4 (Week 7-8): L4 (PostgreSQL + pgvector)

**Tarefas:**
- T4.1: Integrar `postgresql-layer` existente com `KnowledgeBase`
- T4.2: Implementar hybrid search (BM25 + vector) com pgvector
- T4.3: Configurar HNSW index + rebuild automation
- T4.4: Testes de recall, latencia P95/P99, ingestao em lote

**Estimativa:** 60h, 8 tasks
**Entregavel:** `packages/memory/src/l4-knowledge/`

### 14.5 Phase 5 (Week 9-10): L5 + L6 (DuckDB + S3)

**Tarefas:**
- T5.1: Implementar `DataLake` com DuckDB (baseado na Secao 8)
- T5.2: Script de exportacao L4 → L5 (PostgreSQL → Parquet)
- T5.3: Implementar `ArchiveManager` S3-compatible (baseado na Secao 9)
- T5.4: Script de migracao L5 → L6 (Parquet → S3 Glacier)
- T5.5: Lifecycle policies automation

**Estimativa:** 60h, 8 tasks
**Entregavel:** `packages/memory/src/l5-datalake/` e `packages/memory/src/l6-archive/`

### 14.6 Phase 6 (Week 11-12): Coherence + Metrics + Tuning

**Tarefas:**
- T6.1: Implementar `CacheInvalidationService` com Event Bus
- T6.2: Implementar `MemoryMetrics` Prometheus collector
- T6.3: Integracao com OpenTelemetry para tracing cross-nivel
- T6.4: Tuning de performance (LRU vs LFU, HNSW vs IVFFlat, WAL params)
- T6.5: Testes de carga (k6 simulando 100 agentes concorrentes)
- T6.6: Documentacao final e ADR

**Estimativa:** 80h, 8 tasks
**Entregavel:** `packages/memory/src/coherence/` e `packages/memory/src/metrics/`

### 14.7 Total

| Fase | Horas | Tasks | Depende de |
|------|-------|-------|-----------|
| Phase 1 (L0+L1) | 40 | 6 | - |
| Phase 2 (L3) | 40 | 6 | Phase 1 |
| Phase 3 (L2) | 40 | 6 | Phase 1 |
| Phase 4 (L4) | 60 | 8 | Phase 2 |
| Phase 5 (L5+L6) | 60 | 8 | Phase 4 |
| Phase 6 (Coherence+Metrics) | 80 | 8 | Phase 3, 4, 5 |
| **Total** | **320h** | **42 tasks** | |

### 14.8 Diagrama de Dependencias

```
Phase 1 (L0+L1) ─┬─→ Phase 2 (L3) ──→ Phase 4 (L4) ──→ Phase 5 (L5+L6)
                  │                                              │
                  └─→ Phase 3 (L2) ──────────────────────────────┤
                                                                │
                                                Phase 6 (Coherence+Metrics)
```

---

## 15. Conexoes

### 15.1 Estudos Existentes

| Estudo | Relacao | Nivel | Acao |
|--------|---------|-------|------|
| **S2 — Memoria e Contexto** | Base conceitual para L0-L3 | L0, L1, L3 | Alinhar episodic-memory com L3 SQLite |
| **S58 — Data Strategy** | Governance de dados em L4-L6 | L4, L5, L6 | Seguir politicas de retencao do S58 |
| **S1 — Event Bus (NATS)** | Barramento para invalidacao | Cross-level | Usar `IEventBus` para eventos de invalidacao |
| **S54 — Performance** | Budget de latencia e capacidade | Todos | Validar P95/P99 targets contra benchmarks |
| **S55 — Resiliencia** | Circuit breaker, fallback, retry | L2, L4 | Adicionar circuit breaker ao Redis cache |
| **S17 — Observabilidade** | Metricas, tracing, logging | Todos | Exportar metricas para Prometheus via `ObservabilityEngine` |
| **S13 — Performance** | Benchmarks de cache e DB | L3, L4 | Benchmarks FTS5 vs LIKE, pgvector vs in-memory |
| **S12 — Qualidade Automatizada** | Testes de contrato para APIs de memoria | Cross-level | Contratos entre L1→L3→L4 |

### 15.2 GAPS-PRODUCAO-IDE.md

| Gap | Descricao | Resolvido por |
|-----|-----------|---------------|
| G47 | SSE backpressure sem heartbeat | Phase 1 (SessionCache) |
| G11 | Adapter tests sem cobertura | Phase 2 (L3 tests) |
| G5 | LSP sem cache de respostas | Phase 3 (L2 cache para LSP) |
| G8 | DAP sem persistencia de breakpoints | Phase 2 (L3 para breakpoints) |
| SEC-001 | Audit trail sem hash chain | Phase 6 (L6 archive com checksum) |

### 15.3 Pacotes Existentes na IDEIA

| Package | Relacao | Acao |
|---------|---------|------|
| `packages/memory-hierarchy/` | Implementacao atual (4 niveis) | Estender para 7 niveis |
| `packages/memory-store/` | Store plano com hybrid search | Migrar para L3+L4 |
| `packages/prompt-economy/` | ContextCompressor, BudgetTracker | Integrar como L0 |
| `packages/postgresql-layer/` | PostgreSQL + pgvector | Integrar como L4 |
| `packages/event-bus/` | NATS pub/sub | Usar para invalidacao |
| `packages/observability/` | Tracing, metrics, logging | Estender para metrics de memoria |

### 15.4 Arquivos de Referencia

```typescript
// Implementacoes existentes que servem como base:
// packages/memory-hierarchy/src/hierarchy.ts       → Fachada unificada
// packages/memory-hierarchy/src/curator.ts          → Politicas de promocao
// packages/memory-hierarchy/src/working-memory.ts   → Cache L1 base
// packages/memory-store/src/memory-store.ts         → Store com hybrid search
// packages/memory-store/src/semantic-cache.ts       → Cache semantico LLM
// packages/memory-store/src/vector-search.ts        → Busca vetorial
// packages/memory-store/src/duckdb-analytics.ts     → DuckDB stub
// packages/prompt-economy/src/context-compressor.ts → Compressao L0
// packages/prompt-economy/src/budget-tracker.ts     → Alocacao de tokens

// Schemas e migrations:
// packages/postgresql-layer/migrations/             → PostgreSQL + pgvector
```

---

## Apendice A: Glossario

| Termo | Significado |
|-------|------------|
| **ANN** | Approximate Nearest Neighbor — busca aproximada por vizinho mais proximo |
| **BM25** | Best Matching 25 — funcao de ranking para busca textual |
| **Cache-aside** | Aplicacao verifica cache antes de consultar a fonte primaria |
| **FTS5** | Full-Text Search 5 — engine de busca textual do SQLite |
| **HNSW** | Hierarchical Navigable Small World — grafo para ANN de alta precisao |
| **Hybrid Search** | Combinacao de busca textual (BM25) + busca semantica (vetores) |
| **IVFFlat** | Inverted File with Flat — indice ANN rapido de construir |
| **LFU** | Least Frequently Used — politica de expulsao por frequencia |
| **LRU** | Least Recently Used — politica de expulsao por recencia |
| **Memory Wall** | Divergencia entre velocidade do processador e latencia da memoria |
| **OLAP** | Online Analytical Processing — processamento analitico |
| **OLTP** | Online Transaction Processing — processamento transacional |
| **pgvector** | Extensao do PostgreSQL para armazenamento e busca de vetores |
| **Read-through** | Cache busca automaticamente da fonte no miss |
| **TTL** | Time-To-Live — tempo de vida de uma entrada no cache |
| **WAL** | Write-Ahead Log — modo de concorrencia do SQLite |
| **Write-behind** | Escrita async no banco, app escreve so no cache |
| **Write-through** | Escrita sync no cache e no banco simultaneamente |
| **ZSTD** | Zstandard — algoritmo de compressao da Facebook |

---

## Apendice B: Metricas de Sucesso

| KPI | Target | Como Medir | Gatilho |
|-----|--------|-----------|---------|
| Hit rate L1 | > 80% | `ideia_memory_l1_hit_rate` | Alerta se < 60% por 5min |
| P95 latencia L3 get | < 10ms | `ideia_memory_l3_latency_ms` | Alerta se > 50ms |
| P95 latencia L4 hybrid search | < 200ms | `ideia_memory_l4_hybrid_query_ms` | Alerta se > 500ms |
| Recall@10 L4 | > 90% | Testes de recall periodicos | Falha em CI se < 85% |
| Cobertura de testes | > 80% | Jest coverage report | Bloqueia PR se < 70% |
| Cache invalidation lag | < 100ms | Tracing distribuido | Alerta se > 500ms |
| Archive restore time (standard) | < 5h | Lambda de monitoramento | SLA violation se > 12h |
| Memory footprint L1 | < 100MB | `ideia_memory_l1_size_bytes` | Alerta se > 500MB |
| DuckDB query P95 | < 500ms | `ideia_memory_l5_query_ms` | Alerta se > 2s |

---

## Apendice C: Falhas Conhecidas e Mitigacoes

| Falha | Sintoma | Mitigacao | Nivel |
|-------|---------|-----------|-------|
| Redis down | Cache L2 indisponivel | Fallback para L1 (SessionCache) | L2 |
| PostgreSQL connection pool exaustao | Queries L4 lentas | Circuit breaker + fila de espera | L4 |
| SQLite WAL file cresce sem limite | Disco cheio | `PRAGMA wal_checkpoint(TRUNCATE)` periodico | L3 |
| FTS5 index corrompido | Erro MATCH em queries | Rebuild do indice com `INSERT INTO wm_fts(wm_fts) VALUES('rebuild')` | L3 |
| S3 rate limit | Archive lento | Retry exponencial + batch de objetos | L6 |
| Memory leak no SessionCache | OOM | MaxSizeBytes + LRU agressivo | L1 |
| DuckDB OOM em queries pesadas | Processo crasha | Limit + streaming de resultados | L5 |

---

*Este documento e parte do conjunto de estudos arquiteturais da IDEIA. Consulte `IDEIA-MASTER.md` para a lista completa de estudos e `document-registry.md` para o registro central de documentos.*
