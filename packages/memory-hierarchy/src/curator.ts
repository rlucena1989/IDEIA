import { MemoryEntry, MemoryLevel, PromotionRule } from './types';
import { createLogger } from '@ideia/logger';
import { WorkingMemory } from './working-memory';
import { ProjectMemory } from './project-memory';
import { InstitutionalMemory } from './institutional-memory';
import { GlobalMemory } from './global-memory';
const logger = createLogger('curator');

export interface CuratorConfig {
  autoPromote: boolean;
  promotionRules: PromotionRule[];
}

const DEFAULT_RULES: PromotionRule[] = [
  { fromLevel: 'working', toLevel: 'project', minAccessCount: 3, minConfidence: 0.7 },
  { fromLevel: 'project', toLevel: 'institutional', minAccessCount: 5, minConfidence: 0.85, requiredTags: ['policy', 'compliance'] },
  { fromLevel: 'project', toLevel: 'global', minAccessCount: 8, minConfidence: 0.9 },
  { fromLevel: 'institutional', toLevel: 'global', minAccessCount: 3, minConfidence: 0.95 },
];

export class MemoryCurator {
  private config: CuratorConfig;

  constructor(
    private working: WorkingMemory,
    private project: ProjectMemory,
    private institutional: InstitutionalMemory,
    private global: GlobalMemory,
    config?: Partial<CuratorConfig>,
  ) {
    this.config = {
      autoPromote: true,
      promotionRules: DEFAULT_RULES,
      ...config,
    };
  }

  evaluatePromotions(): { promoted: MemoryEntry[]; candidates: MemoryEntry[] } {
    const promoted: MemoryEntry[] = [];
    const candidates: MemoryEntry[] = [];

    const wmEntries = this.working.getAll();
    const pmEntries = this.project.getAll();

    for (const entry of [...wmEntries, ...pmEntries]) {
      for (const rule of this.config.promotionRules) {
        if (entry.level !== rule.fromLevel) continue;
        if (entry.accessCount < rule.minAccessCount) continue;
        if (entry.confidence < rule.minConfidence) continue;
        if (rule.requiredTags && !rule.requiredTags.some(t => entry.tags.includes(t))) continue;

        candidates.push(entry);

        if (this.config.autoPromote) {
          const promotedEntry = this.promote(entry, rule.toLevel);
          promoted.push(promotedEntry);
        }
      }
    }

    return { promoted, candidates };
  }

  promote(entry: MemoryEntry, toLevel: MemoryLevel): MemoryEntry {
    const promoted: MemoryEntry = {
      ...entry,
      level: toLevel,
      id: `${entry.id}_promoted_${toLevel}`,
      status: 'promoted',
      confidence: Math.min(1, entry.confidence + 0.05),
      updatedAt: new Date().toISOString(),
      tags: [...entry.tags, `promoted_from_${entry.level}`],
    };

    switch (toLevel) {
      case 'project':
        this.project.store(promoted.content, promoted.category, promoted.source, promoted.tags);
        break;
      case 'institutional':
        this.institutional.storePolicy(promoted.source, promoted.content, promoted.tags);
        break;
      case 'global':
        this.global.storePattern(promoted.source, promoted.content, promoted.tags);
        break;
    }

    return promoted;
  }

  getSummary(): { working: number; project: number; institutional: number; global: number; promoted: number } {
    return {
      working: this.working.size,
      project: this.project.size,
      institutional: this.institutional.size,
      global: this.global.size,
      promoted: this.evaluatePromotions().promoted.length,
    };
  }
}
