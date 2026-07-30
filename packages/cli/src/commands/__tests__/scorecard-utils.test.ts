import type { ScorecardItem, ScorecardCategory, ScorecardResult } from '../scorecard-types';

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockAppendFileSync = jest.fn();
const mockStatSync = jest.fn();

jest.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  appendFileSync: mockAppendFileSync,
  statSync: mockStatSync,
}));

const mockSpawnSync = jest.fn();
const mockExecFileSync = jest.fn();
jest.mock('node:child_process', () => ({
  spawnSync: mockSpawnSync,
  execFileSync: mockExecFileSync,
}));

jest.mock('../../local-ai/ollama', () => ({
  queryOllama: jest.fn(),
}));

const mockHttpRequest = jest.fn(() => ({ write: jest.fn(), end: jest.fn() }));
jest.mock('node:http', () => ({
  request: mockHttpRequest,
}));

const mockHttpsRequest = jest.fn(() => ({ write: jest.fn(), end: jest.fn() }));
jest.mock('node:https', () => ({
  request: mockHttpsRequest,
}));

import {
  root,
  ex,
  read,
  hasContent,
  dirSize,
  jsonParse,
  runNode,
  git,
  gitExists,
  npmAudit,
  coveragePct,
  pylintOk,
  golintOk,
  oldestDep,
  loadPolicyGates,
  applyPolicyGates,
  runBenchmarks,
  buildAIAnalysisPrompt,
  shieldColor,
  calcScore,
  level,
  overallScore,
  buildRecommendations,
  buildAlerts,
  generateBadge,
  buildTrends,
  computeGit,
  crossCategoryAnalysis,
  forecastScore,
  validateYamlContent,
  generateFromTemplate,
  scoreDiffExport,
  loadCustomChecks,
  gitTraceForFile,
  linkScoreToCommits,
  saveSnapshot,
  detectRegression,
  sendNotifications,
  createTasksFromFailures,
  runAllScripts,
  jestResultOk,
  publishResult,
} from '../scorecard-utils';
import type { PolicyGate, Benchmarks, Notification } from '../scorecard-utils';

beforeEach(() => {
  jest.clearAllMocks();
  mockReadFileSync.mockReset();
  mockExistsSync.mockReset();
  mockReaddirSync.mockReset();
  mockWriteFileSync.mockReset();
  mockMkdirSync.mockReset();
  mockAppendFileSync.mockReset();
  mockStatSync.mockReset();
  mockSpawnSync.mockReset();
  mockExecFileSync.mockReset();
  mockHttpRequest.mockReset();
});

const item = (overrides?: Partial<ScorecardItem>): ScorecardItem => ({
  id: 'TST-001',
  description: 'test item',
  passed: true,
  weight: 10,
  ...overrides,
});
const cat = (overrides?: Partial<ScorecardCategory>): ScorecardCategory => ({
  name: 'Test',
  weight: 50,
  score: 80,
  maxScore: 100,
  items: [item()],
  ...overrides,
});
const result = (overrides?: Partial<ScorecardResult>): ScorecardResult => ({
  timestamp: '2026-07-26T12:00:00.000Z',
  overallScore: 75,
  maturityLevel: 'B',
  categories: [cat()],
  recommendations: [{ text: 'Improve X' }],
  evolution: { version: '1.0', categories: 1, items: 1 },
  trends: [],
  alerts: [],
  correlationAlerts: [],
  forecast: { forecast: 80, confidence: 'medium', trend: 'up', history: [70, 75, 80] },
  git: { branch: 'main', commit: 'abc1234', message: 'test commit' },
  meta: { durationMs: 100, scorecardVersion: '1.0' },
  ...overrides,
});

// ─── 1. Utility Helpers ──────────────────────────────────────

describe('root', () => {
  it('returns process.cwd()', () => {
    expect(root()).toBe(process.cwd());
  });
});

describe('ex', () => {
  it('returns true when file exists', () => {
    const p = require('path').join(process.cwd(), 'some-file.md');
    mockExistsSync.mockImplementation((f: string) => f === p);
    expect(ex('some-file.md')).toBe(true);
  });
  it('returns false when file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(ex('nonexistent.md')).toBe(false);
  });
  it('calls existsSync with joined root path', () => {
    mockExistsSync.mockReturnValue(false);
    ex('foo/bar.txt');
    expect(mockExistsSync).toHaveBeenCalledWith(require('path').join(process.cwd(), 'foo/bar.txt'));
  });
});

