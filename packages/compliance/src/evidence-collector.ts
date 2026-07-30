import { createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
import { v4 as uuidv4 } from 'uuid';
import type { EvidenceRecord } from './types';
const logger = createLogger('evidence-collector');

export class EvidenceCollector {
  private evidence: Map<string, EvidenceRecord> = new Map();
  private chain: { hash: string; previousHash: string; recordId: string }[] = [];

  collect(
    controlId: string,
    type: EvidenceRecord['type'],
    content: string
  ): EvidenceRecord {
    const id = uuidv4();
    const timestamp = new Date();
    const raw = `${id}:${controlId}:${type}:${content}:${timestamp.toISOString()}`;
    const hash = createHash('sha256').update(raw).digest('hex');

    const record: EvidenceRecord = {
      id,
      controlId,
      type,
      content,
      timestamp,
      hash,
    };

    this.evidence.set(id, record);

    const previousHash = this.chain.length > 0
      ? this.chain[this.chain.length - 1].hash
      : '0000000000000000000000000000000000000000000000000000000000000000';

    this.chain.push({ hash, previousHash, recordId: id });

    return record;
  }

  getEvidence(controlId: string): EvidenceRecord[] {
    return Array.from(this.evidence.values()).filter(
      e => e.controlId === controlId
    );
  }

  listAll(): EvidenceRecord[] {
    return Array.from(this.evidence.values());
  }

  verifyChain(): boolean {
    if (this.chain.length === 0) return true;

    for (let i = 0; i < this.chain.length; i++) {
      const link = this.chain[i];
      const record = this.evidence.get(link.recordId);

      if (!record) return false;

      const raw = `${record.id}:${record.controlId}:${record.type}:${record.content}:${record.timestamp.toISOString()}`;
      const computedHash = createHash('sha256').update(raw).digest('hex');

      if (computedHash !== link.hash) return false;

      if (i > 0) {
        const expectedPrevious = this.chain[i - 1].hash;
        if (link.previousHash !== expectedPrevious) return false;
      }
    }

    return true;
  }

  getChainLength(): number {
    return this.chain.length;
  }
}
