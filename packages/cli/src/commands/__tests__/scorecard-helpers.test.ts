const mockCwd = jest.fn().mockReturnValue('/test/project');
const mockExists = jest.fn();
const mockRead = jest.fn();
const mockReadDir = jest.fn();
const mockWrite = jest.fn();
const mockMkDir = jest.fn();
const mockStat = jest.fn();

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      cwd: mockCwd,
      exists: mockExists,
      read: mockRead,
      readDir: mockReadDir,
      write: mockWrite,
      mkDir: mockMkDir,
      stat: mockStat,
    },
  })),
}));

const mockSpawnSync = jest.fn();
const mockExecFileSync = jest.fn();
jest.mock('node:child_process', () => ({
  spawnSync: mockSpawnSync,
  execFileSync: mockExecFileSync,
}));

import {
  root, ex, read, hasContent, dirSize, jsonParse,
  calcScore, level, shieldColor, computeGit,
  validateYamlContent, generateFromTemplate,
  npmAudit, coveragePct, pylintOk, golintOk, oldestDep,
  runNode, git, gitExists, runAllScripts, jestResultOk,
} from '../scorecard-helpers';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('root', () => {
  it('returns cwd from IO', () => {
    expect(root()).toBe('/test/project');
    expect(mockCwd).toHaveBeenCalled();
  });
});

describe('ex', () => {
  it('checks file existence', () => {
    mockExists.mockReturnValue(true);
    expect(ex('package.json')).toBe(true);
    expect(mockExists).toHaveBeenCalled();
  });

  it('returns false for missing files', () => {
    mockExists.mockReturnValue(false);
    expect(ex('missing')).toBe(false);
  });
});

describe('read', () => {
  it('reads file content', () => {
    mockRead.mockReturnValue('file content');
    expect(read('file.txt')).toBe('file content');
  });

  it('returns null on read error', () => {
    mockRead.mockImplementation(() => { throw new Error('ENOENT'); });
    expect(read('missing.txt')).toBeNull();
  });
});

describe('hasContent', () => {
  it('returns true for content > 100 chars', () => {
    mockRead.mockReturnValue('a'.repeat(101));
    expect(hasContent('big.txt')).toBe(true);
  });

  it('returns false for content <= 100 chars', () => {
    mockRead.mockReturnValue('short');
    expect(hasContent('short.txt')).toBe(false);
  });

  it('returns false for null content', () => {
    mockRead.mockReturnValue(null);
    expect(hasContent('null.txt')).toBe(false);
  });

  it('returns false for whitespace-only content', () => {
    mockRead.mockReturnValue('   ');
    expect(hasContent('ws.txt')).toBe(false);
  });
});

describe('dirSize', () => {
  it('returns directory entry count', () => {
    mockReadDir.mockReturnValue(['a', 'b', 'c']);
    expect(dirSize('somedir')).toBe(3);
  });

  it('returns 0 on error', () => {
    mockReadDir.mockImplementation(() => { throw new Error('ENOENT'); });
    expect(dirSize('missing')).toBe(0);
  });

  it('returns 0 for empty directory', () => {
    mockReadDir.mockReturnValue([]);
    expect(dirSize('empty')).toBe(0);
  });
});

describe('jsonParse', () => {
  it('parses valid JSON', () => {
    mockRead.mockReturnValue('{"key": "value"}');
    expect(jsonParse('file.json')).toEqual({ key: 'value' });
  });

  it('returns null for invalid JSON', () => {
    mockRead.mockReturnValue('not-json');
    expect(jsonParse('bad.json')).toBeNull();
  });

  it('returns null when read returns null', () => {
    mockRead.mockReturnValue(null);
    expect(jsonParse('missing.json')).toBeNull();
  });
});

describe('calcScore', () => {
  it('returns 100 when all items pass', () => {
    expect(calcScore([{ weight: 1, passed: true }, { weight: 3, passed: true }])).toBe(100);
  });

  it('returns 0 when no items pass', () => {
    expect(calcScore([{ weight: 1, passed: false }])).toBe(0);
  });

  it('calculates proportional score', () => {
    expect(calcScore([{ weight: 2, passed: true }, { weight: 2, passed: false }])).toBe(50);
  });

  it('returns 0 for empty items', () => {
    expect(calcScore([])).toBe(0);
  });

  it('handles single item', () => {
    expect(calcScore([{ weight: 10, passed: true }])).toBe(100);
    expect(calcScore([{ weight: 10, passed: false }])).toBe(0);
  });

  it('handles zero total weight', () => {
    expect(calcScore([{ weight: 0, passed: true }])).toBe(0);
  });
});

