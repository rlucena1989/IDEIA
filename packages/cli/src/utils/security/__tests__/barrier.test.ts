import fs from 'node:fs';
import path from 'node:path';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

import { loadRules, saveRules, checkBarriers, addRule, BarrierRule, BarrierCheckResult } from '../barrier';

const mockExistsSync = fs.existsSync as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;
const mockMkdirSync = fs.mkdirSync as jest.Mock;
const mockAppendFileSync = fs.appendFileSync as jest.Mock;

const TEST_CWD = '/test/project';
const RULES_PATH = path.join(TEST_CWD, '.ai', 'policies', 'barriers.json');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loadRules', () => {
  it('returns DEFAULT_RULES when no custom rules file exists', () => {
    mockExistsSync.mockReturnValue(false);
    const rules = loadRules(TEST_CWD);
    expect(rules).toBeDefined();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]).toHaveProperty('pattern');
    expect(rules[0]).toHaveProperty('severity');
    expect(rules[0]).toHaveProperty('description');
  });

  it('loads custom rules from file when exists', () => {
    const customRules: BarrierRule[] = [
      { pattern: 'test*.ts', severity: 'block', description: 'Test rule' },
    ];
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(customRules));
    const rules = loadRules(TEST_CWD);
    expect(rules).toEqual(customRules);
    expect(mockReadFileSync).toHaveBeenCalledWith(RULES_PATH, 'utf-8');
  });

  it('falls back to defaults on JSON parse error', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('invalid json{{{');
    const rules = loadRules(TEST_CWD);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0].pattern).toBe('auth*.ts');
  });

  it('falls back to defaults on read error', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => { throw new Error('EACCES'); });
    const rules = loadRules(TEST_CWD);
    expect(rules.length).toBeGreaterThan(0);
  });
});

describe('saveRules', () => {
  it('writes rules to the correct path', () => {
    const rules: BarrierRule[] = [
      { pattern: '*.env', severity: 'block', description: 'Env files' },
    ];
    mockMkdirSync.mockReturnValue(undefined);
    saveRules(TEST_CWD, rules);
    expect(mockMkdirSync).toHaveBeenCalledWith(path.join(TEST_CWD, '.ai', 'policies'), { recursive: true });
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      RULES_PATH,
      JSON.stringify(rules, null, 2),
      'utf-8',
    );
  });
});

describe('checkBarriers', () => {
  it('blocks files matching block rules', () => {
    mockExistsSync.mockReturnValue(false);
    const result = checkBarriers(TEST_CWD, ['auth.ts', 'src/foo.ts']);
    expect(result.blocked).toContain('auth.ts');
    expect(result.blocked).not.toContain('src/foo.ts');
  });

  it('warns on files matching warn rules', () => {
    mockExistsSync.mockReturnValue(false);
    const result = checkBarriers(TEST_CWD, ['user-schema.ts', 'foo.ts']);
    expect(result.warnings).toContain('user-schema.ts');
  });

  it('returns empty for unblocked files', () => {
    mockExistsSync.mockReturnValue(false);
    const result = checkBarriers(TEST_CWD, ['README.md', 'src/index.ts']);
    expect(result.blocked).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('sets bypass property when reason provided', () => {
    mockExistsSync.mockReturnValue(false);
    const result = checkBarriers(TEST_CWD, ['auth.ts'], 'Urgent fix');
    expect(result.bypass).toBe('Urgent fix');
  });

  it('clears blocked files and logs audit entry on bypass', () => {
    mockExistsSync.mockReturnValue(false);
    mockAppendFileSync.mockReturnValue(undefined);
    const result = checkBarriers(TEST_CWD, ['auth.ts'], 'Emergency deploy');
    expect(result.blocked).toEqual([]);
    expect(mockMkdirSync).toHaveBeenCalledWith(
      path.join(TEST_CWD, '.ai', 'audit-trail'),
      { recursive: true },
    );
    expect(mockAppendFileSync).toHaveBeenCalled();
    const appendArg = mockAppendFileSync.mock.calls[0][1] as string;
    expect(appendArg).toContain('BYPASS');
    expect(appendArg).toContain('Emergency deploy');
  });

  it('does not log bypass when no blocked files', () => {
    mockExistsSync.mockReturnValue(false);
    const result = checkBarriers(TEST_CWD, ['README.md'], 'Bypass with no blocked');
    expect(result.blocked).toEqual([]);
    expect(mockAppendFileSync).not.toHaveBeenCalled();
  });

  it('handles wildcard patterns correctly', () => {
    mockExistsSync.mockReturnValue(false);
    const result = checkBarriers(TEST_CWD, ['credentials.json', 'prisma/schema.prisma']);
    expect(result.blocked).toContain('credentials.json');
    expect(result.blocked).toContain('prisma/schema.prisma');
  });

  it('returns null bypass when no reason given', () => {
    mockExistsSync.mockReturnValue(false);
    const result = checkBarriers(TEST_CWD, ['auth.ts']);
    expect(result.bypass).toBeNull();
  });

  it('uses custom rules when loaded from file', () => {
    const customRules: BarrierRule[] = [
      { pattern: 'custom_*.ts', severity: 'block', description: 'Custom' },
    ];
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(customRules));
    const result = checkBarriers(TEST_CWD, ['custom_auth.ts', 'auth.ts']);
    expect(result.blocked).toContain('custom_auth.ts');
    expect(result.blocked).not.toContain('auth.ts');
  });
});

describe('addRule', () => {
  it('loads existing rules, appends new rule, and saves', () => {
    mockExistsSync.mockReturnValue(false);
    addRule(TEST_CWD, 'new*.ts', 'block', 'New rule');
    expect(mockWriteFileSync).toHaveBeenCalled();
    const writeArg = mockWriteFileSync.mock.calls[0][1] as string;
    const savedRules = JSON.parse(writeArg) as BarrierRule[];
    const added = savedRules.find(r => r.pattern === 'new*.ts');
    expect(added).toBeDefined();
    expect(added!.severity).toBe('block');
    expect(added!.description).toBe('New rule');
  });

  it('adds to existing custom rules', () => {
    const existingRules: BarrierRule[] = [
      { pattern: 'old*.ts', severity: 'warn', description: 'Existing' },
    ];
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(existingRules));
    addRule(TEST_CWD, 'new*.ts', 'block', 'Added rule');
    const writeArg = mockWriteFileSync.mock.calls[0][1] as string;
    const savedRules = JSON.parse(writeArg) as BarrierRule[];
    expect(savedRules).toHaveLength(2);
    expect(savedRules[1].pattern).toBe('new*.ts');
  });

  it('can add warn severity rule', () => {
    mockExistsSync.mockReturnValue(false);
    addRule(TEST_CWD, 'config*.ts', 'warn', 'Config warning rule');
    const writeArg = mockWriteFileSync.mock.calls[0][1] as string;
    const savedRules = JSON.parse(writeArg) as BarrierRule[];
    const added = savedRules.find(r => r.pattern === 'config*.ts');
    expect(added!.severity).toBe('warn');
  });
});
