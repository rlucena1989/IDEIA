import type { LLMProvider, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from './index'
import { createLogger } from '@ideia/logger';
import type { LoRAAdapter, LoRAAdapterStore } from '@ideia/memory-store'
const logger = createLogger('adapter-aware-provider');

export interface AdapterAwareConfig {
  baseProvider: LLMProvider
  adapterStore: LoRAAdapterStore
  projectId: string
  fallbackToBase: boolean
}

export class AdapterAwareProvider implements LLMProvider {
  readonly name = 'adapter-aware'
  private baseProvider: LLMProvider
  private adapterStore: LoRAAdapterStore
  private projectId: string
  private fallbackToBase: boolean
  private activeAdapter: LoRAAdapter | null = null

  constructor(config: AdapterAwareConfig) {
    this.baseProvider = config.baseProvider
    this.adapterStore = config.adapterStore
    this.projectId = config.projectId
    this.fallbackToBase = config.fallbackToBase ?? true
  }

  async setProject(projectId: string): Promise<void> {
    this.projectId = projectId
    const adapter = await this.adapterStore.getActiveForProject(projectId)
    this.activeAdapter = adapter || null
  }

  getActiveAdapter(): LoRAAdapter | null {
    return this.activeAdapter
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    const adaptedRequest = await this.adaptRequest(request)

    if (this.activeAdapter) {
      const adapterInfo = `[Active adapter: ${this.activeAdapter.name} v${this.activeAdapter.version} | base: ${this.activeAdapter.baseModel} | method: ${this.activeAdapter.method}]\n`
      if (typeof adaptedRequest === 'object' && 'messages' in adaptedRequest) {
        adaptedRequest.messages = [
          { role: 'system', content: adapterInfo, ...(adaptedRequest.messages?.[0]?.id ? { id: adaptedRequest.messages[0].id } : {}) },
          ...(adaptedRequest.messages || []),
        ]
      }
    }

    return this.baseProvider.chat(adaptedRequest, signal)
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.baseProvider.embed(request)
  }

  private async adaptRequest(request: ChatRequest): Promise<ChatRequest> {
    if (!this.activeAdapter) return request

    const adapterContext = this.buildAdapterContext(this.activeAdapter)

    return {
      ...request,
      messages: [
        { role: 'system' as const, content: adapterContext },
        ...request.messages,
      ],
    }
  }

  private buildAdapterContext(adapter: LoRAAdapter): string {
    return [
      `# LoRA Adapter Context`,
      `Adapter: ${adapter.name} v${adapter.version}`,
      `Base model: ${adapter.baseModel}`,
      `Method: ${adapter.method} (rank=${adapter.rank}, alpha=${adapter.alpha})`,
      `Target modules: ${adapter.targetModules.join(', ')}`,
      `Project: ${adapter.projectId}`,
      adapter.metrics.perplexity ? `Quality: perplexity=${adapter.metrics.perplexity}` : '',
      adapter.metrics.evalScore ? `Eval score: ${adapter.metrics.evalScore}` : '',
      `Created: ${adapter.createdAt}`,
      `Tags: ${adapter.tags.join(', ')}`,
    ].filter(Boolean).join('\n')
  }
}
