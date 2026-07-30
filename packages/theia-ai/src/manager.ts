import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { AiProvider, AiRequest, AiResponse, AiStreamChunk, AiManager } from './types';
const logger = createLogger('manager');

export class DefaultAiManager implements AiManager {
  private providers = new Map<string, AiProvider>();
  private defaultProviderId?: string;
  private onRegisteredEmitter = new Emitter<AiProvider>();
  private onUnregisteredEmitter = new Emitter<string>();

  get onProviderRegistered() { return this.onRegisteredEmitter.event; }
  get onProviderUnregistered() { return this.onUnregisteredEmitter.event; }

  registerProvider(provider: AiProvider): Disposable {
    this.providers.set(provider.id, provider);
    if (!this.defaultProviderId) this.defaultProviderId = provider.id;
    this.onRegisteredEmitter.fire(provider);
    return { dispose: () => this.unregisterProvider(provider.id) };
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id);
    this.onUnregisteredEmitter.fire(id);
    if (this.defaultProviderId === id) {
      this.defaultProviderId = this.providers.keys().next().value;
    }
  }

  getProvider(id: string): AiProvider | undefined {
    return this.providers.get(id);
  }

  getProviders(): AiProvider[] {
    return Array.from(this.providers.values());
  }

  setDefaultProvider(id: string): void {
    if (this.providers.has(id)) this.defaultProviderId = id;
  }

  getDefaultProvider(): AiProvider | undefined {
    if (!this.defaultProviderId) return undefined;
    return this.providers.get(this.defaultProviderId);
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    const provider = this.getDefaultProvider();
    if (!provider) throw new Error('No AI provider configured');
    return provider.chat(request);
  }

  async *streamChat(request: AiRequest): AsyncIterable<AiStreamChunk> {
    const provider = this.getDefaultProvider();
    if (!provider) throw new Error('No AI provider configured');
    yield* provider.streamChat(request);
  }
}
