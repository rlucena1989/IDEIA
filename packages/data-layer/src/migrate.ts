import { readFileSync, readdirSync, existsSync } from 'fs';
import { createLogger } from '@ideia/logger';
import { join, resolve } from 'path';
import { DatabaseAdapter } from './types';
const logger = createLogger('data-layer:migrate');

export interface MigrationFile {
  version: number;
  name: string;
  up: string;
  down?: string;
}

export class MigrationRunner {
  private adapter: DatabaseAdapter;
  private migrationsDir: string;
  private dryRun: boolean;

  constructor(adapter: DatabaseAdapter, migrationsDir?: string, dryRun = false) {
    this.adapter = adapter;
    this.migrationsDir = migrationsDir || join(resolve(__dirname, '..'), 'migrations');
    this.dryRun = dryRun;
  }

  async ensureTable(): Promise<void> {
    if (this.dryRun) { logger.info('[DRY-RUN] CREATE TABLE IF NOT EXISTS ideia_migrations ...'); return; }
    await this.adapter.query(`
      CREATE TABLE IF NOT EXISTS ideia_migrations (
        version INT PRIMARY KEY,
        name TEXT NOT NULL,
        checksum TEXT,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  async pending(): Promise<MigrationFile[]> {
    const all = this.loadMigrations();
    const applied = await this.getApplied();
    return all.filter(m => !applied.includes(m.version));
  }

  async up(targetVersion?: number): Promise<number> {
    await this.ensureTable();
    const pending = await this.pending();
    let count = 0;
    for (const m of pending) {
      if (targetVersion !== undefined && m.version > targetVersion) break;
      if (this.dryRun) {
        logger.info('[DRY-RUN] Apply migration ${m.version}: ${m.name}');
        count++;
        continue;
      }
      try {
        await this.adapter.query(m.up);
        const checksum = this.checksum(m.up);
        await this.adapter.query(
          'INSERT INTO ideia_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [m.version, m.name, checksum]
        );
        logger.info('Applied migration ${m.version}: ${m.name}');
        count++;
      } catch (_err) {
        throw new Error(`Migration ${m.version} (${m.name}) failed: ${_err}`);
      }
    }
    return count;
  }

  async down(targetVersion: number): Promise<number> {
    const applied = await this.getApplied();
    const toRollback = applied.filter(v => v > targetVersion).sort((a, b) => b - a);
    let count = 0;
    for (const version of toRollback) {
      const m = this.loadMigrations().find(x => x.version === version);
      if (!m || !m.down) {
        logger.warn(`No down migration for version ${version}, skipping`);
        continue;
      }
      if (this.dryRun) {
        logger.info('[DRY-RUN] Rollback migration ${version}: ${m.name}');
        count++;
        continue;
      }
      try {
        await this.adapter.query(m.down);
        await this.adapter.query('DELETE FROM ideia_migrations WHERE version = $1', [version]);
        logger.info('Rolled back migration ${version}: ${m.name}');
        count++;
      } catch (_err) {
        throw new Error(`Rollback ${version} failed: ${_err}`);
      }
    }
    return count;
  }

  async status(): Promise<{ version: number; name: string; applied: boolean; checksum?: string }[]> {
    const all = this.loadMigrations();
    const applied = await this.getAppliedRecords();
    return all.map(m => ({
      version: m.version,
      name: m.name,
      applied: applied.some(a => a.version === m.version),
      checksum: applied.find(a => a.version === m.version)?.checksum,
    }));
  }

  private async getApplied(): Promise<number[]> {
    try {
      const result = await this.adapter.query<{ version: number }>(
        'SELECT version FROM ideia_migrations ORDER BY version'
      );
      return result.rows.map(r => r.version);
    } catch {
      return [];
    }
  }

  private async getAppliedRecords(): Promise<{ version: number; checksum?: string }[]> {
    try {
      const result = await this.adapter.query<{ version: number; checksum?: string }>(
        'SELECT version, checksum FROM ideia_migrations ORDER BY version'
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  private loadMigrations(): MigrationFile[] {
    if (!existsSync(this.migrationsDir)) return [];
    const files = readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.map(f => {
      const match = f.match(/^(\d{4})[-_](.+)\.sql$/);
      if (!match) throw new Error(`Invalid migration filename: ${f}. Expected format: 0001_name.sql`);
      const content = readFileSync(join(this.migrationsDir, f), 'utf8');
      const parts = content.split('-- DOWN');
      return {
        version: parseInt(match[1], 10),
        name: match[2].replace(/-/g, ' '),
        up: parts[0].trim(),
        down: parts[1]?.trim(),
      };
    });
  }

  private checksum(content: string): string {
    const { createHash } = require('crypto');
    return createHash('sha256').update(content).digest('hex');
  }
}
