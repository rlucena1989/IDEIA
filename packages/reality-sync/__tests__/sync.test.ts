import { createDefaultConfig } from '../src/index';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('reality-sync', () => {
  let tmpDir: string;
  let origCwd: string;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    tmpDir = path.join(os.tmpdir(), `reality-sync-test-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    origCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
  it('createDefaultConfig returns config with workspace root', () => {
    const config = createDefaultConfig('/test/root');
    expect(config.workspaceRoot).toBe('/test/root');
    expect(config.docsDir).toBe(path.join('/test/root', 'docs'));
    expect(config.packagesDir).toBe(path.join('/test/root', 'packages'));
    expect(config.ignorePatterns).toContain('node_modules');
  });

  it('createDefaultConfig has all required paths', () => {
    const config = createDefaultConfig('/test');
    expect(config.manifestPath).toContain('REALITY-MANIFEST.md');
    expect(config.gapsPath).toContain('GAPS-PRODUCAO-IDE.md');
    expect(config.registryPath).toContain('document-registry.md');
    expect(config.watchPaths.length).toBeGreaterThan(0);
  });
});
