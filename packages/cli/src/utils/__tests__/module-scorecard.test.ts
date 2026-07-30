import path from 'node:path';

let mockFsInstance: Record<string, jest.Mock | (() => void)> = {};

jest.mock('../../io', () => ({
  getIO: jest.fn(() => mockFsInstance),
}));

import { getIO } from '../../io';
import {
  discoverModules,
  calculateDepthScore,
  calculateCoverageScore,
  assessRisk,
  estimateComplexity,
  estimateBusinessValue,
  calculateTestability,
  assessMaturity,
  generateRecommendations,
  generateGranularScorecard,
  ModuleScore,
} from '../module-scorecard';

beforeEach(() => {
  const fs = createMockFs();
  mockFsInstance = { fs } as any;
  (getIO as jest.Mock).mockReturnValue(mockFsInstance);
});

afterEach(() => {
  jest.restoreAllMocks();
  mockFsInstance = {};
});

function createMockFs() {
  const dirs = new Set<string>();
  const files = new Map<string, string>();
  const sstats = new Map<string, { mtimeMs: number; size: number }>();

  return {
    cwd: jest.fn(() => process.cwd()),
    exists: jest.fn((p: string) => dirs.has(p) || files.has(p)),
    read: jest.fn((p: string) => files.get(p) ?? ''),
    readDir: jest.fn((p: string) => {
      const items = new Set<string>();
      const prefix = p + path.sep;
      for (const d of dirs) {
        if (d.startsWith(prefix)) {
          const rel = d.slice(prefix.length);
          const first = rel.split(path.sep)[0];
          if (first) items.add(first);
        }
      }
      for (const f of files.keys()) {
        if (f.startsWith(prefix)) {
          const rel = f.slice(prefix.length);
          const first = rel.split(path.sep)[0];
          if (first) items.add(first);
        }
      }
      return Array.from(items);
    }),
    readDirEntries: jest.fn((p: string) => {
      const items = new Set<string>();
      const prefix = p + path.sep;
      for (const d of dirs) {
        if (d.startsWith(prefix)) {
          const rel = d.slice(prefix.length);
          const first = rel.split(path.sep)[0];
          if (first && !rel.includes(path.sep)) items.add(first);
        }
      }
      for (const f of files.keys()) {
        if (f.startsWith(prefix)) {
          const rel = f.slice(prefix.length);
          const first = rel.split(path.sep)[0];
          if (first && !rel.includes(path.sep)) items.add(first);
        }
      }
      return Array.from(items).map((name) => ({
        name,
        isDirectory: () => dirs.has(path.join(p, name)),
        isFile: () => files.has(path.join(p, name)),
      }));
    }),
    stat: jest.fn((p: string) => {
      const s = sstats.get(p);
      return s ?? { mtimeMs: Date.now(), size: 100, isDirectory: () => dirs.has(p) };
    }),
    write: jest.fn(),
    mkdir: jest.fn(),
    remove: jest.fn(),
    _addDir: (p: string) => {
      dirs.add(p);
    },
    _addFile: (p: string, content = '') => {
      files.set(p, content);
      sstats.set(p, { mtimeMs: Date.now(), size: content.length || 100 });
    },
    _addFiles: (rec: Record<string, string>) => {
      for (const [k, v] of Object.entries(rec)) {
        files.set(k, v);
        sstats.set(k, { mtimeMs: Date.now(), size: v.length || 100 });
      }
    },
    _clear: () => {
      dirs.clear();
      files.clear();
      sstats.clear();
    },
  };
}

