import fs from 'node:fs';
import path from 'node:path';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

import { antiSlop, regressionCheck, securityScan, performanceCheck, runReview } from '../index';

const mockReaddirSync = fs.readdirSync as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;
const mockMkdirSync = fs.mkdirSync as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;

const TEST_CWD = path.resolve('/test/project');

function createDirent(name: string, type: 'file' | 'dir'): fs.Dirent {
  return {
    name,
    isDirectory: () => type === 'dir',
    isFile: () => type === 'file',
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
  } as fs.Dirent;
}

function setupMockFiles(files: Record<string, string>) {
  const dirEntries: Record<string, Array<{ name: string; type: 'file' | 'dir' }>> = {};
  const fileContents: Record<string, string> = {};

  for (const rawPath of Object.keys(files)) {
    const normalized = path.resolve(rawPath);
    fileContents[normalized] = files[rawPath];
    const dir = path.resolve(path.dirname(rawPath));
    const base = path.basename(rawPath);
    if (!dirEntries[dir]) dirEntries[dir] = [];
    if (!dirEntries[dir].some(e => e.name === base)) {
      dirEntries[dir].push({ name: base, type: 'file' });
    }
  }

  mockReaddirSync.mockImplementation((dir: string) => {
    const entries = dirEntries[path.resolve(dir)];
    if (!entries) return [];
    return entries.map(e => createDirent(e.name, e.type));
  });

  mockReadFileSync.mockImplementation((file: string) => {
    return fileContents[path.resolve(file)] || '';
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('antiSlop', () => {
  it('detects TODO without ticket reference', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: '// TODO fix this later\n' });
    const findings = antiSlop(TEST_CWD);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ type: 'anti-slop', severity: 'medium', file: 'foo.ts', line: 1 });
    expect(findings[0].message).toContain('TODO/FIXME');
  });

  it('skips TODO with ticket reference', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: '// TODO(PRJ-123) fix this later\n' });
    const findings = antiSlop(TEST_CWD);
    expect(findings).toHaveLength(0);
  });

  it('detects FIXME without ticket', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'bar.ts')]: '// FIXME broken logic\n' });
    const findings = antiSlop(TEST_CWD);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('TODO/FIXME');
  });

  it('detects HACK without ticket', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'hack.ts')]: '// HACK workaround\n' });
    const findings = antiSlop(TEST_CWD);
    expect(findings).toHaveLength(1);
  });

  it('detects console.log in non-test files', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: 'console.log("debug")\n' });
    const findings = antiSlop(TEST_CWD);
    const consoleFindings = findings.filter(f => f.message.includes('console.log'));
    expect(consoleFindings).toHaveLength(1);
    expect(consoleFindings[0].severity).toBe('low');
  });

  it('skips console.log in test files', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'foo.test.ts')]: 'console.log("debug")\n' });
    const findings = antiSlop(TEST_CWD);
    const consoleFindings = findings.filter(f => f.message.includes('console.log'));
    expect(consoleFindings).toHaveLength(0);
  });

  it('detects empty catch blocks', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: 'try { x() } catch (e) {}\n' });
    const findings = antiSlop(TEST_CWD);
    const emptyCatch = findings.filter(f => f.message.includes('Catch block'));
    expect(emptyCatch).toHaveLength(1);
    expect(emptyCatch[0].severity).toBe('high');
  });

  it('detects duplicate lines', () => {
    const line = 'const x = someLongVariableNameForDuplicationDetection;\n';
    const content = Array.from({ length: 10 }, (_, i) => `const unique${i} = ${i};\n`).join('') +
      line.repeat(4);
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: content });
    const findings = antiSlop(TEST_CWD);
    const dupes = findings.filter(f => f.message.includes('Linha duplicada'));
    expect(dupes.length).toBeGreaterThanOrEqual(2);
  });

  it('skips files in node_modules or hidden dirs', () => {
    const nodeModulesFile = path.join(TEST_CWD, 'node_modules', 'dep.ts');
    setupMockFiles({ [nodeModulesFile]: '// TODO bad\n' });
    const findings = antiSlop(TEST_CWD);
    expect(findings).toHaveLength(0);
  });

  it('handles empty directory gracefully', () => {
    mockReaddirSync.mockReturnValue([]);
    expect(antiSlop(TEST_CWD)).toEqual([]);
  });

  it('handles readdir error gracefully', () => {
    mockReaddirSync.mockImplementation(() => { throw new Error('ENOENT'); });
    expect(antiSlop(TEST_CWD)).toEqual([]);
  });
});

describe('regressionCheck', () => {
  it('detects duplicate exports across files', () => {
    setupMockFiles({
      [path.join(TEST_CWD, 'a.ts')]: 'export interface User { name: string }\nexport const foo = 1;\n',
      [path.join(TEST_CWD, 'b.ts')]: 'export interface User { age: number }\nexport const bar = 2;\n',
    });
    const findings = regressionCheck(TEST_CWD);
    const dupes = findings.filter(f => f.message.includes('"User"'));
    expect(dupes).toHaveLength(1);
    expect(dupes[0].severity).toBe('medium');
    expect(dupes[0].type).toBe('regression');
  });

  it('finds no duplicates for unique exports', () => {
    setupMockFiles({
      [path.join(TEST_CWD, 'a.ts')]: 'export interface User { name: string }\n',
      [path.join(TEST_CWD, 'b.ts')]: 'export type Status = "active" | "inactive";\n',
    });
    const findings = regressionCheck(TEST_CWD);
    expect(findings).toHaveLength(0);
  });

  it('only scans .ts and .tsx files', () => {
    setupMockFiles({
      [path.join(TEST_CWD, 'a.ts')]: 'export const foo = 1;\n',
      [path.join(TEST_CWD, 'a.js')]: 'export const foo = 1;\n',
    });
    const findings = regressionCheck(TEST_CWD);
    expect(findings).toHaveLength(0);
  });
});

