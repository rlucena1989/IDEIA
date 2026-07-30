import { createLogger } from '@ideia/logger'
import { BlueprintMetadata, BlueprintDefinition } from './types'

const log = createLogger('blueprint-market')

export class BlueprintMarket {
  private _registryUrl: string
  private _token?: string

  constructor(registryUrl: string, token?: string) {
    this._registryUrl = registryUrl
    this._token = token
  }

  async publish(blueprint: BlueprintDefinition | string, _options?: { version?: string }): Promise<{ success: boolean; version: string; url?: string }> {
    const bp = typeof blueprint === 'string'
      ? JSON.parse(require('fs').readFileSync(require('path').resolve(blueprint), 'utf-8')) as BlueprintDefinition
      : blueprint as BlueprintDefinition
    log.info(`Publishing blueprint ${bp.name}@${bp.version}`)
    return { success: true, version: bp.version, url: `${this._registryUrl}/blueprints/${bp.name}` }
  }

  async search(query: string, tags?: string[]): Promise<BlueprintSearchResult[]> {
    const results: BlueprintSearchResult[] = []
    log.info(`Searching for "${query}" with tags ${tags?.join(',') || 'all'}`)
    return results
  }

  async download(name: string, version?: string): Promise<BlueprintDefinition | null> {
    log.info(`Downloading ${name}@${version || 'latest'}`)
    return null
  }
}

export interface BlueprintSearchResult {
  name: string
  version: string
  description: string
  tags: string[]
  downloads: number
  rating: number
  updatedAt: string
}
