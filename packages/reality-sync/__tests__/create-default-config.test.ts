import { describe, it, expect, jest } from '@jest/globals';
import { createDefaultConfig } from '../src/index';
import * as path from 'node:path';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('createDefaultConfig', () => {
  it('returns config with all required fields', () => {
    const root = '/test/workspace';
    const config = createDefaultConfig(root);

    expect(config.workspaceRoot).toBe(root);
    expect(config.docsDir).toBe(path.join(root, 'docs'));
    expect(config.packagesDir).toBe(path.join(root, 'packages'));
    expect(config.manifestPath).toContain('REALITY-MANIFEST.md');
    expect(config.gapsPath).toContain('GAPS-PRODUCAO-IDE.md');
    expect(config.registryPath).toContain('document-registry.md');
  });

  it('includes watch paths for docs, packages and governance', () => {
    const config = createDefaultConfig('/test');
    expect(config.watchPaths.length).toBe(3);
    expect(config.watchPaths.some(p => p.includes('packages'))).toBe(true);
    expect(config.watchPaths.some(p => p.includes('docs'))).toBe(true);
  });

  it('includes ignore patterns for common dirs', () => {
    const config = createDefaultConfig('/test');
    expect(config.ignorePatterns).toContain('node_modules');
    expect(config.ignorePatterns).toContain('dist');
    expect(config.ignorePatterns).toContain('.git');
  });
});
