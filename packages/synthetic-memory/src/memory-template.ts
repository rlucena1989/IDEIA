import { createLogger } from '@ideia/logger';
import { Memory, MemoryTemplate as MemoryTemplateInterface, MemoryProvenance } from './types';

const _logger = createLogger('synthetic-memory:template');

export class MemoryTemplate {
  private _template: MemoryTemplateInterface;

  constructor(template: MemoryTemplateInterface) {
    this._template = template;
  }

  get id(): string {
    return this._template.id;
  }

  get name(): string {
    return this._template.name;
  }

  get template(): MemoryTemplateInterface {
    return { ...this._template };
  }

  generateMemory(seedValues?: Record<string, string>): Memory {
    let content = this._template.contentPattern;
    if (seedValues) {
      for (const [key, value] of Object.entries(seedValues)) {
        content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    const importanceMin = this._template.importanceRange[0];
    const importanceMax = this._template.importanceRange[1];
    const importance = Math.round((importanceMin + Math.random() * (importanceMax - importanceMin)) * 100) / 100;

    const provenance: MemoryProvenance = {
      originalSources: [this._template.source],
      synthesisMethod: 'template',
      faithfulness: 0.95,
    };

    const memory: Memory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content,
      summary: content.length > 120 ? content.substring(0, 117) + '...' : content,
      importance,
      tags: [...this._template.tags],
      source: 'synthesis',
      timestamp: Date.now(),
      level: importance >= 0.8 ? 'L4' : importance >= 0.6 ? 'L3' : importance >= 0.3 ? 'L2' : 'L1',
      provenance,
      accessCount: 0,
      lastAccessed: Date.now(),
      decayFactor: 0.95,
    };

    _logger.info(`Memory generated from template "${this._template.name}"`, { id: memory.id, importance });

    return memory;
  }

  generateBatch(count: number, seedValuesList?: Record<string, string>[]): Memory[] {
    const memories: Memory[] = [];
    for (let i = 0; i < count; i++) {
      const values = seedValuesList && i < seedValuesList.length ? seedValuesList[i] : undefined;
      memories.push(this.generateMemory(values));
    }
    return memories;
  }
}