describe('read', () => {
  it('returns file content when file exists', () => {
    mockReadFileSync.mockReturnValue('file content');
    expect(read('test.txt')).toBe('file content');
  });
  it('returns null when file read throws', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(read('missing.txt')).toBeNull();
  });
});

describe('hasContent', () => {
  it('returns true when content exceeds 100 chars', () => {
    mockReadFileSync.mockReturnValue('x'.repeat(150));
    expect(hasContent('big.txt')).toBe(true);
  });
  it('returns false when content is short', () => {
    mockReadFileSync.mockReturnValue('short');
    expect(hasContent('short.txt')).toBe(false);
  });
  it('returns false when file read fails', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(hasContent('missing.txt')).toBe(false);
  });
  it('returns false for empty content', () => {
    mockReadFileSync.mockReturnValue('');
    expect(hasContent('empty.txt')).toBe(false);
  });
  it('returns false for exactly 100 chars', () => {
    mockReadFileSync.mockReturnValue('x'.repeat(100));
    expect(hasContent('exact.txt')).toBe(false);
  });
});

describe('dirSize', () => {
  it('returns count of directory entries', () => {
    mockReaddirSync.mockReturnValue(['a', 'b', 'c']);
    expect(dirSize('somedir')).toBe(3);
  });
  it('returns 0 on error', () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(dirSize('missing')).toBe(0);
  });
  it('returns 0 for empty directory', () => {
    mockReaddirSync.mockReturnValue([]);
    expect(dirSize('empty')).toBe(0);
  });
});

describe('jsonParse', () => {
  it('parses valid JSON from file', () => {
    mockReadFileSync.mockReturnValue('{"key": "value"}');
    expect(jsonParse('data.json')).toEqual({ key: 'value' });
  });
  it('returns null when file read fails', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(jsonParse('missing.json')).toBeNull();
  });
  it('returns null on invalid JSON', () => {
    mockReadFileSync.mockReturnValue('not-json');
    expect(jsonParse('bad.json')).toBeNull();
  });
});

// ─── 2. Git Helpers ──────────────────────────────────────────

describe('git', () => {
  it('returns trimmed output on success', () => {
    mockExecFileSync.mockReturnValue('main\n');
    expect(git(['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main');
  });
  it('returns null on failure', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('not a repo');
    });
    expect(git(['status'])).toBeNull();
  });
  it('calls execFileSync with git and cwd', () => {
    mockExecFileSync.mockReturnValue('');
    git(['log', '-1']);
    expect(mockExecFileSync).toHaveBeenCalledWith('git', ['log', '-1'], expect.objectContaining({ encoding: 'utf-8' }));
  });
});

describe('gitExists', () => {
  it('returns true when git dir exists', () => {
    mockExecFileSync.mockReturnValue('.git\n');
    expect(gitExists()).toBe(true);
  });
  it('returns false when exec throws', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('fatal');
    });
    expect(gitExists()).toBe(false);
  });
});

describe('computeGit', () => {
  it('returns git info when repo exists', () => {
    mockExecFileSync
      .mockReturnValueOnce('.git')
      .mockReturnValueOnce('main\n')
      .mockReturnValueOnce('abc1234\n')
      .mockReturnValueOnce('fix: resolve bug\n');
    const info = computeGit();
    expect(info.branch).toBe('main');
    expect(info.commit).toBe('abc1234');
    expect(info.message).toBe('fix: resolve bug');
  });
  it('returns fallback when no git repo', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('fatal');
    });
    const info = computeGit();
    expect(info.branch).toBe('no-git');
    expect(info.commit).toBe('0000000');
  });
});

describe('gitTraceForFile', () => {
  it('returns trace on success', () => {
    mockExecFileSync.mockReturnValue('abc1234|author|2026-07-26|fix: thing\n');
    const trace = gitTraceForFile('src/index.ts');
    expect(trace).toBeTruthy();
    expect(trace.length).toBe(1);
    expect(trace[0]).toContain('abc1234');
  });
  it('returns empty array on empty log', () => {
    mockExecFileSync.mockReturnValue('');
    expect(gitTraceForFile('new.ts')).toEqual([]);
  });
  it('returns empty array on failure', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('fatal');
    });
    expect(gitTraceForFile('missing.ts')).toEqual([]);
  });
});

// ─── 3. Audit / Process Helpers ──────────────────────────────

