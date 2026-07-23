import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export interface MigrationResult {
  ok: boolean;
  output: string;
  durationMs: number;
}

export async function runMigrations(cwd: string, orm: 'prisma' | 'typeorm' | 'drizzle' = 'prisma'): Promise<MigrationResult> {
  const start = Date.now();
  try {
    let cmd: string;
    let args: string[];
    if (orm === 'prisma') {
      cmd = 'npx'; args = ['prisma', 'migrate', 'dev'];
    } else if (orm === 'typeorm') {
      cmd = 'npx'; args = ['typeorm', 'migration:run'];
    } else {
      cmd = 'npx'; args = ['drizzle-kit', 'push:pg'];
    }
    const output = await execFilePromise(cmd, args, cwd);
    return { ok: true, output, durationMs: Date.now() - start };
  } catch (_err) {
    return { ok: false, output: String(err), durationMs: Date.now() - start };
  }
}

export async function createMigration(cwd: string, name: string, orm: 'prisma' | 'typeorm' | 'drizzle' = 'prisma'): Promise<MigrationResult> {
  const start = Date.now();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    let output = '';
    if (orm === 'prisma') {
      output = await execFilePromise('npx', ['prisma', 'migrate', 'dev', '--name', safeName], cwd);
    }
    return { ok: true, output, durationMs: Date.now() - start };
  } catch (_err) {
    return { ok: false, output: String(err), durationMs: Date.now() - start };
  }
}

export async function resetDatabase(cwd: string, orm: 'prisma' | 'typeorm' | 'drizzle' = 'prisma'): Promise<MigrationResult> {
  const start = Date.now();
  try {
    if (orm === 'prisma') {
      await execFilePromise('npx', ['prisma', 'migrate', 'reset', '--force'], cwd);
    }
    return { ok: true, output: '', durationMs: Date.now() - start };
  } catch (_err) {
    return { ok: false, output: String(err), durationMs: Date.now() - start };
  }
}

export function getMigrationStatus(cwd: string): Array<{ name: string; applied: boolean; timestamp?: string }> {
  const migrationsDir = path.join(cwd, 'prisma/migrations');
  if (!fs.existsSync(migrationsDir)) return [];
  return fs.readdirSync(migrationsDir)
    .filter(e => fs.statSync(path.join(migrationsDir, e)).isDirectory())
    .map(name => {
      const migrationDir = path.join(migrationsDir, name);
      const exists = fs.existsSync(path.join(migrationDir, 'migration_lock.toml')) ||
        fs.readdirSync(migrationDir).some(f => f.endsWith('.sql'));
      return { name, applied: exists, timestamp: name.split('_')[0] };
    });
}

function execFilePromise(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
      if (err) reject(err); else resolve(stdout);
    });
  });
}
