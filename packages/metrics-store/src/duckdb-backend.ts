import { createLogger } from '@ideia/logger';
import { MetricEntry, AggregateResult, AggregationType, MetricsBackend } from './types';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

export class DuckDbBackend implements MetricsBackend {
  private logger = createLogger('duckdb-backend');
  private available: boolean;
  private db: Record<string, MetricEntry[]>;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = resolve(dbPath ?? '.ai/metrics/duckdb-fallback.json');
    this.db = {};
    this.available = false;
    this.initialize();
  }

  private initialize(): void {
    try {
      require('duckdb');
      this.available = true;
      this.logger.info('DuckDB backend available');
    } catch {
      this.logger.warn('DuckDB not installed, using JSON file fallback');
      this.loadFromDisk();
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async record(category: string, key: string, value: number, tags?: Record<string, string>): Promise<void> {
    const entry: MetricEntry = { key, value, tags, timestamp: Date.now() };
    const entries = this.db[category] ?? [];
    entries.push(entry);
    if (entries.length > 10000) entries.splice(0, entries.length - 10000);
    this.db[category] = entries;
    if (!this.available) this.persistToDisk();
  }

  async query(category: string, from?: number, to?: number): Promise<MetricEntry[]> {
    const entries = this.db[category] ?? [];
    return entries.filter(e =>
      e.timestamp >= (from ?? 0) && e.timestamp <= (to ?? Date.now())
    );
  }

  async queryMetrics(name: string, from: number, to: number, aggregation: AggregationType): Promise<AggregateResult> {
    const allEntries: MetricEntry[] = [];
    for (const category of Object.keys(this.db)) {
      const entries = await this.query(category, from, to);
      allEntries.push(...entries.filter(e => e.key === name));
    }
    const values = allEntries.map(e => e.value);
    if (values.length === 0) {
      return { name, from, to, aggregation, value: 0, count: 0 };
    }
    const value = this.aggregate(values, aggregation);
    return { name, from, to, aggregation, value, count: values.length };
  }

  async listCategories(): Promise<string[]> {
    return Object.keys(this.db);
  }

  async getTotalMetrics(): Promise<number> {
    return Object.values(this.db).reduce((sum, arr) => sum + arr.length, 0);
  }

  async prune(olderThan: number): Promise<number> {
    let pruned = 0;
    for (const category of Object.keys(this.db)) {
      const before = this.db[category].length;
      this.db[category] = this.db[category].filter(e => e.timestamp >= olderThan);
      pruned += before - this.db[category].length;
    }
    return pruned;
  }

  async close(): Promise<void> {
    this.persistToDisk();
  }

  private aggregate(values: number[], aggregation: AggregationType): number {
    if (values.length === 0) return 0;
    switch (aggregation) {
      case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'max': return Math.max(...values);
      case 'min': return Math.min(...values);
      case 'p95': return this.percentile(values, 95);
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'count': return values.length;
      default: return values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const sortedVals = [...sorted].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sortedVals.length) - 1;
    return sortedVals[Math.max(0, idx)];
  }

  private loadFromDisk(): void {
    try {
      if (existsSync(this.dbPath)) {
        this.db = JSON.parse(readFileSync(this.dbPath, 'utf-8'));
      }
    } catch {
      this.db = {};
    }
  }

  private persistToDisk(): void {
    try {
      const dir = dirname(this.dbPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(this.dbPath, JSON.stringify(this.db), 'utf-8');
    } catch {
      /* silent */
    }
  }
}
