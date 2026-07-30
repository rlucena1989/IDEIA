import { ContextPack, GenerateOptions, RefreshOptions, Section, VariableDefinition } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('context-pack-generator');

// --- CodeScanResult ---

export interface CodeScanResult {
  projectName: string;
  interfaces: string[];
  types: string[];
  exports: string[];
  schemas: string[];
  configs: string[];
}

// --- Manifest-like structure ---

export interface RealityManifest {
  project: {
    name: string;
    description: string;
    version: string;
  };
  packages: { name: string; path: string; description: string }[];
  capabilities: Record<string, unknown>;
  agents: { name: string; role: string }[];
  commands: { name: string; description: string }[];
}

export class PackGenerator {
  async fromManifest(manifest: RealityManifest, _options?: GenerateOptions): Promise<ContextPack> {
    const sections: Section[] = [
      {
        id: 'project_overview',
        title: 'Project Overview',
        format: 'markdown',
        priority: 'P0',
        content: `## Project: ${manifest.project.name}\n\n${manifest.project.description}`,
      },
      {
        id: 'packages',
        title: 'Packages',
        format: 'table',
        priority: 'P1',
        content: manifest.packages.map((p) => `| ${p.name} | ${p.description} | ${p.path} |`).join('\n'),
      },
      {
        id: 'capabilities',
        title: 'Capabilities',
        format: 'yaml',
        priority: 'P1',
        content: Object.entries(manifest.capabilities).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n'),
      },
      {
        id: 'agents',
        title: 'Agents',
        format: 'table',
        priority: 'P1',
        content: manifest.agents.map((a) => `| ${a.name} | ${a.role} |`).join('\n'),
      },
      {
        id: 'commands',
        title: 'Commands',
        format: 'table',
        priority: 'P2',
        content: manifest.commands.map((c) => `| ${c.name} | ${c.description} |`).join('\n'),
      },
    ];

    const variables: VariableDefinition[] = [
      {
        name: 'focus_area',
        type: 'string',
        description: 'Focus area for context',
        required: false,
      },
    ];

    return {
      name: `manifest-${manifest.project.name}`,
      version: '1.0.0',
      description: `Auto-generated context from manifest of ${manifest.project.name}`,
      author: 'IDEIA',
      tags: ['auto-generated', 'manifest', 'project-context'],
      categories: ['auto-generated'],
      level: 'intermediate',
      variables,
      sections,
      dependencies: [],
      slicing: [
        { maxTokens: 4096, strategy: 'priority', maxSections: 3 },
        { maxTokens: 8192, strategy: 'priority', maxSections: 5 },
        { maxTokens: 32768, strategy: 'priority' },
      ],
      hooks: [],
      examples: [],
    };
  }

  async fromCodeScan(scanResult: CodeScanResult, _options?: GenerateOptions): Promise<ContextPack> {
    const sections: Section[] = [
      {
        id: 'code_scan_overview',
        title: 'Code Scan Overview',
        format: 'markdown',
        priority: 'P0',
        content: `## Code Scan: ${scanResult.projectName}\n\nGenerated from code analysis.`,
      },
    ];

    if (scanResult.interfaces.length > 0) {
      sections.push({
        id: 'interfaces',
        title: 'Interfaces',
        format: 'code',
        priority: 'P1',
        content: scanResult.interfaces.join('\n'),
      });
    }

    if (scanResult.types.length > 0) {
      sections.push({
        id: 'types',
        title: 'Types',
        format: 'code',
        priority: 'P1',
        content: scanResult.types.join('\n'),
      });
    }

    if (scanResult.exports.length > 0) {
      sections.push({
        id: 'exports',
        title: 'Exports',
        format: 'code',
        priority: 'P2',
        content: scanResult.exports.join('\n'),
      });
    }

    return {
      name: `codescan-${scanResult.projectName}`,
      version: '1.0.0',
      description: `Auto-generated context from code scan of ${scanResult.projectName}`,
      author: 'IDEIA',
      tags: ['auto-generated', 'code-scan'],
      categories: ['auto-generated'],
      level: 'intermediate',
      variables: [],
      sections,
      dependencies: [],
      slicing: [
        { maxTokens: 4096, strategy: 'priority', maxSections: 3 },
        { maxTokens: 8192, strategy: 'priority' },
      ],
      hooks: [],
      examples: [],
    };
  }

  async fromTemplate(templateName: string, _variables: Record<string, unknown>, _options?: GenerateOptions): Promise<ContextPack> {
    const sections: Section[] = [
      {
        id: 'template_content',
        title: `Template: ${templateName}`,
        format: 'markdown',
        priority: 'P0',
        content: `## ${templateName}\n\nContent generated from template.`,
      },
    ];

    return {
      name: `template-${templateName}`,
      version: '1.0.0',
      description: `Context pack generated from template "${templateName}"`,
      author: 'IDEIA',
      tags: ['auto-generated', 'template', templateName],
      categories: ['auto-generated'],
      level: 'intermediate',
      variables: [],
      sections,
      dependencies: [],
      slicing: [],
      hooks: [],
      examples: [],
    };
  }

  async generateAuto(_context: { taskType: string; description: string; language?: string; framework?: string }): Promise<ContextPack> {
    const sections: Section[] = [
      {
        id: 'task_context',
        title: 'Task Context',
        format: 'markdown',
        priority: 'P0',
        content: `## Task: ${_context.taskType}\n\n${_context.description}`,
      },
    ];

    return {
      name: `auto-${_context.taskType}`,
      version: '1.0.0',
      description: `Auto-generated context for ${_context.taskType}`,
      author: 'IDEIA',
      tags: ['auto-generated', _context.taskType],
      categories: ['auto-generated'],
      level: 'intermediate',
      variables: [],
      sections,
      dependencies: [],
      slicing: [],
      hooks: [],
      examples: [],
    };
  }

  async refresh(pack: ContextPack, _options?: RefreshOptions): Promise<ContextPack> {
    const newVersion = this._bumpVersion(pack.version, _options?.versionStrategy ?? 'patch');
    return {
      ...pack,
      version: newVersion,
      updated: new Date().toISOString(),
      totalTokens: pack.sections.reduce((s, sec) => s + Math.ceil(sec.content.length / 4), 0),
    };
  }

  estimateTokens(pack: ContextPack): ContextPack {
    const totalTokens = pack.sections.reduce((s, sec) => s + Math.ceil(sec.content.length / 4), 0);
    const totalTokensShort = Math.ceil(totalTokens * 0.4);
    return { ...pack, totalTokens, totalTokensShort };
  }

  save(_pack: ContextPack, _path?: string): string {
    return `/context-packs/${_pack.name}@${_pack.version}.json`;
  }

  register(_registry: { register: (pack: ContextPack) => Promise<void> }, pack: ContextPack): Promise<void> {
    return _registry.register(pack);
  }

  private _bumpVersion(current: string, strategy: 'patch' | 'minor' | 'major'): string {
    const parts = current.split('.').map(Number);
    switch (strategy) {
      case 'major': return `${parts[0] + 1}.0.0`;
      case 'minor': return `${parts[0]}.${parts[1] + 1}.0`;
      case 'patch': return `${parts[0]}.${parts[1]}.${(parts[2] ?? 0) + 1}`;
      default: return `${parts[0]}.${parts[1]}.${(parts[2] ?? 0) + 1}`;
    }
  }
}
