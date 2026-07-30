import { randomUUID } from 'node:crypto';
import { createLogger } from '@ideia/logger';
import type { UsageRecord, UsageStats, TrackerConfig } from './types';
const logger = createLogger('usage-tracker');

const DEFAULT_MAX_RECORDS = 5000;

export class UsageTracker {
  private records: UsageRecord[] = [];
  private config: Required<TrackerConfig>;

  constructor(config?: TrackerConfig) {
    this.config = {
      maxRecords: config?.maxRecords ?? DEFAULT_MAX_RECORDS,
      persistPath: config?.persistPath ?? '',
    };
  }

  record(
    feature: string,
    action: string,
    sessionId: string,
    metadata?: Record<string, unknown>,
    durationMs?: number,
    source?: string,
  ): UsageRecord {
    const record: UsageRecord = {
      id: randomUUID(),
      feature,
      action,
      timestamp: new Date().toISOString(),
      sessionId,
      metadata,
      durationMs,
      source,
    };
    this.records.push(record);
    if (this.records.length > this.config.maxRecords) {
      this.records = this.records.slice(-this.config.maxRecords);
    }
    return record;
  }

  getRecords(feature?: string, since?: Date): UsageRecord[] {
    let filtered = this.records;
    if (feature) {
      filtered = filtered.filter(r => r.feature === feature);
    }
    if (since) {
      const sinceMs = since.getTime();
      filtered = filtered.filter(r => new Date(r.timestamp).getTime() >= sinceMs);
    }
    return [...filtered];
  }

  getStats(feature: string): UsageStats {
    const featureRecords = this.records.filter(r => r.feature === feature);
    if (featureRecords.length === 0) {
      const now = new Date().toISOString();
      return {
        feature,
        totalUses: 0,
        sessionsUsed: 0,
        firstUsed: now,
        lastUsed: now,
        frequencyByHour: {},
        frequencyByDay: {},
      };
    }

    const sessions = new Set(featureRecords.map(r => r.sessionId));
    const totalDuration = featureRecords.reduce((sum, r) => sum + (r.durationMs ?? 0), 0);
    const durationCount = featureRecords.filter(r => r.durationMs !== undefined).length;
    const timestamps = featureRecords.map(r => new Date(r.timestamp));

    const frequencyByHour: Record<string, number> = {};
    const frequencyByDay: Record<string, number> = {};
    for (const ts of timestamps) {
      const hour = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}T${String(ts.getHours()).padStart(2, '0')}`;
      const day = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
      frequencyByHour[hour] = (frequencyByHour[hour] ?? 0) + 1;
      frequencyByDay[day] = (frequencyByDay[day] ?? 0) + 1;
    }

    return {
      feature,
      totalUses: featureRecords.length,
      sessionsUsed: sessions.size,
      firstUsed: timestamps[0].toISOString(),
      lastUsed: timestamps[timestamps.length - 1].toISOString(),
      avgDurationMs: durationCount > 0 ? Math.round(totalDuration / durationCount) : undefined,
      frequencyByHour,
      frequencyByDay,
    };
  }

  getAllStats(): UsageStats[] {
    const features = new Set(this.records.map(r => r.feature));
    return Array.from(features).map(f => this.getStats(f)).sort((a, b) => b.totalUses - a.totalUses);
  }

  getTotalRecords(): number {
    return this.records.length;
  }

  getSessions(): string[] {
    return Array.from(new Set(this.records.map(r => r.sessionId)));
  }

  getSessionCount(): number {
    return this.getSessions().length;
  }

  clear(): void {
    this.records = [];
  }

  clearSession(sessionId: string): void {
    this.records = this.records.filter(r => r.sessionId !== sessionId);
  }

  getConfig(): Readonly<TrackerConfig> {
    return { ...this.config };
  }

  toJSON(): UsageRecord[] {
    return [...this.records];
  }

  fromJSON(data: UsageRecord[]): void {
    this.records = [...data];
    if (this.records.length > this.config.maxRecords) {
      this.records = this.records.slice(-this.config.maxRecords);
    }
  }
}
