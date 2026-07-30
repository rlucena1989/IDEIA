import crypto from 'crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('merkle-proof');

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  actor: string | { id: string; type: string };
  eventType: string;
  target: string;
  decision: string;
  approvalStatus?: string;
  result: string;
  metadata?: Record<string, unknown>;
  previousHash?: string;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

export interface InclusionProof {
  entryIndex: number;
  entryHash: string;
  siblings: string[];
  rootHash: string;
  verifiedAt: string;
}

export class MerkleProof {
  private events: AuditEvent[];

  constructor(events: AuditEvent[]) {
    this.events = events;
  }

  proveEntry(eventId: string): InclusionProof | null {
    const entryIndex = this.events.findIndex(e => e.eventId === eventId);
    if (entryIndex === -1) return null;

    const entryHash = this.hashEvent(this.events[entryIndex]);
    const tree = this.buildTree();
    const siblings = this.collectSiblings(entryIndex, tree);
    const rootHash = tree.length > 0 ? tree[0]?.hash ?? '' : '';

    return {
      entryIndex,
      entryHash,
      siblings,
      rootHash,
      verifiedAt: new Date().toISOString(),
    };
  }

  verifyProof(proof: InclusionProof): boolean {
    if (this.events.length === 0) return false;
    if (proof.entryIndex >= this.events.length) return false;

    let computedHash = proof.entryHash;
    let index = proof.entryIndex;
    const _len = this.events.length;

    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i];
      if (index % 2 === 0) {
        computedHash = crypto.createHash('sha256').update(computedHash + sibling).digest('hex');
      } else {
        computedHash = crypto.createHash('sha256').update(sibling + computedHash).digest('hex');
      }
      index = Math.floor(index / 2);
    }

    const expectedRoot = this.computeRoot();
    return computedHash === expectedRoot && proof.rootHash === expectedRoot;
  }

  computeRoot(): string {
    if (this.events.length === 0) {
      return crypto.createHash('sha256').update('').digest('hex');
    }
    const tree = this.buildTree();
    return tree[0]?.hash ?? '';
  }

  private buildTree(): MerkleNode[] {
    if (this.events.length === 0) return [];

    const n = this.nextPow2(this.events.length);
    let level: MerkleNode[] = [];

    for (let i = 0; i < n; i++) {
      if (i < this.events.length) {
        const h = this.hashEvent(this.events[i]);
        level.push({ hash: h });
      } else {
        level.push({ hash: '' });
      }
    }

    while (level.length > 1) {
      const nextLevel: MerkleNode[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] ?? left;
        if (left.hash === '' && right.hash === '') {
          nextLevel.push({ hash: '' });
        } else {
          const combined = left.hash + (right.hash || left.hash);
          const hash = crypto.createHash('sha256').update(combined).digest('hex');
          nextLevel.push({ hash, left, right });
        }
      }
      level = nextLevel;
    }

    return level;
  }

  private collectSiblings(targetIndex: number, _treeLevel: MerkleNode[]): string[] {
    const n = this.events.length;
    const leafCount = Math.pow(2, Math.ceil(Math.log2(n)));
    const siblings: string[] = [];
    let idx = targetIndex;

    let currentLevelCount = leafCount;
    let currentLevel: string[] = [];

    for (let i = 0; i < leafCount; i++) {
      if (i < n) {
        currentLevel.push(this.hashEvent(this.events[i]));
      } else {
        currentLevel.push('');
      }
    }

    while (currentLevelCount > 1) {
      const siblingIndex = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (siblingIndex < currentLevel.length && currentLevel[siblingIndex] !== '') {
        siblings.push(currentLevel[siblingIndex]);
      }
      idx = Math.floor(idx / 2);

      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] ?? left;
        if (left === '' && right === '') {
          nextLevel.push('');
        } else {
          const combined = left + (right || left);
          nextLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
        }
      }
      currentLevel = nextLevel;
      currentLevelCount = currentLevel.length;
    }

    return siblings;
  }

  private hashEvent(event: AuditEvent): string {
    const { previousHash, ...rest } = event;
    const data = previousHash
      ? JSON.stringify({ ...rest, previousHash }, Object.keys({ ...rest, previousHash }).sort())
      : JSON.stringify(rest, Object.keys(rest).sort());
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private nextPow2(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }
}

export function createMerkleProof(events: AuditEvent[]): MerkleProof {
  return new MerkleProof(events);
}
