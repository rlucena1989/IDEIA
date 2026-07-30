import { createHash, randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';

const log = createLogger('audit-trail:provenance');

export interface ProvenanceEntry {
  id: string;
  source: string;
  target: string;
  relation: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  hash: string;
  previousHash?: string;
}

export interface ProvenanceGraph {
  nodes: { id: string; label: string; type: 'source' | 'target' | 'intermediate' }[];
  edges: { source: string; target: string; relation: string; id: string }[];
}

export class ProvenanceTracker {
  private entries: ProvenanceEntry[] = [];
  private maxEntries: number;
  private indexBySource: Map<string, ProvenanceEntry[]> = new Map();
  private indexByTarget: Map<string, ProvenanceEntry[]> = new Map();
  private indexByRelation: Map<string, ProvenanceEntry[]> = new Map();

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries;
  }

  record(source: string, target: string, relation: string, metadata?: Record<string, unknown>): ProvenanceEntry {
    const previousHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].hash
      : undefined;

    const entry: ProvenanceEntry = {
      id: randomUUID(),
      source,
      target,
      relation,
      timestamp: new Date().toISOString(),
      metadata,
      hash: '',
      previousHash,
    };

    entry.hash = this.hashEntry(entry);
    this.entries.push(entry);
    this.indexEntry(entry);

    if (this.entries.length > this.maxEntries) {
      const removed = this.entries.splice(0, this.entries.length - this.maxEntries);
      for (const r of removed) {
        this.deindexEntry(r);
      }
    }

    log.info('Provenance recorded', { id: entry.id, source, target, relation });
    return entry;
  }

  get(id: string): ProvenanceEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  getProvenance(id: string): ProvenanceEntry[] {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return [];
    const chain: ProvenanceEntry[] = [entry];
    let current = entry;
    while (current.previousHash) {
      const prev = this.entries.find(e => e.hash === current.previousHash);
      if (prev) {
        chain.unshift(prev);
        current = prev;
      } else {
        break;
      }
    }
    return chain;
  }

  getLineage(target: string): ProvenanceEntry[] {
    const visited = new Set<string>();
    const result: ProvenanceEntry[] = [];

    const walk = (tgt: string) => {
      const directSources = this.indexByTarget.get(tgt) || [];
      for (const entry of directSources) {
        if (!visited.has(entry.id)) {
          visited.add(entry.id);
          result.push(entry);
          walk(entry.source);
        }
      }
    };

    walk(target);
    return result;
  }

  queryBySource(source: string): ProvenanceEntry[] {
    return [...(this.indexBySource.get(source) || [])];
  }

  queryByType(relation: string): ProvenanceEntry[] {
    return [...(this.indexByRelation.get(relation) || [])];
  }

  exportProvenanceGraph(): ProvenanceGraph {
    const nodes = new Map<string, { label: string; type: 'source' | 'target' | 'intermediate' }>();
    const edges: ProvenanceGraph['edges'] = [];

    for (const entry of this.entries) {
      if (!nodes.has(entry.source)) {
        const isOnlySource = !this.indexByTarget.has(entry.source);
        nodes.set(entry.source, {
          label: entry.source,
          type: isOnlySource ? 'source' : 'intermediate',
        });
      }
      if (!nodes.has(entry.target)) {
        const isOnlyTarget = !this.indexBySource.has(entry.target);
        nodes.set(entry.target, {
          label: entry.target,
          type: isOnlyTarget ? 'target' : 'intermediate',
        });
      }
      edges.push({ source: entry.source, target: entry.target, relation: entry.relation, id: entry.id });
    }

    return {
      nodes: Array.from(nodes.entries()).map(([id, n]) => ({ id, ...n })),
      edges,
    };
  }

  verifyChain(): { valid: boolean; breakAtIndex: number | null; breakReason: string | null } {
    for (let i = 0; i < this.entries.length; i++) {
      const current = this.entries[i];
      const computedHash = this.hashEntry(current);
      if (current.hash !== computedHash) {
        return {
          valid: false,
          breakAtIndex: i,
          breakReason: `Entry ${i} hash mismatch: expected ${computedHash}, got ${current.hash}`,
        };
      }
      if (i > 0) {
        const prev = this.entries[i - 1];
        if (current.previousHash !== prev.hash) {
          return {
            valid: false,
            breakAtIndex: i,
            breakReason: `Entry ${i} previousHash ${current.previousHash} does not match entry ${i - 1} hash ${prev.hash}`,
          };
        }
      }
    }
    return { valid: true, breakAtIndex: null, breakReason: null };
  }

  toJSON(): string {
    return JSON.stringify({ entries: this.entries, version: 1 }, null, 2);
  }

  fromJSON(json: string): void {
    const data = JSON.parse(json);
    if (Array.isArray(data.entries)) {
      this.entries = data.entries;
      this.rebuildIndexes();
    }
  }

  private indexEntry(entry: ProvenanceEntry): void {
    const srcList = this.indexBySource.get(entry.source);
    if (srcList) srcList.push(entry); else this.indexBySource.set(entry.source, [entry]);

    const tgtList = this.indexByTarget.get(entry.target);
    if (tgtList) tgtList.push(entry); else this.indexByTarget.set(entry.target, [entry]);

    const relList = this.indexByRelation.get(entry.relation);
    if (relList) relList.push(entry); else this.indexByRelation.set(entry.relation, [entry]);
  }

  private deindexEntry(entry: ProvenanceEntry): void {
    const removeFrom = (map: Map<string, ProvenanceEntry[]>, key: string) => {
      const list = map.get(key);
      if (list) {
        const idx = list.findIndex(e => e.id === entry.id);
        if (idx >= 0) list.splice(idx, 1);
        if (list.length === 0) map.delete(key);
      }
    };
    removeFrom(this.indexBySource, entry.source);
    removeFrom(this.indexByTarget, entry.target);
    removeFrom(this.indexByRelation, entry.relation);
  }

  private rebuildIndexes(): void {
    this.indexBySource.clear();
    this.indexByTarget.clear();
    this.indexByRelation.clear();
    for (const entry of this.entries) {
      this.indexEntry(entry);
    }
  }

  private hashEntry(entry: ProvenanceEntry): string {
    const { hash: _hash, ...rest } = entry;
    return createHash('sha256')
      .update(JSON.stringify(rest, Object.keys(rest).sort()))
      .digest('hex');
  }
}
