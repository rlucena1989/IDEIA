import { createLogger } from '@ideia/logger';
import { Section, ContextPack, PackAssembly } from './types';

const logger = createLogger('pack-manager');

export class PackManager {
  private packs = new Map<string, ContextPack>();

  registerPack(pack: ContextPack): void {
    this.packs.set(pack.name, pack);
    logger.info('Pack registered', { id: pack.name, sections: pack.sections.length });
  }

  assemble(packId: string, budget: number): PackAssembly {
    const pack = this.packs.get(packId);
    if (!pack) throw new Error(`Pack ${packId} not found`);

    const priorityOrder: Record<string, number> = { P0: 3, P1: 2, P2: 1 };
    const sorted = [...pack.sections].sort(
      (a, b) => (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0)
    );
    const selected: Section[] = [];
    const trimmed: string[] = [];
    let used = 0;

    for (const section of sorted) {
      const sectionTokens = Math.ceil(section.content.length / 4);
      if (used + sectionTokens <= budget) {
        selected.push(section);
        used += sectionTokens;
      } else {
        trimmed.push(section.id);
      }
    }

    logger.info('Pack assembled', { packId, selected: selected.length, trimmed: trimmed.length, used });
    return { packId, sections: selected, totalTokens: used, budget, trimmedSections: trimmed };
  }

  prioritize(packId: string, query: string): { sectionId: string; score: number; reason: string }[] {
    const pack = this.packs.get(packId);
    if (!pack) return [];
    const priorityOrder: Record<string, number> = { P0: 3, P1: 2, P2: 1 };
    return pack.sections.map(s => {
      const relevance = query ? (s.title.toLowerCase().includes(query.toLowerCase()) ? 0.9 : 0.3) : 0.5;
      const basePriority = priorityOrder[s.priority] ?? 1;
      return {
        sectionId: s.id,
        score: relevance * basePriority,
        reason: relevance > 0.5 ? 'Query match' : 'Default priority',
      };
    }).sort((a, b) => b.score - a.score);
  }

  getPack(id: string): ContextPack | undefined {
    return this.packs.get(id);
  }

  getAllPacks(): ContextPack[] {
    return Array.from(this.packs.values());
  }
}
