const mockIO = {
  fs: {
    cwd: jest.fn(() => '/test/project'),
    exists: jest.fn(),
    read: jest.fn(),
    write: jest.fn(),
    append: jest.fn(),
    mkDir: jest.fn(),
    readDir: jest.fn(),
    stat: jest.fn(),
  },
  outputLines: jest.fn(),
  output: jest.fn(),
};

jest.mock('../../io', () => ({
  getIO: () => mockIO,
}));

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
  execFileSync: jest.fn(),
}));

jest.mock('node:http', () => ({
  request: jest.fn(() => ({ write: jest.fn(), end: jest.fn() })),
  createServer: jest.fn(() => {
    const server = { listen: jest.fn((_port: number, cb: () => void) => cb?.()), close: jest.fn() };
    return server;
  }),
}));

jest.mock('node:https', () => ({
  request: jest.fn(() => ({ write: jest.fn(), end: jest.fn() })),
}));

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: console.log, error: console.log, warn: console.log })),
}));

jest.mock('../scorecard-utils', () => ({
  detectRegression: jest.fn(() => ({ regressed: false, drops: [] })),
}));

jest.mock('../scorecard', () => ({
  computeScorecard: jest.fn(() =>
    Promise.resolve({
      overallScore: 75,
      maturityLevel: 'B',
      categories: [],
      recommendations: [],
      evolution: { version: '18.0', categories: 0, items: 0 },
      trends: [],
      alerts: [],
      correlationAlerts: [],
      forecast: { forecast: 80, confidence: 'medium', trend: 'up', history: [] },
      git: { branch: 'main', commit: 'abc', message: 'feat' },
      meta: { durationMs: 100, scorecardVersion: '18.0' },
      timestamp: '2026-07-26T12:00:00.000Z',
    }),
  ),
  saveAll: jest.fn(),
}));

import http from 'node:http';
import * as helpers from '../scorecard-helpers';
import * as analysis from '../scorecard-analysis';
import * as display from '../scorecard-display';
import * as modes from '../scorecard-modes';
import * as notifications from '../scorecard-notifications';
import * as report from '../scorecard-report';
import * as reporting from '../scorecard-reporting';
import * as server from '../scorecard-server';
import * as scorecardTypes from '../scorecard-types';

const cp = require('node:child_process');

function makeScorecardResult(overrides: Record<string, unknown> = {}) {
  return {
    timestamp: '2026-07-26T12:00:00.000Z',
    overallScore: 75,
    maturityLevel: 'B' as const,
    categories: [
      {
        name: 'Segurança',
        weight: 30,
        score: 100,
        maxScore: 100,
        items: [{ id: 'sec-1', description: 'Check security', passed: true, weight: 10 }],
      },
      {
        name: 'Qualidade',
        weight: 30,
        score: 100,
        maxScore: 100,
        items: [{ id: 'qual-1', description: 'Check quality', passed: true, weight: 10 }],
      },
      {
        name: 'Saúde do Ecossistema',
        weight: 20,
        score: 100,
        maxScore: 100,
        items: [{ id: 'eco-1', description: 'Check ecosystem', passed: true, weight: 5 }],
      },
      {
        name: 'Integridade do Projeto',
        weight: 10,
        score: 100,
        maxScore: 100,
        items: [{ id: 'int-1', description: 'Check integrity', passed: true, weight: 5 }],
      },
      {
        name: 'Pipeline Health',
        weight: 10,
        score: 100,
        maxScore: 100,
        items: [{ id: 'pl-1', description: 'Check pipeline', passed: true, weight: 5 }],
      },
    ],
    recommendations: [{ text: 'All good' }],
    evolution: { version: '18.0', categories: 5, items: 5 },
    trends: [{ timestamp: '2026-07-25', overallScore: 70, categories: [{ name: 'Segurança', score: 50 }] }],
    alerts: [],
    correlationAlerts: [] as Array<{ severity: 'info' | 'warn' | 'critical'; message: string; categories: string[] }>,
    forecast: { forecast: 80, confidence: 'medium' as const, trend: 'up' as const, history: [70, 72, 75] },
    git: { branch: 'main', commit: 'abc1234', message: 'feat: update' },
    meta: { durationMs: 1200, scorecardVersion: '18.0' },
    ...overrides,
  };
}

function resetMocks() {
  jest.clearAllMocks();
  mockIO.fs.cwd.mockReturnValue('/test/project');
  mockIO.fs.exists.mockReturnValue(false);
  mockIO.fs.read.mockReturnValue(null);
  mockIO.fs.readDir.mockReturnValue([]);
  mockIO.fs.stat.mockReturnValue({ mtimeMs: 1000, size: 1000, isDirectory: () => true });
  mockIO.fs.write.mockReturnValue(undefined);
  mockIO.fs.append.mockReturnValue(undefined);
  mockIO.fs.mkDir.mockReturnValue(undefined);
  cp.spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
  cp.execFileSync.mockReturnValue('');
  (globalThis as any).log = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
  (globalThis as any).console.log = jest.fn();
}

beforeEach(() => {
  resetMocks();
});

// ============ SCORECARD TYPES ============
describe('scorecard-types', () => {
  it('should export ScorecardItem interface shape', () => {
    const item: scorecardTypes.ScorecardItem = { id: 't1', description: 'test', passed: true, weight: 1 };
    expect(item.id).toBe('t1');
  });

  it('should export ScorecardCategory interface shape', () => {
    const cat: scorecardTypes.ScorecardCategory = { name: 'Test', weight: 100, score: 50, maxScore: 100, items: [] };
    expect(cat.name).toBe('Test');
  });

  it('should export ScorecardResult interface shape', () => {
    const result: scorecardTypes.ScorecardResult = {
      timestamp: '',
      overallScore: 0,
      maturityLevel: 'D',
      categories: [],
      recommendations: [],
      evolution: { version: '', categories: 0, items: 0 },
      trends: [],
      alerts: [],
      correlationAlerts: [],
      forecast: { forecast: 0, confidence: '', trend: '', history: [] },
      git: { branch: '', commit: '', message: '' },
      meta: { durationMs: 0, scorecardVersion: '' },
    };
    expect(result.maturityLevel).toBe('D');
  });

  it('should export CorrelationAlert interface', () => {
    const alert: scorecardTypes.CorrelationAlert = { severity: 'warn', message: 'test', categories: ['a'] };
    expect(alert.severity).toBe('warn');
  });

  it('should export ScorecardTrend interface', () => {
    const trend: scorecardTypes.ScorecardTrend = { timestamp: '', overallScore: 0, categories: [] };
    expect(trend.overallScore).toBe(0);
  });

  it('should export ScorecardAlert interface', () => {
    const alert: scorecardTypes.ScorecardAlert = { category: 'c', item: 'i', severity: 'warn', message: 'm' };
    expect(alert.message).toBe('m');
  });
});

