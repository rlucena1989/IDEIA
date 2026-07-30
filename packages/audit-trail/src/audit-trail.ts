import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Actor, Decision, EventResult } from '@ideia/contracts';
import { createLogger } from '@ideia/logger';

const log = createLogger('audit-trail');

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  actor: Actor;
  eventType: string;
  target: string;
  decision: Decision | 'approved' | 'rejected';
  approvalStatus?: 'approved' | 'rejected';
  result: EventResult;
  metadata?: Record<string, unknown>;
  previousHash?: string;
}

export interface MerkleProof {
  entryIndex: number;
  entryHash: string;
  siblings: string[];
  rootHash: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  totalEvents: number;
  breakAtIndex: number | null;
  breakReason: string | null;
  currentTipHash: string | null;
}

const MAX_BYTES = 10 * 1024 * 1024;

function hashEvent(event: AuditEvent): string {
  const { previousHash, ...rest } = event;
  const data = previousHash
    ? JSON.stringify({ ...rest, previousHash }, Object.keys({ ...rest, previousHash }).sort())
    : JSON.stringify(rest, Object.keys(rest).sort());
  return crypto.createHash('sha256').update(data).digest('hex');
}

export class AuditTrail {
  private lineCache: number | null = null;
  private eventCache: AuditEvent[] | null = null;
  private indexByEventType: Map<string, AuditEvent[]> = new Map();
  private indexByActor: Map<string, AuditEvent[]> = new Map();
  private indexByTarget: Map<string, AuditEvent[]> = new Map();

  private eventQueue: Promise<void> = Promise.resolve();

  constructor(private filePath: string) {
    this.eventCache = [];
  }

  private rebuildIndexes(events: AuditEvent[]): void {
    this.indexByEventType.clear();
    this.indexByActor.clear();
    this.indexByTarget.clear();
    for (const event of events) {
      const typeKey = event.eventType || 'unknown';
      const typeList = this.indexByEventType.get(typeKey);
      if (typeList) typeList.push(event); else this.indexByEventType.set(typeKey, [event]);

      const actorKey = event.actor || 'unknown';
      const actorList = this.indexByActor.get(actorKey);
      if (actorList) actorList.push(event); else this.indexByActor.set(actorKey, [event]);

      const targetKey = event.target || 'unknown';
      const targetList = this.indexByTarget.get(targetKey);
      if (targetList) targetList.push(event); else this.indexByTarget.set(targetKey, [event]);
    }
  }

