import { createLogger } from '@ideia/logger';
import { execFile } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const logger = createLogger('data-layer:wal-backup');

export interface WalBackupConfig {
  pgDataDir: string;
  archiveDir: string;
  walDir?: string;
  retentionDays: number;
  compress: boolean;
  snapshotIntervalMs: number;
  maxSnapshots: number;
}

export interface WalSnapshot {
  path: string;
  size: number;
  timestamp: string;
  walSegments: number;
  type: 'full' | 'incremental';
}

export interface WalBackupStatus {
  lastArchive: string | null;
  lastSnapshot: string | null;
  walSegmentsArchived: number;
  snapshots: WalSnapshot[];
  isArchiving: boolean;
}

export class WalBackupManager {
  private config: WalBackupConfig;
  private archiving = false;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private _walSegmentsArchived = 0;
  private snapshots: WalSnapshot[] = [];

  constructor(config: Partial<WalBackupConfig>) {
    this.config = {
      pgDataDir: '/var/lib/postgresql/data',
      archiveDir: '.deploy/backups/wal',
      retentionDays: 30,
      compress: true,
      snapshotIntervalMs: 86400000,
      maxSnapshots: 7,
      ...config,
    };
    mkdirSync(this.config.archiveDir, { recursive: true });
  }

  getStatus(): WalBackupStatus {
    return {
      lastArchive: this.snapshots[this.snapshots.length - 1]?.path ?? null,
      lastSnapshot: this.snapshots[this.snapshots.length - 1]?.timestamp ?? null,
      walSegmentsArchived: this._walSegmentsArchived,
      snapshots: [...this.snapshots],
      isArchiving: this.archiving,
    };
  }

  start(): void {
    if (this.snapshotTimer) return;
    logger.info('Starting WAL backup scheduler');
    this.snapshotTimer = setInterval(() => {
      this.runSnapshot().catch(err => logger.error('WAL snapshot failed', { error: String(err) }));
    }, this.config.snapshotIntervalMs);
    this.runSnapshot().catch(err => logger.error('Initial WAL snapshot failed', { error: String(err) }));
  }

  stop(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  async archiveWalSegment(segmentPath: string): Promise<boolean> {
    if (!existsSync(segmentPath)) {
      logger.warn('WAL segment not found', { path: segmentPath });
      return false;
    }

    try {
      const destName = `wal_${Date.now()}_${segmentPath.replace(/[/\\]/g, '_')}`;
      const destPath = join(this.config.archiveDir, destName);
      const content = readFileSync(segmentPath);
      writeFileSync(destPath, this.config.compress ? content : content);
      this._walSegmentsArchived++;
      this.cleanup();
      return true;
    } catch (err) {
      logger.error('Failed to archive WAL segment', { error: String(err) });
      return false;
    }
  }

  async runSnapshot(): Promise<WalSnapshot> {
    this.archiving = true;
    const start = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = this.config.compress ? '.snap.gz' : '.snap';
    const snapshotPath = resolve(this.config.archiveDir, `pg-snapshot-${timestamp}${ext}`);

    try {
      const env = { ...process.env };
      const args = ['start', '--wait'];
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile('pg_basebackup', args, { env, encoding: 'utf-8', maxBuffer: 500 * 1024 * 1024, timeout: 300000 }, (err, out) => {
          if (err) reject(err);
          else resolve(out);
        });
      });
      if (this.config.compress) {
        writeFileSync(snapshotPath, stdout, 'binary');
      } else {
        writeFileSync(snapshotPath, stdout, 'utf-8');
      }
      const size = existsSync(snapshotPath) ? statSync(snapshotPath).size : 0;

      const snapshot: WalSnapshot = {
        path: snapshotPath,
        size,
        timestamp: new Date().toISOString(),
        walSegments: this._walSegmentsArchived,
        type: 'full',
      };
      this.snapshots.push(snapshot);

      if (this.snapshots.length > this.config.maxSnapshots) {
        const oldest = this.snapshots.shift();
        if (oldest && existsSync(oldest.path)) {
          unlinkSync(oldest.path);
        }
      }

      logger.info(`WAL snapshot completed: ${(size / 1024 / 1024).toFixed(1)}MB in ${Date.now() - start}ms`);
      return snapshot;
    } catch (err) {
      logger.error('WAL snapshot failed', { error: String(err) });
      const snapshot: WalSnapshot = {
        path: snapshotPath,
        size: 0,
        timestamp: new Date().toISOString(),
        walSegments: this._walSegmentsArchived,
        type: 'full',
      };
      this.snapshots.push(snapshot);
      return snapshot;
    } finally {
      this.archiving = false;
    }
  }

  listSnapshots(): WalSnapshot[] {
    return [...this.snapshots];
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.config.retentionDays * 86400000;
    try {
      const files = readdirSync(this.config.archiveDir);
      for (const file of files) {
        const filePath = join(this.config.archiveDir, file);
        const stats = statSync(filePath);
        if (stats.isFile() && stats.mtimeMs < cutoff) {
          unlinkSync(filePath);
        }
      }
    } catch (err) {
      logger.warn('WAL cleanup error', { error: String(err) });
    }
  }

  destroy(): void {
    this.stop();
    this.snapshots = [];
    this._walSegmentsArchived = 0;
  }
}
