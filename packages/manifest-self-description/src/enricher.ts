import { createLogger } from '@ideia/logger'
import { DescriptionLevel, EnrichTarget, Manifest, AgentManifest } from './types'
import { ManifestResolver } from './resolver'

const logger = createLogger('manifest-enricher')

export class ContextEnricher {
  private resolver: ManifestResolver

  constructor(resolver?: ManifestResolver) {
    this.resolver = resolver ?? new ManifestResolver()
  }

  async enrich(level: DescriptionLevel, target: EnrichTarget): Promise<string> {
    switch (level) {
      case 'summary': return this.buildSummary()
      case 'full': return this.buildFullDescription()
      case 'detailed': return this.buildDetailed()
    }
  }

  async enrichSystemPrompt(prompt: string, level: DescriptionLevel): Promise<string> {
    const context = await this.enrich(level, 'system-prompt')
    return `${prompt}\n\n---\n\n## IDEIA Platform Context\n\n${context}`
  }

  private async buildSummary(): Promise<string> {
    const manifest = await this.resolver.resolve<Manifest>({ all: true })
    return [
      `# ${manifest.name} Platform -- Summary`,
      '',
      `${manifest.description}`,
      '',
      '## Architecture',
      `- ${manifest.architecture.layers.length} camadas: ${manifest.architecture.layers.map(l => l.name).join(' \u2192 ')}`,
      `- Padrao: ${manifest.architecture.pattern}`,
      `- Barramento: ${manifest.architecture.messageBus.implementation}`,
      '',
      `## Agents (${manifest.agents.length})`,
      ...manifest.agents.map(a => `  ${a.name.padEnd(12)} - ${a.role}`),
      '',
      '## Commands',
      ...manifest.commands.map(c => `  ${c.path}`),
      '',
      '## Limitations',
      ...manifest.limitations.notImplemented.slice(0, 3).map(l => `  - ${l}`),
    ].join('\n')
  }

  private async buildFullDescription(): Promise<string> {
    const manifest = await this.resolver.resolve<Manifest>({ all: true })
    const lines: string[] = [
      `# ${manifest.name} Platform -- Full Description`,
      '',
      '## Identity',
      `  Name: ${manifest.name}`,
      `  Version: ${manifest.platformVersion}`,
      `  Description: ${manifest.description}`,
      '',
      `## Architecture (${manifest.architecture.layers.length} layers)`,
    ]
    for (const layer of manifest.architecture.layers) {
      lines.push(`  [${layer.id}] ${layer.name}`)
      lines.push(`    ${layer.description}`)
    }
    lines.push('', `## Agents (${manifest.agents.length})`)
    for (const agent of manifest.agents) {
      lines.push(
        `  ## ${agent.name} (${agent.autonomyLevel})`,
        `    ${agent.role}`,
        `    Tools: ${agent.tools?.join(', ') ?? 'none'}`,
      )
    }
    lines.push('', '## CLI Commands')
    for (const cmd of manifest.commands) {
      lines.push(`  ${cmd.path} - ${cmd.description}`)
    }
    lines.push('', '## Limitations')
    lines.push('  [Not Implemented]', ...manifest.limitations.notImplemented.slice(0, 5).map(l => `    - ${l}`))
    lines.push(`  [Max Context] ${manifest.limitations.maxContextWindow} tokens`)
    lines.push(`  [Max Output] ${manifest.limitations.maxTokens} tokens`)
    return lines.join('\n')
  }

  private async buildDetailed(): Promise<string> {
    const full = await this.buildFullDescription()
    const manifest = await this.resolver.resolve<Manifest>({ all: true })
    const sections: string[] = [
      full,
      '',
      '## Capabilities',
      ...manifest.capabilities.map(c => `  - ${c.name}: ${c.description} [${c.riskLevel ?? 'low'}]`),
      '',
      '## Tools',
      ...manifest.tools.map(t => {
        const paramNames = Object.keys(t.parameters)
        return `  - ${t.name}: ${t.description} (params: ${paramNames.join(', ')})${t.dangerous ? ' [DANGEROUS]' : ''}`
      }),
      '',
      '## Adapters',
      ...manifest.adapters.map(a => `  - ${a.language} (${a.status}): ${a.capabilities.join(', ')}`),
      '',
      '## Workflows',
      ...manifest.workflows.map(w => {
        return `  - ${w.name}: ${w.steps.map(s => `${s.agent}/${s.action}`).join(' \u2192 ')}`
      }),
      '',
      '## Limitations (full)',
      '  Not Implemented:',
      ...manifest.limitations.notImplemented.map(l => `    - ${l}`),
      '  Experimental:',
      ...manifest.limitations.experimental.map(l => `    - ${l}`),
      `  Supported Models: ${manifest.limitations.supportedModels.join(', ')}`,
    ]
    return sections.join('\n')
  }
}
