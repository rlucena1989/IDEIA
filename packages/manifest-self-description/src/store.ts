import * as fsp from 'fs/promises'
import * as path from 'path'
import { createLogger } from '@ideia/logger'
import { Manifest } from './types'

const logger = createLogger('manifest-store')

const DEFAULT_STORE_PATH = '.ideia/manifest/manifest.yaml'

export class ManifestStore {
  private storePath: string

  constructor(storePath?: string) {
    this.storePath = storePath ?? DEFAULT_STORE_PATH
  }

  async read(): Promise<Manifest | null> {
    const resolvedPath = this.resolvePath()
    const jsonPath = resolvedPath.replace(/\.yaml$/, '.json')
    try {
      const content = await fsp.readFile(jsonPath, 'utf-8')
      return JSON.parse(content) as Manifest
    } catch {
      try {
        const content = await fsp.readFile(resolvedPath, 'utf-8')
        return JSON.parse(content) as Manifest
      } catch {
        return null
      }
    }
  }

  async write(manifest: Manifest): Promise<void> {
    const resolvedPath = this.resolvePath()
    await fsp.mkdir(path.dirname(resolvedPath), { recursive: true })
    const yaml = this.toYAML(manifest)
    await fsp.writeFile(resolvedPath, yaml, 'utf-8')
    const jsonPath = resolvedPath.replace(/\.yaml$/, '.json')
    await fsp.writeFile(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8')
    logger.info('Manifest written', { path: resolvedPath })
  }

  async invalidate(): Promise<void> {
    try {
      await fsp.unlink(this.resolvePath())
    } catch {
      // file may not exist
    }
  }

  getPath(): string {
    return this.storePath
  }

  private resolvePath(): string {
    return path.resolve(process.cwd(), this.storePath)
  }

  private toYAML(manifest: Manifest): string {
    const lines: string[] = [
      '# ============================================================================',
      '# IDEIA Manifest -- Auto-Description System',
      `# Generator: @ideia/manifest-self-description v${manifest.generatorVersion}`,
      `# Generated: ${manifest.generatedAt}`,
      '# ============================================================================',
      '',
      `id: ${manifest.id}`,
      `version: ${manifest.version}`,
      `platformVersion: ${manifest.platformVersion}`,
      `generatedAt: '${manifest.generatedAt}'`,
      `generatorVersion: ${manifest.generatorVersion}`,
      '',
      `name: ${manifest.name}`,
      `description: >`,
      `  ${manifest.description}`,
      '',
      'architecture:',
      `  pattern: ${manifest.architecture.pattern}`,
      '  layers:',
    ]
    for (const layer of manifest.architecture.layers) {
      lines.push(
        `    - id: ${layer.id}`,
        `      name: ${layer.name}`,
        `      description: ${layer.description}`,
        '      packages:',
      )
      for (const pkg of layer.packages) {
        lines.push(`        - ${pkg}`)
      }
    }
    lines.push(
      '  messageBus:',
      `    type: ${manifest.architecture.messageBus.type}`,
      `    implementation: ${manifest.architecture.messageBus.implementation}`,
      '    patterns:',
    )
    for (const p of manifest.architecture.messageBus.patterns) {
      lines.push(`      - ${p}`)
    }
    lines.push(
      '  extensibility:',
      `    pluginSystem: ${String(manifest.architecture.extensibility.pluginSystem)}`,
      `    mcpSupport: ${String(manifest.architecture.extensibility.mcpSupport)}`,
      `    adapterArchitecture: ${String(manifest.architecture.extensibility.adapterArchitecture)}`,
      '',
      'agents:',
    )
    for (const agent of manifest.agents) {
      lines.push(
        `  - id: ${agent.id}`,
        `    name: ${agent.name}`,
        `    role: ${agent.role}`,
        `    autonomyLevel: ${agent.autonomyLevel}`,
        '    capabilities:',
      )
      for (const cap of agent.capabilities) {
        lines.push(`      - ${cap}`)
      }
      if (agent.tools && agent.tools.length > 0) {
        lines.push('    tools:')
        for (const tool of agent.tools) {
          lines.push(`      - ${tool}`)
        }
      }
    }
    lines.push('', `capabilities:`)
    for (const cap of manifest.capabilities) {
      lines.push(
        `  - id: ${cap.id}`,
        `    name: ${cap.name}`,
        `    description: ${cap.description}`,
        `    riskLevel: ${cap.riskLevel ?? 'low'}`,
      )
    }
    lines.push('', `tools:`)
    for (const tool of manifest.tools) {
      lines.push(
        `  - id: ${tool.id}`,
        `    name: ${tool.name}`,
        `    description: ${tool.description}`,
        '    parameters: {}',
        `    dangerous: ${String(tool.dangerous ?? false)}`,
      )
    }
    lines.push('', `commands:`)
    for (const cmd of manifest.commands) {
      lines.push(
        `  - path: ${cmd.path}`,
        `    description: ${cmd.description}`,
        `    category: ${cmd.category}`,
      )
    }
    lines.push('', 'adapters:')
    for (const adp of manifest.adapters) {
      lines.push(
        `  - id: ${adp.id}`,
        `    language: ${adp.language}`,
        `    status: ${adp.status}`,
        '    capabilities:',
      )
      for (const cap of adp.capabilities) {
        lines.push(`      - ${cap}`)
      }
    }
    lines.push('', 'limitations:')
    lines.push('  notImplemented:')
    for (const item of manifest.limitations.notImplemented) {
      lines.push(`    - ${item}`)
    }
    lines.push('  experimental:')
    for (const item of manifest.limitations.experimental) {
      lines.push(`    - ${item}`)
    }
    lines.push('  deprecated:')
    for (const item of manifest.limitations.deprecated) {
      lines.push(`    - ${item}`)
    }
    lines.push(
      `  maxContextWindow: ${manifest.limitations.maxContextWindow}`,
      `  maxTokens: ${manifest.limitations.maxTokens}`,
      '  supportedModels:',
    )
    for (const model of manifest.limitations.supportedModels) {
      lines.push(`    - ${model}`)
    }
    return lines.join('\n') + '\n'
  }
}
