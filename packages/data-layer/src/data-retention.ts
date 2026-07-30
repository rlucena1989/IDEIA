import { createLogger } from '@ideia/logger';
import type { DatabaseAdapter } from './types';
const logger = createLogger('data-layer');

export interface DataRetentionConfig {
  enabled: boolean;
  defaultRetentionDays: number;
  purgeIntervalMs: number;
  policies: DataRetentionPolicy[];
}

export interface DataRetentionPolicy {
  category: string;
  retentionDays: number;
  action: 'delete' | 'anonymize' | 'archive';
  priority: number;
}

export interface PurgeReport {
  policy: string;
  recordsPurged: number;
  durationMs: number;
  success: boolean;
  timestamp: string;
}

interface TableMapping {
  table: string;
  dateCol: string;
  anonymizeCols: string[];
}

const TABLE_MAP: Record<string, TableMapping> = {
  audit_logs: { table: 'ideia_audit_log', dateCol: 'created_at', anonymizeCols: ['actor', 'target', 'metadata'] },
  sessions: { table: 'ideia_sessions', dateCol: 'started_at', anonymizeCols: ['metadata'] },
  chat_history: { table: 'ideia_memory', dateCol: 'created_at', anonymizeCols: ['summary', 'context'] },
  decisions: { table: 'ideia_decisions', dateCol: 'created_at', anonymizeCols: ['reason', 'metadata'] },
  metrics: { table: 'ideia_metrics', dateCol: 'created_at', anonymizeCols: ['category', 'value'] },
  errors: { table: 'ideia_errors', dateCol: 'created_at', anonymizeCols: ['message', 'stack_trace', 'metadata'] },
  vectors: { table: 'ideia_vectors', dateCol: 'created_at', anonymizeCols: ['content', 'metadata'] },
  memory: { table: 'ideia_memory', dateCol: 'created_at', anonymizeCols: ['summary', 'context'] },
};

const FILE_CATEGORIES = new Set(['temporary_files', 'temp', 'cache', 'logs']);

const DEFAULT_POLICIES: DataRetentionPolicy[] = [
  { category: 'audit_logs', retentionDays: 365, action: 'archive', priority: 1 },
  { category: 'sessions', retentionDays: 30, action: 'delete', priority: 2 },
  { category: 'chat_history', retentionDays: 90, action: 'anonymize', priority: 3 },
  { category: 'decisions', retentionDays: 730, action: 'archive', priority: 1 },
  { category: 'metrics', retentionDays: 180, action: 'delete', priority: 3 },
  { category: 'errors', retentionDays: 60, action: 'delete', priority: 2 },
  { category: 'temporary_files', retentionDays: 1, action: 'delete', priority: 4 },
];

const VALID_TABLE_NAMES = new Set([
  'ideia_audit_log', 'ideia_sessions', 'ideia_memory', 'ideia_decisions',
  'ideia_metrics', 'ideia_errors', 'ideia_vectors',
  'ideia_audit_log_archive', 'ideia_sessions_archive', 'ideia_memory_archive',
  'ideia_decisions_archive', 'ideia_metrics_archive', 'ideia_errors_archive',
  'ideia_vectors_archive',
]);

const VALID_COLUMN_NAMES = new Set([
  'created_at', 'started_at', 'actor', 'target', 'metadata', 'summary',
  'context', 'reason', 'category', 'value', 'message', 'stack_trace',
  'content', 'event_id', 'event_type', 'decision', 'approval_status',
  'result', 'previous_hash', 'updated_at', 'deleted_at',
]);

function validateIdentifier(name: string, validSet: Set<string>, context: string): string {
  if (!validSet.has(name)) {
    throw new Error(`SQL injection prevention: invalid ${context} "${name}". Must be one of: [${[...validSet].join(', ')}]`);
  }
  return name;
}

export class DataRetentionPolicyEnforcer {
  private config: DataRetentionConfig;
  private purgeHistory: PurgeReport[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private adapter: DatabaseAdapter | null;
  private tableCache: Set<string> | null = null;

  constructor(config?: Partial<DataRetentionConfig> & { adapter?: DatabaseAdapter }) {
    this.config = {
      enabled: true,
      defaultRetentionDays: 90,
      purgeIntervalMs: 86400000,
      policies: DEFAULT_POLICIES,
      ...config,
    };
    this.adapter = config?.adapter || null;
  }

  setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;
  }

