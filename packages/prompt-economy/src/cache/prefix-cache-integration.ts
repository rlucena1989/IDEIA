import { PromptCacheManager, PromptCacheConfig } from './prompt-cache-manager'
import { createLogger } from '@ideia/logger';
const logger = createLogger('prefix-cache-integration');

export interface PrefixCacheAdapter {
  name: string
  prepareRequest(body: Record<string, unknown>): Record<string, unknown>
  readCacheHeader(response: Record<string, unknown>): { cacheHit: boolean; tokensSaved: number }
}

export class PromptCachingService {
  private manager: PromptCacheManager
  private adapters: Map<string, PrefixCacheAdapter> = new Map()

  constructor(config?: Partial<PromptCacheConfig>) {
    this.manager = new PromptCacheManager(config)
    this.registerDefaultAdapters()
  }

  setStablePrefix(prefix: string[]): void {
    this.manager.configureCache(prefix)
  }

  prepareMessages(params: {
    system?: string
    messages: Array<{ role: string; content: string }>
    tools?: Array<{ name: string; description: string }>
  }): {
    body: Record<string, unknown>
    expectedSavings: number
    cacheKey: string
  } {
    const cacheKey = this.buildCacheKey(params)

    const { body, expectedSavings } = this.manager.preparePayload({
      system: params.system,
      messages: params.messages,
    })

    const adapter = this.adapters.get(this.manager['config']?.provider || 'generic')
    if (adapter) {
      return { body: adapter.prepareRequest(body as Record<string, unknown>), expectedSavings, cacheKey }
    }

    return { body, expectedSavings, cacheKey }
  }

  recordResponse(cacheKey: string, response: { usage?: { cache_creation_input_tokens?: number; cache_read_input_tokens?: number } }, duration: number): void {
    if (response.usage) {
      const tokensSaved = response.usage.cache_read_input_tokens || 0
      if (tokensSaved > 0) {
        this.manager.recordHit(tokensSaved)
      } else {
        this.manager.recordMiss()
      }
    }
  }

  getReport() {
    return this.manager.getReport()
  }

  reset(): void {
    this.manager.reset()
  }

  private buildCacheKey(params: { system?: string; messages: Array<{ role: string; content: string }> }): string {
    const systemHash = params.system ? params.system.slice(0, 100) : ''
    const msgCount = params.messages.length
    return `cache:${systemHash}:${msgCount}`
  }

  private registerDefaultAdapters(): void {
    this.adapters.set('anthropic', {
      name: 'anthropic',
      prepareRequest(body) {
        return body
      },
      readCacheHeader(response) {
        const usage = response['usage'] as Record<string, number> | undefined
        const tokensSaved = usage?.cache_read_input_tokens || 0
        return { cacheHit: tokensSaved > 0, tokensSaved }
      },
    })

    this.adapters.set('openai', {
      name: 'openai',
      prepareRequest(body) {
        return body
      },
      readCacheHeader(response) {
        const usage = response['usage'] as Record<string, number> | undefined
        const tokensSaved = usage?.cache_read_input_tokens || 0
        return { cacheHit: tokensSaved > 0, tokensSaved }
      },
    })
  }
}