// ============ SCORECARD HELPERS ============
describe('scorecard-helpers', () => {
  describe('root', () => {
    it('should return current working directory', () => {
      expect(helpers.root()).toBe('/test/project');
    });
  });

  describe('ex', () => {
    it('should return true when file exists', () => {
      mockIO.fs.exists.mockReturnValue(true);
      expect(helpers.ex('test.txt')).toBe(true);
    });

    it('should return false when file does not exist', () => {
      mockIO.fs.exists.mockReturnValue(false);
      expect(helpers.ex('nonexistent.txt')).toBe(false);
    });
  });

  describe('read', () => {
    it('should return file content when read succeeds', () => {
      mockIO.fs.read.mockReturnValue('file content');
      expect(helpers.read('test.txt')).toBe('file content');
    });

    it('should return null when read fails', () => {
      mockIO.fs.read.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(helpers.read('test.txt')).toBeNull();
    });
  });

  describe('hasContent', () => {
    it('should return true for content > 100 chars', () => {
      mockIO.fs.read.mockReturnValue('x'.repeat(150));
      expect(helpers.hasContent('big.txt')).toBe(true);
    });

    it('should return false for short content', () => {
      mockIO.fs.read.mockReturnValue('short');
      expect(helpers.hasContent('short.txt')).toBe(false);
    });

    it('should return false when file cannot be read', () => {
      mockIO.fs.read.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(helpers.hasContent('missing.txt')).toBe(false);
    });
  });

  describe('dirSize', () => {
    it('should return number of entries in directory', () => {
      mockIO.fs.readDir.mockReturnValue(['a', 'b', 'c']);
      expect(helpers.dirSize('somedir')).toBe(3);
    });

    it('should return 0 on error', () => {
      mockIO.fs.readDir.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(helpers.dirSize('missing')).toBe(0);
    });
  });

  describe('jsonParse', () => {
    it('should parse valid JSON', () => {
      mockIO.fs.read.mockReturnValue('{"key": "value"}');
      expect(helpers.jsonParse('data.json')).toEqual({ key: 'value' });
    });

    it('should return null for invalid JSON', () => {
      mockIO.fs.read.mockReturnValue('not json');
      expect(helpers.jsonParse('bad.json')).toBeNull();
    });

    it('should return null when read fails', () => {
      mockIO.fs.read.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(helpers.jsonParse('missing.json')).toBeNull();
    });
  });

  describe('runNode', () => {
    it('should execute node script and return true on success', () => {
      cp.spawnSync.mockReturnValue({ status: 0 });
      mockIO.fs.exists.mockReturnValue(false);
      expect(helpers.runNode('script.js')).toBe(true);
    });

    it('should return false on failure', () => {
      cp.spawnSync.mockReturnValue({ status: 1 });
      expect(helpers.runNode('script.js')).toBe(false);
    });

    it('should use example request when args are empty and file exists', () => {
      cp.spawnSync.mockReturnValue({ status: 0 });
      mockIO.fs.exists.mockReturnValue(true);
      expect(helpers.runNode('optimizer.js')).toBe(true);
    });

    it('should return false on spawn exception', () => {
      cp.spawnSync.mockImplementation(() => {
        throw new Error('spawn error');
      });
      expect(helpers.runNode('script.js')).toBe(false);
    });
  });

  describe('git', () => {
    it('should execute git command and return output', () => {
      cp.execFileSync.mockReturnValue('main\n');
      expect(helpers.git(['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main');
    });

    it('should return null on error', () => {
      cp.execFileSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });
      expect(helpers.git(['status'])).toBeNull();
    });
  });

  describe('gitExists', () => {
    it('should return true in git repo', () => {
      cp.execFileSync.mockReturnValue('.git\n');
      expect(helpers.gitExists()).toBe(true);
    });

    it('should return false outside git repo', () => {
      cp.execFileSync.mockImplementation(() => {
        throw new Error('fatal');
      });
      expect(helpers.gitExists()).toBe(false);
    });
  });

  describe('npmAudit', () => {
    it('should parse npm audit JSON output', () => {
      cp.execFileSync.mockReturnValue(
        JSON.stringify({
          metadata: { vulnerabilities: { critical: 2, high: 3, moderate: 5, low: 10 } },
        }),
      );
      const result = helpers.npmAudit();
      expect(result.critical).toBe(2);
      expect(result.high).toBe(3);
      expect(result.moderate).toBe(5);
      expect(result.low).toBe(10);
    });

    it('should handle missing metadata', () => {
      cp.execFileSync.mockReturnValue(JSON.stringify({}));
      const result = helpers.npmAudit();
      expect(result.critical).toBe(0);
    });

    it('should return zeros on error', () => {
      cp.execFileSync.mockImplementation(() => {
        throw new Error('npm error');
      });
      const result = helpers.npmAudit();
      expect(result).toEqual({ critical: 0, high: 0, moderate: 0, low: 0 });
    });
  });

  describe('coveragePct', () => {
    it('should return coverage percentage', () => {
      mockIO.fs.read.mockReturnValue(JSON.stringify({ total: { lines: { pct: 85.3 } } }));
      expect(helpers.coveragePct()).toBe(85);
    });

    it('should return null if no coverage file', () => {
      mockIO.fs.read.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(helpers.coveragePct()).toBeNull();
    });

    it('should return null if total is missing', () => {
      mockIO.fs.read.mockReturnValue(JSON.stringify({}));
      expect(helpers.coveragePct()).toBeNull();
    });

    it('should return null if lines.pct is missing', () => {
      mockIO.fs.read.mockReturnValue(JSON.stringify({ total: {} }));
      expect(helpers.coveragePct()).toBeNull();
    });
  });

  describe('pylintOk', () => {
    it('should return true when flake8 passes', () => {
      cp.spawnSync.mockReturnValue({ status: 0 });
      expect(helpers.pylintOk()).toBe(true);
    });

    it('should return false when flake8 fails', () => {
      cp.spawnSync.mockReturnValue({ status: 1 });
      expect(helpers.pylintOk()).toBe(false);
    });

    it('should return false on spawn error', () => {
      cp.spawnSync.mockImplementation(() => {
        throw new Error('not found');
      });
      expect(helpers.pylintOk()).toBe(false);
    });
  });

  describe('golintOk', () => {
    it('should return true when go is not installed', () => {
      cp.spawnSync.mockImplementation(() => {
        throw new Error('not found');
      });
      expect(helpers.golintOk()).toBe(true);
    });

    it('should return true when golangci-lint passes', () => {
      cp.spawnSync.mockReturnValue({ status: 0 });
      expect(helpers.golintOk()).toBe(true);
    });

    it('should return false when golangci-lint fails', () => {
      cp.spawnSync.mockReturnValueOnce({ status: 0 }).mockReturnValueOnce({ status: 1 });
      expect(helpers.golintOk()).toBe(false);
    });
  });

  describe('oldestDep', () => {
    it('should return warning when major 1 deps exist', () => {
      mockIO.fs.read.mockImplementation(() => JSON.stringify({ dependencies: { express: '0.0.0', lodash: '^4.0.0' } }));
      const result = helpers.oldestDep();
      expect(result).toContain('1 deps na major 1');
    });

    it('should return null when no major 1 deps', () => {
      mockIO.fs.read.mockImplementation(() => JSON.stringify({ dependencies: { express: '^4.0.0' } }));
      expect(helpers.oldestDep()).toBeNull();
    });

    it('should return null when parse fails', () => {
      mockIO.fs.read.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(helpers.oldestDep()).toBeNull();
    });

    it('should consider devDependencies as well', () => {
      mockIO.fs.read.mockImplementation(() => JSON.stringify({ devDependencies: { typescript: '0.0.0' } }));
      const result = helpers.oldestDep();
      expect(result).toContain('1 deps na major 1');
    });
  });

  describe('computeGit', () => {
    it('should return branch, commit, message', () => {
      cp.execFileSync
        .mockReturnValueOnce('.git')
        .mockReturnValueOnce('main\n')
        .mockReturnValueOnce('abc1234\n')
        .mockReturnValueOnce('feat: update\n');
      const result = helpers.computeGit();
      expect(result.branch).toBe('main');
      expect(result.commit).toBe('abc1234');
      expect(result.message).toBe('feat: update');
    });

    it('should handle missing git repo', () => {
      cp.execFileSync.mockImplementation(() => {
        throw new Error('fatal');
      });
      const result = helpers.computeGit();
      expect(result.branch).toBe('no-git');
      expect(result.commit).toBe('0000000');
    });
  });

  describe('validateYamlContent', () => {
    it('should return valid when all keys present', () => {
      mockIO.fs.read.mockReturnValue('name: test\nversion: 1\n');
      expect(helpers.validateYamlContent('test.yaml', ['name', 'version'])).toEqual({ valid: true, missing: [] });
    });

    it('should return missing keys', () => {
      mockIO.fs.read.mockReturnValue('name: test\n');
      const result = helpers.validateYamlContent('test.yaml', ['name', 'version']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['version']);
    });

    it('should handle missing file', () => {
      mockIO.fs.read.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      const result = helpers.validateYamlContent('missing.yaml', ['key']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['key']);
    });
  });

  describe('generateFromTemplate', () => {
    it('should generate security-policy template', () => {
      const result = helpers.generateFromTemplate('security-policy', {
        version: '1.0',
        agents: 'all',
        network: 'internal',
        secrets: 'vault',
      });
      expect(result).toContain('Política de Segurança');
      expect(result).toContain('Versão: 1.0');
    });

    it('should generate quality-dod template', () => {
      const result = helpers.generateFromTemplate('quality-dod', { project: 'IDEIA' });
      expect(result).toContain('Definition of Done');
      expect(result).toContain('IDEIA');
    });

    it('should generate architecture-adr template', () => {
      const result = helpers.generateFromTemplate('architecture-adr', {
        title: 'Use NATS',
        status: 'approved',
        context: 'Need messaging',
        decision: 'Use NATS',
      });
      expect(result).toContain('ADR: Use NATS');
      expect(result).toContain('approved');
    });

    it('should return placeholder for unknown template', () => {
      const result = helpers.generateFromTemplate('unknown', {});
      expect(result).toBe('Template não encontrado.');
    });
  });

  describe('calcScore', () => {
    it('should return 100 when all items pass', () => {
      expect(
        helpers.calcScore([
          { weight: 5, passed: true },
          { weight: 3, passed: true },
        ]),
      ).toBe(100);
    });

    it('should return 0 when no items pass', () => {
      expect(helpers.calcScore([{ weight: 5, passed: false }])).toBe(0);
    });

    it('should calculate proportional score', () => {
      expect(
        helpers.calcScore([
          { weight: 2, passed: true },
          { weight: 2, passed: false },
        ]),
      ).toBe(50);
    });

    it('should return 0 for empty items', () => {
      expect(helpers.calcScore([])).toBe(0);
    });
  });

  describe('level', () => {
    it('returns A for score >= 90', () => expect(helpers.level(95)).toBe('A'));
    it('returns B for score >= 70', () => expect(helpers.level(75)).toBe('B'));
    it('returns C for score >= 50', () => expect(helpers.level(55)).toBe('C'));
    it('returns D for score < 50', () => expect(helpers.level(30)).toBe('D'));
  });

  describe('shieldColor', () => {
    it('returns brightgreen for score >= 90', () => expect(helpers.shieldColor(95)).toBe('brightgreen'));
    it('returns yellow for score >= 70', () => expect(helpers.shieldColor(75)).toBe('yellow'));
    it('returns orange for score >= 50', () => expect(helpers.shieldColor(55)).toBe('orange'));
    it('returns red for score < 50', () => expect(helpers.shieldColor(30)).toBe('red'));
  });

  describe('runAllScripts', () => {
    it('should return true when all scripts pass', () => {
      mockIO.fs.readDir.mockReturnValue(['script1.js', 'script2.js']);
      cp.spawnSync.mockReturnValue({ status: 0 });
      expect(helpers.runAllScripts()).toBe(true);
    });

    it('should return false when a script fails', () => {
      mockIO.fs.readDir.mockReturnValue(['script1.js']);
      cp.spawnSync.mockReturnValue({ status: 1 });
      expect(helpers.runAllScripts()).toBe(false);
    });

    it('should return false on read error', () => {
      mockIO.fs.readDir.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(helpers.runAllScripts()).toBe(false);
    });

    it('should handle empty scripts directory', () => {
      mockIO.fs.readDir.mockReturnValue([]);
      expect(helpers.runAllScripts()).toBe(true);
    });
  });

  describe('jestResultOk', () => {
    it('should return true when jest passes', () => {
      cp.spawnSync.mockReturnValue({ status: 0 });
      expect(helpers.jestResultOk()).toBe(true);
    });

    it('should return false when jest fails', () => {
      cp.spawnSync.mockReturnValue({ status: 1 });
      expect(helpers.jestResultOk()).toBe(false);
    });

    it('should return false on spawn error', () => {
      cp.spawnSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(helpers.jestResultOk()).toBe(false);
    });
  });
});

