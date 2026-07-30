import { DescriptionLevel } from './types'
import { createLogger } from '@ideia/logger';
import { ManifestResolver } from './resolver'
import { ContextEnricher } from './enricher'
const logger = createLogger('api');

export interface APIResponse {
  status: string
  data: unknown
}

export class SelfDescriptionAPI {
  private resolver: ManifestResolver
  private enricher: ContextEnricher

  constructor(resolver?: ManifestResolver, enricher?: ContextEnricher) {
    this.resolver = resolver ?? new ManifestResolver()
    this.enricher = enricher ?? new ContextEnricher(this.resolver)
  }

  async getFull(): Promise<APIResponse> {
    const manifest = await this.resolver.resolve<object>({ all: true })
    return { status: 'ok', data: manifest }
  }

  async getLevel(level: DescriptionLevel): Promise<APIResponse> {
    const context = await this.enricher.enrich(level, 'api')
    return { status: 'ok', data: { level, content: context } }
  }

  async getAgents(): Promise<APIResponse> {
    const agents = await this.resolver.resolveAgents()
    return { status: 'ok', data: agents }
  }

  async getCapabilities(): Promise<APIResponse> {
    const capabilities = await this.resolver.resolveCapabilities()
    return { status: 'ok', data: capabilities }
  }

  async getCommands(): Promise<APIResponse> {
    const commands = await this.resolver.resolveCommands()
    return { status: 'ok', data: commands }
  }

  async getContextPack(level: DescriptionLevel): Promise<APIResponse> {
    const context = await this.enricher.enrich(level, 'api')
    return { status: 'ok', data: { level, content: context } }
  }

  async getHealth(): Promise<APIResponse> {
    const manifest = await this.resolver.resolve<{ name: string; platformVersion: string; version: string; generatedAt: string }>({ section: 'id' as never })
    return {
      status: 'ok',
      data: {
        status: 'healthy',
        platform: 'IDEIA',
        uptime: process.uptime(),
      },
    }
  }
}
