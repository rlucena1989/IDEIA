import { MemoryRecord, MemoryCategory, MemoryState } from '@ideia/contracts';
import { createLogger } from '@ideia/logger';
import { MemorySearchOptions } from './memory-store';
import { MemoryPgAdapter, type MemoryRow } from '@ideia/data-layer';
import type { DatabaseAdapter } from '@ideia/data-layer';
import crypto from 'crypto';
const logger = createLogger('postgres-adapter');

export class PostgresMemoryStore {
  private pgAdapter: MemoryPgAdapter;
  private dbAdapter: DatabaseAdapter;
  private _state: MemoryState;

  constructor(dbAdapter: DatabaseAdapter, dbType: 'postgres' | 'sqlite' = 'postgres') {
    this.dbAdapter = dbAdapter;
    this.pgAdapter = new MemoryPgAdapter(dbAdapter, dbType);
    this._state = {
      sessionId: crypto.randomUUID(),
      workspaceRoot: '',
      activeTask: null,
      preferences: {},
      lastDecisions: [],
      context: {},
      records: [],
    };
  }

  async init(): Promise<void> {
    await this.pgAdapter.ensureSchema();
  }

  async append(record: MemoryRecord): Promise<void> {
    const ctx = record.context as Record<string, unknown> | undefined;
    await this.pgAdapter.insertMemory({
      id: crypto.randomUUID(),
      memoryId: record.memoryId,
      category: record.category,
      source: record.source,
      summary: record.summary,
      tags: record.tags,
      severity: record.severity || 'low',
      context: ctx,
    });
    this._state.records.push(record);
  }

  async list(): Promise<MemoryRecord[]> {
    const rows = await this.pgAdapter.queryMemory({ limit: 1000 });
    return rows.map(rowToRecord);
  }

  async findByCategory(category: MemoryCategory): Promise<MemoryRecord[]> {
    const rows = await this.pgAdapter.queryMemory({ category, limit: 1000 });
    return rows.map(rowToRecord);
  }

  async findBySeverity(severity: MemoryRecord['severity']): Promise<MemoryRecord[]> {
    const rows = await this.pgAdapter.queryMemory({ severity, limit: 1000 });
    return rows.map(rowToRecord);
  }

  async search(query: string): Promise<MemoryRecord[]> {
    const rows = await this.pgAdapter.searchMemory(query, 50);
    return rows.map(rowToRecord);
  }

  async hybridSearch(options: MemorySearchOptions): Promise<{ results: MemoryRecord[]; scores: number[] }> {
    const rows = options.category
      ? await this.pgAdapter.queryMemory({ category: options.category, limit: options.topK ?? 10 })
      : await this.pgAdapter.searchMemory(options.query, options.topK ?? 10);
    return { results: rows.map(rowToRecord), scores: rows.map(() => 0.5) };
  }

  async count(): Promise<number> {
    return this.pgAdapter.countMemory();
  }

  async clear(): Promise<void> {
    const all = await this.pgAdapter.queryMemory({ limit: 10000 });
    for (const row of all) {
      await this.pgAdapter.deleteMemory(row.memory_id);
    }
    this._state.records = [];
  }

  async destroy(): Promise<void> {
  }

  load(): MemoryState {
    return this._state;
  }

  save(state: MemoryState): void {
    this._state = state;
  }

  pushDecision(state: MemoryState, decision: Record<string, unknown>): void {
    state.lastDecisions.push(decision);
  }

  updateContext(state: MemoryState, ctx: Record<string, unknown>): void {
    Object.assign(state.context, ctx);
  }
}

function rowToRecord(row: MemoryRow): MemoryRecord {
  return {
    memoryId: row.memory_id,
    category: row.category as MemoryCategory,
    source: row.source,
    summary: row.summary,
    tags: JSON.parse(row.tags || '[]'),
    severity: row.severity as MemoryRecord['severity'],
    context: row.context && row.context !== '{}' ? JSON.parse(row.context) : undefined,
    createdAt: row.created_at,
  };
}