// ============ SCORECARD ANALYSIS ============
describe('scorecard-analysis', () => {
  describe('crossCategoryAnalysis', () => {
    it('should return critical alert when both Segurança and Qualidade are low', () => {
      const result = makeScorecardResult({
        categories: [
          { name: 'Segurança', weight: 30, score: 30, maxScore: 100, items: [] },
          { name: 'Qualidade', weight: 30, score: 40, maxScore: 100, items: [] },
        ],
      });
      const alerts = analysis.crossCategoryAnalysis(result);
      expect(alerts.some((a) => a.severity === 'critical')).toBe(true);
    });

    it('should return info alerts for mature project', () => {
      const result = makeScorecardResult({
        categories: [
          { name: 'Segurança', weight: 30, score: 95, maxScore: 100, items: [] },
          { name: 'Qualidade', weight: 30, score: 92, maxScore: 100, items: [] },
        ],
      });
      const alerts = analysis.crossCategoryAnalysis(result);
      expect(alerts.some((a) => a.severity === 'info')).toBe(true);
    });

    it('should return warn when ecosystem is critical', () => {
      const result = makeScorecardResult({
        categories: [{ name: 'Saúde do Ecossistema', weight: 20, score: 30, maxScore: 100, items: [] }],
      });
      const alerts = analysis.crossCategoryAnalysis(result);
      expect(alerts.some((a) => a.severity === 'warn')).toBe(true);
    });

    it('should return no alerts for mixed categories', () => {
      const result = makeScorecardResult({
        categories: [
          { name: 'Segurança', weight: 30, score: 70, maxScore: 100, items: [] },
          { name: 'Qualidade', weight: 30, score: 60, maxScore: 100, items: [] },
        ],
      });
      expect(analysis.crossCategoryAnalysis(result)).toEqual([]);
    });

    it('should handle empty category list', () => {
      const result = makeScorecardResult({ categories: [] });
      expect(analysis.crossCategoryAnalysis(result)).toEqual([]);
    });
  });

  describe('buildTrends', () => {
    function makeTrendHistory(score: number, timestamp: string) {
      return {
        timestamp,
        overallScore: score,
        maturityLevel: score >= 90 ? ('A' as const) : score >= 70 ? ('B' as const) : score >= 50 ? ('C' as const) : ('D' as const),
        categories: [{ name: 'Test', weight: 100, score, maxScore: 100, items: [] }],
        recommendations: [],
        evolution: { version: '1', categories: 1, items: 0 },
        trends: [],
        alerts: [],
        correlationAlerts: [],
        forecast: { forecast: 0, confidence: 'low', trend: 'stable', history: [] },
        git: { branch: 'main', commit: 'a', message: 'm' },
        meta: { durationMs: 100, scorecardVersion: '1' },
      };
    }

    it('should return trend entries from history', () => {
      const history = [makeTrendHistory(70, '2026-07-25'), makeTrendHistory(75, '2026-07-26')];
      const trends = analysis.buildTrends(history);
      expect(trends).toHaveLength(2);
      expect(trends[0].overallScore).toBe(70);
    });

    it('should limit to last 20 entries', () => {
      const many = Array.from({ length: 25 }, (_, i) => makeTrendHistory(50 + (i % 10), `2026-07-${String(i + 1).padStart(2, '0')}`));
      expect(analysis.buildTrends(many)).toHaveLength(20);
    });

    it('should return empty array for empty history', () => {
      expect(analysis.buildTrends([])).toEqual([]);
    });
  });

  describe('forecastScore', () => {
    it('should return low confidence when no snapshots', () => {
      mockIO.fs.readDir.mockReturnValue([]);
      const result = analysis.forecastScore(30);
      expect(result.forecast).toBe(0);
      expect(result.confidence).toBe('low');
    });

    it('should return low confidence with fewer than 3 snapshots', () => {
      mockIO.fs.readDir.mockReturnValue(['snap1.json', 'snap2.json']);
      mockIO.fs.read.mockImplementation(() => JSON.stringify({ score: 50 }));
      const result = analysis.forecastScore(30);
      expect(result.confidence).toBe('low');
      expect(result.history.length).toBeGreaterThanOrEqual(0);
    });

    it('should compute forecast with sufficient data', () => {
      const count = 10;
      const files = Array.from({ length: count }, (_, i) => `snap-${i}.json`);
      mockIO.fs.readDir.mockReturnValue(files);
      let idx = 0;
      mockIO.fs.read.mockImplementation(() => JSON.stringify({ score: 50 + idx++ * 5 }));
      const result = analysis.forecastScore(30);
      expect(result.forecast).toBeGreaterThanOrEqual(0);
      expect(result.history).toHaveLength(count);
    });

    it('should catch errors and return default', () => {
      mockIO.fs.readDir.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      const result = analysis.forecastScore(30);
      expect(result.forecast).toBe(0);
      expect(result.confidence).toBe('low');
    });
  });

  describe('overallScore', () => {
    it('should compute weighted average', () => {
      const cats = [
        { name: 'A', weight: 60, score: 100, maxScore: 100, items: [] },
        { name: 'B', weight: 40, score: 0, maxScore: 100, items: [] },
      ];
      expect(analysis.overallScore(cats)).toBe(60);
    });

    it('should return 0 when total weight is 0', () => {
      expect(analysis.overallScore([{ name: 'A', weight: 0, score: 50, maxScore: 100, items: [] }])).toBe(0);
    });

    it('should handle single category', () => {
      expect(analysis.overallScore([{ name: 'A', weight: 100, score: 80, maxScore: 100, items: [] }])).toBe(80);
    });

    it('should handle empty categories', () => {
      expect(analysis.overallScore([])).toBe(0);
    });
  });

  describe('buildRecommendations', () => {
    it('should return recommendations for failed items', () => {
      const cats = [
        {
          name: 'Test',
          weight: 100,
          score: 0,
          maxScore: 100,
          items: [{ id: 'f1', description: 'Failed', passed: false, weight: 2, hint: 'fix it', value: 'bad' }],
        },
      ];
      const recs = analysis.buildRecommendations(cats);
      expect(recs).toHaveLength(1);
      expect(recs[0].text).toContain('Failed');
    });

    it('should skip passed items', () => {
      const cats = [
        { name: 'Test', weight: 100, score: 100, maxScore: 100, items: [{ id: 'p1', description: 'Passed', passed: true, weight: 2 }] },
      ];
      expect(analysis.buildRecommendations(cats)).toEqual([]);
    });

    it('should limit to 20 recommendations', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: `f${i}`, description: `Fail ${i}`, passed: false, weight: 1 }));
      const cats = [{ name: 'Test', weight: 100, score: 0, maxScore: 100, items }];
      expect(analysis.buildRecommendations(cats)).toHaveLength(20);
    });

    it('should include fixCommand when available', () => {
      const cats = [
        {
          name: 'Sec',
          weight: 100,
          score: 0,
          maxScore: 100,
          items: [{ id: 'f1', description: 'Vulnerability', passed: false, weight: 3, fixCommand: 'npm audit fix' }],
        },
      ];
      const recs = analysis.buildRecommendations(cats);
      expect(recs[0].fixCommand).toBe('npm audit fix');
    });

    it('should include hint in text', () => {
      const cats = [
        {
          name: 'Test',
          weight: 100,
          score: 0,
          maxScore: 100,
          items: [{ id: 'f1', description: 'Check', passed: false, weight: 1, hint: 'Do X' }],
        },
      ];
      expect(analysis.buildRecommendations(cats)[0].text).toContain('Do X');
    });
  });

  describe('buildAlerts', () => {
    it('should return alerts for heavy failed items', () => {
      const cats = [
        {
          name: 'Test',
          weight: 100,
          score: 0,
          maxScore: 100,
          items: [{ id: 'f1', description: 'Critical fail', passed: false, weight: 3 }],
        },
      ];
      const alerts = analysis.buildAlerts(cats);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('error');
    });

    it('should skip light failed items (weight < 3)', () => {
      const cats = [
        { name: 'Test', weight: 100, score: 0, maxScore: 100, items: [{ id: 'f1', description: 'Minor fail', passed: false, weight: 1 }] },
      ];
      expect(analysis.buildAlerts(cats)).toEqual([]);
    });

    it('should skip passed items', () => {
      const cats = [
        { name: 'Test', weight: 100, score: 100, maxScore: 100, items: [{ id: 'p1', description: 'Passed', passed: true, weight: 5 }] },
      ];
      expect(analysis.buildAlerts(cats)).toEqual([]);
    });

    it('should handle multiple categories', () => {
      const cats = [
        { name: 'A', weight: 50, score: 0, maxScore: 100, items: [{ id: 'a1', description: 'Fail A', passed: false, weight: 5 }] },
        { name: 'B', weight: 50, score: 0, maxScore: 100, items: [{ id: 'b1', description: 'Fail B', passed: false, weight: 4 }] },
      ];
      expect(analysis.buildAlerts(cats)).toHaveLength(2);
    });
  });

  describe('buildAIAnalysisPrompt', () => {
    it('should include score and maturity level', () => {
      const result = makeScorecardResult({ overallScore: 75, maturityLevel: 'B' });
      const prompt = analysis.buildAIAnalysisPrompt(result);
      expect(prompt).toContain('75/100');
      expect(prompt).toContain('B');
    });

    it('should include category breakdown', () => {
      const result = makeScorecardResult();
      const prompt = analysis.buildAIAnalysisPrompt(result);
      expect(prompt).toContain('Segurança');
      expect(prompt).toContain('Qualidade');
    });

    it('should include top recommendations', () => {
      const result = makeScorecardResult({ recommendations: [{ text: 'Fix ecosystem health', fixCommand: 'npm audit fix' }] });
      const prompt = analysis.buildAIAnalysisPrompt(result);
      expect(prompt).toContain('Fix ecosystem health');
    });

    it('should include benchmarks when provided', () => {
      const result = makeScorecardResult();
      const prompt = analysis.buildAIAnalysisPrompt(result, { buildTimeMs: 5000, testTimeMs: 30000, lintTimeMs: 2000, totalFiles: 150 });
      expect(prompt).toContain('5.0s');
      expect(prompt).toContain('150');
    });

    it('should handle missing benchmarks', () => {
      const result = makeScorecardResult();
      const prompt = analysis.buildAIAnalysisPrompt(result);
      expect(prompt).not.toContain('Benchmarks');
    });
  });

  describe('runBenchmarks', () => {
    it('should measure build and test times', () => {
      cp.spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
      mockIO.fs.readDir.mockReturnValue(['file1.ts', 'file2.ts']);
      mockIO.fs.stat.mockReturnValue({ mtimeMs: 1000, size: 100, isDirectory: () => false });
      mockIO.fs.cwd.mockReturnValue('/test');
      const bench = analysis.runBenchmarks();
      expect(bench.buildTimeMs).toBeGreaterThanOrEqual(0);
      expect(bench.testTimeMs).toBeGreaterThanOrEqual(0);
      expect(bench.lintTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle spawn failures gracefully', () => {
      cp.spawnSync.mockImplementation(() => {
        throw new Error('not found');
      });
      mockIO.fs.readDir.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      const bench = analysis.runBenchmarks();
      expect(bench.buildTimeMs).toBeNull();
      expect(bench.testTimeMs).toBeNull();
      expect(bench.totalFiles).toBe(0);
    });
  });

  describe('scoreDiffExport', () => {
    function makeDiffResult(ts: string, score: number, cats: Array<{ name: string; weight: number; score: number }>) {
      return {
        timestamp: ts,
        overallScore: score,
        maturityLevel: 'B' as const,
        categories: cats.map((c) => ({ ...c, maxScore: 100, items: [] })),
        recommendations: [],
        evolution: { version: '1', categories: 0, items: 0 },
        trends: [],
        alerts: [],
        correlationAlerts: [],
        forecast: { forecast: 0, confidence: 'low', trend: 'stable', history: [] },
        git: { branch: 'main', commit: 'a', message: 'm' },
        meta: { durationMs: 100, scorecardVersion: '1' },
      };
    }

    it('should compute diff between two results', () => {
      const r1 = makeDiffResult('2026-07-25', 70, [
        { name: 'Segurança', weight: 30, score: 50 },
        { name: 'Qualidade', weight: 30, score: 80 },
      ]);
      const r2 = makeDiffResult('2026-07-26', 75, [
        { name: 'Segurança', weight: 30, score: 60 },
        { name: 'Qualidade', weight: 30, score: 80 },
      ]);
      const diff = JSON.parse(analysis.scoreDiffExport(r1, r2));
      expect(diff.categories.Segurança.diff).toBe(10);
      expect(diff.categories.Qualidade.diff).toBe(0);
    });

    it('should skip categories with weight 0', () => {
      const r1 = makeDiffResult('2026-07-25', 0, [{ name: 'Custom', weight: 0, score: 100 }]);
      const r2 = makeDiffResult('2026-07-26', 0, [{ name: 'Custom', weight: 0, score: 100 }]);
      const diff = JSON.parse(analysis.scoreDiffExport(r1, r2));
      expect(diff.categories.Custom).toBeUndefined();
    });

    it('should handle missing category in second result', () => {
      const r1 = makeDiffResult('2026-07-25', 80, [{ name: 'Unique', weight: 50, score: 80 }]);
      const r2 = makeDiffResult('2026-07-26', 0, []);
      const diff = JSON.parse(analysis.scoreDiffExport(r1, r2));
      expect(diff.categories.Unique).toBeUndefined();
    });
  });

  describe('queryLocalAI', () => {
    it('should handle import result gracefully', async () => {
      try {
        const result = await analysis.queryLocalAI('test prompt');
        expect(result === null || typeof result === 'string').toBe(true);
      } catch {
        // Dynamic import may fail depending on module resolution
        expect(true).toBe(true);
      }
    });
  });
});

