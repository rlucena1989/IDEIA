import { LLMProvider, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, ProviderRouter } from './index';
import { createLogger } from '@ideia/logger';
const logger = createLogger('lazy-provider');

export type ProviderFactory = () => Promise<LLMProvider>;

export interface LazyProviderConfig {
  maxConcurrent?: number;
}

export class LazyProviderRegistry {
  private factories = new Map<string, ProviderFactory>();
  private instances = new Map<string, LLMProvider>();
  private loading = new Map<string, Promise<LLMProvider>>();
  private _router = new ProviderRouter();
  private maxConcurrent: number;
  private runningInitCount = 0;
  private initQueue: Array<() => void> = [];

  get router(): ProviderRouter {
    return this._router;
  }

  constructor(config?: LazyProviderConfig) {
    this.maxConcurrent = config?.maxConcurrent ?? 5;
  }

  register(name: string, factory: ProviderFactory, deferInit = true): void {
    this.factories.set(name, factory);
    if (!deferInit) {
      this.initialize(name).catch(() => {});
    }
  }

  private async acquireInitSlot(): Promise<void> {
    if (this.runningInitCount < this.maxConcurrent) {
      this.runningInitCount++;
      return;
    }
    await new Promise<void>(resolve => {
      this.initQueue.push(resolve);
    });
    this.runningInitCount++;
  }

  private releaseInitSlot(): void {
    this.runningInitCount--;
    if (this.initQueue.length > 0) {
      this.initQueue.shift()?.();
    }
  }

  async initialize(name: string): Promise<LLMProvider> {
    const existing = this.instances.get(name);
    if (existing) return existing;

    const pending = this.loading.get(name);
    if (pending) return pending;

    const factory = this.factories.get(name);
    if (!factory) throw new Error(`Provider "${name}" not registered`);

    await this.acquireInitSlot();

    const promise = factory();
    this.loading.set(name, promise);

    try {
      const provider = await promise;
      this.instances.set(name, provider);
      this._router.register(provider);
      this.loading.delete(name);
      this.releaseInitSlot();
      return provider;
    } catch (err) {
      this.loading.delete(name);
      this.releaseInitSlot();
      throw err;
    }
  }

  preloadWarm(name: string): void {
    if (this.instances.has(name) || this.loading.has(name)) return;
    if (!this.factories.has(name)) return;
    this.initialize(name).catch(() => {});
  }

  getInitialized(): string[] {
    return Array.from(this.instances.keys());
  }

  getPending(): string[] {
    const pending = new Set<string>();
    for (const name of this.factories.keys()) {
      if (!this.instances.has(name)) pending.add(name);
    }
    for (const name of this.loading.keys()) {
      if (!this.instances.has(name)) pending.add(name);
    }
    return Array.from(pending);
  }

  get(name: string): LLMProvider | undefined {
    return this.instances.get(name);
  }

  isInitialized(name: string): boolean {
    return this.instances.has(name);
  }

  async ensureAll(): Promise<void> {
    const names = Array.from(this.factories.keys());
    await Promise.all(names.map(n => this.initialize(n).catch(() => {})));
  }

  async getActiveProvider(): Promise<LLMProvider> {
    if (this._router.listProviders().length === 0) {
      const names = Array.from(this.factories.keys());
      if (names.length === 0) throw new Error('No LLM provider registered');
      return this.initialize(names[0]);
    }
    const active = this._router.getActive();
    const name = active?.name;
    if (name && !this.isInitialized(name)) {
      return this.initialize(name);
    }
    return active;
  }

  listRegistered(): string[] {
    return Array.from(this.factories.keys());
  }

  listInitialized(): string[] {
    return Array.from(this.instances.keys());
  }

  async callChat(name: string, request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    const provider = await this.initialize(name);
    return provider.chat(request, signal);
  }

  async callEmbed(name: string, request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const provider = await this.initialize(name);
    return provider.embed(request);
  }
}