  append(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): AuditEvent {
    const full: AuditEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };
    const pendingHash = this.getLastHashSync();
    if (pendingHash) {
      full.previousHash = pendingHash;
    }
    const h = hashEvent(full);
    this.persistAsync(full, h);
    if (this.lineCache !== null) this.lineCache++;
    if (this.eventCache) {
      this.eventCache.push(full);
      this.rebuildIndexes(this.eventCache);
    }
    return full;
  }

  private persistAsync(full: AuditEvent, hash: string): void {
    this.eventQueue = this.eventQueue
      .then(() => fsp.mkdir(path.dirname(this.filePath), { recursive: true }))
      .then(() => this.rotateIfNeededAsync())
      .then(() => fsp.appendFile(this.filePath, JSON.stringify(full) + '\n', 'utf-8'))
      .then(() => fsp.appendFile(this.filePath + '.hash', hash + '\n', 'utf-8'))
      .catch(err => log.error('Failed to persist audit event', { error: err.message }));
  }

  load(): AuditEvent[] {
    if (this.eventCache) return this.eventCache;
    if (!fs.existsSync(this.filePath)) return [];
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      this.lineCache = lines.length;
      this.eventCache = lines.map(line => {
        try {
          return JSON.parse(line) as AuditEvent;
        } catch {
          return null;
        }
      }).filter((e): e is AuditEvent => e !== null);
      this.rebuildIndexes(this.eventCache);
      return this.eventCache;
    } catch (_err) {
      log.error('Failed to load audit file, renaming to .corrupted', { error: String(_err) });
      fsp.rename(this.filePath, this.filePath + '.corrupted').catch(() => {});
      return [];
    }
  }

  async query(filter: Partial<AuditEvent>): Promise<AuditEvent[]> {
    const events = this.load();
    const filterKeys = Object.keys(filter);

    if (filterKeys.length === 1) {
      const key = filterKeys[0];
      const value = String(filter[key as keyof AuditEvent]);
      if (key === 'eventType' && this.indexByEventType.has(value)) {
        return [...this.indexByEventType.get(value) ?? []];
      }
      if (key === 'actor' && this.indexByActor.has(value)) {
        return [...this.indexByActor.get(value) ?? []];
      }
      if (key === 'target' && this.indexByTarget.has(value)) {
        return [...this.indexByTarget.get(value) ?? []];
      }
    }

    return events.filter((e) => {
      for (const [key, value] of Object.entries(filter)) {
        if (!(key in e) || e[key as keyof typeof e] !== value) return false;
      }
      return true;
    });
  }

  async loadAsync(): Promise<AuditEvent[]> {
    const cached = this.load();
    if (cached.length > 0) return cached;
    try {
      const content = await fsp.readFile(this.filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      this.lineCache = lines.length;
      this.eventCache = lines.map(line => {
        try { return JSON.parse(line) as AuditEvent; }
        catch { return null; }
      }).filter((e): e is AuditEvent => e !== null);
      this.rebuildIndexes(this.eventCache);
      return this.eventCache as NonNullable<typeof this.eventCache>;
    } catch {
      return [];
    }
  }

  count(): number {
    if (this.lineCache !== null) return this.lineCache;
    return this.load().length;
  }

  verifyChain(): ChainVerificationResult {
    const events = this.load();
    if (events.length === 0) {
      return { valid: true, totalEvents: 0, breakAtIndex: null, breakReason: null, currentTipHash: null };
    }
    for (let i = 0; i < events.length; i++) {
      const current = events[i] as AuditEvent;
      if (i > 0) {
        const expectedHash = hashEvent(events[i - 1] as AuditEvent);
        if (current.previousHash !== expectedHash) {
          return {
            valid: false,
            totalEvents: events.length,
            breakAtIndex: i,
            breakReason: `Event ${i} references previousHash ${current.previousHash} but event ${i - 1} hash is ${expectedHash}`,
            currentTipHash: hashEvent(events[events.length - 1] as AuditEvent),
          };
        }
      }
    }
    return {
      valid: true,
      totalEvents: events.length,
      breakAtIndex: null,
      breakReason: null,
      currentTipHash: hashEvent(events[events.length - 1] as AuditEvent),
    };
  }

  proveEntry(eventId: string): MerkleProof | null {
    const events = this.load();
    const idx = events.findIndex(e => e.eventId === eventId);
    if (idx === -1) return null;
    const entryHash = hashEvent(events[idx]);
    const rootHash = events.length > 0 ? hashEvent(events[events.length - 1]) : entryHash;
    const siblings: string[] = [];
    for (let i = 0; i < events.length; i++) {
      if (i !== idx) siblings.push(hashEvent(events[i]));
    }
    return { entryIndex: idx, entryHash, siblings, rootHash };
  }

  verifyEntryInclusion(proof: MerkleProof): boolean {
    const events = this.load();
    if (proof.entryIndex < 0 || proof.entryIndex >= events.length) return false;
    const actualHash = hashEvent(events[proof.entryIndex]);
    if (actualHash !== proof.entryHash) return false;
    const rootHash = events.length > 0 ? hashEvent(events[events.length - 1]) : '';
    return rootHash === proof.rootHash;
  }

  getMerkleRoot(): string {
    const events = this.load();
    if (events.length === 0) return crypto.createHash('sha256').update('empty').digest('hex');
    return hashEvent(events[events.length - 1]);
  }

  getChainGaps(): Array<{ index: number; eventId: string }> {
    const events = this.load();
    const gaps: Array<{ index: number; eventId: string }> = [];
    for (let i = 1; i < events.length; i++) {
      const expectedPrevHash = hashEvent(events[i - 1]);
      if (events[i].previousHash !== expectedPrevHash) {
        gaps.push({ index: i, eventId: events[i].eventId });
      }
    }
    return gaps;
  }

  scheduleVerification(intervalMs: number): { stop: () => void } {
    let stopped = false;
    const id = setInterval(() => {
      if (!stopped) this.verifyChain();
    }, intervalMs);
    return {
      stop: () => {
        stopped = true;
        clearInterval(id);
      },
    };
  }

  getChainTipHash(): string | null {
    const events = this.load();
    if (events.length === 0) return null;
    return hashEvent(events[events.length - 1] as AuditEvent);
  }

  private getLastHashSync(): string | null {
    if (this.eventCache && this.eventCache.length > 0) {
      return hashEvent(this.eventCache[this.eventCache.length - 1] as AuditEvent);
    }
    try {
      if (!fs.existsSync(this.filePath)) return null;
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.length > 0);
      if (lines.length === 0) return null;
      const lastEvent = JSON.parse(lines[lines.length - 1] as string) as AuditEvent;
      return hashEvent(lastEvent);
    } catch {
      return null;
    }
  }

  private async rotateIfNeededAsync(): Promise<void> {
    try {
      const stats = await fsp.stat(this.filePath).catch(() => null);
      if (stats && stats.size > MAX_BYTES) {
        const archivePath = this.filePath + '.' + Date.now() + '.audit';
        await fsp.rename(this.filePath, archivePath);
        const hashPath = this.filePath + '.hash';
        try {
          await fsp.access(hashPath);
          await fsp.rename(hashPath, archivePath + '.hash');
        } catch {
          log.debug('No hash file to rotate');
        }
      }
    } catch (_err) {
      log.debug('Rotation check failed', { error: String(_err) });
    }
  }
}