describe('level', () => {
  it('returns A for score >= 90', () => { expect(level(90)).toBe('A');
    expect(level(100)).toBe('A');
    expect(level(95)).toBe('A'); });
  it('returns B for 70-89', () => { expect(level(70)).toBe('B');
    expect(level(89)).toBe('B');
    expect(level(75)).toBe('B'); });
  it('returns C for 50-69', () => { expect(level(50)).toBe('C');
    expect(level(69)).toBe('C');
    expect(level(55)).toBe('C'); });
  it('returns D for < 50', () => { expect(level(0)).toBe('D');
    expect(level(49)).toBe('D');
    expect(level(30)).toBe('D'); });
});

describe('shieldColor', () => {
  it('returns brightgreen for score >= 90', () => { expect(shieldColor(90)).toBe('brightgreen');
    expect(shieldColor(100)).toBe('brightgreen'); });
  it('returns yellow for 70-89', () => { expect(shieldColor(70)).toBe('yellow');
    expect(shieldColor(89)).toBe('yellow'); });
  it('returns orange for 50-69', () => { expect(shieldColor(50)).toBe('orange');
    expect(shieldColor(69)).toBe('orange'); });
  it('returns red for < 50', () => { expect(shieldColor(0)).toBe('red');
    expect(shieldColor(49)).toBe('red'); });
});

describe('generateFromTemplate', () => {
  it('generates security-policy template', () => {
    const result = generateFromTemplate('security-policy', { version: '1.0', agents: 'agent1', network: 'net1', secrets: 'sec1' });
    expect(result).toContain('# Política de Segurança');
    expect(result).toContain('## Versão: 1.0');
    expect(result).toContain('### Agentes');
    expect(result).toContain('- agent1');
  });

  it('generates quality-dod template', () => {
    const result = generateFromTemplate('quality-dod', { project: 'Test' });
    expect(result).toContain('# Definition of Done');
    expect(result).toContain('## Test');
  });

  it('generates architecture-adr template', () => {
    const result = generateFromTemplate('architecture-adr', { title: 'ADR Title', status: 'proposed', context: 'ctx', decision: 'dec' });
    expect(result).toContain('# ADR: ADR Title');
    expect(result).toContain('## Status: proposed');
  });

  it('returns fallback for unknown template', () => {
    const result = generateFromTemplate('unknown', {});
    expect(result).toBe('Template não encontrado.');
  });

  it('replaces variables correctly', () => {
    const result = generateFromTemplate('quality-dod', { project: 'MyProject' });
    expect(result).toContain('MyProject');
    expect(result).not.toContain('{project}');
  });
});

describe('validateYamlContent', () => {
  it('returns valid when all keys found', () => {
    mockRead.mockReturnValue('key1: val\nkey2: val');
    expect(validateYamlContent('file.yaml', ['key1', 'key2'])).toEqual({ valid: true, missing: [] });
  });

  it('returns missing keys', () => {
    mockRead.mockReturnValue('key1: val');
    const result = validateYamlContent('file.yaml', ['key1', 'key2']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['key2']);
  });

  it('handles null file', () => {
    mockRead.mockReturnValue(null);
    const result = validateYamlContent('missing.yaml', ['key1']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['key1']);
  });

  it('handles empty requiredKeys', () => {
    mockRead.mockReturnValue('content');
    expect(validateYamlContent('file.yaml', [])).toEqual({ valid: true, missing: [] });
  });
});

describe('computeGit', () => {
  beforeEach(() => {
    mockExecFileSync.mockReset();
  });

  it('returns no-git when git not available', () => {
    mockExecFileSync.mockImplementation(() => { throw new Error('not a git repo'); });
    const result = computeGit();
    expect(result.branch).toBe('no-git');
    expect(result.commit).toBe('0000000');
    expect(result.message).toBe('not a git repository');
  });

  it('returns git info when available', () => {
    mockExecFileSync
      .mockReturnValueOnce('.git')        // gitExists
      .mockReturnValueOnce('main\n')       // branch
      .mockReturnValueOnce('abc1234\n')    // commit
      .mockReturnValueOnce('feat: add test\n');  // message
    const result = computeGit();
    expect(result.branch).toBe('main');
    expect(result.commit).toBe('abc1234');
    expect(result.message).toBe('feat: add test');
  });

  it('handles git command failures gracefully', () => {
    mockExecFileSync
      .mockReturnValueOnce('.git')
      .mockImplementationOnce(() => { throw new Error('fail'); });
    const result = computeGit();
    expect(result.branch).toBe('unknown');
  });
});

describe('npmAudit', () => {
  it('parses npm audit output', () => {
    mockExecFileSync.mockReturnValue(JSON.stringify({ metadata: { vulnerabilities: { critical: 1, high: 2, moderate: 3, low: 4 } } }));
    expect(npmAudit()).toEqual({ critical: 1, high: 2, moderate: 3, low: 4 });
  });

  it('returns zeros on error', () => {
    mockExecFileSync.mockImplementation(() => { throw new Error('npm error'); });
    expect(npmAudit()).toEqual({ critical: 0, high: 0, moderate: 0, low: 0 });
  });

  it('handles missing metadata', () => {
    mockExecFileSync.mockReturnValue(JSON.stringify({}));
    expect(npmAudit()).toEqual({ critical: 0, high: 0, moderate: 0, low: 0 });
  });
});

