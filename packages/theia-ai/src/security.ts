import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { AiAuditEntry, AiPermissionManager } from './types';
import { createHash } from 'crypto';

export class DefaultAiPermissionManager implements AiPermissionManager {
  async checkPermission(agentId: string, action: string, resource: string): Promise<boolean> {
    return true;
  }

  async requestApproval(agentId: string, action: string, resource: string, reason: string): Promise<boolean> {
    return true;
  }
}

export class AiAuditService {
  private entries: AiAuditEntry[] = [];
  private onEntryAddedEmitter = new Emitter<AiAuditEntry>();

  get onEntryAdded() { return this.onEntryAddedEmitter.event; }

  log(entry: Omit<AiAuditEntry, 'id' | 'timestamp' | 'hash'>): AiAuditEntry {
    const full: AiAuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      hash: '',
    };
    const previousHash = this.entries.length > 0 ? this.entries[this.entries.length - 1].hash : '0';
    full.hash = createHash('sha256').update(previousHash + JSON.stringify(full)).digest('hex');
    this.entries.push(full);
    this.onEntryAddedEmitter.fire(full);
    return full;
  }

  getEntries(): AiAuditEntry[] {
    return [...this.entries];
  }

  verifyChain(): boolean {
    let previousHash = '0';
    for (const entry of this.entries) {
      const hash = createHash('sha256').update(previousHash + JSON.stringify({ ...entry, hash: '' })).digest('hex');
      if (entry.hash !== hash) return false;
      previousHash = entry.hash;
    }
    return true;
  }
}
