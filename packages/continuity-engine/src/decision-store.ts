import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { MemoryStore, createMemoryRecord } from '@ideia/memory-store';
const logger = createLogger('decision-store');

export interface DecisionOption {
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

export interface StoredDecision {
  id: string;
  timestamp: string;
  context: Record<string, unknown>;
  options: DecisionOption[];
  choice: string;
  justification: string;
  outcome?: string;
}

export class DecisionStore {
  private decisions: StoredDecision[] = [];
  private memoryStore?: MemoryStore;

  constructor(memoryStore?: MemoryStore) {
    this.memoryStore = memoryStore;
  }

  store(context: Record<string, unknown>, options: DecisionOption[], choice: string, justification: string): StoredDecision {
    const decision: StoredDecision = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      context,
      options,
      choice,
      justification,
    };

    this.decisions.push(decision);
    this.persistToMemory(decision);

    return decision;
  }

  updateOutcome(id: string, outcome: string): boolean {
    const decision = this.decisions.find(d => d.id === id);
    if (!decision) return false;
    decision.outcome = outcome;
    return true;
  }

  getRecent(limit?: number): StoredDecision[] {
    const n = limit ?? 10;
    return [...this.decisions].reverse().slice(0, n);
  }

  getByContext(contextFilter: Record<string, unknown>): StoredDecision[] {
    return this.decisions.filter(d => {
      for (const [key, value] of Object.entries(contextFilter)) {
        if (d.context[key] !== value) return false;
      }
      return true;
    });
  }

  getAll(): StoredDecision[] {
    return [...this.decisions];
  }

  count(): number {
    return this.decisions.length;
  }

  clear(): void {
    this.decisions = [];
  }

  private persistToMemory(decision: StoredDecision): void {
    if (!this.memoryStore) return;

    const record = createMemoryRecord({
      category: 'decision',
      source: 'continuity-engine',
      summary: `Decision: ${decision.choice}`,
      tags: ['decision', 'continuity'],
    });
    record.context = { decision: JSON.parse(JSON.stringify(decision)) };
    this.memoryStore.append(record);
  }
}

export function createDecisionStore(memoryStore?: MemoryStore): DecisionStore {
  return new DecisionStore(memoryStore);
}