describe('module-scorecard', () => {
  describe('estimateBusinessValue', () => {
    it('should return 90 for core/domain/contract/adapter modules', () => {
      expect(estimateBusinessValue('/p/core')).toBe(90);
      expect(estimateBusinessValue('/p/domain')).toBe(90);
      expect(estimateBusinessValue('/p/contract')).toBe(90);
      expect(estimateBusinessValue('/p/adapter')).toBe(90);
    });

    it('should return 80 for command/service/module', () => {
      expect(estimateBusinessValue('/p/command')).toBe(80);
      expect(estimateBusinessValue('/p/service')).toBe(80);
      expect(estimateBusinessValue('/p/module')).toBe(80);
    });

    it('should return 50 for utils/helper/common/shared', () => {
      expect(estimateBusinessValue('/p/utils')).toBe(50);
      expect(estimateBusinessValue('/p/helper')).toBe(50);
      expect(estimateBusinessValue('/p/common')).toBe(50);
      expect(estimateBusinessValue('/p/shared')).toBe(50);
    });

    it('should return 30 for test/mock/fixture/spec', () => {
      expect(estimateBusinessValue('/p/test')).toBe(30);
      expect(estimateBusinessValue('/p/mock')).toBe(30);
      expect(estimateBusinessValue('/p/fixture')).toBe(30);
    });

    it('should return 65 for unknown module names', () => {
      expect(estimateBusinessValue('/p/random')).toBe(65);
    });
  });

  describe('generateRecommendations', () => {
    it('should return empty recommendations when all modules are good', () => {
      const modules: ModuleScore[] = [
        {
          name: 'good',
          path: '/p/good',
          dimensions: {
            profundidade: 80,
            cobertura: 80,
            risco: 20,
            complexidade: 20,
            valor_de_negocio: 80,
            maturidade: 80,
            testabilidade: 80,
          },
          overall: 80,
          status: 'good',
        },
      ];
      const recs = generateRecommendations(modules);
      expect(recs[0]).toContain('todos os m');
    });

    it('should recommend improvements for low-scoring modules', () => {
      const modules: ModuleScore[] = [
        {
          name: 'bad',
          path: '/p/bad',
          dimensions: {
            profundidade: 20,
            cobertura: 20,
            risco: 80,
            complexidade: 80,
            valor_de_negocio: 20,
            maturidade: 20,
            testabilidade: 20,
          },
          overall: 30,
          status: 'critical',
        },
      ];
      const recs = generateRecommendations(modules);
      expect(recs.length).toBeGreaterThanOrEqual(5);
      expect(recs.some((r) => r.includes('baixa profundidade'))).toBe(true);
      expect(recs.some((r) => r.includes('cobertura baixa'))).toBe(true);
      expect(recs.some((r) => r.includes('risco elevado'))).toBe(true);
      expect(recs.some((r) => r.includes('complexidade alta'))).toBe(true);
      expect(recs.some((r) => r.includes('valor'))).toBe(true);
    });
  });

  describe('discoverModules', () => {
    it('should discover modules from src dir', () => {
      const baseDir = path.join('', 'test', 'project');
      const srcDir = path.join(baseDir, 'src');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(srcDir);
      mockFs._addDir(path.join(srcDir, 'moduleA'));
      mockFs._addDir(path.join(srcDir, 'moduleB'));

      const modules = discoverModules(baseDir);
      expect(modules).toHaveLength(2);
      expect(modules[0].name).toBe('moduleA');
      expect(modules[1].name).toBe('moduleB');
    });

    it('should skip node_modules, dist, __tests__, legacy', () => {
      const baseDir = path.join('', 'test', 'project');
      const srcDir = path.join(baseDir, 'src');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(srcDir);
      mockFs._addDir(path.join(srcDir, 'good'));
      mockFs._addDir(path.join(srcDir, 'node_modules'));
      mockFs._addDir(path.join(srcDir, 'dist'));
      mockFs._addDir(path.join(srcDir, '__tests__'));
      mockFs._addDir(path.join(srcDir, 'legacy'));

      const modules = discoverModules(baseDir);
      expect(modules).toHaveLength(1);
      expect(modules[0].name).toBe('good');
    });

    it('should return empty array when src does not exist', () => {
      const modules = discoverModules(path.join('', 'nonexistent'));
      expect(modules).toEqual([]);
    });
  });

  describe('calculateDepthScore', () => {
    it('should return 0 for non-existent path', () => {
      const score = calculateDepthScore('/nonexistent', '/base');
      expect(score).toBe(0);
    });
  });

  describe('assessRisk', () => {
    it('should return score 50 on error', () => {
      const mockFs = (getIO() as any).fs;
      mockFs._addDir('/p/module');
      mockFs._addFile('/p/module/main.ts', 'const x = 1;');
      jest.spyOn(mockFs, 'readDirEntries').mockImplementation(() => {
        return [
          {
            name: 'main.ts',
            isDirectory: () => {
              throw new Error('fail');
            },
            isFile: () => true,
          },
        ] as any;
      });
      const result = assessRisk('/p/module');
      expect(result.score).toBe(50);
      expect(result.factors).toContain('erro ao analisar risco');
    });

    it('should detect any usages and TODOs', () => {
      const modPath = path.join('', 'test', 'module');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(modPath);
      mockFs._addFiles({
        [path.join(modPath, 'main.ts')]: 'const x: any = 1; // TODO fix this',
        [path.join(modPath, 'util.ts')]: 'function foo(y: any): void {}',
      });

      const result = assessRisk(modPath);
      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.length).toBeGreaterThan(0);
    });
  });

  describe('estimateComplexity', () => {
    it('should return 0 for non-existent path', () => {
      expect(estimateComplexity('/nonexistent')).toBe(0);
    });

    it('should return 0 for empty module', () => {
      const modPath = path.join('', 'test', 'empty');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(modPath);
      expect(estimateComplexity(modPath)).toBe(0);
    });

    it('should return positive score for module with files', () => {
      const modPath = path.join('', 'test', 'mod');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(modPath);
      mockFs._addFile(path.join(modPath, 'main.ts'), 'const x = 1;');
      mockFs._addFile(path.join(modPath, 'util.ts'), 'const y = 2;');

      const result = estimateComplexity(modPath);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateTestability', () => {
    it('should return 0 for non-existent path', () => {
      expect(calculateTestability('/nonexistent')).toBe(0);
    });

    it('should return ratio of test files to source files', () => {
      const modPath = path.join('', 'test', 'mod');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(modPath);
      mockFs._addFile(path.join(modPath, 'main.ts'));
      mockFs._addFile(path.join(modPath, 'main.test.ts'));

      const result = calculateTestability(modPath);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('assessMaturity', () => {
    it('should return 0 for non-existent path', () => {
      expect(assessMaturity('/nonexistent')).toBe(0);
    });

    it('should add points for README, changelog, .ai dir, tests, lint config', () => {
      const baseDir = path.join('', 'test', 'project');
      const modPath = path.join(baseDir, 'mymod');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(modPath);
      mockFs._addDir(path.join(baseDir, '.ai'));
      mockFs._addFile(path.join(modPath, 'README.md'), '# MyMod');
      mockFs._addFile(path.join(baseDir, 'CHANGELOG.md'), '# Changelog');
      mockFs._addFile(path.join(modPath, 'tsconfig.json'), '{}');
      mockFs._addFile(path.join(modPath, 'main.test.ts'), 'test');

      const result = assessMaturity(modPath);
      expect(result).toBeGreaterThanOrEqual(80);
    });
  });

  describe('calculateCoverageScore', () => {
    it('should return 30 for module with no coverage data and no types', () => {
      const modPath = path.join('', 'test', 'mod');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(modPath);
      mockFs._addFile(path.join(modPath, 'main.ts'), 'const x = 1;');
      const result = calculateCoverageScore(modPath);
      expect(result).toBe(30);
    });

    it('should return 50 for module with typed source', () => {
      const modPath = path.join('', 'test', 'mod');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(modPath);
      mockFs._addFile(path.join(modPath, 'main.ts'), 'export interface Foo {}');
      const result = calculateCoverageScore(modPath);
      expect(result).toBe(50);
    });
  });

  describe('generateGranularScorecard', () => {
    it('should generate a valid scorecard', () => {
      const baseDir = path.join('', 'test', 'project');
      const srcDir = path.join(baseDir, 'src');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(srcDir);
      mockFs._addDir(path.join(srcDir, 'core'));
      mockFs._addFile(path.join(srcDir, 'core', 'index.ts'), 'export const x = 1;');

      const sc = generateGranularScorecard(baseDir);
      expect(sc.modules).toHaveLength(1);
      expect(sc.overall).toBeGreaterThan(0);
      expect(sc.averages).toBeDefined();
      expect(sc.modules[0].name).toBe('core');
      expect(sc.modules[0].status).toBeDefined();
    });

    it('should filter with includePatterns', () => {
      const baseDir = path.join('', 'test', 'project');
      const srcDir = path.join(baseDir, 'src');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(srcDir);
      mockFs._addDir(path.join(srcDir, 'core'));
      mockFs._addDir(path.join(srcDir, 'utils'));
      mockFs._addFile(path.join(srcDir, 'core', 'index.ts'), '');
      mockFs._addFile(path.join(srcDir, 'utils', 'index.ts'), '');

      const sc = generateGranularScorecard(baseDir, { includePatterns: ['core'] });
      expect(sc.modules).toHaveLength(1);
      expect(sc.modules[0].name).toBe('core');
    });

    it('should filter with excludePatterns', () => {
      const baseDir = path.join('', 'test', 'project');
      const srcDir = path.join(baseDir, 'src');
      const mockFs = (getIO() as any).fs;
      mockFs._addDir(srcDir);
      mockFs._addDir(path.join(srcDir, 'core'));
      mockFs._addDir(path.join(srcDir, 'utils'));
      mockFs._addFile(path.join(srcDir, 'core', 'index.ts'), '');
      mockFs._addFile(path.join(srcDir, 'utils', 'index.ts'), '');

      const sc = generateGranularScorecard(baseDir, { excludePatterns: ['core'] });
      expect(sc.modules).toHaveLength(1);
      expect(sc.modules[0].name).toBe('utils');
    });
  });
});
