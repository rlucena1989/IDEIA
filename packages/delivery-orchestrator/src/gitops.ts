import { execFileSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DeployEnvironment } from './types';

export type GitOpsProvider = 'github-actions' | 'argo-cd' | 'gitlab-ci' | 'manual';

export interface GitOpsConfig {
  enabled: boolean;
  provider: GitOpsProvider;
  repoPath: string;
  manifestDir: string;
  branch: string;
  autoSync: boolean;
  syncIntervalMs: number;
  autoCommit: boolean;
}

export interface GitOpsSyncResult {
  success: boolean;
  provider: GitOpsProvider;
  currentCommit: string;
  currentVersion?: string;
  driftDetected: boolean;
  lastSyncAt: string;
  error?: string;
}

export interface GitOpsManifest {
  apiVersion: string;
  kind: string;
  metadata: { name: string; labels?: Record<string, string> };
  spec: {
    version: string;
    environment: DeployEnvironment;
    replicas?: number;
    image?: string;
  };
}

const DEFAULT_CONFIG: GitOpsConfig = {
  enabled: true,
  provider: 'github-actions',
  repoPath: process.cwd(),
  manifestDir: '.deploy/manifests',
  branch: 'main',
  autoSync: false,
  syncIntervalMs: 300000,
  autoCommit: false,
};

export class GitOpsManager {
  private config: GitOpsConfig;
  private lastSyncResult?: GitOpsSyncResult;
  private syncIntervalId?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<GitOpsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setConfig(config: Partial<GitOpsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): GitOpsConfig {
    return { ...this.config };
  }

  async sync(): Promise<GitOpsSyncResult> {
    const start = Date.now();

    try {
      const currentCommit = this.execGit(['rev-parse', 'HEAD']);
      const _currentBranch = this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
      const remoteCommit = this.execGit(['ls-remote', 'origin', this.config.branch])
        .split('\t')[0] || '';

      const driftDetected = currentCommit.trim() !== remoteCommit.trim();

      const manifestPath = join(this.config.repoPath, this.config.manifestDir);
      let currentVersion: string | undefined;

      if (existsSync(manifestPath)) {
        const versionFile = join(manifestPath, 'version.txt');
        if (existsSync(versionFile)) {
          currentVersion = readFileSync(versionFile, 'utf-8').trim();
        }
      }

      const result: GitOpsSyncResult = {
        success: true,
        provider: this.config.provider,
        currentCommit: currentCommit.trim(),
        currentVersion,
        driftDetected,
        lastSyncAt: new Date(Date.now() + (Date.now() - start)).toISOString(),
      };

      this.lastSyncResult = result;
      return result;
    } catch (_err) {
      const result: GitOpsSyncResult = {
        success: false,
        provider: this.config.provider,
        currentCommit: '',
        driftDetected: false,
        lastSyncAt: new Date().toISOString(),
        error: String(_err),
      };

      this.lastSyncResult = result;
      return result;
    }
  }

  async applyManifest(manifest: GitOpsManifest): Promise<boolean> {
    try {
      const manifestDir = resolve(this.config.repoPath, this.config.manifestDir);

      if (!existsSync(manifestDir)) {
        const { mkdirSync } = require('node:fs');
        mkdirSync(manifestDir, { recursive: true });
      }

      const filePath = join(manifestDir, `${manifest.metadata.name}.json`);
      writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');

      const versionFilePath = join(manifestDir, 'version.txt');
      writeFileSync(versionFilePath, manifest.spec.version, 'utf-8');

      if (this.config.autoCommit) {
        try {
          this.execGit(['add', '-A']);
          this.execGit(['commit', '-m', `deploy: ${manifest.spec.version} to ${manifest.spec.environment}`]);
          try {
            this.execGit(['push']);
          } catch {
            // Push is optional
          }
        } catch {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  async detectDrift(): Promise<{ drifted: boolean; details: string[] }> {
    try {
      const status = this.execGit(['status', '--porcelain']);
      const changedFiles = status.split('\n').filter(Boolean);

      if (changedFiles.length === 0) {
        return { drifted: false, details: [] };
      }

      const details = changedFiles
        .filter(line => line.includes(this.config.manifestDir))
        .map(line => line.trim());

      return { drifted: details.length > 0, details };
    } catch {
      return { drifted: false, details: ['Failed to check drift'] };
    }
  }

  getLastSync(): GitOpsSyncResult | undefined {
    return this.lastSyncResult;
  }

  startAutoSync(): void {
    if (this.syncIntervalId) return;
    this.syncIntervalId = setInterval(() => {
      this.sync().catch(() => {});
    }, this.config.syncIntervalMs);
  }

  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }

  private execGit(args: string[]): string {
    return execFileSync('git', args, {
      cwd: this.config.repoPath,
      encoding: 'utf-8',
      timeout: 15000,
      stdio: 'pipe',
    });
  }
}

export function createGitOpsManager(config?: Partial<GitOpsConfig>): GitOpsManager {
  return new GitOpsManager(config);
}