  private async tableExists(table: string): Promise<boolean> {
    if (!validateIdentifier(table, VALID_TABLE_NAMES, 'table')) return false;
    if (this.tableCache?.has(table)) return true;
    if (!this.adapter) return false;
    try {
      const result = await this.adapter.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=? UNION SELECT tablename FROM pg_catalog.pg_tables WHERE tablename=?",
        [table, table]
      );
      const exists = result.rows.length > 0;
      if (exists) {
        if (!this.tableCache) this.tableCache = new Set();
        this.tableCache.add(table);
      }
      return exists;
    } catch {
      try {
        const result = await this.adapter.query(`SELECT 1 FROM ${table} LIMIT 0`);
        return result.rowCount === 0 || true;
      } catch {
        return false;
      }
    }
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.runPurgeCycle(), this.config.purgeIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getPolicy(category: string): DataRetentionPolicy {
    const policy = this.config.policies.find(p => p.category === category);
    return policy ?? { category, retentionDays: this.config.defaultRetentionDays, action: 'delete', priority: 0 };
  }

  addPolicy(policy: DataRetentionPolicy): void {
    const existing = this.config.policies.findIndex(p => p.category === policy.category);
    if (existing >= 0) {
      this.config.policies[existing] = policy;
    } else {
      this.config.policies.push(policy);
    }
    this.config.policies.sort((a, b) => b.priority - a.priority);
  }

  calculatePurgeDate(category: string, createdAt: Date): Date {
    const policy = this.getPolicy(category);
    const purgeDate = new Date(createdAt);
    purgeDate.setDate(purgeDate.getDate() + policy.retentionDays);
    return purgeDate;
  }

  isExpired(category: string, createdAt: Date): boolean {
    const purgeDate = this.calculatePurgeDate(category, createdAt);
    return new Date() >= purgeDate;
  }

  async runPurgeCycle(dryRun = false): Promise<PurgeReport[]> {
    if (!this.config.enabled) return [];
    const reports: PurgeReport[] = [];
    for (const policy of this.config.policies) {
      const start = Date.now();
      try {
        const count = dryRun ? await this.dryRunPurge(policy) : await this.executePurge(policy);
        const report: PurgeReport = {
          policy: policy.category,
          recordsPurged: count,
          durationMs: Date.now() - start,
          success: true,
          timestamp: new Date().toISOString(),
        };
        reports.push(report);
        this.purgeHistory.push(report);
        const action = dryRun ? 'DRY-RUN would purge' : 'Purged';
        logger.info(`${action} ${count} records for policy "${policy.category}" (${policy.action}) in ${Date.now() - start}ms`);
      } catch (err) {
        logger.error('Error in runPurgeCycle', { category: policy.category, error: String(err) });
        const report: PurgeReport = {
          policy: policy.category,
          recordsPurged: 0,
          durationMs: Date.now() - start,
          success: false,
          timestamp: new Date().toISOString(),
        };
        reports.push(report);
        this.purgeHistory.push(report);
      }
    }
    return reports;
  }