describe('npmAudit', () => {
  it('returns parsed vulnerabilities', () => {
    mockExecFileSync.mockReturnValue(
      JSON.stringify({
        metadata: { vulnerabilities: { critical: 1, high: 2, moderate: 3, low: 4 } },
      }),
    );
    expect(npmAudit()).toEqual({ critical: 1, high: 2, moderate: 3, low: 4 });
  });
  it('returns zeros when exec fails', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('audit failed');
    });
    expect(npmAudit()).toEqual({ critical: 0, high: 0, moderate: 0, low: 0 });
  });
  it('handles missing metadata', () => {
    mockExecFileSync.mockReturnValue(JSON.stringify({}));
    expect(npmAudit()).toEqual({ critical: 0, high: 0, moderate: 0, low: 0 });
  });
});

describe('coveragePct', () => {
  it('returns rounded line coverage', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ total: { lines: { pct: 93.7 } } }));
    expect(coveragePct()).toBe(94);
  });
  it('returns null when file missing', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(coveragePct()).toBeNull();
  });
  it('returns null when total is missing', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({}));
    expect(coveragePct()).toBeNull();
  });
  it('handles invalid JSON gracefully', () => {
    mockReadFileSync.mockReturnValue('not-json');
    expect(coveragePct()).toBeNull();
  });
});

describe('pylintOk', () => {
  it('returns true when flake8 passes', () => {
    mockSpawnSync.mockReturnValue({ status: 0 });
    expect(pylintOk()).toBe(true);
  });
  it('returns false when flake8 fails', () => {
    mockSpawnSync.mockReturnValue({ status: 1 });
    expect(pylintOk()).toBe(false);
  });
  it('returns false on exception', () => {
    mockSpawnSync.mockImplementation(() => {
      throw new Error('spawn error');
    });
    expect(pylintOk()).toBe(false);
  });
});

describe('golintOk', () => {
  it('returns true when go version + lint passes', () => {
    mockSpawnSync.mockReturnValue({ status: 0 });
    expect(golintOk()).toBe(true);
  });
  it('returns true when go not installed', () => {
    mockSpawnSync.mockReturnValue({ status: 1 });
    expect(golintOk()).toBe(true);
  });
  it('returns true on exception', () => {
    mockSpawnSync.mockImplementation(() => {
      throw new Error('spawn error');
    });
    expect(golintOk()).toBe(true);
  });
});

describe('oldestDep', () => {
  it('returns warning when deps on major 1 exist', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        dependencies: { foo: '0.0.0', bar: '2.0.0' },
      }),
    );
    expect(oldestDep()).toContain('1 dep');
  });
  it('returns null when no old deps', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        dependencies: { foo: '2.0.0', bar: '3.0.0' },
      }),
    );
    expect(oldestDep()).toBeNull();
  });
  it('returns null when package.json missing', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(oldestDep()).toBeNull();
  });
  it('returns null with no dependencies', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({}));
    expect(oldestDep()).toBeNull();
  });
});

// ─── 4. Script runners ──────────────────────────────────────

describe('runNode', () => {
  it('returns true when script exits 0', () => {
    mockSpawnSync.mockReturnValue({ status: 0 });
    expect(runNode('script.js')).toBe(true);
  });
  it('returns false when script exits non-zero', () => {
    mockSpawnSync.mockReturnValue({ status: 1 });
    expect(runNode('script.js')).toBe(false);
  });
  it('appends example request arg when no args provided and file exists', () => {
    mockExistsSync.mockReturnValue(true);
    mockSpawnSync.mockReturnValue({ status: 0 });
    runNode('script.js');
    expect(mockSpawnSync).toHaveBeenCalledWith(
      'node',
      expect.arrayContaining([expect.stringMatching(/request\.example\.json/i)]),
      expect.any(Object),
    );
  });
  it('returns false on exception', () => {
    mockSpawnSync.mockImplementation(() => {
      throw new Error('spawn failed');
    });
    expect(runNode('script.js')).toBe(false);
  });
});

describe('runAllScripts', () => {
  it('returns true when all scripts pass', () => {
    mockReaddirSync.mockReturnValue(['a.js', 'b.js']);
    mockSpawnSync.mockReturnValue({ status: 0 });
    expect(runAllScripts()).toBe(true);
  });
  it('returns false when any script fails', () => {
    mockReaddirSync.mockReturnValue(['a.js']);
    mockSpawnSync.mockReturnValue({ status: 1 });
    expect(runAllScripts()).toBe(false);
  });
  it('returns false on readdir error', () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(runAllScripts()).toBe(false);
  });
});

describe('jestResultOk', () => {
  it('returns true when jest passes', () => {
    mockSpawnSync.mockReturnValue({ status: 0 });
    expect(jestResultOk()).toBe(true);
  });
  it('returns false when jest fails', () => {
    mockSpawnSync.mockReturnValue({ status: 1 });
    expect(jestResultOk()).toBe(false);
  });
  it('returns false on exception', () => {
    mockSpawnSync.mockImplementation(() => {
      throw new Error('spawn error');
    });
    expect(jestResultOk()).toBe(false);
  });
});

