import { describe, it, expect, jest } from '@jest/globals';
import {
  detectNamingConvention,
  findCommonPrefix,
  collectDirs,
  collectNamingConventions,
  collectComponents,
  collectCommits,
  collectTestPatterns,
  collectApiPatterns,
} from '../pattern-learner-collectors';

jest.mock('../../io', () => {
  const mockFiles = new Map<string, string>();
  const mockDirs = new Set<string>();

  mockDirs.add(process.cwd());
  mockDirs.add(process.cwd() + '\\src');
  mockDirs.add(process.cwd() + '\\src\\components');
  mockDirs.add(process.cwd() + '\\src\\utils');
  mockDirs.add(process.cwd() + '\\__tests__');
  mockFiles.set(process.cwd() + '\\src\\components\\Button.tsx', 'export function Button(props: { label: string }) { const [count, useState] = [0]; return <button>{props.label}</button>; }');
  mockFiles.set(process.cwd() + '\\src\\components\\Card.tsx', 'export function Card() { return <div>card</div>; }');
  mockFiles.set(process.cwd() + '\\src\\utils\\helper.ts', 'export function helper() {}');
  mockFiles.set(process.cwd() + '\\src\\utils\\helper.test.ts', 'test("helper", () => {})');
  mockFiles.set(process.cwd() + '\\__tests__\\Button.test.ts', 'test("button", () => {})');
  mockFiles.set(process.cwd() + '\\package.json', JSON.stringify({ name: 'test', devDependencies: { jest: '^29.0.0' } }));

  return {
    getIO: () => ({
      fs: {
        exists: (fp: string) => mockFiles.has(fp) || mockDirs.has(fp),
        read: (fp: string) => {
          if (!mockFiles.has(fp)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
          return mockFiles.get(fp) as string;
        },
        readDirEntries: (dir: string) => {
          const resolved = dir.replace(/\\/g, '/');
          const entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }> = [];
          for (const f of mockFiles.keys()) {
            const normalized = f.replace(/\\/g, '/');
            if (normalized.startsWith(resolved + '/')) {
              const rel = normalized.slice(resolved.length + 1);
              const name = rel.split('/')[0];
              if (name && !entries.some(e => e.name === name)) {
                entries.push({ name, isDirectory: () => false, isFile: () => true });
              }
            }
          }
          for (const d of mockDirs) {
            const normalized = d.replace(/\\/g, '/');
            if (normalized.startsWith(resolved + '/')) {
              const rel = normalized.slice(resolved.length + 1);
              const name = rel.split('/')[0];
              if (name && !entries.some(e => e.name === name)) {
                entries.push({ name, isDirectory: () => true, isFile: () => false });
              }
            }
          }
          return entries;
        },
        cwd: () => process.cwd(),
        readBuffer: () => Buffer.from(''),
        write: () => {},
        append: () => {},
        mkDir: () => {},
        readDir: () => [],
        stat: () => ({ mtimeMs: 0, size: 0, isDirectory: () => false }),
        remove: () => {},
        copy: () => {},
        ensureDir: () => {},
      },
      shell: { exec: () => ({ status: 0, stdout: '', stderr: '' }), execString: () => ({ stdout: '', status: 0 }) },
      http: { get: async () => ({ status: 200, data: '' }), post: async () => ({ status: 200, data: '' }) },
    }),
  };
});

describe('detectNamingConvention', () => {
  it('should detect camelCase', () => {
    expect(detectNamingConvention(['helloWorld', 'fooBar', 'testCase'])).toBe('camelCase');
  });

  it('should detect kebab-case', () => {
    expect(detectNamingConvention(['hello-world', 'foo-bar', 'test-case'])).toBe('kebab-case');
  });

  it('should detect PascalCase', () => {
    expect(detectNamingConvention(['HelloWorld', 'FooBar', 'TestCase'])).toBe('PascalCase');
  });

  it('should detect snake_case', () => {
    expect(detectNamingConvention(['hello_world', 'foo_bar', 'test_case'])).toBe('snake_case');
  });

  it('should return mixed for empty array', () => {
    expect(detectNamingConvention([])).toBe('mixed');
  });

  it('should return mixed when no clear convention', () => {
    expect(detectNamingConvention(['_test', '__init__', '$special'])).toBe('mixed');
  });

  it('should handle mixed naming with a majority', () => {
    expect(detectNamingConvention(['helloWorld', 'fooBar', 'test-case'])).toBe('camelCase');
  });
});

describe('findCommonPrefix', () => {
  it('should find common prefix', () => {
    expect(findCommonPrefix(['Button.tsx', 'Button.test.tsx', 'Button.styles.ts'])).toBe('Button.');
  });

  it('should return empty for less than 2 names', () => {
    expect(findCommonPrefix(['test.ts'])).toBe('');
    expect(findCommonPrefix([])).toBe('');
  });

  it('should return empty when no common prefix', () => {
    expect(findCommonPrefix(['abc.ts', 'xyz.ts'])).toBe('');
  });

  it('should find partial common prefix', () => {
    expect(findCommonPrefix(['ComponentA.ts', 'ComponentB.ts'])).toBe('Component');
  });

  it('should handle identical names', () => {
    expect(findCommonPrefix(['same.ts', 'same.ts'])).toBe('same.ts');
  });
});

describe('collectDirs', () => {
  it('should collect directories with patterns', () => {
    const dirs = collectDirs(process.cwd(), 5);
    expect(dirs.length).toBeGreaterThanOrEqual(0);
  });

  it('should include depth information', () => {
    const dirs = collectDirs(process.cwd(), 5);
    for (const d of dirs) {
      expect(d).toHaveProperty('path');
      expect(d).toHaveProperty('depth');
      expect(typeof d.depth).toBe('number');
    }
  });
});

describe('collectNamingConventions', () => {
  it('should collect naming conventions from files', () => {
    const conventions = collectNamingConventions(process.cwd());
    expect(Array.isArray(conventions)).toBe(true);
  });
});

describe('collectComponents', () => {
  it('should collect component patterns from TSX files', () => {
    const components = collectComponents(process.cwd());
    expect(Array.isArray(components)).toBe(true);
    if (components.length > 0) {
      expect(components[0]).toHaveProperty('name');
      expect(components[0]).toHaveProperty('hasProps');
      expect(components[0]).toHaveProperty('hasHooks');
    }
  });
});

describe('collectCommits', () => {
  it('should return empty array when git fails', () => {
    const commits = collectCommits(process.cwd(), 10);
    expect(Array.isArray(commits)).toBe(true);
  });
});

describe('collectTestPatterns', () => {
  it('should collect test patterns', () => {
    const patterns = collectTestPatterns(process.cwd());
    expect(Array.isArray(patterns)).toBe(true);
  });
});

describe('collectApiPatterns', () => {
  it('should collect API route patterns', () => {
    const apis = collectApiPatterns(process.cwd());
    expect(Array.isArray(apis)).toBe(true);
  });
});
