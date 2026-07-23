import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MemoryRecord, MemoryCategory, MemoryState } from '@ideia/contracts';
import { VectorSearch } from './vector-search';
import type { EventBus, BusEvent } from '@ideia/event-bus';

export { MemoryRecord, MemoryCategory, MemoryState };
export { VectorSearch, createVectorSearch } from './vector-search';

export interface MemorySearchOptions {
  query: string;
  topK?: number;
  minScore?: number;
  category?: MemoryCategory;
  useVectorSearch?: boolean;
}

export function createMemoryRecord(params: {
  category: MemoryCategory;
  source: string;
  summary: string;
  tags?: string[];
  severity?: MemoryRecord['severity'];
}): MemoryRecord {
  return {
    memoryId: crypto.randomUUID(),
    category: params.category,
    source: params.source,
    summary: params.summary,
    tags: params.tags ?? [],
    createdAt: new Date().toISOString(),
    severity: params.severity,
  };
}

export class MemoryStore {
  private filePath?: string;
  private inMemoryRecords: MemoryRecord[] = [];
  private _loaded = false;
  private _lockAcquired = false;
  private _saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private vectorSearch: VectorSearch;
  private _eventBus?: EventBus;
  private _eventCount = 0;
  private _subscriptionIds: string[] = [];

  constructor(filePath?: string, vectorSearch?: VectorSearch) {
    this.filePath = filePath;
    this.vectorSearch = vectorSearch ?? new VectorSearch(384);
  }

  get eventCount(): number {
    return this._eventCount;
  }

  setVectorSearch(vs: VectorSearch): void { this.vectorSearch = vs; }
  getVectorSearch(): VectorSearch { return this.vectorSearch; }

  async integrateWithEventBus(eventBus: EventBus): Promise<void> {
    this.disconnectEventBus();
    this._eventBus = eventBus;

    const subscribe = async (type: string) => {
      const id = await eventBus.subscribe(type, (event: BusEvent) => {
        this._eventCount++;
        const record = createMemoryRecord({
          category: this.eventTypeToCategory(event.type),
          source: event.source,
          summary: `[${event.type}] ${JSON.stringify(event.payload ?? {})}`,
          tags: [event.type, event.source],
          severity: 'low',
        });
        record.context = { eventId: event.id, timestamp: event.timestamp, metadata: event.metadata };
        this.append(record);

        this.vectorSearch.addAsync(
          `Event ${event.type} from ${event.source}: ${JSON.stringify(event.payload ?? {})}`,
          { eventType: event.type, source: event.source, eventId: event.id }
        ).catch(() => {});
      });
      this._subscriptionIds.push(id);
    };

    await subscribe('policy.evaluated');
    await subscribe('cycle.completed');
    await subscribe('feedback.submitted');
    await subscribe('agent.action');
  }

  disconnectEventBus(): void {
    if (this._eventBus) {
      for (const id of this._subscriptionIds) {
        this._eventBus.unsubscribe(id);
      }
    }
    this._subscriptionIds = [];
    this._eventBus = undefined;
  }

  private eventTypeToCategory(type: string): MemoryCategory {
    switch (type) {
      case 'policy.evaluated': return 'policy';
      case 'cycle.completed': return 'cycle';
      case 'feedback.submitted': return 'decision';
      case 'agent.action': return 'agent';
      default: return 'change';
    }
  }

