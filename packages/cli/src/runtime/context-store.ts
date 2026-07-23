/** Interface que define a estrutura de context item. */
export interface ContextItem {
  id: string;
  type: 'file' | 'code' | 'architecture' | 'config' | 'dependency' | 'history' | 'decision';
  source: string;
  content: string;
  size: number;
  tokens: number;
  timestamp: number;
  priority: number;
  tags: string[];
  relevanceScore?: number;
}

/** Interface que define a estrutura de context query. */
export interface ContextQuery {
  taskType: string;
  keywords: string[];
  files?: string[];
  maxItems?: number;
  minRelevance?: number;
}

/** Interface que define a estrutura de context store config. */
export interface ContextStoreConfig {
  maxItems: number;
  maxTokensPerItem: number;
  maxTotalTokens: number;
  ttlMs: number;
}

/** Processa e f a u l t_ c o n t e x t_ s t o r e_ c o n f i g. */
export const DEFAULT_CONTEXT_STORE_CONFIG: ContextStoreConfig = {
  maxItems: 500,
  maxTokensPerItem: 8000,
  maxTotalTokens: 128000,
  ttlMs: 3600000,
};

/** Interface que define a estrutura de relevance filter result. */
export interface RelevanceFilterResult {
  items: ContextItem[];
  totalTokens: number;
  filteredOut: number;
  reason: string;
}

const TOKENS_PER_CHAR = 0.35;

/**
 * Estima tokens.
 * @param text - Valor text.
 * @returns O resultado da operação.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

/**
 * Cria context item.
 * @param source - Valor source.
 * @param content - Valor content.
 * @param type - Valor type.
 * @param tags - Valor tags.
 * @param priority - Valor priority.
 * @returns O resultado da operação.
 */
export function createContextItem(
  source: string,
  content: string,
  type: ContextItem['type'],
  tags: string[] = [],
  priority: number = 5,
): ContextItem {
  return {
    id: `${type}_${source}_${Date.now()}`,
    type,
    source,
    content,
    size: content.length,
    tokens: estimateTokens(content),
    timestamp: Date.now(),
    priority,
    tags,
  };
}

/** Classe responsável por processa store. */
export class ContextStore {
  private items: Map<string, ContextItem> = new Map();
  private config: ContextStoreConfig;

  constructor(config: Partial<ContextStoreConfig> = {}) {
    this.config = { ...DEFAULT_CONTEXT_STORE_CONFIG, ...config };
  }

  getConfig(): ContextStoreConfig {
    return { ...this.config };
  }

  add(item: ContextItem): void {
    if (item.tokens > this.config.maxTokensPerItem) return;
    if (this.getTotalTokens() + item.tokens > this.config.maxTotalTokens) {
      this.evictLowestPriority();
    }
    this.items.set(item.id, item);
  }

  addMany(items: ContextItem[]): number {
    let added = 0;
    for (const item of items) {
      if (item.tokens <= this.config.maxTokensPerItem) {
        if (this.getTotalTokens() + item.tokens > this.config.maxTotalTokens) {
          this.evictLowestPriority();
        }
        this.items.set(item.id, item);
        added++;
      }
    }
    return added;
  }

  get(id: string): ContextItem | undefined {
    return this.items.get(id);
  }

  remove(id: string): boolean {
    return this.items.delete(id);
  }

  clear(): void {
    this.items.clear();
  }

  getAll(): ContextItem[] {
    return Array.from(this.items.values());
  }

  count(): number {
    return this.items.size;
  }

  getTotalTokens(): number {
    let total = 0;
    for (const item of this.items.values()) {
      total += item.tokens;
    }
    return total;
  }

  getStats(): { count: number; totalTokens: number; totalChars: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    let totalChars = 0;
    for (const item of this.items.values()) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      totalChars += item.size;
    }
    return {
      count: this.items.size,
      totalTokens: this.getTotalTokens(),
      totalChars,
      byType,
    };
  }

  filterRelevance(query: ContextQuery): RelevanceFilterResult {
    const maxItems = query.maxItems || 20;
    const minRelevance = query.minRelevance || 0.1;
    const now = Date.now();

    const scored = Array.from(this.items.values())
      .filter(item => (now - item.timestamp) <= this.config.ttlMs)
      .map(item => {
        let score = 0;
        const contentLower = item.content.toLowerCase();
        const sourceLower = item.source.toLowerCase();
        const combinedLower = contentLower + ' ' + sourceLower;

        for (const kw of query.keywords) {
          const kwLower = kw.toLowerCase();
          if (combinedLower.includes(kwLower)) {
            const count = (combinedLower.match(new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
            score += count * 2;
          }
        }

        if (query.files && query.files.some(f => sourceLower.includes(f.toLowerCase()))) {
          score += 10;
        }

        score += item.priority;

        return { ...item, relevanceScore: score };
      })
      .filter(item => item.relevanceScore! >= minRelevance)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, maxItems);

    const filteredOut = this.items.size - scored.length;
    let totalTokens = 0;
    for (const item of scored) {
      totalTokens += item.tokens;
    }

    return {
      items: scored,
      totalTokens,
      filteredOut,
      reason: filteredOut > 0
        ? `Filtrados ${filteredOut} itens por baixa relevancia (limite: ${maxItems}, minScore: ${minRelevance})`
        : 'Todos os itens atendem aos criterios de relevancia',
    };
  }

  pruneExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, item] of this.items) {
      if ((now - item.timestamp) > this.config.ttlMs) {
        this.items.delete(id);
        removed++;
      }
    }
    return removed;
  }

  private evictLowestPriority(): void {
    const sorted = Array.from(this.items.entries()).sort((a, b) => a[1]!.priority - b[1]!.priority);
    const toRemove = sorted.slice(0, Math.max(1, Math.floor(this.items.size * 0.1)));
    for (const [id] of toRemove) {
      this.items.delete(id);
    }
  }
}