// ─── 5. Policy Gates ─────────────────────────────────────────

describe('loadPolicyGates', () => {
  it('returns empty array when policy file missing', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(loadPolicyGates()).toEqual([]);
  });
  it('parses gates from yaml content', () => {
    mockReadFileSync.mockReturnValue(
      [
        'gates:',
        '  - category: "Segurança"',
        '    minScore: 70',
        '    action: "block"',
        '  - category: "Qualidade"',
        '    minScore: 50',
        '    action: "warn"',
      ].join('\n'),
    );
    const gates = loadPolicyGates();
    expect(gates.length).toBe(2);
    expect(gates[0].category).toBe('Segurança');
    expect(gates[0].minScore).toBe(70);
    expect(gates[0].action).toBe('block');
  });
});

describe('applyPolicyGates', () => {
  const gates: PolicyGate[] = [
    { category: 'Segurança', minScore: 80, action: 'block' },
    { category: 'Qualidade', minScore: 60, action: 'warn' },
  ];

  it('blocks when category score is below threshold', () => {
    const r = result({
      categories: [cat({ name: 'Segurança', score: 50, weight: 20 }), cat({ name: 'Qualidade', score: 90, weight: 20 })],
    });
    expect(applyPolicyGates(r, gates).blocked).toBe(true);
  });
  it('does not block when all scores meet thresholds', () => {
    const r = result({
      categories: [cat({ name: 'Segurança', score: 90, weight: 20 }), cat({ name: 'Qualidade', score: 90, weight: 20 })],
    });
    expect(applyPolicyGates(r, gates).blocked).toBe(false);
  });
  it('creates tasks for auto-create-task gates', () => {
    mockReadFileSync.mockReturnValue('# Backlog\n');
    const gates2: PolicyGate[] = [{ category: 'Performance', minScore: 70, action: 'auto-create-task' }];
    const r = result({ categories: [cat({ name: 'Performance', score: 30, weight: 10 })] });
    const res = applyPolicyGates(r, gates2);
    expect(res.tasksCreated).toBe(1);
    expect(mockWriteFileSync).toHaveBeenCalled();
  });
  it('skips tasks that already exist', () => {
    jest.spyOn(Date, 'now').mockReturnValue(0);
    mockReadFileSync.mockReturnValue('# Backlog\n- [ ] **POLICY-Performance-0**');
    const gates2: PolicyGate[] = [{ category: 'Performance', minScore: 70, action: 'auto-create-task' }];
    const r = result({ categories: [cat({ name: 'Performance', score: 30, weight: 10 })] });
    const res = applyPolicyGates(r, gates2);
    expect(res.tasksCreated).toBe(0);
    jest.restoreAllMocks();
  });
  it('handles missing category gracefully', () => {
    const r = result({ categories: [] });
    expect(applyPolicyGates(r, gates)).toEqual({ blocked: false, tasksCreated: 0 });
  });
});

// ─── 6. Benchmarks ──────────────────────────────────────────

describe('runBenchmarks', () => {
  it('returns benchmark results', () => {
    mockSpawnSync.mockReturnValue({ status: 0, pid: 1 });
    mockReaddirSync.mockReturnValue([]);
    mockStatSync.mockReturnValue({ isDirectory: () => false });
    const b = runBenchmarks();
    expect(b).toHaveProperty('buildTimeMs');
    expect(b).toHaveProperty('testTimeMs');
    expect(b).toHaveProperty('lintTimeMs');
    expect(b).toHaveProperty('totalFiles');
    expect(typeof b.totalFiles).toBe('number');
  });
  it('handles spawn errors gracefully', () => {
    mockSpawnSync.mockImplementation(() => {
      throw new Error('spawn failed');
    });
    mockReaddirSync.mockReturnValue([]);
    const b = runBenchmarks();
    expect(b.buildTimeMs).toBeNull();
    expect(b.totalFiles).toBe(0);
  });
});

// ─── 7. AI Prompt ───────────────────────────────────────────