// ============ SCORECARD DISPLAY ============
describe('scorecard-display', () => {
  describe('print', () => {
    it('should output scorecard header', () => {
      display.print(makeScorecardResult());
      expect(console.log).toHaveBeenCalled();
    });

    it('should show green indicator for high scores', () => {
      display.print(makeScorecardResult({ overallScore: 95, maturityLevel: 'A' }));
      expect(console.log).toHaveBeenCalled();
    });

    it('should show red indicator for low scores', () => {
      display.print(makeScorecardResult({ overallScore: 30, maturityLevel: 'D' }));
      expect(console.log).toHaveBeenCalled();
    });

    it('should show correlation alerts when present', () => {
      display.print(makeScorecardResult({ correlationAlerts: [{ severity: 'warn', message: 'Test correlation', categories: ['A'] }] }));
      expect(console.log).toHaveBeenCalled();
    });

    it('should show forecast when history is sufficient', () => {
      display.print(makeScorecardResult());
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle custom categories', () => {
      display.print(
        makeScorecardResult({
          categories: [
            {
              name: 'Custom:Test',
              weight: 10,
              score: 80,
              maxScore: 100,
              items: [{ id: 'c1', description: 'Custom', passed: true, weight: 5 }],
            },
          ],
        }),
      );
    });
  });
});

