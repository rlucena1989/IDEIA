import { EventBus } from '@ideia/event-bus';
import { Logger } from '@ideia/logger';
import { MetricEntry, MetricsSummary, TrendResult } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class MetricsStore {
  private bus: EventBus;
  private logger: Logger;
  private storageDir: string;
  private cache: Map<string, MetricEntry[]>;
  private ttlMs: number;

  constructor(
    bus: EventBus,
    logger: Logger,
    options?: { storageDir?: string; ttlMs?: number }
  ) {
    this.bus = bus;
    this.logger = logger;
    this.storageDir = options?.storageDir ?? path.join(process.cwd(), '.ai', 'metrics');
    this.ttlMs = options?.ttlMs ?? 30 * 24 * 60 * 60 * 1000;
    this.cache = new Map();
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async record(
    category: string,
    key: string,
    value: number,
    tags?: Record<string, string>
  ): Promise<void> {
    const entry: MetricEntry = {
      key,
      value,
      tags,
      timestamp: Date.now(),
    };

    const entries = this.cache.get(category) ?? [];
    entries.push(entry);
    this.cache.set(category, entries);

    await this.flushCategory(category);
    await this.bus.emit({ type: 'metrics.recorded', source: 'metrics-store', payload: { category, key, value } });
    this.logger.debug(`Metric [${category}] ${key} = ${value}`);
  }

  async query(
    category: string,
    from?: number,
    to?: number
  ): Promise<MetricEntry[]> {
    await this.loadCategory(category);
    const entries = this.cache.get(category) ?? [];
    const toValue = to ?? Date.now();
    const fromValue = from ?? 0;
    return entries.filter(e => e.timestamp >= fromValue && e.timestamp <= toValue);
  }

  async getTrend(
    category: string,
    key: string,
    window?: number
  ): Promise<TrendResult> {
    const entries = await this.query(
      category,
      Date.now() - (window ?? 86400000)
    );
    const filtered = entries.filter(e => e.key === key);
    const values = filtered.map(e => e.value);
    const timestamps = filtered.map(e => e.timestamp);

    if (values.length === 0) {
      return { category, key, values: [], timestamps: [], min: 0, max: 0, avg: 0, slope: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const slope = values.length > 1
      ? (values[values.length - 1] - values[0]) / values.length
      : 0;

    return { category, key, values, timestamps, min, max, avg, slope };
  }

  async getLatest(category: string): Promise<MetricEntry | undefined> {
    const entries = await this.query(category);
    return entries.length > 0 ? entries[entries.length - 1] : undefined;
  }

  async getSummary(): Promise<MetricsSummary> {
    const categories: Record<string, number> = {};
    let totalEntries = 0;
    let oldestEntry = Infinity;
    let newestEntry = 0;

    const files = fs.readdirSync(this.storageDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const category = file.replace('.json', '');
      await this.loadCategory(category);
      const entries = this.cache.get(category) ?? [];
      categories[category] = entries.length;
      totalEntries += entries.length;
      for (const e of entries) {
        if (e.timestamp < oldestEntry) oldestEntry = e.timestamp;
        if (e.timestamp > newestEntry) newestEntry = e.timestamp;
      }
    }

    return {
      totalEntries,
      categories,
      oldestEntry: oldestEntry === Infinity ? 0 : oldestEntry,
      newestEntry,
      storagePath: this.storageDir,
    };
  }

  async cleanup(): Promise<number> {
    const cutoff = Date.now() - this.ttlMs;
    let removed = 0;

    for (const [category, entries] of this.cache) {
      const filtered = entries.filter(e => e.timestamp >= cutoff);
      removed += entries.length - filtered.length;
      this.cache.set(category, filtered);
    }

    const files = fs.readdirSync(this.storageDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(this.storageDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MetricEntry[];
      const filtered = content.filter(e => e.timestamp >= cutoff);
      if (filtered.length !== content.length) {
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        removed += content.length - filtered.length;
      }
    }

    if (removed > 0) {
      this.logger.info(`Cleaned up ${removed} expired metric entries`);
    }

    return removed;
  }

  private async flushCategory(category: string): Promise<void> {
    const entries = this.cache.get(category);
    if (!entries) return;
    const filePath = path.join(this.storageDir, `${category}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
  }

  private async loadCategory(category: string): Promise<void> {
    if (this.cache.has(category)) return;
    const filePath = path.join(this.storageDir, `${category}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const entries = JSON.parse(content) as MetricEntry[];
      this.cache.set(category, entries);
    } else {
      this.cache.set(category, []);
    }
  }
}