describe('buildAIAnalysisPrompt', () => {
  it('builds prompt with score, categories and recommendations', () => {
    const r = result({ overallScore: 85, maturityLevel: 'B' });
    const prompt = buildAIAnalysisPrompt(r);
    expect(prompt).toContain('85/100');
    expect(prompt).toContain('B');
    expect(prompt).toContain('Improve X');
  });
  it('includes benchmarks when provided', () => {
    const b: Benchmarks = { buildTimeMs: 5000, testTimeMs: 10000, lintTimeMs: 3000, totalFiles: 42 };
    const prompt = buildAIAnalysisPrompt(result(), b);
    expect(prompt).toContain('5.0s');
    expect(prompt).toContain('10.0s');
    expect(prompt).toContain('42');
  });
  it('handles empty recommendations', () => {
    const r = result({ recommendations: [] });
    const prompt = buildAIAnalysisPrompt(r);
    expect(prompt).toContain('Categories:');
  });
  it('handles no benchmarks', () => {
    const prompt = buildAIAnalysisPrompt(result());
    expect(prompt).not.toContain('Benchmarks:');
  });
});

// ─── 8. Core Score Utilities ────────────────────────────────

describe('shieldColor', () => {
  it('returns brightgreen for score >= 90', () => {
    expect(shieldColor(95)).toBe('brightgreen');
  });
  it('returns yellow for 70-89', () => {
    expect(shieldColor(80)).toBe('yellow');
  });
  it('returns orange for 50-69', () => {
    expect(shieldColor(60)).toBe('orange');
  });
  it('returns red for < 50', () => {
    expect(shieldColor(30)).toBe('red');
  });
  it('handles boundary values', () => {
    expect(shieldColor(90)).toBe('brightgreen');
    expect(shieldColor(70)).toBe('yellow');
    expect(shieldColor(50)).toBe('orange');
  });
});

describe('calcScore', () => {
  it('returns 100 when all items pass', () => {
    expect(calcScore([item({ passed: true, weight: 10 }), item({ passed: true, weight: 20 })])).toBe(100);
  });
  it('returns 0 when no items pass', () => {
    expect(calcScore([item({ passed: false, weight: 10 })])).toBe(0);
  });
  it('returns proportional score', () => {
    expect(calcScore([item({ passed: true, weight: 10 }), item({ passed: false, weight: 10 })])).toBe(50);
  });
  it('returns 0 for empty items', () => {
    expect(calcScore([])).toBe(0);
  });
  it('handles items with zero weight', () => {
    expect(calcScore([item({ passed: false, weight: 0 }), item({ passed: true, weight: 0 })])).toBe(0);
  });
});

describe('level', () => {
  it('returns A for >= 90', () => {
    expect(level(95)).toBe('A');
    expect(level(90)).toBe('A');
  });
  it('returns B for 70-89', () => {
    expect(level(80)).toBe('B');
    expect(level(70)).toBe('B');
  });
  it('returns C for 50-69', () => {
    expect(level(60)).toBe('C');
    expect(level(50)).toBe('C');
  });
  it('returns D for < 50', () => {
    expect(level(30)).toBe('D');
    expect(level(0)).toBe('D');
  });
});

describe('overallScore', () => {
  it('calculates weighted score', () => {
    const cats = [cat({ weight: 60, score: 100 }), cat({ weight: 40, score: 50 })];
    expect(overallScore(cats)).toBeCloseTo(80, 1);
  });
  it('returns 0 for empty categories', () => {
    expect(overallScore([])).toBe(0);
  });
  it('returns 0 when total weight is 0', () => {
    expect(overallScore([cat({ weight: 0, score: 100 })])).toBe(0);
  });
  it('handles single category', () => {
    expect(overallScore([cat({ weight: 100, score: 75 })])).toBe(75);
  });
});

describe('buildRecommendations', () => {
  it('returns recommendations for failed items', () => {
    const c = cat({ items: [item({ id: 'F1', passed: false, description: 'fix me', weight: 5 })] });
    const recs = buildRecommendations([c]);
    expect(recs.length).toBe(1);
    expect(recs[0].text).toContain('fix me');
  });
  it('returns empty for all passing items', () => {
    expect(buildRecommendations([cat()])).toEqual([]);
  });
  it('includes hint when available', () => {
    const c = cat({ items: [item({ id: 'H1', passed: false, description: 'hint item', hint: 'try harder', weight: 1 })] });
    expect(buildRecommendations([c])[0].text).toContain('try harder');
  });
  it('limits to 20 recommendations', () => {
    const items: ScorecardItem[] = Array.from({ length: 25 }, (_, i) => item({ id: `F${i}`, passed: false, weight: 1 }));
    const recs = buildRecommendations([cat({ items })]);
    expect(recs.length).toBe(20);
  });
  it('includes fixCommand when provided', () => {
    const c = cat({ items: [item({ id: 'FC1', passed: false, description: 'fixable', fixCommand: 'npm run fix', weight: 1 })] });
    expect(buildRecommendations([c])[0].fixCommand).toBe('npm run fix');
  });
});