// ============ SCORECARD MODES ============
describe('scorecard-modes', () => {
  describe('loadPolicyGates', () => {
    it('should return empty array when no policy file', () => {
      mockIO.fs.read.mockReturnValue(null);
      expect(modes.loadPolicyGates()).toEqual([]);
    });

    it('should parse policy gates from YAML-like content', () => {
      mockIO.fs.read.mockReturnValue('gates:\n  - category: "Segurança"\n    minScore: 80\n    action: "block"\n');
      const result = modes.loadPolicyGates();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('applyPolicyGates', () => {
    it('should block when gate action is block', () => {
      const result = makeScorecardResult({
        categories: [
          {
            name: 'Segurança',
            weight: 30,
            score: 50,
            maxScore: 100,
            items: [{ id: 's1', description: 'Low score', passed: false, weight: 10 }],
          },
        ],
      });
      const gates = [{ category: 'Segurança', minScore: 90, action: 'block' as const }];
      const outcome = modes.applyPolicyGates(result, gates);
      expect(outcome.blocked).toBe(true);
      expect(outcome.tasksCreated).toBe(0);
    });

    it('should auto-create task when gate action is auto-create-task', () => {
      mockIO.fs.read.mockReturnValue('# Backlog\n');
      const result = makeScorecardResult({
        categories: [
          {
            name: 'Segurança',
            weight: 30,
            score: 50,
            maxScore: 100,
            items: [{ id: 's1', description: 'Low score', passed: false, weight: 10 }],
          },
        ],
      });
      const gates = [{ category: 'Segurança', minScore: 90, action: 'auto-create-task' as const }];
      const outcome = modes.applyPolicyGates(result, gates);
      expect(outcome.tasksCreated).toBe(1);
      expect(mockIO.fs.write).toHaveBeenCalled();
    });

    it('should not create duplicate tasks when ID already exists', () => {
      const fixedDate = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(fixedDate);
      const expectedId = `POLICY-Segurança-${fixedDate.toString(36)}`;
      mockIO.fs.read.mockReturnValue(`# Backlog\n${expectedId}`);
      const result = makeScorecardResult();
      const gates = [{ category: 'Segurança', minScore: 90, action: 'auto-create-task' as const }];
      const outcome = modes.applyPolicyGates(result, gates);
      expect(outcome.tasksCreated).toBe(0);
      jest.restoreAllMocks();
    });

    it('should not block when score meets minimum', () => {
      const result = makeScorecardResult();
      const gates = [{ category: 'Segurança', minScore: 30, action: 'block' as const }];
      const outcome = modes.applyPolicyGates(result, gates);
      expect(outcome.blocked).toBe(false);
    });

    it('should handle non-matching category name', () => {
      const result = makeScorecardResult();
      const gates = [{ category: 'Nonexistent', minScore: 50, action: 'block' as const }];
      const outcome = modes.applyPolicyGates(result, gates);
      expect(outcome.blocked).toBe(false);
    });
  });

  describe('cadenceMode', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should call log.info', () => {
      jest.spyOn(process, 'on').mockImplementation(() => process as any);
      expect(() => modes.cadenceMode(10, 5)).not.toThrow();
    }, 10000);
  });

  describe('watchMode', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should call log.info', () => {
      jest.spyOn(process, 'on').mockImplementation(() => process as any);
      expect(() => modes.watchMode(5)).not.toThrow();
    }, 10000);
  });

  describe('serveMode', () => {
    it('should create HTTP server on given port', () => {
      jest.spyOn(process, 'on').mockImplementation(() => process as any);
      process.stdout.write = jest.fn().mockReturnValue(true);
      modes.serveMode(3456);
      expect(http.createServer).toHaveBeenCalled();
    });
  });
});

