import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { AiMessage } from '@ideia/theia-ai';
import { RouterEngine, RouterConstraints, LlmProvider, ChatOptions, ChatResponse, FallbackChain } from './types';
const logger = createLogger('llm-integration:router');

export class DefaultRouterEngine implements RouterEngine {
  private providers = new Map<string, LlmProvider>();
  private onAddedEmitter = new Emitter<LlmProvider>();
  private onRemovedEmitter = new Emitter<string>();

  get onProviderAdded() { return this.onAddedEmitter.event; }
  get onProviderRemoved() { return this.onRemovedEmitter.event; }

  registerProvider(provider: LlmProvider): Disposable {
    this.providers.set(provider.id, provider);
    this.onAddedEmitter.fire(provider);
    return { dispose: () => this.unregisterProvider(provider.id) };
  }

  async selectProvider(task: string, constraints?: RouterConstraints): Promise<LlmProvider> {
    const providers = this.getProviders();
    if (providers.length === 0) throw new Error('No providers registered');

    if (constraints?.requireVision) {
      const visionProvider = providers.find(p => p.config.capabilities.supportsVision);
      if (visionProvider) return visionProvider;
    }
    if (constraints?.requireFunctions) {
      const fnProvider = providers.find(p => p.config.capabilities.supportsFunctions);
      if (fnProvider) return fnProvider;
    }

    return providers[0];
  }

  getProviders(): LlmProvider[] {
    return Array.from(this.providers.values());
  }

  private unregisterProvider(id: string): void {
    this.providers.delete(id);
    this.onRemovedEmitter.fire(id);
  }
}

export class DefaultFallbackChain implements FallbackChain {
  private fallbackOrder: string[] = [];
  private providers: Map<string, LlmProvider>;

  constructor(providers: Map<string, LlmProvider>) {
    this.providers = providers;
  }

  setFallbackOrder(providerIds: string[]): void {
    this.fallbackOrder = providerIds;
  }

  async execute(model: string, messages: AiMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const order = this.fallbackOrder.length > 0 ? this.fallbackOrder : Array.from(this.providers.keys());
    let lastError: Error | undefined;

    for (const providerId of order) {
      const provider = this.providers.get(providerId);
      if (!provider) continue;
      try {
        return await provider.chat(model, messages, options);
      } catch (err) {
        lastError = err as Error;
        logger.warn(`Fallback: provider ${providerId} failed`, { error: (err as Error).message });
      }
    }

    throw lastError || new Error('All providers failed');
  }
}
