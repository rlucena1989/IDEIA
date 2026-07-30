import { ProvenanceEntry } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('provenance');

export class ContextProvenance {
  private entries: ProvenanceEntry[] = [];

  record(itemId: string, action: ProvenanceEntry['action'], reason: string, source: string, score?: number): void {
    this.entries.push({ itemId, action, reason, source, score });
  }

  getEntries(): ProvenanceEntry[] {
    return [...this.entries];
  }

  getEntriesByAction(action: ProvenanceEntry['action']): ProvenanceEntry[] {
    return this.entries.filter(e => e.action === action);
  }

  getEntriesBySource(source: string): ProvenanceEntry[] {
    return this.entries.filter(e => e.source === source);
  }

  getIncludedCount(): number {
    return this.entries.filter(e => e.action === 'included').length;
  }

  getExcludedCount(): number {
    return this.entries.filter(e => e.action !== 'included').length;
  }

  clear(): void {
    this.entries = [];
  }

  summary(): string {
    const included = this.getIncludedCount();
    const excluded = this.getExcludedCount();
    const byAction = this.entries.reduce(
      (acc, e) => {
        acc[e.action] = (acc[e.action] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return `Provenance: ${included} included, ${excluded} excluded | ${Object.entries(byAction)
      .map(([a, c]) => `${a}=${c}`)
      .join(', ')}`;
  }
}
