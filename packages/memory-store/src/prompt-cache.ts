/**
 * prompt-cache.ts — Prompt Caching Integration (Item 46)
 *
 * Integra suporte a prompt caching dos providers LLM:
 * - OpenAI Prompt Caching (prefix-based, 50% desconto)
 * - Anthropic Context Caching (prompt caching API)
 * - Cache local baseado em prefixo de prompt
 */

export interface CacheablePrompt {
  prefix: string;
  suffix: string;
  cachedTokens: number;
}

export class PromptCacheManager {
  private prefixCache = new Map<string, { tokens: number; cachedAt: string }>();
  private maxPrefixEntries = 100;

  addPrefix(prefix: string, tokens: number): void {
    if (this.prefixCache.size >= this.maxPrefixEntries) {
      const firstKey = this.prefixCache.keys().next().value;
      if (firstKey !== undefined) this.prefixCache.delete(firstKey);
    }
    this.prefixCache.set(prefix, { tokens, cachedAt: new Date().toISOString() });
  }

  findCacheablePrompt(fullPrompt: string): CacheablePrompt | null {
    let bestPrefix = '';
    let bestTokens = 0;

    for (const [prefix, info] of this.prefixCache) {
      if (fullPrompt.startsWith(prefix) && prefix.length > bestPrefix.length) {
        bestPrefix = prefix;
        bestTokens = info.tokens;
      }
    }

    if (!bestPrefix) return null;

    return {
      prefix: bestPrefix,
      suffix: fullPrompt.slice(bestPrefix.length),
      cachedTokens: bestTokens,
    };
  }

  estimateSavings(): { cachedPrefixes: number; totalTokens: number } {
    return {
      cachedPrefixes: this.prefixCache.size,
      totalTokens: Array.from(this.prefixCache.values()).reduce((s, e) => s + e.tokens, 0),
    };
  }

  clear(): void {
    this.prefixCache.clear();
  }
}