describe('buildAlerts', () => {
  it('returns alerts for failed items with weight >= 3', () => {
    const c = cat({ name: 'Security', items: [item({ id: 'S1', passed: false, description: 'alert!', weight: 3 })] });
    expect(buildAlerts([c])).toHaveLength(1);
  });
  it('skips failed items with low weight', () => {
    const c = cat({ items: [item({ id: 'L1', passed: false, description: 'low', weight: 2 })] });
    expect(buildAlerts([c])).toHaveLength(0);
  });
  it('returns empty for all passing items', () => {
    expect(buildAlerts([cat()])).toEqual([]);
  });
  it('sets severity to error', () => {
    const c = cat({ items: [item({ id: 'E1', passed: false, weight: 5 })] });
    expect(buildAlerts([c])[0].severity).toBe('error');
  });
});

describe('generateBadge', () => {
  it('generates SVG with correct dimensions', () => {
    const svg = generateBadge(85);
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="170"');
    expect(svg).toContain('85');
  });
  it('uses brightgreen for high scores', () => {
    expect(generateBadge(95)).toContain('#4c1');
  });
  it('uses red for low scores', () => {
    expect(generateBadge(30)).toContain('#e05d44');
  });
  it('contains maturidade label', () => {
    expect(generateBadge(50)).toContain('maturidade');
  });
});

