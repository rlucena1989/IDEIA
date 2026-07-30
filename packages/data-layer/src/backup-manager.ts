import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';
import { createLogger } from '@ideia/logger';
import { PostgresBackup, type BackupConfig, type BackupResult } from './backup';
import { BackupVerifier } from './backup-verifier';

const logger = createLogger('data-layer:backup-manager');

export interface BackupManagerConfig {
  type: 'postgres' | 'sqlite';
  backupDir: string;
  postgres?: BackupConfig;
  sqlite?: BackupConfig;
  maxBackups: number;
  retentionDays: number;
  scheduleIntervalMs: number;
  incremental: boolean;
  verifyAfterBackup: boolean;
  compress: boolean;
}

export interface IncrementalBackupInfo {
  baseBackupPath: string;
  changes: Array<{ file: string; checksum: string }>;
  timestamp: string;
}

export interface BackupManagerStatus {
  lastBackup: BackupResult | null;
  totalBackups: number;
  nextScheduledRun: number | null;
  isRunning: boolean;
  incrementalChain: IncrementalBackupInfo[];
}

type BackupTimer = ReturnType<typeof setTimeout>;

const DEFAULT_CONFIG: BackupManagerConfig = {
  type: 'sqlite',
  backupDir: '.ai/backups',
  maxBackups: 10,
  retentionDays: 30,
  scheduleIntervalMs: 86400000,
  incremental: false,
  verifyAfterBackup: true,
  compress: true,
};

export class BackupManager {
  private config: BackupManagerConfig;
  private postgresBackup: PostgresBackup | null = null;
  private sqliteBackup: PostgresBackup | null = null;
  private verifier: BackupVerifier;
  private timer: BackupTimer | null = null;
  private running = false;
  private incrementalChain: IncrementalBackupInfo[] = [];
  private lastBackup: BackupResult | null = null;
  private checksumCache: Map<string, string> = new Map();

  constructor(config?: Partial<BackupManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.verifier = new BackupVerifier(this.config.backupDir);
    if (this.config.type === 'postgres' && this.config.postgres) {
      this.postgresBackup = new PostgresBackup({ ...this.config.postgres, backupDir: this.config.backupDir, compress: this.config.compress });
    } else if (this.config.type === 'sqlite' && this.config.sqlite) {
      this.sqliteBackup = new PostgresBackup({ ...this.config.sqlite, backupDir: this.config.backupDir });
    }
    mkdirSync(this.config.backupDir, { recursive: true });
  }