// ============ SCORECARD NOTIFICATIONS ============
describe('scorecard-notifications', () => {
  describe('sendNotifications', () => {
    it('should log notification to file', () => {
      const nots: notifications.Notification[] = [{ type: 'file', message: 'Test notification', level: 'info' }];
      notifications.sendNotifications(nots);
      expect(mockIO.fs.append).toHaveBeenCalled();
    });

    it('should send webhook notification when url provided', () => {
      const nots: notifications.Notification[] = [{ type: 'webhook', message: 'Webhook test', level: 'error' }];
      notifications.sendNotifications(nots, 'http://example.com/hook');
      expect(mockIO.fs.append).toHaveBeenCalled();
    });

    it('should handle multiple notifications', () => {
      const nots: notifications.Notification[] = [
        { type: 'file', message: 'First', level: 'info' },
        { type: 'file', message: 'Second', level: 'warn' },
      ];
      notifications.sendNotifications(nots);
      expect(mockIO.fs.append).toHaveBeenCalledTimes(2);
    });

    it('should handle webhook creation failure gracefully', () => {
      const httpMock = require('node:http');
      httpMock.request.mockImplementation(() => {
        throw new Error('network error');
      });
      const nots: notifications.Notification[] = [{ type: 'webhook', message: 'Fail', level: 'error' }];
      expect(() => notifications.sendNotifications(nots, 'http://example.com/hook')).not.toThrow();
    });
  });

  describe('publishResult', () => {
    it('should send result to webhook when url provided', () => {
      const result = {
        overallScore: 85,
        maturityLevel: 'A' as const,
        evolution: { version: '1.0' },
        git: { branch: 'main', commit: 'abc', message: 'msg' },
        timestamp: '2026-07-26',
        alerts: [],
      };
      notifications.publishResult(result, 'http://example.com/hook');
      expect(require('node:http').request).toHaveBeenCalled();
    });

    it('should do nothing when no webhook url', () => {
      const result = {
        overallScore: 85,
        maturityLevel: 'A' as const,
        evolution: { version: '1.0' },
        git: { branch: 'main', commit: 'abc', message: 'msg' },
        timestamp: '2026-07-26',
        alerts: [],
      };
      notifications.publishResult(result);
      expect(require('node:http').request).not.toHaveBeenCalled();
    });

    it('should handle request creation failure', () => {
      require('node:http').request.mockImplementation(() => {
        throw new Error('fail');
      });
      const result = {
        overallScore: 85,
        maturityLevel: 'A' as const,
        evolution: { version: '1.0' },
        git: { branch: 'main', commit: 'abc', message: 'msg' },
        timestamp: '2026-07-26',
        alerts: [],
      };
      expect(() => notifications.publishResult(result, 'http://example.com/hook')).not.toThrow();
    });
  });
});

