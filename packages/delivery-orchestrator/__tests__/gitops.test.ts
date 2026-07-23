import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import os from 'os';
import { GitOpsManager, createGitOpsManager, GitOpsManifest } from '../src/gitops';

describe('GitOpsManager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(os.tmpdir(), `gitops-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    try {
      const rm = (dir: string) => {
        if (existsSync(dir)) {
          const entries = require('fs').readdirSync(dir);
          for (const e of entries) {
            const full = join(dir, e);
            if (require('fs').statSync(full).isDirectory()) rm(full);
            else unlinkSync(full);
          }
          require('fs').rmdirSync(dir);
        }
      };
      rm(tmpDir);
    } catch {}
  });

  it('should create with default config', () => {
    const gm = createGitOpsManager({ repoPath: tmpDir });
    const config = gm.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('github-actions');
    expect(config.branch).toBe('main');
  });

  it('should apply manifest', async () => {
    const gm = createGitOpsManager({ repoPath: tmpDir });
    const manifest: GitOpsManifest = {
      apiVersion: 'ideia.dev/v1',
      kind: 'Deployment',
      metadata: { name: 'test-app' },
      spec: { version: '1.0.0', environment: 'production', replicas: 2 },
    };

    const result = await gm.applyManifest(manifest);
    expect(result).toBe(true);

    const versionPath = join(tmpDir, '.deploy', 'manifests', 'version.txt');
    expect(require('fs').readFileSync(versionPath, 'utf-8').trim()).toBe('1.0.0');
  });

  it('should detect drift', async () => {
    const gm = createGitOpsManager({ repoPath: tmpDir });
    const result = await gm.detectDrift();
    expect(result.drifted).toBe(false);
  });

  it('should support start/stop auto sync', () => {
    const gm = createGitOpsManager({ repoPath: tmpDir });
    gm.startAutoSync();
    gm.stopAutoSync();
    expect(gm.getLastSync()).toBeUndefined();
  });
});
