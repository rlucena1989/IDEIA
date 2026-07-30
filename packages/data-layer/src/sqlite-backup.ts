import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as path from 'path';

const log = createLogger('data-layer:sqlite-backup');

export interface SqliteBackupConfig {
  dbPath: string;
  backupDir?: string;
  retentionDays?: number;
  intervalMs?: number;
}

export class SqliteBackup {
  private config: Required<SqliteBackupConfig>;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: SqliteBackupConfig) {
    this.config = {
      backupDir: '.ai/backups/sqlite',
      retentionDays: 30,
      intervalMs: 86400000,
      ...config,
    };
  }

  start(): void {
    if (this.intervalId) return;
    this.runBackup();
    this.intervalId = setInterval(() => this.runBackup(), this.config.intervalMs);
    log.info('SQLite auto-backup started', { intervalMs: this.config.intervalMs });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runBackup(): Promise<string | null> {
    try {
      if (!fs.existsSync(this.config.dbPath)) {
        log.warn(`SQLite database not found at ${this.config.dbPath}`);
        return null;
      }
      const dir = path.resolve(this.config.backupDir);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupName = `ideia-sqlite-${timestamp}.db`;
      const backupPath = path.join(dir, backupName);

      fs.copyFileSync(this.config.dbPath, backupPath);
      log.info(`SQLite backup created: ${backupPath}`);

      this.cleanOldBackups();
      return backupPath;
    } catch (__err) {
      log.error('SQLite backup failed', { error: String(__err) });
      return null;
    }
  }

  private cleanOldBackups(): void {
    try {
      const dir = path.resolve(this.config.backupDir);
      if (!fs.existsSync(dir)) return;
      const cutoff = Date.now() - this.config.retentionDays * 86400000;
      for (const file of fs.readdirSync(dir)) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile() && stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          log.info(`Removed old backup: ${file}`);
        }
      }
    } catch (__err) {
      log.warn('Failed to clean old backups', { error: String(__err) });
    }
  }

  listBackups(): string[] {
    try {
      const dir = path.resolve(this.config.backupDir);
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => f.endsWith('.db'))
        .sort()
        .map(f => path.join(dir, f));
    } catch {
      return [];
    }
  }
}

export function createSqliteBackup(config: SqliteBackupConfig): SqliteBackup {
  return new SqliteBackup(config);
}
