import { createLogger } from '@ideia/logger';
import { Memory, MemoryVariant, MemoryTemplate } from './types';

const _logger = createLogger('synthetic-memory:variant-gen');

export class MemoryVariantGenerator {
  private _templates: Map<string, MemoryTemplate> = new Map();

  constructor(templates?: MemoryTemplate[]) {
    if (templates) {
      for (const t of templates) {
        this._templates.set(t.id, t);
      }
    }
  }

  registerTemplate(template: MemoryTemplate): void {
    this._templates.set(template.id, template);
    _logger.info(`Template registered`, { id: template.id, name: template.name });
  }

  generateVariants(memory: Memory, count: number): MemoryVariant[] {
    const variants: MemoryVariant[] = [];
    const baseTime = Date.now();

    for (let i = 0; i < count; i++) {
      const importanceJitter = (Math.random() - 0.5) * 0.2;
      const clampedImportance = Math.max(0, Math.min(1, memory.importance + importanceJitter));

      const tagVariants = this._variateTags(memory.tags, i);

      const variant: MemoryVariant = {
        id: `var-${memory.id}-${i}`,
        templateId: 'direct',
        content: this._variateContent(memory.content, i),
        tags: tagVariants,
        importance: Math.round(clampedImportance * 100) / 100,
        timestamp: baseTime + i * 1000,
      };

      variants.push(variant);
    }

    _logger.info(`Generated ${count} variants for memory`, { memoryId: memory.id });
    return variants;
  }

  generateFromTemplate(templateId: string, count: number): MemoryVariant[] {
    const template = this._templates.get(templateId);
    if (template === undefined) {
      _logger.warn(`Template not found`, { templateId });
      return [];
    }

    const variants: MemoryVariant[] = [];
    const baseTime = Date.now();

    for (let i = 0; i < count; i++) {
      let content = template.contentPattern;
      const fillValue = `variant-${i}`;
      content = content.replace(/\{[^}]+\}/g, fillValue);

      const importanceMin = template.importanceRange[0];
      const importanceMax = template.importanceRange[1];
      const importance = importanceMin + Math.random() * (importanceMax - importanceMin);

      const variant: MemoryVariant = {
        id: `vtmpl-${templateId}-${i}`,
        templateId,
        content,
        tags: [...template.tags],
        importance: Math.round(importance * 100) / 100,
        timestamp: baseTime + i * 1000,
      };

      variants.push(variant);
    }

    return variants;
  }

  estimateDiversity(variants: MemoryVariant[]): number {
    if (variants.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    let pairs = 0;

    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        const embeddingA = variants[i].embedding;
        const embeddingB = variants[j].embedding;
        if (embeddingA !== undefined && embeddingB !== undefined) {
          totalDistance += this._cosineDistance(embeddingA, embeddingB);
        } else {
          totalDistance += this._textDistance(variants[i].content, variants[j].content);
        }
        pairs++;
      }
    }

    return pairs > 0 ? totalDistance / pairs : 0;
  }

  private _variateContent(content: string, index: number): string {
    const prefixes = ['', 'Note: ', 'Updated: ', 'Revised: '];
    const suffix = index > 2 ? ` (v${index})` : '';
    return prefixes[index % prefixes.length] + content + suffix;
  }

  private _variateTags(baseTags: string[], index: number): string[] {
    const extraTags = ['auto-generated', `variant-${index}`, index % 2 === 0 ? 'verified' : 'unverified'];
    return [...new Set([...baseTags, extraTags[index % extraTags.length]])];
  }

  private _cosineDistance(a: Float64Array, b: Float64Array): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom < 1e-10 ? 1 : 1 - dot / denom;
  }

  private _textDistance(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) {
      return 0;
    }
    const diff = this._levenshtein(a, b);
    return diff / maxLen;
  }

  private _levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
        }
      }
    }

    return dp[m][n];
  }
}
