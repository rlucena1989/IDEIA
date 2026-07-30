import { DecisionStore, StoredDecision } from './decision-store';
import { createLogger } from '@ideia/logger';
import { ContinuityEngine } from './continuity-engine';
const logger = createLogger('session-summary');

export interface SessionSummary {
  generatedAt: string;
  totalDecisions: number;
  pendingDecisions: number;
  decisions: StoredDecision[];
  pendingItems: PendingItem[];
}

export interface PendingItem {
  type: 'decision' | 'task';
  description: string;
  id: string;
  timestamp: string;
}

export class SessionSummaryGenerator {
  private decisionStore: DecisionStore;
  private continuityEngine?: ContinuityEngine;

  constructor(decisionStore: DecisionStore, continuityEngine?: ContinuityEngine) {
    this.decisionStore = decisionStore;
    this.continuityEngine = continuityEngine;
  }

  generate(): SessionSummary {
    const allDecisions = this.decisionStore.getAll();
    const pendingDecisions = allDecisions.filter(d => !d.outcome);

    const pendingItems: PendingItem[] = pendingDecisions.map(d => ({
      type: 'decision',
      description: `Decision: ${d.choice} (${d.justification.substring(0, 60)})`,
      id: d.id,
      timestamp: d.timestamp,
    }));

    if (this.continuityEngine) {
      const pendingEngine = this.continuityEngine.getPendingDecisions();
      for (const pd of pendingEngine) {
        pendingItems.push({
          type: 'task',
          description: pd.description,
          id: pd.id,
          timestamp: new Date(pd.createdAt).toISOString(),
        });
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      totalDecisions: allDecisions.length,
      pendingDecisions: pendingDecisions.length,
      decisions: allDecisions.slice(-20).reverse(),
      pendingItems,
    };
  }

  formatMarkdown(): string {
    const summary = this.generate();
    const lines: string[] = [
      '# Session Summary',
      '',
      `Generated: ${summary.generatedAt}`,
      '',
      '## Overview',
      `- Total decisions made: ${summary.totalDecisions}`,
      `- Pending items: ${summary.pendingItems.length}`,
      '',
    ];

    if (summary.pendingItems.length > 0) {
      lines.push('## Pending Items', '');
      for (const item of summary.pendingItems) {
        lines.push(`- [${item.type}] ${item.description}`);
      }
      lines.push('');
    }

    if (summary.decisions.length > 0) {
      lines.push('## Recent Decisions', '');
      for (const d of summary.decisions) {
        const status = d.outcome ? `✓ ${d.outcome}` : '⏳ pending';
        lines.push(`- **${d.choice}** — ${d.justification.substring(0, 80)} (${status})`);
      }
    }

    return lines.join('\n');
  }
}

export function createSessionSummaryGenerator(decisionStore: DecisionStore, continuityEngine?: ContinuityEngine): SessionSummaryGenerator {
  return new SessionSummaryGenerator(decisionStore, continuityEngine);
}