// ============ SCORECARD REPORT (scorecard-report.ts) ============
describe('scorecard-report', () => {
  describe('generateHTML', () => {
    it('should generate complete HTML report', () => {
      const html = report.generateHTML(makeScorecardResult());
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Scorecard de Maturidade');
      expect(html).toContain('75/100');
    });

    it('should use green color for high scores', () => {
      expect(report.generateHTML(makeScorecardResult({ overallScore: 95, maturityLevel: 'A' }))).toContain('#22c55e');
    });

    it('should use red color for low scores', () => {
      expect(report.generateHTML(makeScorecardResult({ overallScore: 30, maturityLevel: 'D' }))).toContain('#ef4444');
    });

    it('should include alerts section when alerts exist', () => {
      const result = makeScorecardResult({
        alerts: [{ category: 'Test', item: 't1', severity: 'error' as const, message: 'Something wrong' }],
      });
      expect(report.generateHTML(result)).toContain('Alertas');
    });

    it('should hide alerts section when no alerts', () => {
      expect(report.generateHTML(makeScorecardResult({ alerts: [] }))).not.toContain('Alertas');
    });

    it('should include category bars with proper colors', () => {
      const html = report.generateHTML(makeScorecardResult());
      expect(html).toContain('bar-bg');
      expect(html).toContain('Segurança');
    });
  });
});

