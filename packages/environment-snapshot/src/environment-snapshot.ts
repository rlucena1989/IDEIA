import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { createLogger } from '@ideia/logger';

const logger = createLogger('environment-snapshot');

export interface SnapshotFile {
  path: string;
  hash: string;
  size: number;
}

export interface SnapshotMetadata {
  name: string;
  id: string;
  createdAt: string;
  nodeVersion: string;
  gitCommit: string;
  lockfileHash: string;
  totalFiles: number;
}

export interface Snapshot {
  metadata: SnapshotMetadata;
  files: SnapshotFile[];
  packageVersions: Record<string, string>;
  tsconfigContent: string;
}

let snapshotCounter = 0;

export class EnvironmentSnapshot {
  private snapshots: Map<string, Snapshot> = new Map();
  private storageDir: string;

  constructor(storageDir?: string) {
    this.storageDir = storageDir ?? resolve(process.cwd(), '.env-snapshots');
  }

  createSnapshot(name: string): Snapshot {
    const root = process.cwd();
    const id = `snap-${++snapshotCounter}-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const files = this.collectFiles(root);
    const packageVersions = this.collectPackageVersions(root);
    const tsconfigContent = this.readFileSafe(resolve(root, 'tsconfig.json'));
    const lockfileHash = this.computeLockfileHash(root);
    const gitCommit = this.getGitCommit();

    const metadata: SnapshotMetadata = {
      name,
      id,
      createdAt,
      nodeVersion: process.version,
      gitCommit,
      lockfileHash,
      totalFiles: files.length,
    };

    const snapshot: Snapshot = {
      metadata,
      files,
      packageVersions,
      tsconfigContent,
    };

    this.snapshots.set(id, snapshot);
    this.saveToDisk(id, snapshot);

    logger.info(`Snapshot "${name}" (${id}) created — ${files.length} files, ${Object.keys(packageVersions).length} packages`);
    return snapshot;
  }

  restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.loadFromDisk(snapshotId) || this.snapshots.get(snapshotId);
    if (!snapshot) {
      logger.error(`Snapshot "${snapshotId}" not found`);
      return false;
    }

    if (!this.verifySnapshot(snapshotId)) {
      logger.error(`Snapshot "${snapshotId}" verification failed — environment has changed`);
      return false;
    }

    logger.info(`Snapshot "${snapshot.metadata.name}" verified and ready for restore`);
    return true;
  }

  diffSnapshots(a: string, b: string): Array<{ file: string; status: 'added' | 'removed' | 'modified' | 'unchanged' }> {
    const snapA = this.loadFromDisk(a) || this.snapshots.get(a);
    const snapB = this.loadFromDisk(b) || this.snapshots.get(b);

    if (!snapA || !snapB) {
      logger.error('One or both snapshots not found');
      return [];
    }

    const filesA = new Map(snapA.files.map(f => [f.path, f]));
    const filesB = new Map(snapB.files.map(f => [f.path, f]));
    const allPaths = new Set([...filesA.keys(), ...filesB.keys()]);

    const result: Array<{ file: string; status: 'added' | 'removed' | 'modified' | 'unchanged' }> = [];

    for (const filePath of allPaths) {
      const fa = filesA.get(filePath);
      const fb = filesB.get(filePath);

      if (!fa && fb) {
        result.push({ file: filePath, status: 'added' });
      } else if (fa && !fb) {
        result.push({ file: filePath, status: 'removed' });
      } else if (fa && fb && fa.hash !== fb.hash) {
        result.push({ file: filePath, status: 'modified' });
      } else {
        result.push({ file: filePath, status: 'unchanged' });
      }
    }

    return result;
  }

  verifySnapshot(snapshotId: string): boolean {
    const snapshot = this.loadFromDisk(snapshotId) || this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    const root = process.cwd();

    for (const file of snapshot.files) {
      const fullPath = resolve(root, file.path);
      if (!existsSync(fullPath)) return false;

      const currentHash = this.hashFile(fullPath);
      if (currentHash !== file.hash) return false;
    }

    return true;
  }

  listSnapshots(): SnapshotMetadata[] {
    const inMemory = Array.from(this.snapshots.values()).map(s => s.metadata);
    const onDisk = this.listOnDisk();

    const seen = new Set<string>();
    const all = [...onDisk, ...inMemory].filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    return all;
  }

  private collectFiles(root: string): SnapshotFile[] {
    const result: SnapshotFile[] = [];
    const scanDir = (dir: string) => {
      let entries: string[] = [];
      try {
        entries = readdirSync(dir);
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        let stat;
        try {
          stat = statSync(fullPath);
        } catch {
          continue;
        }

        if (stat.isDirectory()) {
          if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
            scanDir(fullPath);
          }
        } else if (entry.endsWith('.json') || entry.endsWith('.ts') || entry.endsWith('.js') || entry.endsWith('.yaml') || entry.endsWith('.yml')) {
          const relPath = relative(root, fullPath);
          result.push({
            path: relPath,
            hash: this.hashFile(fullPath),
            size: stat.size,
          });
        }
      }
    };

    scanDir(root);
    return result;
  }

  private collectPackageVersions(root: string): Record<string, string> {
    const versions: Record<string, string> = {};
    const packagesDir = resolve(root, 'packages');

    if (!existsSync(packagesDir)) return versions;

    let entries: string[] = [];
    try {
      entries = readdirSync(packagesDir);
    } catch {
      return versions;
    }

    for (const pkg of entries) {
      const pkgJsonPath = resolve(packagesDir, pkg, 'package.json');
      if (!existsSync(pkgJsonPath)) continue;
      try {
        const content = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as { name?: string; version?: string };
        if (content.name && content.version) {
          versions[content.name] = content.version;
        }
      } catch {
        // skip invalid package.json
      }
    }

    return versions;
  }

  private computeLockfileHash(root: string): string {
    const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
    for (const lf of lockFiles) {
      const fullPath = resolve(root, lf);
      if (existsSync(fullPath)) {
        return this.hashFile(fullPath);
      }
    }
    return '';
  }

  private getGitCommit(): string {
    try {
      const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
      return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8', stdio: 'pipe' }).toString().trim();
    } catch {
      return 'unknown';
    }
  }

  private hashFile(filePath: string): string {
    try {
      const content = readFileSync(filePath);
      return createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  private readFileSafe(filePath: string): string {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  private saveToDisk(id: string, snapshot: Snapshot): void {
    try {
      if (!existsSync(this.storageDir)) {
        mkdirSync(this.storageDir, { recursive: true });
      }
      const filePath = resolve(this.storageDir, `${id}.json`);
      writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch (_e) {
      logger.error(`Failed to save snapshot to disk: ${e}`);
    }
  }

  private loadFromDisk(id: string): Snapshot | undefined {
    try {
      const filePath = resolve(this.storageDir, `${id}.json`);
      if (!existsSync(filePath)) return undefined;
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as Snapshot;
    } catch {
      return undefined;
    }
  }

  private listOnDisk(): SnapshotMetadata[] {
    try {
      if (!existsSync(this.storageDir)) return [];
      const files = readdirSync(this.storageDir).filter(f => f.endsWith('.json'));
      return files.map(f => {
        try {
          const content = JSON.parse(readFileSync(resolve(this.storageDir, f), 'utf-8')) as Snapshot;
          return content.metadata;
        } catch {
          return null;
        }
      }).filter((m): m is SnapshotMetadata => m !== null);
    } catch {
      return [];
    }
  }
}

export function createEnvironmentSnapshot(storageDir?: string): EnvironmentSnapshot {
  return new EnvironmentSnapshot(storageDir);
}
