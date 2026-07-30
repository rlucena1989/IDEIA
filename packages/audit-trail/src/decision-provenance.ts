import { createHash, randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';

const logger = createLogger('audit-trail:decision-provenance');

export interface DecisionProvenance {
  id: string;
  parentId?: string;
  timestamp: string;
  actor: string;
  category: string;
  description: string;
  context: Record<string, unknown>;
  rationale: string;
  alternatives: Array<{ label: string; pros: string[]; cons: string[] }>;
  outcome: 'accepted' | 'rejected' | 'superseded' | 'rolled_back';
  outcomeReason?: string;
  metadata?: Record<string, unknown>;
  hash: string;
  previousHash?: string;
}

export interface ProvenanceChain {
  decisions: DecisionProvenance[];
  tipHash: string;
  totalDecisions: number;
}

export class DecisionProvenanceTracker {
  private decisions: DecisionProvenance[] = [];
  private maxDecisions: number;

  constructor(maxDecisions = 10000) {
    this.maxDecisions = maxDecisions;
  }

  record(params: {
    actor: string;
    category: string;
    description: string;
    context?: Record<string, unknown>;
    rationale: string;
    alternatives?: Array<{ label: string; pros: string[]; cons: string[] }>;
    outcome?: DecisionProvenance['outcome'];
    outcomeReason?: string;
    parentId?: string;
    metadata?: Record<string, unknown>;
  }): DecisionProvenance {
    const previousHash = this.decisions.length > 0
      ? this.decisions[this.decisions.length - 1].hash
      : undefined;

    const decision: DecisionProvenance = {
      id: randomUUID(),
      parentId: params.parentId,
      timestamp: new Date().toISOString(),
      actor: params.actor,
      category: params.category,
      description: params.description,
      context: params.context ?? {},
      rationale: params.rationale,
      alternatives: params.alternatives ?? [],
      outcome: params.outcome ?? 'accepted',
      outcomeReason: params.outcomeReason,
      metadata: params.metadata,
      hash: '',
      previousHash,
    };

    decision.hash = this.hashDecision(decision);
    this.decisions.push(decision);

    if (this.decisions.length > this.maxDecisions) {
      this.decisions = this.decisions.slice(-this.maxDecisions);
    }

    logger.info('Decision recorded', {
      id: decision.id,
      category: decision.category,
      outcome: decision.outcome,
    });

    return decision;
  }

  getChain(): ProvenanceChain {
    return {
      decisions: [...this.decisions],
      tipHash: this.decisions.length > 0
        ? this.decisions[this.decisions.length - 1].hash
        : '',
      totalDecisions: this.decisions.length,
    };
  }

  get(id: string): DecisionProvenance | undefined {
    return this.decisions.find(d => d.id === id);
  }

  query(filter: {
    category?: string;
    actor?: string;
    outcome?: DecisionProvenance['outcome'];
    since?: string;
    until?: string;
  }): DecisionProvenance[] {
    let results = [...this.decisions];
    if (filter.category) results = results.filter(d => d.category === filter.category);
    if (filter.actor) results = results.filter(d => d.actor === filter.actor);
    if (filter.outcome) results = results.filter(d => d.outcome === filter.outcome);
    const sinceVal = filter.since;
    const untilVal = filter.until;
    if (sinceVal) results = results.filter(d => d.timestamp >= sinceVal);
    if (untilVal) results = results.filter(d => d.timestamp <= untilVal);
    return results;
  }

  getChildren(parentId: string): DecisionProvenance[] {
    return this.decisions.filter(d => d.parentId === parentId);
  }

  getLineage(decisionId: string): DecisionProvenance[] {
    const lineage: DecisionProvenance[] = [];
    let current = this.decisions.find(d => d.id === decisionId);
    for (let iter = current; iter; iter = iter.parentId ? this.decisions.find(d => d.id === iter.parentId) : undefined) {
      lineage.unshift(iter);
    }
    return lineage;
  }

  verifyChain(): { valid: boolean; breakAtIndex: number | null; breakReason: string | null } {
    for (let i = 0; i < this.decisions.length; i++) {
      const current = this.decisions[i];
      const computedHash = this.hashDecision(current);
      if (current.hash !== computedHash) {
        return {
          valid: false,
          breakAtIndex: i,
          breakReason: `Decision ${i} hash mismatch: expected ${computedHash}, got ${current.hash}`,
        };
      }
      if (i > 0) {
        const prev = this.decisions[i - 1];
        if (current.previousHash !== prev.hash) {
          return {
            valid: false,
            breakAtIndex: i,
            breakReason: `Decision ${i} previousHash ${current.previousHash} does not match decision ${i - 1} hash ${prev.hash}`,
          };
        }
      }
    }
    return { valid: true, breakAtIndex: null, breakReason: null };
  }

  toJSON(): string {
    return JSON.stringify({ decisions: this.decisions, version: 1 }, null, 2);
  }

  fromJSON(json: string): void {
    const data = JSON.parse(json);
    if (Array.isArray(data.decisions)) {
      this.decisions = data.decisions;
    }
  }

  private hashDecision(decision: DecisionProvenance): string {
    const { hash: _hash, ...rest } = decision;
    return createHash('sha256')
      .update(JSON.stringify(rest, Object.keys(rest).sort()))
      .digest('hex');
  }
}
