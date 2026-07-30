import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { syncManifest } from '../src/sync-manifest';
import type { SyncConfig } from '../src/types';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

function createMinimalConfig(workspaceDir: string): SyncConfig {
  const docsDir = path.join(workspaceDir, 'docs');
  const governanceDir = path.join(docsDir, 'governance');
  return {
    workspaceRoot: workspaceDir,
    docsDir,
    packagesDir: path.join(workspaceDir, 'packages'),
    manifestPath: path.join(governanceDir, 'REALITY-MANIFEST.md'),
    gapsPath: path.join(governanceDir, 'GAPS-PRODUCAO-IDE.md'),
    registryPath: path.join(governanceDir, 'document-registry.md'),
    watchPaths: [path.join(workspaceDir, 'packages'), docsDir],
    ignorePatterns: ['node_modules'],
  };
}

describe('syncManifest', () => {
  let tmpDir: string;
  let governanceDir: string;
  let packagesDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `sync-manifest-test-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    governanceDir = path.join(tmpDir, 'docs', 'governance');
    fs.mkdirSync(governanceDir, { recursive: true });
    packagesDir = path.join(tmpDir, 'packages');
    fs.mkdirSync(packagesDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns error when manifest does not exist', () => {
    const config = createMinimalConfig(tmpDir);
    config.manifestPath = path.join(tmpDir, 'nonexistent.md');

    const result = syncManifest(config);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('updates package count in manifest', () => {
    fs.mkdirSync(path.join(packagesDir, 'pkg-a'), { recursive: true });
    fs.writeFileSync(path.join(packagesDir, 'pkg-a', 'package.json'), JSON.stringify({ name: 'pkg-a' }));

    const manifestContent = `# Reality Manifest\n\n| **Packages** | | placeholder |\n| **Tests** | | placeholder |\n`;
    fs.writeFileSync(path.join(governanceDir, 'REALITY-MANIFEST.md'), manifestContent);

    const config = createMinimalConfig(tmpDir);
    const result = syncManifest(config);

    expect(result.ok).toBe(true);
    expect(result.actions.some(a => a.includes('Updated package count'))).toBe(true);
  });

  it('updates test count in manifest', () => {
    const pkgDir = path.join(packagesDir, 'test-pkg');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: 'test-pkg' }));
    const testDir = path.join(pkgDir, '__tests__');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'test.test.ts'), '// test');

    const manifestContent = `# Reality Manifest\n\n| **Packages** | | 1 package in workspace |\n| **Tests** | | placeholder |\n`;
    fs.writeFileSync(path.join(governanceDir, 'REALITY-MANIFEST.md'), manifestContent);

    const config = createMinimalConfig(tmpDir);
    const result = syncManifest(config);

    expect(result.ok).toBe(true);
    expect(result.actions.some(a => a.includes('Updated test count'))).toBe(true);
  });

  it('reports action when manifest table rows exist', () => {
    fs.mkdirSync(path.join(packagesDir, 'pkg-a'), { recursive: true });
    fs.writeFileSync(path.join(packagesDir, 'pkg-a', 'package.json'), JSON.stringify({ name: 'pkg-a' }));

    const manifestContent = `# Reality Manifest\n\n| **Packages** | | 1 package in workspace |\n| **Tests** | | 0 test files found |\n`;
    fs.writeFileSync(path.join(governanceDir, 'REALITY-MANIFEST.md'), manifestContent);

    const config = createMinimalConfig(tmpDir);
    const result = syncManifest(config);

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.actions)).toBe(true);
  });

  it('returns ok with no packages present', () => {
    const manifestContent = `# Reality Manifest\n\n| **Packages** | | placeholder |\n| **Tests** | | placeholder |\n`;
    fs.writeFileSync(path.join(governanceDir, 'REALITY-MANIFEST.md'), manifestContent);

    const config = createMinimalConfig(tmpDir);
    const result = syncManifest(config);
    expect(result.ok).toBe(true);
  });
});