describe('securityScan', () => {
  it('detects hardcoded API keys', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'config.ts')]: 'const api_key = "sk-1234567890abcdef";\n' });
    const findings = securityScan(TEST_CWD);
    const secFindings = findings.filter(f => f.type === 'security');
    expect(secFindings.length).toBeGreaterThanOrEqual(1);
    expect(secFindings[0].severity).toBe('critical');
  });

  it('detects private keys', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'config.ts')]: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n' });
    const findings = securityScan(TEST_CWD);
    const keyFindings = findings.filter(f => f.message.includes('Chave privada'));
    expect(keyFindings).toHaveLength(1);
  });

  it('detects env var overrides in code', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'app.ts')]: "process.env.NODE_ENV = 'development';\n" });
    const findings = securityScan(TEST_CWD);
    const envFindings = findings.filter(f => f.message.includes('Variavel de ambiente'));
    expect(envFindings).toHaveLength(1);
    expect(envFindings[0].severity).toBe('high');
  });

  it('returns empty for clean files', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'clean.ts')]: 'const x = 1;\n' });
    expect(securityScan(TEST_CWD)).toEqual([]);
  });
});

describe('performanceCheck', () => {
  it('detects await inside loop (N+1)', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'service.ts')]: 'for (const item of items) { await fetch(item); }\n' });
    const findings = performanceCheck(TEST_CWD);
    const n1 = findings.filter(f => f.message.includes('N+1'));
    expect(n1).toHaveLength(1);
    expect(n1[0].severity).toBe('high');
  });

  it('detects large array literals', () => {
    const items = Array.from({ length: 22 }, (_, i) => `"${String.fromCharCode(97 + i)}"`).join(',');
    const arr = `[${items}];`;
    setupMockFiles({ [path.join(TEST_CWD, 'data.ts')]: arr });
    const findings = performanceCheck(TEST_CWD);
    const largeArr = findings.filter(f => f.message.includes('Array literal'));
    expect(largeArr.length).toBeGreaterThanOrEqual(1);
    expect(largeArr[0].severity).toBe('low');
  });

  it('detects sync fs operations', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'fs.ts')]: 'const data = fs.readFileSync("file.txt");\n' });
    const findings = performanceCheck(TEST_CWD);
    const syncFs = findings.filter(f => f.message.includes('I/O sincrona'));
    expect(syncFs).toHaveLength(1);
    expect(syncFs[0].severity).toBe('medium');
  });

  it('returns empty for clean code', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'clean.ts')]: 'const x = await Promise.all(items);\n' });
    expect(performanceCheck(TEST_CWD)).toEqual([]);
  });

  it('only scans .ts and .tsx files', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'code.js')]: 'for (const item of items) { await fetch(item); }\n' });
    expect(performanceCheck(TEST_CWD)).toEqual([]);
  });
});

describe('runReview', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('runs specified checks and returns findings with summary', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: 'const api_key = "secret";\n' });
    const result = runReview(['security'], TEST_CWD);
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    expect(result.summary.total).toBeGreaterThanOrEqual(1);
    expect(result.summary.critical).toBeGreaterThanOrEqual(1);
  });

  it('runs multiple check types', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: '// TODO fix\nconst api_key = "sk-test";\nconsole.log("debug");\n' });
    const result = runReview(['anti-slop', 'security'], TEST_CWD);
    const types = new Set(result.findings.map(f => f.type));
    expect(types.has('anti-slop')).toBe(true);
    expect(types.has('security')).toBe(true);
  });

  it('returns empty for unknown check names', () => {
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: 'const x = 1;\n' });
    const result = runReview(['unknown-check'], TEST_CWD);
    expect(result.findings).toEqual([]);
    expect(result.summary.total).toBe(0);
  });

  it('outputs JSON when json=true', () => {
    const logSpy = jest.spyOn(console, 'log');
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: 'const api_key = "sk-test";\n' });
    runReview(['security'], TEST_CWD, true);
    expect(logSpy).toHaveBeenCalled();
    const callArg = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(callArg);
    expect(parsed).toHaveProperty('findings');
    expect(parsed).toHaveProperty('summary');
  });

  it('writes report file when json=false', () => {
    const logSpy = jest.spyOn(console, 'log');
    setupMockFiles({ [path.join(TEST_CWD, 'foo.ts')]: '// TODO test\n' });
    const result = runReview(['anti-slop'], TEST_CWD);
    expect(mockMkdirSync).toHaveBeenCalledWith(path.join(TEST_CWD, '.ai', 'reports'), { recursive: true });
    expect(mockWriteFileSync).toHaveBeenCalled();
    const writeArg = mockWriteFileSync.mock.calls[0][1] as string;
    expect(writeArg).toContain('Adversarial Review Report');
    expect(logSpy).toHaveBeenCalled();
  });
});
