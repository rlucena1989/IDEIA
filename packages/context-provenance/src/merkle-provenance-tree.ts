import { createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
import { ProvenanceEntry, MerkleNode } from './types';
const logger = createLogger('merkle-provenance-tree');

export class MerkleProvenanceTree {
  private _root: MerkleNode | null = null;
  private _leaves: MerkleNode[] = [];

  build(entries: ProvenanceEntry[]): MerkleNode {
    this._leaves = entries.map((e) => ({ hash: e.hash }));
    if (this._leaves.length === 0) {
      this._root = { hash: '0' };
      return this._root;
    }

    let level: MerkleNode[] = [...this._leaves];

    while (level.length > 1) {
      const nextLevel: MerkleNode[] = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          const combined = level[i].hash + level[i + 1].hash;
          const hash = createHash('sha256').update(combined).digest('hex');
          nextLevel.push({ hash, left: level[i], right: level[i + 1] });
        } else {
          nextLevel.push(level[i]);
        }
      }
      level = nextLevel;
    }

    this._root = level[0]!;
    return this._root;
  }

  getRootHash(): string {
    return this._root?.hash ?? '0';
  }

  verify(entries: ProvenanceEntry[]): boolean {
    if (!this._root) return false;
    const leaves = entries.map((e) => ({ hash: e.hash }));
    if (leaves.length === 0) {
      return this._root.hash === '0';
    }

    let level: MerkleNode[] = [...leaves];
    while (level.length > 1) {
      const nextLevel: MerkleNode[] = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          const combined = level[i].hash + level[i + 1].hash;
          const hash = createHash('sha256').update(combined).digest('hex');
          nextLevel.push({ hash, left: level[i], right: level[i + 1] });
        } else {
          nextLevel.push(level[i]);
        }
      }
      level = nextLevel;
    }

    return level[0]!.hash === this._root.hash;
  }

  generateProof(entryId: string): string[] {
    const idx = this._leaves.findIndex((n) => n.hash === entryId);
    if (idx === -1) return [];

    const proof: string[] = [];
    let level: MerkleNode[] = [...this._leaves];
    let currentIdx = idx;

    while (level.length > 1) {
      const nextLevel: MerkleNode[] = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          const combined = level[i].hash + level[i + 1].hash;
          const hash = createHash('sha256').update(combined).digest('hex');
          nextLevel.push({ hash, left: level[i], right: level[i + 1] });

          if (i === currentIdx || i + 1 === currentIdx) {
            proof.push(i === currentIdx ? level[i + 1].hash : level[i].hash);
          }
        } else {
          nextLevel.push(level[i]);
        }
      }
      currentIdx = Math.floor(currentIdx / 2);
      level = nextLevel;
    }

    return proof;
  }

  verifyProof(entryHash: string, proof: string[], rootHash: string): boolean {
    let current = entryHash;
    for (const sibling of proof) {
      const combined = current + sibling;
      current = createHash('sha256').update(combined).digest('hex');
    }
    return current === rootHash;
  }

  getDepth(): number {
    if (!this._root) return 0;
    let depth = 0;
    let node: MerkleNode | undefined = this._root;
    while (node) {
      depth++;
      node = node.left;
    }
    return depth;
  }

  toJSON(): { root: string; leaves: string[]; depth: number } {
    return {
      root: this.getRootHash(),
      leaves: this._leaves.map((n) => n.hash),
      depth: this.getDepth(),
    };
  }
}