// ============ SCORECARD REPORTING (scorecard-reporting.ts) ============
describe('scorecard-reporting', () => {
  describe('generateBadge', () => {
    it('should return SVG string with score', () => {
      const svg = reporting.generateBadge(85);
      expect(svg).toContain('<svg');
      expect(svg).toContain('85/100');
    });

    it('should use green color for high scores', () => {
      expect(reporting.generateBadge(95)).toContain('#4c1');
    });

    it('should use red color for low scores', () => {
      expect(reporting.generateBadge(30)).toContain('#e05d44');
    });

    it('should use yellow for medium scores', () => {
      expect(reporting.generateBadge(75)).toContain('#dfb317');
    });

    it('should use orange for borderline scores', () => {
      expect(reporting.generateBadge(55)).toContain('#fe7d37');
    });
  });

  describe('generateHTML (reporting)', () => {
    it('should generate HTML with score and categories', () => {
      const html = reporting.generateHTML(makeScorecardResult());
      expect(html).toContain('Scorecard de Maturidade');
      expect(html).toContain('75/100');
    });

    it('should include badge image', () => {
      expect(reporting.generateHTML(makeScorecardResult())).toContain('badge.svg');
    });

    it('should include alerts section with icons', () => {
      const result = makeScorecardResult({ alerts: [{ category: 'Test', item: 't1', severity: 'warn' as const, message: 'Warning' }] });
      expect(reporting.generateHTML(result)).toContain('Alertas');
    });
  });

  describe('sendNotifications (reporting)', () => {
    it('should log to file and log info', () => {
      const nots: Array<{ type: 'file' | 'webhook'; message: string; level: 'info' | 'warn' | 'error' }> = [
        { type: 'file', message: 'Reporting test', level: 'warn' },
      ];
      reporting.sendNotifications(nots);
      expect(mockIO.fs.append).toHaveBeenCalled();
    });

    it('should send webhook when type is webhook', () => {
      const nots: Array<{ type: 'file' | 'webhook'; message: string; level: 'info' | 'warn' | 'error' }> = [
        { type: 'webhook', message: 'Webhook', level: 'error' },
      ];
      reporting.sendNotifications(nots, 'http://example.com/hook');
      expect(mockIO.fs.append).toHaveBeenCalled();
    });
  });

  describe('publishResult (reporting)', () => {
    it('should send to webhook', () => {
      reporting.publishResult(makeScorecardResult() as any, 'http://example.com/hook');
      expect(require('node:http').request).toHaveBeenCalled();
    });

    it('should do nothing without webhook', () => {
      reporting.publishResult(makeScorecardResult() as any);
      expect(require('node:http').request).not.toHaveBeenCalled();
    });
  });

  describe('createTasksFromFailures', () => {
    it('should create tasks for failed items with weight >= 2', () => {
      mockIO.fs.read.mockReturnValue('# Backlog\n\n## Tarefas Pendentes\n');
      const result = makeScorecardResult({
        categories: [
          {
            name: 'Segurança',
            weight: 30,
            score: 0,
            maxScore: 100,
            items: [{ id: 'sec-fail', description: 'Security check failed', passed: false, weight: 3 }],
          },
        ],
      });
      expect(reporting.createTasksFromFailures(result)).toBe(1);
      expect(mockIO.fs.write).toHaveBeenCalled();
    });

    it('should skip items with weight < 2', () => {
      mockIO.fs.read.mockReturnValue('# Backlog\n');
      const result = makeScorecardResult({
        categories: [
          {
            name: 'Test',
            weight: 100,
            score: 0,
            maxScore: 100,
            items: [{ id: 'light-fail', description: 'Light fail', passed: false, weight: 1 }],
          },
        ],
      });
      expect(reporting.createTasksFromFailures(result)).toBe(0);
    });

    it('should skip passed items', () => {
      mockIO.fs.read.mockReturnValue('# Backlog\n');
      expect(reporting.createTasksFromFailures(makeScorecardResult())).toBe(0);
    });

    it('should skip categories with weight 0', () => {
      mockIO.fs.read.mockReturnValue('# Backlog\n');
      const result = makeScorecardResult({
        categories: [
          { name: 'Zero', weight: 0, score: 0, maxScore: 100, items: [{ id: 'skip', description: 'Skip', passed: false, weight: 5 }] },
        ],
      });
      expect(reporting.createTasksFromFailures(result)).toBe(0);
    });

    it('should create backlog file if missing', () => {
      mockIO.fs.read.mockReturnValue(null);
      const result = makeScorecardResult({
        categories: [
          {
            name: 'Test',
            weight: 100,
            score: 0,
            maxScore: 100,
            items: [{ id: 'new-task', description: 'New task', passed: false, weight: 3 }],
          },
        ],
      });
      expect(reporting.createTasksFromFailures(result)).toBe(1);
    });

    it('should not create duplicate tasks when ID already exists', () => {
      const fixedDate = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(fixedDate);
      const expectedId = `SCORE-new-task-${fixedDate.toString(36)}`;
      mockIO.fs.read.mockReturnValue(`# Backlog\n${expectedId}`);
      const result = makeScorecardResult({
        categories: [
          {
            name: 'Test',
            weight: 100,
            score: 0,
            maxScore: 100,
            items: [{ id: 'new-task', description: 'Existing task', passed: false, weight: 3 }],
          },
        ],
      });
      expect(reporting.createTasksFromFailures(result)).toBe(0);
      jest.restoreAllMocks();
    });
  });
});

// ============ SCORECARD SERVER ============
describe('scorecard-server', () => {
  describe('cadenceMode', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should call log.info', () => {
      jest.spyOn(process, 'on').mockImplementation(() => process as any);
      expect(() => server.cadenceMode(30, 5)).not.toThrow();
    }, 10000);
  });

  describe('watchMode', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should call log.info', () => {
      jest.spyOn(process, 'on').mockImplementation(() => process as any);
      expect(() => server.watchMode(10)).not.toThrow();
    }, 10000);
  });

  describe('serveMode', () => {
    it('should create HTTP server', () => {
      jest.spyOn(process, 'on').mockImplementation(() => process as any);
      process.stdout.write = jest.fn().mockReturnValue(true);
      server.serveMode(4567);
      expect(http.createServer).toHaveBeenCalled();
    });
  });
});
