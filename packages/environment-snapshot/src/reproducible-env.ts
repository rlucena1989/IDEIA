import { execFileSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLogger } from '@ideia/logger';
import { EnvironmentSnapshot } from './environment-snapshot';

const logger = createLogger('reproducible-env');

export interface EnvReport {
  nodeVersion: string;
  npmVersion: string;
  packagesCount: number;
  gitCommit: string;
  envSnapshot: string;
  verified: boolean;
  issues: string[];
}

export class ReproducibleEnvironment {
  private snapshot: EnvironmentSnapshot;
  private activeSnapshotId: string | null = null;

  constructor(snapshot: EnvironmentSnapshot) {
    this.snapshot = snapshot;
  }

  setup(snapshotId: string): boolean {
    const snapshots = this.snapshot.listSnapshots();
    const meta = snapshots.find(s => s.id === snapshotId);

    if (!meta) {
      logger.error(`Snapshot "${snapshotId}" not found`);
      return false;
    }

    if (!this.snapshot.verifySnapshot(snapshotId)) {
      logger.warn(`Snapshot "${snapshotId}" verification failed — proceeding anyway`);
    }

    this.activeSnapshotId = snapshotId;
    logger.info(`Environment set up from snapshot "${meta.name}" (${snapshotId})`);
    return true;
  }

  teardown(): void {
    if (this.activeSnapshotId) {
      logger.info(`Tearing down environment from snapshot "${this.activeSnapshotId}"`);
      this.activeSnapshotId = null;
    }
  }

  execInEnv(command: string, cwd?: string): { stdout: string; stderr: string; exitCode: number } {
    const workDir = cwd ?? process.cwd();

    try {
      const stdout = execFileSync(
        process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
        [
          process.platform === 'win32' ? '/c' : '-c',
          command,
        ],
        {
          cwd: workDir,
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 60000,
        }
      );

      return {
        stdout: String(stdout),
        stderr: '',
        exitCode: 0,
      };
    } catch (_e) {
      const err = e as { stdout?: string; stderr?: string; status?: number; message?: string };
      return {
        stdout: (err.stdout ?? '').toString(),
        stderr: (err.stderr ?? err.message ?? '').toString(),
        exitCode: err.status ?? 1,
      };
    }
  }

  verifyEnv(snapshotId: string): boolean {
    return this.snapshot.verifySnapshot(snapshotId);
  }

  getEnvReport(): EnvReport {
    const issues: string[] = [];
    let npmVersion = 'unknown';
    let gitCommit = 'unknown';
    let packagesCount = 0;

    try {
      npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf-8', stdio: 'pipe' }).toString().trim();
    } catch {
      issues.push('npm not available');
    }

    try {
      gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8', stdio: 'pipe' }).toString().trim();
    } catch {
      issues.push('git not available');
    }

    try {
      const root = process.cwd();
      if (existsSync(resolve(root, 'packages'))) {
        const { readdirSync } = require('node:fs') as typeof import('node:fs');
        packagesCount = readdirSync(resolve(root, 'packages')).filter((d: string) => {
          try {
            return existsSync(resolve(root, 'packages', d, 'package.json'));
          } catch {
            return false;
          }
        }).length;
      }
    } catch {
      issues.push('cannot read packages directory');
    }

    return {
      nodeVersion: process.version,
      npmVersion,
      packagesCount,
      gitCommit,
      envSnapshot: this.activeSnapshotId ?? 'none',
      verified: this.activeSnapshotId ? this.snapshot.verifySnapshot(this.activeSnapshotId) : false,
      issues,
    };
  }
}

export function createReproducibleEnvironment(snapshot: EnvironmentSnapshot): ReproducibleEnvironment {
  return new ReproducibleEnvironment(snapshot);
}