  private acquireLock(): boolean {
    if (!this.filePath) return true;
    const lockPath = this.filePath + '.lock';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          this.sleep(50 + Math.random() * 50);
        }
        fs.mkdirSync(path.dirname(lockPath), { recursive: true });
        fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
        this._lockAcquired = true;
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }

  private sleep(ms: number): void {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // busy-wait is intentional for synchronous lock retry
    }
  }

  private releaseLock(): void {
    if (!this._lockAcquired || !this.filePath) return;
    try {
      fs.unlinkSync(this.filePath + '.lock');
    } catch (_err) {
      // Log silenciado propositalmente — falha nao bloqueia fluxo
    }
    this._lockAcquired = false;
  }

  load(): MemoryState {
    this._loaded = true;
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return {
        sessionId: crypto.randomUUID(),
        workspaceRoot: '',
        activeTask: null,
        preferences: {},
        lastDecisions: [],
        context: {},
        records: [],
      };
    }
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as MemoryState;
      this.inMemoryRecords = data.records ?? [];
      return data;
    } catch {
      if (this.filePath && fs.existsSync(this.filePath)) {
        fs.renameSync(this.filePath, this.filePath + '.corrupted');
      }
      return {
        sessionId: crypto.randomUUID(),
        workspaceRoot: '',
        activeTask: null,
        preferences: {},
        lastDecisions: [],
        context: {},
        records: [],
      };
    }
  }

  private atomicWrite(filePath: string, data: string): void {
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, data, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  private async atomicWriteAsync(filePath: string, data: string): Promise<void> {
    const tmpPath = filePath + '.tmp';
    await fs.promises.writeFile(tmpPath, data, 'utf-8');
    await fs.promises.rename(tmpPath, filePath);
  }

  save(state: MemoryState): void {
    if (!this._loaded) this.load();
    state.records = this.inMemoryRecords;
    if (this.filePath) {
      if (!this.acquireLock()) return;
      try {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        const data = JSON.stringify(state, null, 2);
        fs.writeFileSync(this.filePath + '.backup', data, 'utf-8');
        this.atomicWrite(this.filePath, data);
      } finally {
        this.releaseLock();
      }
    }
  }

  async saveAsync(state: MemoryState): Promise<void> {
    if (!this._loaded) this.load();
    state.records = this.inMemoryRecords;
    if (this.filePath) {
      if (!this.acquireLock()) return;
      try {
        const data = JSON.stringify(state, null, 2);
        await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.promises.writeFile(this.filePath + '.backup', data, 'utf-8');
        await this.atomicWriteAsync(this.filePath, data);
      } finally {
        this.releaseLock();
      }
    }
  }

  private debouncedSave(state: MemoryState): void {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      this.save(state);
      this._saveTimeout = null;
    }, 0);
  }

  pushDecision(state: MemoryState, decision: Record<string, unknown>): void {
    state.lastDecisions.push(decision);
    if (state.lastDecisions.length > 100) {
      state.lastDecisions = state.lastDecisions.slice(-100);
    }
    this.debouncedSave(state);
  }

  updateContext(state: MemoryState, ctx: Record<string, unknown>): void {
    Object.assign(state.context, ctx);
    this.debouncedSave(state);
  }

  private ensureLoaded(): void {
    if (!this._loaded) this.load();
  }

  append(record: MemoryRecord): void {
    this.ensureLoaded();
    this.inMemoryRecords.push(record);
    this.emitMemoryEvent('memory:created', record);
    if (this.filePath) {
      const records = [...this.inMemoryRecords];
      const state = this.load();
      state.records = records;
      this.inMemoryRecords = records;
      this.debouncedSave(state);
    }
  }

  private emitMemoryEvent(type: string, record: MemoryRecord): void {
    if (this._eventBus) {
      this._eventBus.emit({
        type,
        source: 'memory-store',
        payload: {
          memoryId: record.memoryId,
          category: record.category,
          summary: record.summary,
        },
        metadata: { timestamp: new Date().toISOString() },
      }).catch(() => {});
    }
  }

  list(): MemoryRecord[] {
    return [...this.inMemoryRecords];
  }

  findByCategory(category: MemoryCategory): MemoryRecord[] {
    return this.inMemoryRecords.filter(r => r.category === category);
  }

  findBySeverity(severity: MemoryRecord['severity']): MemoryRecord[] {
    return this.inMemoryRecords.filter(r => r.severity === severity);
  }

  search(query: string): MemoryRecord[] {
    return this.hybridSearch({ query }).results;
  }

  hybridSearch(options: MemorySearchOptions): { results: MemoryRecord[]; scores: number[] } {
    const q = options.query.toLowerCase();
    const keywordResults = this.inMemoryRecords.filter(r =>
      r.summary.toLowerCase().includes(q) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(q))) ||
      (r.category && r.category.toLowerCase().includes(q))
    );

    const semanticResults = this.vectorSearch.size > 0
      ? this.vectorSearch.search(options.query, options.topK ?? 5, {
          minScore: options.minScore ?? 0.1,
          filter: options.category ? (m) => m.category === options.category : undefined,
        })
      : [];

    const seen = new Set<string>();
    const merged: MemoryRecord[] = [];
    const scores: number[] = [];

    for (const sr of semanticResults) {
      const record = this.inMemoryRecords.find(r => r.memoryId === sr.record.id);
      if (record && !seen.has(record.memoryId)) {
        seen.add(record.memoryId);
        merged.push(record);
        scores.push(sr.score);
      }
    }

    for (const r of keywordResults) {
      if (!seen.has(r.memoryId)) {
        seen.add(r.memoryId);
        merged.push(r);
        scores.push(0.3);
      }
    }

    if (merged.length === 0) {
      for (const r of this.inMemoryRecords) {
        if (!seen.has(r.memoryId) && (
          r.summary.toLowerCase().includes(q) ||
          (r.tags || []).some(t => t.toLowerCase().includes(q))
        )) {
          seen.add(r.memoryId);
          merged.push(r);
          scores.push(0.2);
        }
      }
    }

    return { results: merged.slice(0, options.topK ?? 10), scores };
  }

  count(): number {
    return this.inMemoryRecords.length;
  }

  clear(): void {
    this.inMemoryRecords = [];
    if (this.filePath) {
      const state = this.load();
      state.records = this.inMemoryRecords;
      this.save(state);
    }
  }

  destroy(): void {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this.disconnectEventBus();
    this.releaseLock();
  }
}
