import { createHash } from 'crypto'
import { createLogger } from '@ideia/logger';
const logger = createLogger('prompt-cache-manager');

export type CacheProvider = 'anthropic' | 'openai' | 'generic'

export interface PromptCacheConfig {
  strategy: 'prefix' | 'semantic' | 'hybrid'
  stablePrefix: string[]
  volatileSuffix: boolean
  warmHitTarget: number
  provider: CacheProvider
}

export interface CacheReport {
  cacheHits: number
  cacheMisses: number
  tokensSaved: number
  costSaved: number
  warmHitRate: number
  prefixSize: number
  prefixHash: string
}

export class PromptCacheManager {
  private config: PromptCacheConfig
  private hits = 0
  private misses = 0
  private estimatedTokensSaved = 0

  constructor(config?: Partial<PromptCacheConfig>) {
    this.config = {
      strategy: 'prefix',
      stablePrefix: [],
      volatileSuffix: true,
      warmHitTarget: 85,
      provider: 'generic',
      ...config,
    }
  }

  configureCache(prefix: string[]): { prefixHash: string; stableSize: number } {
    this.config.stablePrefix = prefix.map(s => s.trim())
    const stableText = this.config.stablePrefix.join('')
    const hash = createHash('sha256').update(stableText).digest('hex').slice(0, 16)
    return {
      prefixHash: hash,
      stableSize: stableText.length,
    }
  }

  preparePayload(payload: { system?: string; messages: Array<{ role: string; content: string }> }): {
    body: Record<string, unknown>
    expectedSavings: number
  } {
    const systemSize = (payload.system || '').length
    const messagesSize = payload.messages.reduce((acc, m) => acc + m.content.length, 0)
    const expectedSavings = Math.floor(systemSize / 4)

    if (this.config.provider === 'anthropic') {
      return {
        body: {
          system: [
            { type: 'text', text: payload.system || '', cache_control: { type: 'ephemeral' } },
          ] as Array<{ type: string; text: string; cache_control?: { type: string } }>,
          messages: this.separateVolatile(payload.messages),
        },
        expectedSavings,
      }
    }

    return {
      body: {
        ...(payload.system ? { system: payload.system } : {}),
        messages: payload.messages,
      },
      expectedSavings,
    }
  }

  recordHit(tokensSaved: number): void {
    this.hits++
    this.estimatedTokensSaved += tokensSaved
  }

  recordMiss(): void {
    this.misses++
  }

  getReport(): CacheReport {
    const total = this.hits + this.misses
    return {
      cacheHits: this.hits,
      cacheMisses: this.misses,
      tokensSaved: this.estimatedTokensSaved,
      costSaved: this.estimatedTokensSaved * 0.000003,
      warmHitRate: total > 0 ? Math.round((this.hits / total) * 100) : 0,
      prefixSize: this.config.stablePrefix.reduce((a, s) => a + s.length, 0),
      prefixHash: createHash('sha256').update(this.config.stablePrefix.join('')).digest('hex').slice(0, 16),
    }
  }

  reset(): void {
    this.hits = 0
    this.misses = 0
    this.estimatedTokensSaved = 0
  }

  private separateVolatile(messages: Array<{ role: string; content: string }>): Array<Record<string, unknown>> {
    if (!this.config.volatileSuffix) return messages.map(m => ({ role: m.role, content: m.content }))

    const result: Array<Record<string, unknown>> = []
    for (const msg of messages) {
      const content = msg.content
      if (content.includes('timestamp') || content.includes('session') || content.includes('Date')) {
        const lines = content.split('\n')
        const stable = lines.filter(l => !l.includes('timestamp') && !l.includes('session') && !l.includes('Date'))
        const volatile = lines.filter(l => l.includes('timestamp') || l.includes('session') || l.includes('Date'))
        result.push({
          role: msg.role,
          content: [...stable, '--- volatile ---', ...volatile].join('\n'),
        })
      } else {
        result.push({ role: msg.role, content: msg.content })
      }
    }
    return result
  }
}