describe('coveragePct', () => {
  it('returns coverage percentage', () => {
    mockRead.mockReturnValue(JSON.stringify({ total: { lines: { pct: 85.3 } } }));
    expect(coveragePct()).toBe(85);
  });

  it('returns null when no coverage file', () => {
    mockRead.mockReturnValue(null);
    expect(coveragePct()).toBeNull();
  });

  it('returns null when total missing', () => {
    mockRead.mockReturnValue(JSON.stringify({}));
    expect(coveragePct()).toBeNull();
  });

  it('rounds the percentage', () => {
    mockRead.mockReturnValue(JSON.stringify({ total: { lines: { pct: 84.7 } } }));
    expect(coveragePct()).toBe(85);
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

  it('returns false on error', () => {
    mockSpawnSync.mockImplementation(() => { throw new Error('no flake8'); });
    expect(pylintOk()).toBe(false);
  });
});

describe('golintOk', () => {
  it('returns true when go is not available', () => {
    mockSpawnSync.mockImplementation(() => { throw new Error('no go'); });
    expect(golintOk()).toBe(true);
  });

  it('returns true when golangci-lint passes', () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 0 })   // go version
      .mockReturnValueOnce({ status: 0 });   // golangci-lint
    expect(golintOk()).toBe(true);
  });

  it('returns false when golangci-lint fails', () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: 1 });
    expect(golintOk()).toBe(false);
  });
});

describe('oldestDep', () => {
  it('returns null when no package.json', () => {
    mockRead.mockReturnValue(null);
    expect(oldestDep()).toBeNull();
  });

  it('returns warning when deps on major 1-', () => {
    mockRead.mockReturnValue(JSON.stringify({ dependencies: { foo: '^0.0.1', bar: '^2.0.0' } }));
    const result = oldestDep();
    expect(result).toContain('1 deps na major 1-');
  });

  it('returns null when all deps are modern', () => {
    mockRead.mockReturnValue(JSON.stringify({ dependencies: { foo: '^18.0.0' } }));
    expect(oldestDep()).toBeNull();
  });

  it('handles version strings with non-numeric prefixes', () => {
    mockRead.mockReturnValue(JSON.stringify({ dependencies: { foo: '~0.0.1' } }));
    const result = oldestDep();
    expect(result).toContain('1 deps na major 1-');
  });
});

describe('git', () => {
  it('calls execFileSync with args', () => {
    mockExecFileSync.mockReturnValue('output\n');
    expect(git(['status'])).toBe('output');
    expect(mockExecFileSync).toHaveBeenCalledWith('git', ['status'], expect.any(Object));
  });

  it('returns null on failure', () => {
    mockExecFileSync.mockImplementation(() => { throw new Error('git error'); });
    expect(git(['status'])).toBeNull();
  });
});

describe('gitExists', () => {
  it('returns true when git dir exists', () => {
    mockExecFileSync.mockReturnValue('.git\n');
    expect(gitExists()).toBe(true);
  });

  it('returns false when not a git repo', () => {
    mockExecFileSync.mockImplementation(() => { throw new Error('fatal'); });
    expect(gitExists()).toBe(false);
  });
});

describe('runNode', () => {
  it('spawns node with script and args', () => {
    mockSpawnSync.mockReturnValue({ status: 0 });
    expect(runNode('script.js', ['arg1'])).toBe(true);
    expect(mockSpawnSync).toHaveBeenCalledWith('node', [expect.stringMatching(/script\.js/), 'arg1'], expect.any(Object));
  });

  it('returns false on non-zero exit', () => {
    mockSpawnSync.mockReturnValue({ status: 1 });
    expect(runNode('script.js')).toBe(false);
  });

  it('returns false on error', () => {
    mockSpawnSync.mockImplementation(() => { throw new Error('spawn error'); });
    expect(runNode('script.js')).toBe(false);
  });
});

describe('runAllScripts', () => {
  it('returns true when all scripts pass', () => {
    mockReadDir.mockReturnValue(['a.js', 'b.js']);
    mockSpawnSync.mockReturnValue({ status: 0 });
    expect(runAllScripts()).toBe(true);
  });

  it('returns false when a script fails', () => {
    mockReadDir.mockReturnValue(['a.js']);
    mockSpawnSync.mockReturnValue({ status: 1 });
    expect(runAllScripts()).toBe(false);
  });

  it('returns false when readDir throws', () => {
    mockReadDir.mockImplementation(() => { throw new Error('ENOENT'); });
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

  it('returns false on error', () => {
    mockSpawnSync.mockImplementation(() => { throw new Error('no jest'); });
    expect(jestResultOk()).toBe(false);
  });
});
