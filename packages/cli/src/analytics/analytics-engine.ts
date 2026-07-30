import fs from 'fs';
import { createLogger } from '@ideia/logger';
import path from 'path';

export interface AnalyticsRecord {
  timestamp: string;
  category: string;
  event: string;
  value: number;
  tags: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsQuery {
  category?: string;
  event?: string;
  fromDate?: string;
  toDate?: string;
  groupBy?: string[];
  aggregate?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  limit?: number;
}

export interface AnalyticsResult {
  columns: string[];
  rows: unknown[][];
  totalRows: number;
  executionTimeMs: number;
}

const METRICS_DIR = '.ai/metrics';

function getGroupValue(r: AnalyticsRecord, key: string): string {
  if (key === 'timestamp') return r.timestamp;
  if (key === 'category') return r.category;
  if (key === 'event') return r.event;
  if (key === 'value') return String(r.value);
  if (key === 'tags') return JSON.stringify(r.tags);
  if (key === 'metadata') return r.metadata ? JSON.stringify(r.metadata) : '';
  return '';
}

export class AnalyticsEngine {
  private records: AnalyticsRecord[] = [];
  private filePath: string;
  private maxRecords = 100000;

  constructor(basePath?: string) {
    const dir = path.join(basePath ?? process.cwd(), METRICS_DIR);
    this.filePath = path.join(dir, 'analytics.jsonl');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) return;
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      this.records = data.split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line) as AnalyticsRecord; } catch { return null; }
      }).filter((r): r is AnalyticsRecord => r !== null);
    } catch { this.records = []; }
  }

  private save(): void {
    const lines = this.records.slice(-this.maxRecords).map(r => JSON.stringify(r)).join('\n');
    fs.writeFileSync(this.filePath, lines + '\n', 'utf-8');
  }

  track(category: string, event: string, value = 1, tags?: Record<string, string>, metadata?: Record<string, unknown>): AnalyticsRecord {
    const record: AnalyticsRecord = {
      timestamp: new Date().toISOString(),
      category, event, value, tags: tags ?? {}, metadata,
    };
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
    this.save();
    return record;
  }

  query(query: AnalyticsQuery): AnalyticsResult {
    const start = Date.now();
    let filtered = [...this.records];

    if (query.category) filtered = filtered.filter(r => r.category === query.category);
    if (query.event) filtered = filtered.filter(r => r.event === query.event);
    if (query.fromDate!) filtered = filtered.filter(r => r.timestamp >= query.fromDate!);
    if (query.toDate!) filtered = filtered.filter(r => r.timestamp <= query.toDate!);

    const columns: string[] = ['timestamp', 'category', 'event', 'value'];
    const rows: unknown[][] = [];

    if (query.groupBy && query.groupBy.length > 0) {
      const groups = new Map<string, { count: number; sum: number; values: number[] }>();
      for (const r of filtered) {
        const key = query.groupBy.map(g => getGroupValue(r, g)).join('|');
        if (!groups.has(key)) groups.set(key, { count: 0, sum: 0, values: [] });
        const g = groups.get(key);
        if (g) { g.count++; g.sum += r.value; g.values.push(r.value); }
      }
      for (const [key, g] of groups) {
        const groupKeys = key.split('|');
        const avg = g.count > 0 ? g.sum / g.count : 0;
        const sorted = [...g.values].sort((a, b) => a - b);
        const row = [...groupKeys, g.count, g.sum, Math.round(avg * 100) / 100, sorted[0], sorted[sorted.length - 1], sorted[Math.floor(sorted.length * 0.95)] ?? 0];
        rows.push(row);
      }
      for (const g of query.groupBy) columns.push(g);
      columns.push('count', 'sum', 'avg', 'min', 'max', 'p95');
    } else {
      for (const r of filtered.slice(0, query.limit ?? 100)) {
        rows.push([r.timestamp, r.category, r.event, r.value]);
      }
    }

    if (query.orderBy) {
      const idx = columns.indexOf(query.orderBy);
      if (idx >= 0) {
        rows.sort((a, b) => {
          const cmp = String(a[idx]).localeCompare(String(b[idx]));
          return query.orderDir === 'desc' ? -cmp : cmp;
        });
      }
    }

    return {
      columns,
      rows: rows.slice(0, query.limit ?? 1000),
      totalRows: filtered.length,
      executionTimeMs: Date.now() - start,
    };
  }

  getCategories(): string[] {
    return [...new Set(this.records.map(r => r.category))];
  }

  getEvents(category?: string): string[] {
    const filtered = category ? this.records.filter(r => r.category === category) : this.records;
    return [...new Set(filtered.map(r => r.event))];
  }

  getSummary(): { totalRecords: number; categories: number; firstEvent: string | null; lastEvent: string | null } {
    return {
      totalRecords: this.records.length,
      categories: this.getCategories().length,
      firstEvent: this.records.length > 0 ? (this.records[0]?.timestamp ?? null) : null,
      lastEvent: this.records.length > 0 ? this.records[this.records.length - 1].timestamp : null,
    };
  }

  getTimeSeries(category: string, event: string, intervalMinutes = 60): Array<{ period: string; count: number; sum: number }> {
    const filtered = this.records.filter(r => r.category === category && r.event === event);
    const buckets = new Map<string, { count: number; sum: number }>();
    for (const r of filtered) {
      const d = new Date(r.timestamp);
      const period = new Date(Math.floor(d.getTime() / (intervalMinutes * 60000)) * intervalMinutes * 60000).toISOString();
      if (!buckets.has(period)) buckets.set(period, { count: 0, sum: 0 });
      const b = buckets.get(period);
      if (b) { b.count++; b.sum += r.value; }
    }
    return Array.from(buckets.entries()).map(([period, data]) => ({ period, ...data })).sort((a, b) => a.period.localeCompare(b.period));
  }

  clear(): void { this.records = []; this.save(); }
}

export function createAnalyticsEngine(basePath?: string): AnalyticsEngine {
  return new AnalyticsEngine(basePath);
}