  getConfig(): BackupManagerConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<BackupManagerConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.config.type === 'postgres' && this.config.postgres) {
      this.postgresBackup?.setConfig({ ...this.config.postgres, backupDir: this.config.backupDir });
    } else if (this.config.type === 'sqlite' && this.config.sqlite) {
      this.sqliteBackup?.setConfig({ ...this.config.sqlite, backupDir: this.config.backupDir });
    }
  }

  getStatus(): BackupManagerStatus {
    return {
      lastBackup: this.lastBackup,
      totalBackups: this.listBackups().length,
      nextScheduledRun: this.timer ? Date.now() + this.config.scheduleIntervalMs : null,
      isRunning: this.running,
      incrementalChain: [...this.incrementalChain],
    };
  }

  async runBackup(): Promise<BackupResult> {
    if (this.running) {
      return { success: false, path: '', size: 0, durationMs: 0, error: 'Backup already running', timestamp: new Date().toISOString() };
    }
    this.running = true;
    try {
      let result: BackupResult;
      if (this.config.incremental && this.lastBackup?.success) {
        result = await this.runIncrementalBackup();
      } else if (this.postgresBackup) {
        result = await this.postgresBackup.runBackup();
      } else if (this.sqliteBackup) {
        result = await this.sqliteBackup.runBackup();
      } else {
        result = { success: false, path: '', size: 0, durationMs: 0, error: 'No backup engine configured', timestamp: new Date().toISOString() };
      }

      if (result.success) {
        this.lastBackup = result;
        if (this.config.verifyAfterBackup && result.path) {
          const verification = this.verifier.verify(result.path);
          if (!verification.verified) {
            logger.warn('Backup verification failed', { path: result.path, errors: verification.errors });
          }
        }
        this.enforceRetentionPolicy();
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  private async runIncrementalBackup(): Promise<BackupResult> {
    const start = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = resolve(this.config.backupDir);
    const incrementalPath = join(backupDir, `incremental-${timestamp}.json`);

    try {
      const currentChecksums = await this.computeCurrentChecksums();
      const changes: Array<{ file: string; checksum: string }> = [];

      for (const [file, checksum] of currentChecksums) {
        const cached = this.checksumCache.get(file);
        if (cached !== checksum) {
          changes.push({ file, checksum });
          this.checksumCache.set(file, checksum);
        }
      }

      const incrementalInfo: IncrementalBackupInfo = {
        baseBackupPath: this.lastBackup?.path ?? '',
        changes,
        timestamp: new Date().toISOString(),
      };

      writeFileSync(incrementalPath, JSON.stringify(incrementalInfo, null, 2));
      this.incrementalChain.push(incrementalInfo);

      const size = statSync(incrementalPath).size;
      const result: BackupResult = {
        success: true,
        path: incrementalPath,
        size,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };

      logger.info(`Incremental backup completed: ${changes.length} changes at ${incrementalPath}`);
      return result;
    } catch (___err) {
      logger.error('Incremental backup failed', { error: String(___err) });
      return {
        success: false, path: incrementalPath, size: 0, durationMs: Date.now() - start,
        error: String(___err), timestamp: new Date().toISOString(),
      };
    }
  }

  private async computeCurrentChecksums(): Promise<Map<string, string>> {
    const checksums = new Map<string, string>();
    const scanDirs = ['.ai', 'packages'];
    for (const dir of scanDirs) {
      if (!existsSync(dir)) continue;
      try {
        const files = this.walkDir(dir);
        for (const file of files) {
          try {
            const content = readFileSync(file);
            checksums.set(file, createHash('sha256').update(content).digest('hex'));
          } catch {
            // skip unreadable files
          }
        }
      } catch {
        // skip unscannable dirs
      }
    }
    return checksums;
  }

  private walkDir(dir: string): string[] {
    const results: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...this.walkDir(fullPath));
        }
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
    return results;
  }

  async restore(backupPath: string): Promise<{ success: boolean; error?: string }> {
    if (this.postgresBackup) {
      return this.postgresBackup.restore(backupPath);
    }
    if (!this.config.sqlite) {
      return { success: false, error: 'No restore target configured' };
    }
    const targetPath = resolve(this.config.sqlite.backupDir);
    const sourcePath = resolve(backupPath);
    if (!existsSync(sourcePath)) {
      return { success: false, error: `Backup file not found: ${backupPath}` };
    }
    try {
      copyFileSync(sourcePath, targetPath);
      logger.info(`Restored from ${backupPath} to ${targetPath}`);
      return { success: true };
    } catch (___err) {
      logger.error('Restore failed', { error: String(___err) });
      return { success: false, error: String(___err) };
    }
  }

  async restoreLatest(): Promise<{ success: boolean; error?: string }> {
    const backups = this.listBackups().filter(b => b.success);
    if (backups.length === 0) {
      return { success: false, error: 'No backups available' };
    }
    const latest = backups[backups.length - 1];
    return this.restore(latest.path);
  }

  listBackups(): BackupResult[] {
    const results: BackupResult[] = [];
    if (!existsSync(this.config.backupDir)) return results;

    try {
      const files = readdirSync(this.config.backupDir);
      for (const file of files) {
        const filePath = join(this.config.backupDir, file);
        try {
          const stats = statSync(filePath);
          if (stats.isFile()) {
            results.push({
              success: true,
              path: filePath,
              size: stats.size,
              durationMs: 0,
              timestamp: stats.mtime.toISOString(),
            });
          }
        } catch {
          // skip unreadable
        }
      }
    } catch {
      // skip unscannable
    }
    return results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  verifyAll(): ReturnType<BackupVerifier['verifyAll']> {
    return this.verifier.verifyAll();
  }

  startScheduler(): void {
    if (this.timer) return;
    logger.info(`Starting backup scheduler with interval ${this.config.scheduleIntervalMs}ms`);
    this.timer = setTimeout(() => this.schedulerTick(), this.config.scheduleIntervalMs);
  }

  stopScheduler(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedulerTick(): void {
    this.runBackup()
      .catch((__err) => logger.error('Scheduled backup failed', { error: String(__err) }))
      .finally(() => {
        if (this.timer) {
          this.timer = setTimeout(() => this.schedulerTick(), this.config.scheduleIntervalMs);
        }
      });
  }

  clearChecksumCache(): void {
    this.checksumCache.clear();
    this.incrementalChain = [];
  }

  private enforceRetentionPolicy(): void {
    if (!existsSync(this.config.backupDir)) return;

    let files: Array<{ path: string; mtime: Date }>;
    try {
      files = readdirSync(this.config.backupDir)
        .map(f => ({ path: join(this.config.backupDir, f), mtime: statSync(join(this.config.backupDir, f)).mtime }))
        .filter(f => statSync(f.path).isFile())
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    } catch {
      return;
    }

    const ageCutoff = Date.now() - this.config.retentionDays * 86400000;
    let deletedCount = 0;

    for (const file of files) {
      let shouldDelete = false;
      if (file.mtime.getTime() < ageCutoff) {
        shouldDelete = true;
      }
      const idx = files.indexOf(file);
      if (idx >= this.config.maxBackups) {
        shouldDelete = true;
      }
      if (shouldDelete) {
        try {
          unlinkSync(file.path);
          deletedCount++;
        } catch (___err) {
          logger.warn('Could not delete old backup', { path: file.path, error: String(___err) });
        }
      }
    }

    if (deletedCount > 0) {
      logger.info(`Retention policy enforced: deleted ${deletedCount} old backups`);
    }
  }
}

export function createBackupManager(config?: Partial<BackupManagerConfig>): BackupManager {
  return new BackupManager(config);
}
