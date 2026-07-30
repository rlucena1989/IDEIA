import { ApprovalRequest, ApprovalStatus } from './approval-flow';
import { createLogger } from '@ideia/logger';
const logger = createLogger('approval-store');

export interface ApprovalStoreEntry {
  request: ApprovalRequest;
  history: Array<{
    action: 'created' | 'approved' | 'rejected' | 'cancelled' | 'escalated';
    timestamp: string;
    actor: string;
    detail?: string;
  }>;
}

export class ApprovalStore {
  private entries: Map<string, ApprovalStoreEntry> = new Map();
  private persistencePath: string;

  constructor(persistencePath: string) {
    this.persistencePath = persistencePath;
    this.load();
  }

  save(request: ApprovalRequest): void {
    const existing = this.entries.get(request.id);
    if (existing) {
      existing.request = request;
      existing.history.push({
        action: request.status === ApprovalStatus.Approved ? 'approved'
          : request.status === ApprovalStatus.Rejected ? 'rejected'
          : request.status === ApprovalStatus.Cancelled ? 'cancelled'
          : 'created',
        timestamp: new Date().toISOString(),
        actor: request.approvals[request.approvals.length - 1]?.approver ?? 'system',
        detail: request.reason,
      });
      this.entries.set(request.id, existing);
    } else {
      this.entries.set(request.id, {
        request,
        history: [{
          action: 'created',
          timestamp: request.createdAt,
          actor: request.requester,
        }],
      });
    }
    this.persist();
  }

  get(id: string): ApprovalStoreEntry | null {
    return this.entries.get(id) ?? null;
  }

  getRequest(id: string): ApprovalRequest | null {
    return this.entries.get(id)?.request ?? null;
  }

  getAll(): ApprovalStoreEntry[] {
    return Array.from(this.entries.values());
  }

  getPending(): ApprovalStoreEntry[] {
    return this.getAll().filter(e => e.request.status === ApprovalStatus.Pending);
  }

  getByRequester(requester: string): ApprovalStoreEntry[] {
    return this.getAll().filter(e => e.request.requester === requester);
  }

  getByResource(resourceType: string, resourceId: string): ApprovalStoreEntry[] {
    return this.getAll().filter(
      e => e.request.resourceType === resourceType && e.request.resourceId === resourceId
    );
  }

  count(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
    this.persist();
  }

  private load(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.persistencePath)) {
        const data = fs.readFileSync(this.persistencePath, 'utf-8');
        const parsed = JSON.parse(data) as ApprovalStoreEntry[];
        for (const entry of parsed) {
          this.entries.set(entry.request.id, entry);
        }
      }
    } catch {
      this.entries.clear();
    }
  }

  private persist(): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.getAll(), null, 2), 'utf-8');
    } catch {
      // Silently fail persistence
    }
  }
}

export function createApprovalStore(persistencePath: string): ApprovalStore {
  return new ApprovalStore(persistencePath);
}
