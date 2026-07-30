import { createLogger } from '@ideia/logger'
import { Manifest, AgentManifest, CommandManifest, ResolveQuery, DescriptionLevel } from './types'
import { ManifestStore } from './store'

const logger = createLogger('manifest-resolver')

export class ManifestResolver {
  private store: ManifestStore
  private cache: Manifest | null = null

  constructor(store?: ManifestStore) {
    this.store = store ?? new ManifestStore()
  }

  async resolve<T>(query: ResolveQuery): Promise<T> {
    const manifest = await this.getManifest()
    if (query.all) {
      // T is unconstrained generic; double assertion needed for cross-type cast
      return manifest as unknown as T
    }
    if (query.section) {
      const section = this.toRecord(manifest)[query.section]
      if (section === undefined) {
        throw new Error(`Section '${query.section}' not found in manifest`)
      }
      return section as T
    }
    // T is unconstrained generic; double assertion needed for cross-type cast
    return manifest as unknown as T
  }

  async resolveSection(section: string, level?: DescriptionLevel): Promise<object> {
    const manifest = await this.getManifest()
    const sectionData = this.toRecord(manifest)[section]
    if (sectionData === undefined) {
      throw new Error(`Section '${section}' not found`)
    }
    if (level && section === 'contextPacks') {
      const packs = sectionData as Array<{ level: DescriptionLevel }>
      return packs.find(p => p.level === level) ?? {}
    }
    return sectionData as object
  }

  async resolveAgent(name: string): Promise<AgentManifest | null> {
    const manifest = await this.getManifest()
    return manifest.agents.find(a => a.id === name || a.name.toLowerCase() === name.toLowerCase()) ?? null
  }

  async resolveCommand(path: string): Promise<CommandManifest | null> {
    const manifest = await this.getManifest()
    return manifest.commands.find(c => c.path === path || (c.aliases && c.aliases.includes(path))) ?? null
  }

  async resolveAgents(): Promise<AgentManifest[]> {
    const manifest = await this.getManifest()
    return manifest.agents
  }

  async resolveCapabilities(): Promise<object[]> {
    const manifest = await this.getManifest()
    return manifest.capabilities
  }

  async resolveCommands(): Promise<CommandManifest[]> {
    const manifest = await this.getManifest()
    return manifest.commands
  }

  async resolveTools(): Promise<object[]> {
    const manifest = await this.getManifest()
    return manifest.tools
  }

  private async getManifest(): Promise<Manifest> {
    if (this.cache) {
      return this.cache
    }
    const manifest = await this.store.read()
    if (!manifest) {
      throw new Error('No manifest found. Run generate() first.')
    }
    this.cache = manifest
    return manifest
  }

  invalidateCache(): void {
    this.cache = null
  }

  private toRecord(manifest: Manifest): Record<string, unknown> {
    // Manifest lacks index signature; double assertion needed for dynamic key access
    return manifest as unknown as Record<string, unknown>
  }
}
