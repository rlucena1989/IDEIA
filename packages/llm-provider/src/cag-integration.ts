import { ProviderRouter, ChatRequest, ChatResponse, type LLMProvider } from './index';

export interface CagCacheLike {
  semanticGet(query: string, threshold?: number): Promise<{ response: string; confidence: number } | null>;
  set(key: string, response: string, context?: string): void;
  getStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    semanticHits: number;
    semanticMisses: number;
    vectorStoreSize: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  };
}

export class CagAwareRouter {
  private router: ProviderRouter;
  private cagCache?: CagCacheLike;

  constructor(router: ProviderRouter, cagCache?: CagCacheLike) {
    this.router = router;
    this.cagCache = cagCache;
  }

  register(provider: LLMProvider): void {
    this.router.register(provider);
  }

  setPriority(names: string[]): void {
    this.router.setPriority(names);
  }

  getActive(): LLMProvider {
    return this.router.getActive();
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.router.getProvider(name);
  }

  listProviders(): string[] {
    return this.router.listProviders();
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    if (!request.stream && this.cagCache) {
      const lastUserMsg = request.messages.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        const cached = await this.cagCache.semanticGet(lastUserMsg.content);
        if (cached && cached.confidence > 0.85) {
          return { content: cached.response, model: '(cached)', provider: 'cag-cache' };
        }
      }
    }

    const active = this.router.getActive();
    const result = await active.chat(request, signal);

    if (!request.stream && this.cagCache) {
      const response = result as ChatResponse;
      const lastUserMsg = request.messages.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        this.cagCache.set(lastUserMsg.content, response.content);
      }
    }

    return result;
  }

  getCagStats() {
    return this.cagCache?.getStats() ?? {
      size: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      semanticHits: 0,
      semanticMisses: 0,
      vectorStoreSize: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }
}
