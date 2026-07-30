import { execFile } from 'child_process';
import { createLogger } from '@ideia/logger';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

export interface BackupConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  backupDir: string;
  retentionDays: number;
  autoBackup: boolean;
  backupIntervalMs: number;
  compress: boolean;
}

export interface BackupResult {
  success: boolean;
  path: string;
  size: number;
  durationMs: number;
  error?: string;
  timestamp: string;
}

const DEFAULT_CONFIG: BackupConfig = {
  host: 'localhost',
  port: 5432,
  database: 'ideia',
  user: 'ideia',
  password: 'ideia',
  backupDir: '.deploy/backups/postgres',
  retentionDays: 30,
  autoBackup: false,
  backupIntervalMs: 86400000,
  compress: true,
};

export class PostgresBackup {
  private config: BackupConfig;
  private intervalId?: ReturnType<typeof setInterval>;
  private backupHistory: BackupResult[] = [];

  constructor(config?: Partial<BackupConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setConfig(config: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): BackupConfig {
    return { ...this.config };
  }

  async runBackup(): Promise<BackupResult> {
    const start = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = this.config.compress ? '.sql.gz' : '.sql';
    const backupPath = resolve(this.config.backupDir, `ideia-backup-${timestamp}${ext}`);

    try {
      mkdirSync(this.config.backupDir, { recursive: true });

      const env = {
        ...process.env,
        PGPASSWORD: this.config.password,
      };

      const args = [
        '-h',
        this.config.host,
        '-p',
        String(this.config.port),
        '-U',
        this.config.user,
        '-d',
        this.config.database,
        '--no-owner',
        '--no-acl',
      ];

      if (this.config.compress) args.push('-Z', '9');

      const stdout = await new Promise<string>((resolve, reject) => {
        const _proc = execFile('pg_dump', args, { env, encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }, (_err, stdout, stderr) => {
          if (_err) reject(_err);
          else resolve(stdout);
        });
      });

      if (this.config.compress) {
        writeFileSync(backupPath, stdout, 'binary');
      } else {
        writeFileSync(backupPath, stdout, 'utf-8');
      }

      const size = existsSync(backupPath) ? readFileSync(backupPath).length : 0;
      const result: BackupResult = {
        success: true,
        path: backupPath,
        size,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };

      this.backupHistory.push(result);
      this.cleanupOldBackups();
      return result;
    } catch (_err) {
      const result: BackupResult = {
        success: false,
        path: backupPath,
        size: 0,
        durationMs: Date.now() - start,
        error: String(_err),
        timestamp: new Date().toISOString(),
      };
      this.backupHistory.push(result);
      return result;
    }
  }

  async restore(backupPath: string): Promise<{ success: boolean; error?: string }> {
    const env = { ...process.env, PGPASSWORD: this.config.password };
    const args = ['-h', this.config.host, '-p', String(this.config.port), '-U', this.config.user, '-d', this.config.database];

    try {
      const content = readFileSync(backupPath, this.config.compress ? 'binary' : 'utf-8');
      await new Promise<void>((resolve, reject) => {
        const proc = execFile('psql', args, { env, encoding: 'utf-8', timeout: 300000 }, (_err, stdout, stderr) => {
          if (_err) reject(_err);
          else resolve();
        });
        if (proc.stdin) {
          proc.stdin.write(content);
          proc.stdin.end();
        }
      });
      return { success: true };
    } catch (_err) {
      return { success: false, error: String(_err) };
    }
  }

  listBackups(): BackupResult[] {
    return [...this.backupHistory];
  }

  startAutoBackup(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.runBackup().catch(() => {});
    }, this.config.backupIntervalMs);
  }

  stopAutoBackup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private cleanupOldBackups(): void {
    const cutoff = Date.now() - this.config.retentionDays * 86400000;
    try {
      const { readdirSync, unlinkSync, statSync } = require('fs');
      const files = readdirSync(this.config.backupDir);
      for (const file of files) {
        const filePath = join(this.config.backupDir, file);
        const stats = statSync(filePath);
        if (stats.isFile() && stats.mtimeMs < cutoff) {
          unlinkSync(filePath);
        }
      }
    } catch {}
  }
}

export function createPostgresBackup(config?: Partial<BackupConfig>): PostgresBackup {
  return new PostgresBackup(config);
}