describe('buildTrends', () => {
  it('returns trend entries from history', () => {
    const h: ScorecardResult[] = [
      result({ timestamp: '2026-01-01T00:00:00Z', overallScore: 70 }),
      result({ timestamp: '2026-06-01T00:00:00Z', overallScore: 80 }),
    ];
    const trends = buildTrends(h);
    expect(trends).toHaveLength(2);
    expect(trends[0].overallScore).toBe(70);
    expect(trends[1].overallScore).toBe(80);
  });
  it('limits to 20 entries', () => {
    const h: ScorecardResult[] = Array.from({ length: 30 }, (_, i) =>
      result({ timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`, overallScore: i }),
    );
    expect(buildTrends(h)).toHaveLength(20);
  });
  it('includes category scores', () => {
    const h = [result({ categories: [cat({ name: 'Qualidade', score: 90 })] })];
    expect(buildTrends(h)[0].categories[0].score).toBe(90);
  });
});

// ─── 9. Analysis ────────────────────────────────────────────

describe('crossCategoryAnalysis', () => {
  it('returns critical alert when seguranca and qualidade both low', () => {
    const r = result({
      categories: [cat({ name: 'Segurança', score: 30, weight: 20 }), cat({ name: 'Qualidade', score: 40, weight: 20 })],
    });
    const alerts = crossCategoryAnalysis(r);
    expect(alerts.some((a) => a.severity === 'critical')).toBe(true);
  });
  it('returns info when both high', () => {
    const r = result({
      categories: [cat({ name: 'Segurança', score: 95, weight: 20 }), cat({ name: 'Qualidade', score: 92, weight: 20 })],
    });
    const alerts = crossCategoryAnalysis(r);
    expect(alerts.some((a) => a.severity === 'info')).toBe(true);
  });
  it('returns warn when ecossistema low', () => {
    const r = result({ categories: [cat({ name: 'Saúde do Ecossistema', score: 30, weight: 10 })] });
    const alerts = crossCategoryAnalysis(r);
    expect(alerts.some((a) => a.severity === 'warn')).toBe(true);
  });
  it('returns empty when all categories healthy', () => {
    const r = result({
      categories: [
        cat({ name: 'Segurança', score: 80, weight: 20 }),
        cat({ name: 'Qualidade', score: 80, weight: 20 }),
        cat({ name: 'Saúde do Ecossistema', score: 60, weight: 10 }),
      ],
    });
    expect(crossCategoryAnalysis(r)).toEqual([]);
  });
});

describe('forecastScore', () => {
  it('returns low confidence when not enough snapshots', () => {
    mockReaddirSync.mockReturnValue(['s1.json']);
    mockReadFileSync.mockReturnValue(JSON.stringify({ score: 70 }));
    const f = forecastScore();
    expect(f.confidence).toBe('low');
    expect(f.history).toEqual([]);
  });
  it('computes forecast when enough data', () => {
    const scores = [70, 72, 74, 76, 78, 80];
    mockReaddirSync.mockReturnValue(Array.from({ length: 10 }, (_, i) => `snap-${i}.json`));
    let idx = 0;
    mockReadFileSync.mockImplementation(() => JSON.stringify({ score: scores[idx++ % scores.length] }));
    const f = forecastScore();
    expect(f.forecast).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(f.confidence);
    expect(['up', 'stable', 'down']).toContain(f.trend);
  });
  it('returns default on readdir error', () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const f = forecastScore();
    expect(f.forecast).toBe(0);
    expect(f.confidence).toBe('low');
  });
});

describe('scoreDiffExport', () => {
  it('exports diff between two results', () => {
    const r1 = result({ timestamp: '2026-01-01', overallScore: 70, categories: [cat({ name: 'Qualidade', score: 60, weight: 50 })] });
    const r2 = result({ timestamp: '2026-06-01', overallScore: 85, categories: [cat({ name: 'Qualidade', score: 80, weight: 50 })] });
    const diff = JSON.parse(scoreDiffExport(r1, r2));
    expect(diff.from.score).toBe(70);
    expect(diff.to.score).toBe(85);
    expect(diff.categories.Qualidade.diff).toBe(20);
  });
  it('returns empty categories when none match', () => {
    const r1 = result({ categories: [cat({ name: 'A', score: 50, weight: 50 })] });
    const r2 = result({ categories: [cat({ name: 'B', score: 70, weight: 50 })] });
    const diff = JSON.parse(scoreDiffExport(r1, r2));
    expect(Object.keys(diff.categories)).toHaveLength(0);
  });
});

describe('validateYamlContent', () => {
  it('validates when all keys present', () => {
    mockReadFileSync.mockReturnValue('key1: value\nkey2: value');
    expect(validateYamlContent('test.yaml', ['key1', 'key2'])).toEqual({ valid: true, missing: [] });
  });
  it('reports missing keys', () => {
    mockReadFileSync.mockReturnValue('key1: value');
    const result = validateYamlContent('test.yaml', ['key1', 'key2']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['key2']);
  });
  it('returns invalid when file missing', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const result = validateYamlContent('missing.yaml', ['key1']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['key1']);
  });
});

// ─── 10. Template Generation ────────────────────────────────

describe('generateFromTemplate', () => {
  it('generates security-policy template', () => {
    const out = generateFromTemplate('security-policy', { version: '1.0', agents: 'agent-a', network: 'internal', secrets: 'vault' });
    expect(out).toContain('1.0');
    expect(out).toContain('agent-a');
    expect(out).toContain('Política de Segurança');
  });
  it('generates quality-dod template', () => {
    const out = generateFromTemplate('quality-dod', { project: 'MyApp' });
    expect(out).toContain('MyApp');
    expect(out).toContain('Definition of Done');
    expect(out).toContain('Código revisado');
  });
  it('generates architecture-adr template', () => {
    const out = generateFromTemplate('architecture-adr', {
      title: 'Use SQLite',
      status: 'proposed',
      context: 'Need local storage',
      decision: 'Use SQLite with WAL',
    });
    expect(out).toContain('Use SQLite');
    expect(out).toContain('proposed');
  });
  it('returns fallback for unknown template', () => {
    expect(generateFromTemplate('unknown', {})).toBe('Template não encontrado.');
  });
  it('replaces all variables', () => {
    const out = generateFromTemplate('quality-dod', { project: 'TestApp' });
    expect(out).not.toContain('{project}');
  });
});

// ─── 11. Custom Checks ──────────────────────────────────────

describe('loadCustomChecks', () => {
  it('returns empty when no checks file', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(loadCustomChecks()).toEqual([]);
  });
  it('parses simple custom check lines', () => {
    mockReadFileSync.mockReturnValue('- my-id | My Check | exists | .ai/scorecard/my-id\n');
    mockExistsSync.mockReturnValue(true);
    const checks = loadCustomChecks();
    expect(checks.length).toBe(1);
    expect(checks[0].name).toContain('Custom');
  });
  it('handles hasContent type checks', () => {
    mockReadFileSync.mockReturnValueOnce('- my-id | My Check | hasContent | .ai/scorecard/my-id\n').mockReturnValue('x'.repeat(150));
    const checks = loadCustomChecks();
    expect(checks.length).toBe(1);
  });
});

// ─── 12. Snapshot / Regression ──────────────────────────────

describe('saveSnapshot', () => {
  it('creates directory and writes snapshot file', () => {
    mockExistsSync.mockReturnValue(true);
    mockWriteFileSync.mockImplementation(() => {});
    saveSnapshot(result() as unknown as Record<string, unknown>);
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringMatching(/snapshots/), expect.any(String));
  });
  it('creates directory if missing', () => {
    mockExistsSync.mockReturnValue(false);
    saveSnapshot(result() as unknown as Record<string, unknown>);
    expect(mockMkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });
});

describe('detectRegression', () => {
  it('returns no regression when only one snapshot', () => {
    mockReaddirSync.mockReturnValue(['snap-1.json']);
    expect(detectRegression(result(), 5).regressed).toBe(false);
  });
  it('detects category drops above threshold', () => {
    mockReaddirSync.mockReturnValue(['snap-2.json', 'snap-1.json'].sort().reverse());
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        score: 90,
        categories: [{ name: 'Qualidade', score: 90 }],
      }),
    );
    const r = result({ overallScore: 70, categories: [cat({ name: 'Qualidade', score: 60, weight: 50 })] });
    const d = detectRegression(r, 5);
    expect(d.regressed).toBe(true);
    expect(d.drops.length).toBeGreaterThan(0);
    expect(d.drops[0].category).toBe('Qualidade');
  });
  it('returns default on readdir error', () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const d = detectRegression(result(), 5);
    expect(d.regressed).toBe(false);
  });
});

describe('linkScoreToCommits', () => {
  it('returns traces and score history', () => {
    mockReaddirSync.mockReturnValue(['snap-1.json']);
    mockReadFileSync.mockReturnValue(JSON.stringify({ score: 85 }));
    mockExecFileSync.mockReturnValue('abc1234 commit msg\n');
    const linked = linkScoreToCommits(result().overallScore, 'package.json');
    expect(linked).toHaveLength(1);
    expect(linked[0].commit).toBe('abc1234');
  });
  it('handles readdir error', () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const linked = linkScoreToCommits(result().overallScore, 'package.json');
    expect(linked).toEqual([]);
  });
});

// ─── 13. Notifications / Tasks ──────────────────────────────

describe('sendNotifications', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('writes to notification log file', () => {
    const nots: Notification[] = [{ type: 'file', message: 'test alert', level: 'warn' }];
    sendNotifications(nots);
    expect(mockAppendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('notifications.log'),
      expect.stringContaining('[WARN]'),
      'utf8',
    );
  });
  it('sends webhook when type is webhook', () => {
    const nots: Notification[] = [{ type: 'webhook', message: 'webhook test', level: 'error' }];
    sendNotifications(nots, 'http://example.com/hook');
    expect(mockHttpRequest).toHaveBeenCalled();
  });
  it('handles multiple notifications', () => {
    const nots: Notification[] = [
      { type: 'file', message: 'first', level: 'info' },
      { type: 'file', message: 'second', level: 'error' },
    ];
    sendNotifications(nots);
    expect(mockAppendFileSync).toHaveBeenCalledTimes(2);
  });
});

describe('createTasksFromFailures', () => {
  it('creates task entries for failed items with weight >= 2', () => {
    mockReadFileSync.mockReturnValue('# Backlog\n');
    const r = result({
      categories: [
        cat({
          items: [
            item({ id: 'T1', passed: false, weight: 2, description: 'fix task' }),
            item({ id: 'T2', passed: false, weight: 1, description: 'skip' }),
          ],
        }),
      ],
    });
    const count = createTasksFromFailures(r);
    expect(count).toBe(1);
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('backlog.md'), expect.stringContaining('T1'), 'utf8');
  });
  it('skips existing tasks', () => {
    mockReadFileSync.mockReturnValue('# Backlog\n\nT1');
    const r = result({ categories: [cat({ items: [item({ id: 'T1', passed: false, weight: 2 })] })] });
    expect(createTasksFromFailures(r)).toBe(0);
  });
  it('handles categories with zero weight', () => {
    mockReadFileSync.mockReturnValue('# Backlog\n');
    const r = result({ categories: [cat({ weight: 0, items: [item({ id: 'Z1', passed: false, weight: 5 })] })] });
    expect(createTasksFromFailures(r)).toBe(0);
  });
});

// ─── 14. Publish ────────────────────────────────────────────

describe('publishResult', () => {
  it('sends HTTP POST to webhook URL', () => {
    publishResult(result(), 'http://example.com/hook');
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'example.com',
        path: '/hook',
        method: 'POST',
      }),
    );
  });
  it('does nothing when no webhook URL', () => {
    publishResult(result());
    expect(mockHttpRequest).not.toHaveBeenCalled();
  });
  it('handles invalid URL gracefully', () => {
    expect(() => publishResult(result(), 'not-a-url')).not.toThrow();
  });
});
