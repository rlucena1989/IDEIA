import crypto from 'crypto';
import { createLogger } from '@ideia/logger';
import { AuditEvent, ChainVerificationResult } from './audit-trail';
import { AuditPgAdapter } from '@ideia/data-layer';
import type { DatabaseAdapter } from '@ideia/data-layer';
const logger = createLogger('postgres-adapter');

function hashEvent(event: AuditEvent): string {
  const { previousHash, ...rest } = event;
  const keys = Object.keys(previousHash ? { ...rest, previousHash } : rest).sort();
  const data = JSON.stringify(previousHash ? { ...rest, previousHash } : rest, keys);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export class PostgresAuditTrail {
  private auditPg: AuditPgAdapter;
  private dbAdapter: DatabaseAdapter;
  private _cache: AuditEvent[] = [];

  constructor(dbAdapter: DatabaseAdapter, dbType: 'postgres' | 'sqlite' = 'postgres') {
    this.dbAdapter = dbAdapter;
    this.auditPg = new AuditPgAdapter(dbAdapter, dbType);
  }

  get repo() {
    return this.auditPg.repo;
  }

  async init(): Promise<void> {
    await this.auditPg.ensureSchema();
  }

  async append(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): Promise<AuditEvent> {
    const full: AuditEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };
    const latestHash = await this.auditPg.getLatestHash();
    if (latestHash) full.previousHash = latestHash;
    const h = hashEvent(full);

    await this.repo.insert({
      id: full.eventId,
      actor: full.actor,
      eventType: full.eventType,
      target: full.target,
      decision: full.decision,
      result: full.result,
      metadata: full.metadata,
      previousHash: full.previousHash,
      createdAt: full.timestamp,
    });

    await this.auditPg.recordHash(full.eventId, h, full.previousHash ?? null);
    this._cache.push(full);
    return full;
  }

  async load(): Promise<AuditEvent[]> {
    if (this._cache.length > 0) return this._cache;
    const records = await this.repo.query({ limit: 10000 });
    this._cache = records.map(r => ({
      eventId: r.id,
      timestamp: r.createdAt,
      actor: r.actor as AuditEvent['actor'],
      eventType: r.eventType,
      target: r.target || '',
      decision: r.decision as AuditEvent['decision'],
      result: r.result as AuditEvent['result'],
      metadata: r.metadata as Record<string, unknown> | undefined,
      previousHash: r.previousHash,
    }));
    return this._cache;
  }

  async loadAsync(): Promise<AuditEvent[]> {
    return this.load();
  }

  async query(filter: Partial<AuditEvent>): Promise<AuditEvent[]> {
    const events = await this.load();
    return events.filter(e => {
      for (const [key, value] of Object.entries(filter)) {
        if (!(key in e) || e[key as keyof typeof e] !== value) return false;
      }
      return true;
    });
  }

  async count(): Promise<number> {
    const result = await this.dbAdapter.query<{ count: number }>('SELECT COUNT(*) as count FROM ideia_audit_log');
    return Number(result.rows[0]?.count || 0);
  }

  async verifyChain(): Promise<ChainVerificationResult> {
    const result = await this.auditPg.verifyChain();
    const events = await this.load();
    return {
      valid: result.valid,
      totalEvents: result.totalEvents,
      breakAtIndex: result.breakAtIndex,
      breakReason: result.breakReason,
      currentTipHash: events.length > 0 ? hashEvent(events[events.length - 1]) : null,
    };
  }

  async getChainTipHash(): Promise<string | null> {
    return this.auditPg.getLatestHash();
  }
}