  private async dryRunPurge(policy: DataRetentionPolicy): Promise<number> {
    if (!this.adapter) return 0;
    const mapping = TABLE_MAP[policy.category];
    if (!mapping) return 0;
    const table = validateIdentifier(mapping.table, VALID_TABLE_NAMES, 'table');
    const dateCol = validateIdentifier(mapping.dateCol, VALID_COLUMN_NAMES, 'column');
    const exists = await this.tableExists(table);
    if (!exists) return 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - policy.retentionDays);
    const result = await this.adapter.query<{ c: number }>(
      `SELECT COUNT(*) AS c FROM ${table} WHERE ${dateCol} < ?`,
      [cutoff.toISOString()]
    );
    return Number(result.rows[0]?.c || 0);
  }

  private async executePurge(policy: DataRetentionPolicy): Promise<number> {
    if (!this.adapter) {
      logger.warn('executePurge skipped: no DatabaseAdapter configured');
      return 0;
    }

    if (FILE_CATEGORIES.has(policy.category)) {
      return this.purgeFiles(policy);
    }

    const mapping = TABLE_MAP[policy.category];
    if (!mapping) {
      logger.warn(`executePurge skipped: unknown category "${policy.category}"`);
      return 0;
    }

    const exists = await this.tableExists(mapping.table);
    if (!exists) {
      logger.warn(`executePurge skipped: table "${mapping.table}" does not exist for category "${policy.category}"`);
      return 0;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - policy.retentionDays);
    const cutoffStr = cutoff.toISOString();

    switch (policy.action) {
      case 'delete':
        return this.purgeDelete(mapping, cutoffStr);
      case 'anonymize':
        return this.purgeAnonymize(mapping, cutoffStr);
      case 'archive':
        return this.purgeArchive(mapping, cutoffStr);
      default:
        logger.warn(`executePurge skipped: unknown action "${policy.action}" for "${policy.category}"`);
        return 0;
    }
  }

  private async purgeDelete(mapping: TableMapping, cutoff: string): Promise<number> {
    if (!this.adapter) { logger.warn('purgeDelete: adapter not set'); return 0; }
    const table = validateIdentifier(mapping.table, VALID_TABLE_NAMES, 'table');
    const dateCol = validateIdentifier(mapping.dateCol, VALID_COLUMN_NAMES, 'column');
    const result = await this.adapter.query(
      `DELETE FROM ${table} WHERE ${dateCol} < ?`,
      [cutoff]
    );
    return result.rowCount;
  }

  private async purgeAnonymize(mapping: TableMapping, cutoff: string): Promise<number> {
    const table = validateIdentifier(mapping.table, VALID_TABLE_NAMES, 'table');
    const dateCol = validateIdentifier(mapping.dateCol, VALID_COLUMN_NAMES, 'column');
    const validatedCols = mapping.anonymizeCols.map(c => validateIdentifier(c, VALID_COLUMN_NAMES, 'column'));
    const setClauses = validatedCols.map(c => `${c} = ?`).join(', ');
    const params: unknown[] = [];
    for (const col of mapping.anonymizeCols) {
      if (col === 'metadata') {
        params.push(JSON.stringify({ anonymized: true, purgedAt: new Date().toISOString() }));
      } else if (col === 'context') {
        params.push(JSON.stringify({ anonymized: true }));
      } else if (col === 'tags') {
        params.push(JSON.stringify(['anonymized']));
      } else {
        params.push('[anonymized]');
      }
    }
    params.push(cutoff);

    if (!this.adapter) { logger.warn('purgeAnonymize: adapter not set'); return 0; }
    const result = await this.adapter.query(
      `UPDATE ${table} SET ${setClauses} WHERE ${dateCol} < ?`,
      params
    );
    return result.rowCount;
  }

  private async purgeArchive(mapping: TableMapping, cutoff: string): Promise<number> {
    if (!this.adapter) { logger.warn('purgeArchive: adapter not set'); return 0; }
    const table = validateIdentifier(mapping.table, VALID_TABLE_NAMES, 'table');
    const dateCol = validateIdentifier(mapping.dateCol, VALID_COLUMN_NAMES, 'column');
    const archiveTable = `${table}_archive`;
    if (!VALID_TABLE_NAMES.has(archiveTable)) {
      logger.warn(`Cannot create archive table "${archiveTable}": not in allowlist, falling back to delete`);
      return this.purgeDelete(mapping, cutoff);
    }
    const archiveExists = await this.tableExists(archiveTable);
    if (!archiveExists) {
      try {
        await this.adapter.query(
          `CREATE TABLE IF NOT EXISTS ${archiveTable} AS SELECT * FROM ${table} WHERE 1=0`
        );
      } catch {
        logger.warn(`Could not create archive table "${archiveTable}", falling back to delete`);
        return this.purgeDelete(mapping, cutoff);
      }
    }

    const insertResult = await this.adapter.query(
      `INSERT INTO ${archiveTable} SELECT * FROM ${table} WHERE ${dateCol} < ?`,
      [cutoff]
    );
    const deleteResult = await this.adapter.query(
      `DELETE FROM ${table} WHERE ${dateCol} < ?`,
      [cutoff]
    );
    return Math.max(insertResult.rowCount, deleteResult.rowCount);
  }

  private async purgeFiles(policy: DataRetentionPolicy): Promise<number> {
    const { readdir, unlink, stat } = await import('fs/promises');
    const { join } = await import('path');
    const dirsToScan = ['.ai', 'logs', 'temp', '.deploy/backups'];
    const cutoff = Date.now() - policy.retentionDays * 86400000;
    let count = 0;

    for (const dir of dirsToScan) {
      try {
        const files = await readdir(dir);
        for (const file of files) {
          const filePath = join(dir, file);
          try {
            const stats = await stat(filePath);
            if (stats.isFile() && stats.mtimeMs < cutoff) {
              await unlink(filePath);
              count++;
            }
          } catch {
            // skip files we can't stat
          }
        }
      } catch {
        // skip directories that don't exist
      }
    }
    return count;
  }

  getPurgeHistory(): PurgeReport[] {
    return [...this.purgeHistory];
  }
}
