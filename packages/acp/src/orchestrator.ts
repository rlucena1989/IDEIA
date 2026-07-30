import { v4 as uuid } from 'uuid';
import { createLogger } from '@ideia/logger';
import { ACPPayload, ContextItem, ContextProvider, CacheEntry } from './types';

export class ACPOrchestrator {
  private providers: Map<string, ContextProvider> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private maxTokenCount: number;

  constructor(options: { maxTokens?: number } = {}) {
    this.maxTokenCount = options.maxTokens ?? 8000;
  }

  registerProvider(provider: ContextProvider): void {
    this.providers.set(provider.name, provider);
  }

  unregisterProvider(name: string): void {
    this.providers.delete(name);
  }

  getProviders(): string[] {
    return [...this.providers.keys()];
  }

  async buildPayload(options?: {
    sources?: string[];
    ttl?: number;
  }): Promise<ACPPayload> {
    const cacheKey = `acp_${Date.now()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < cached.ttl) {
      return cached.payload;
    }

    const providers = options?.sources
      ? options.sources.map(s => this.providers.get(s)).filter(Boolean) as ContextProvider[]
      : [...this.providers.values()];

    const allItems: ContextItem[] = [];
    let totalTokens = 0;

    for (const provider of providers) {
      const items = await provider.collect();
      for (const item of items) {
        const tokens = this.estimateTokens(item.content);
        if (totalTokens + tokens > this.maxTokenCount) break;
        allItems.push(item);
        totalTokens += tokens;
      }
    }

    const payload: ACPPayload = {
      protocol: 'acp-v1',
      requestId: uuid(),
      timestamp: new Date().toISOString(),
      sources: allItems,
      compressed: false,
      tokenCount: totalTokens,
      ttl: options?.ttl,
    };

    const ttl = options?.ttl ?? 30000;
    this.cache.set(cacheKey, { payload, cachedAt: Date.now(), ttl });

    return payload;
  }

  clearCache(): void {
    this.cache.clear();
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export function createOrchestrator(options?: { maxTokens?: number }): ACPOrchestrator {
  return new ACPOrchestrator(options);
}
