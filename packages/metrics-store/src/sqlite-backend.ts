import { createLogger } from '@ideia/logger';
import { MetricEntry, AggregateResult, AggregationType, MetricsBackend } from './types';

const logger = createLogger('sqlite-backend');

interface SqliteBackendConfig {
  dbPath?: string;
  maxEntries?: number;
}

export class SqliteBackend implements MetricsBackend {
  private db: Map<string, MetricEntry[]> = new Map();
  private cache: Map<string, MetricEntry[]> = new Map();
  private maxEntries: number;
  private dbPath: string;

  constructor(config?: SqliteBackendConfig) {
    const c = { dbPath: '.ai/metrics/sqlite.json', maxEntries: 10000, ...config };
    this.dbPath = c.dbPath;
    this.maxEntries = c.maxEntries;
    this.loadFromDisk();
  }

  async record(category: string, key: string, value: number, tags?: Record<string, string>): Promise<void> {
    const entry: MetricEntry = { key, value, tags, timestamp: Date.now() };
    const entries = this.db.get(category) || [];
    entries.push(entry);
    if (entries.length > this.maxEntries) entries.splice(0, entries.length - this.maxEntries);
    this.db.set(category, entries);
    this.persistToDisk();
  }

  async query(category: string, from?: number, to?: number): Promise<MetricEntry[]> {
    const entries = this.db.get(category) || [];
    return entries.filter(e => e.timestamp >= (from || 0) && e.timestamp <= (to || Date.now()));
  }

  async queryMetrics(name: string, from: number, to: number, aggregation: AggregationType): Promise<AggregateResult> {
    const allEntries: MetricEntry[] = [];
    for (const category of this.db.keys()) {
      const entries = await this.query(category, from, to);
      allEntries.push(...entries.filter(e => e.key === name));
    }
    const values = allEntries.map(e => e.value);
    if (values.length === 0) return { name, from, to, aggregation, value: 0, count: 0 };
    return { name, from, to, aggregation, value: this.aggregate(values, aggregation), count: values.length };
  }

  async prune(olderThan: number): Promise<number> {
    let pruned = 0;
    for (const category of this.db.keys()) {
      const entries = this.db.get(category) || [];
      const before = entries.length;
      const filtered = entries.filter(e => e.timestamp >= olderThan);
      this.db.set(category, filtered);
      pruned += before - filtered.length;
    }
    this.persistToDisk();
    return pruned;
  }

  async close(): Promise<void> {
    this.persistToDisk();
  }

  async listCategories(): Promise<string[]> {
    return Array.from(this.db.keys());
  }

  async getTotalMetrics(): Promise<number> {
    let total = 0;
    for (const entries of this.db.values()) total += entries.length;
    return total;
  }

  private aggregate(values: number[], type: AggregationType): number {
    switch (type) {
      case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'max': return Math.max(...values);
      case 'min': return Math.min(...values);
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'count': return values.length;
      case 'p95': {
        const sorted = [...values].sort((a, b) => a - b);
        const idx = Math.ceil(0.95 * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
      }
    }
  }

  private loadFromDisk(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.db = new Map(Object.entries(parsed));
      }
    } catch { this.db = new Map(); }
  }

  private persistToDisk(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(Object.fromEntries(this.db)), 'utf-8');
    } catch { /* silent */ }
  }
}
