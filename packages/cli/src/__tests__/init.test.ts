import { validateFlavor, shouldCopyFile, autoDetectFlavor, scaffoldFromTemplate, findProjectTemplateDir } from '../commands/init';
import type { InitDeps } from '../commands/init';

function makeDeps(overrides: Partial<InitDeps> = {}): InitDeps {
  return {
    existsSync: () => true,
    statSync: () => ({ isDirectory: () => true }),
    mkdirSync: () => {},
    readdirSync: () => [],
    readFileSync: () => '',
    readFileBuffer: () => Buffer.from(''),
    writeFileSync: () => {},
    pathResolve: (...s: string[]) => s.join('/'),
    pathJoin: (...s: string[]) => s.join('/'),
    pathBasename: (p: string) => p.split('/').pop() || p,
    pathDirname: (p: string) => p.split('/').slice(0, -1).join('/'),
    pathRelative: () => '',
    cwd: '/test',
    __dirname: '/test/cli/src/commands',
    log: () => {},
    error: () => {},
    detectStack: () => ({ languages: [], frameworks: [] }),
    ...overrides,
  };
}

describe('validateFlavor', () => {
  it('accepts valid flavors', () => {
    expect(() => validateFlavor('nestjs')).not.toThrow();
    expect(() => validateFlavor('express')).not.toThrow();
    expect(() => validateFlavor('fastapi')).not.toThrow();
  });

  it('throws for invalid flavors', () => {
    expect(() => validateFlavor('invalid')).toThrow('Invalid flavor');
  });
});

describe('shouldCopyFile', () => {
  it('returns true for all files in full mode', () => {
    expect(shouldCopyFile('any/file.ts', 'full')).toBe(true);
  });

  it('filters by include in minimal mode', () => {
    expect(shouldCopyFile('laws.yaml', 'minimal')).toBe(true);
    expect(shouldCopyFile('generators/index.ts', 'minimal')).toBe(false);
  });

  it('excludes directories in standard mode', () => {
    expect(shouldCopyFile('generators/code.ts', 'standard')).toBe(false);
    expect(shouldCopyFile('context/ai-handoff.md', 'standard')).toBe(true);
  });
});

describe('autoDetectFlavor', () => {
  it('returns nestjs as default', () => {
    expect(autoDetectFlavor('/test', makeDeps())).toBe('nestjs');
  });

  it('detects express', () => {
    const deps = makeDeps({
      detectStack: () => ({ languages: ['javascript'], frameworks: ['express'] }),
    });
    expect(autoDetectFlavor('/test', deps)).toBe('express');
  });
});

describe('scaffoldFromTemplate', () => {
  it('copies files in safe mode with flat template', () => {
    const deps = makeDeps({
      statSync: () => ({ isDirectory: () => false }),
      readFileSync: () => 'content',
      existsSync: (p: string) => p.startsWith('/src'),
    });
    const result = scaffoldFromTemplate('/src/file.ts', '/dest/file.ts', 'myapp', 'safe', deps);
    expect(result.copied.length).toBe(1);
  });

  it('replaces placeholder in package.json', () => {
    const deps = makeDeps({
      statSync: () => ({ isDirectory: () => false }),
      readFileSync: () => '{"name": "placeholder"}',
      existsSync: (p: string) => p.startsWith('/src'),
    });
    const result = scaffoldFromTemplate('/src/package.json', '/dest/package.json', 'myapp', 'safe', deps);
    expect(result.copied.length).toBe(1);
  });

  it('collects errors', () => {
    const deps = makeDeps({
      statSync: () => ({ isDirectory: () => false }),
      readFileSync: () => { throw new Error('read error'); },
    });
    const result = scaffoldFromTemplate('/src/file.ts', '/dest/file.ts', 'myapp', 'safe', deps);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('findProjectTemplateDir', () => {
  it('finds template directory', () => {
    const deps = makeDeps({
      existsSync: () => true,
    });
    expect(() => findProjectTemplateDir('nestjs', deps)).not.toThrow();
  });

  it('throws when template not found', () => {
    const deps = makeDeps({
      existsSync: () => false,
    });
    expect(() => findProjectTemplateDir('missing', deps)).toThrow('not found');
  });
});
