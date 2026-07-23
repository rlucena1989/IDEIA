/** Interface que define a estrutura de project summary. */
export interface ProjectSummary {
  projectName: string;
  stack: string[];
  frameworks: string[];
  totalFiles: number;
  totalLines: number;
  totalTokens: number;
  lastModified: string;
  keyModules: string[];
  recentChanges: string[];
  architecture: string;
  languages: Record<string, number>;
}

/** Interface que define a estrutura de decision cache entry. */
export interface DecisionCacheEntry {
  id: string;
  decision: string;
  context: string;
  outcome: string;
  timestamp: number;
  taskType: string;
  tags: string[];
  tokenCost: number;
}

/** Interface que define a estrutura de decision cache stats. */
export interface DecisionCacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalTokensSaved: number;
  byType: Record<string, { hits: number; misses: number }>;
}

/** Interface que define a estrutura de summarizer config. */
export interface SummarizerConfig {
  maxSummaryLength: number;
  maxDecisions: number;
}

/** Processa e f a u l t_ s u m m a r i z e r_ c o n f i g. */
export const DEFAULT_SUMMARIZER_CONFIG: SummarizerConfig = {
  maxSummaryLength: 500,
  maxDecisions: 100,
};

/** Classe responsável por processa cache. */
export class DecisionCache {
  private entries: Map<string, DecisionCacheEntry> = new Map();
  private hits = 0;
  private misses = 0;
  private byType: Record<string, { hits: number; misses: number }> = {};

  add(entry: DecisionCacheEntry): void {
    if (this.entries.size >= 100) {
      const oldest = Array.from(this.entries.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      if (oldest) this.entries.delete(oldest[0]);
    }
    this.entries.set(entry.id, entry);
  }

  get(id: string): DecisionCacheEntry | undefined {
    const entry = this.entries.get(id);
    if (entry) {
      this.hits++;
      this.recordHit(entry.taskType);
    } else {
      this.misses++;
      this.recordMiss('unknown');
    }
    return entry;
  }

  find(query: string, taskType?: string): DecisionCacheEntry | undefined {
    const queryLower = query.toLowerCase();
    for (const entry of this.entries.values()) {
      if (taskType && entry.taskType !== taskType) continue;
      if (
        entry.decision.toLowerCase().includes(queryLower) ||
        entry.context.toLowerCase().includes(queryLower)
      ) {
        this.hits++;
        this.recordHit(entry.taskType);
        return entry;
      }
    }
    this.misses++;
    this.recordMiss(taskType || 'unknown');
    return undefined;
  }

  clear(): void {
    this.entries.clear();
  }

  getAll(): DecisionCacheEntry[] {
    return Array.from(this.entries.values());
  }

  getStats(): DecisionCacheStats {
    const total = this.hits + this.misses;
    return {
      totalEntries: this.entries.size,
      totalHits: this.hits,
      totalMisses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 10000) / 100 : 0,
      totalTokensSaved: this.hits * 500,
      byType: { ...this.byType },
    };
  }

  private recordHit(taskType: string): void {
    if (!this.byType[taskType]) this.byType[taskType] = { hits: 0, misses: 0 };
    this.byType[taskType]!.hits++;
  }

  private recordMiss(taskType: string): void {
    if (!this.byType[taskType]) this.byType[taskType] = { hits: 0, misses: 0 };
    this.byType[taskType]!.misses++;
  }
}

/**
 * Resume project.
 * @param summary - Valor summary.
 * @param maxLength - Valor length.
 * @returns O resultado da operação.
 */
export function summarizeProject(
  summary: ProjectSummary,
  maxLength?: number,
): string {
  const limit = maxLength || DEFAULT_SUMMARIZER_CONFIG.maxSummaryLength;
  const parts: string[] = [];

  parts.push(`${summary.projectName}`);
  parts.push(`Stack: ${summary.stack.join(', ')}`);
  if (summary.frameworks.length > 0) {
    parts.push(`Frameworks: ${summary.frameworks.join(', ')}`);
  }
  parts.push(`Arquivos: ${summary.totalFiles} | Linhas: ${summary.totalLines}`);

  const langInfo = Object.entries(summary.languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([lang, count]) => `${lang}(${count})`)
    .join(', ');
  parts.push(`Linguagens: ${langInfo}`);

  parts.push(`Arquitetura: ${summary.architecture}`);

  if (summary.keyModules.length > 0) {
    parts.push(`Modulos: ${summary.keyModules.slice(0, 5).join(', ')}`);
  }

  if (summary.recentChanges.length > 0) {
    parts.push(`Mudancas recentes: ${summary.recentChanges.slice(0, 3).join('; ')}`);
  }

  const result = parts.join(' | ');
  if (result.length <= limit) return result;
  return result.slice(0, limit - 3) + '...';
}

/**
 * Formata summary compact.
 * @param summary - Valor summary.
 * @returns O resultado da operação.
 */
export function formatSummaryCompact(summary: ProjectSummary): string {
  return summarizeProject(summary, 300);
}

/**
 * Formata short decision.
 * @param entry - Valor entry.
 * @returns O resultado da operação.
 */
export function formatShortDecision(entry: DecisionCacheEntry): string {
  return `[${entry.taskType}] ${entry.decision.slice(0, 80)} => ${entry.outcome.slice(0, 60)}`;
}
