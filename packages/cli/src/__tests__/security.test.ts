import { runSecurityCheck, runSecurityDiff, runSecurityBaseline, runSecurityLogs, SecurityDeps } from '../commands/security';

function makeDeps(overrides: Partial<SecurityDeps> = {}): SecurityDeps {
  const lines: string[] = [];
  return {
    root: '/test',
    loadBaseline: () => [],
    getCurrentRules: () => [],
    detectDowngrades: () => [],
    evaluateFindings: () => ({ message: 'ok', blocked: false, criticalCount: 0, findings: [] }),
    logDowngradeAttempt: () => {},
    createBaseline: () => [],
    loadDowngradeLogs: () => [],
    printLine: (msg: string) => { lines.push(msg); },
    printResult: () => {},
    ...overrides,
  };
}

describe('runSecurityCheck', () => {
  it('prints message when no baseline exists', () => {
    const lines: string[] = [];
    runSecurityCheck(makeDeps({
      printLine: (m) => { lines.push(m); },
    }), {});
    expect(lines.some(l => l.includes('Nenhum baseline'))).toBe(true);
  });

  it('prints findings when downgrades detected', () => {
    const lines: string[] = [];
    runSecurityCheck(makeDeps({
      loadBaseline: () => [{ file: 'test.yaml', rules: [] }],
      detectDowngrades: () => [{ file: 'test.yaml', rule: 'eval()', action: 'removed', severity: 'high' }],
      evaluateFindings: () => ({ message: 'downgrade detected', blocked: false, criticalCount: 0, findings: [{ file: 'test.yaml', rule: 'eval()', action: 'removed', severity: 'high' }] }),
      printLine: (m) => { lines.push(m); },
    }), {});
    expect(lines.some(l => l.includes('eval()'))).toBe(true);
  });

  it('sets exitCode when blocked', () => {
    const prev = process.exitCode;
    runSecurityCheck(makeDeps({
      loadBaseline: () => [{ file: 'test.yaml', rules: [] }],
      detectDowngrades: () => [{ file: 'test.yaml', rule: 'bad', action: 'removed', severity: 'critical' }],
      evaluateFindings: () => ({ message: 'blocked', blocked: true, criticalCount: 1, findings: [{ file: 'test.yaml', rule: 'bad', action: 'removed', severity: 'critical' }] }),
    }), {});
    expect(process.exitCode).toBe(1);
    process.exitCode = prev;
  });
});

describe('runSecurityDiff', () => {
  it('prints success when no differences', () => {
    let result = '';
    runSecurityDiff(makeDeps({
      printResult: (msg, _ok) => { result = msg; },
    }));
    expect(result).toContain('Nenhuma diferenca');
  });

  it('prints findings when differences exist', () => {
    const lines: string[] = [];
    runSecurityDiff(makeDeps({
      loadBaseline: () => [{ file: 'test.yaml', rules: [] }],
      detectDowngrades: () => [{ file: 'test.yaml', rule: 'eval()', action: 'removed', severity: 'high' }],
      printLine: (m) => { lines.push(m); },
    }));
    expect(lines.some(l => l.includes('eval()'))).toBe(true);
  });
});

describe('runSecurityBaseline', () => {
  it('prints baseline summary', () => {
    let result = '';
    runSecurityBaseline(makeDeps({
      createBaseline: () => [{ file: 'test.yaml', rules: [{ text: 'no-eval', severity: 'critical' }, { text: 'no-console', severity: 'high' }] }],
      printResult: (msg, _ok) => { result = msg; },
    }));
    expect(result).toContain('1 arquivo');
  });
});

describe('runSecurityLogs', () => {
  it('prints message when no logs', () => {
    const lines: string[] = [];
    runSecurityLogs(makeDeps({
      loadDowngradeLogs: () => [],
      printLine: (m) => { lines.push(m); },
    }));
    expect(lines.some(l => l.includes('Nenhuma tentativa'))).toBe(true);
  });

  it('prints log entries', () => {
    const lines: string[] = [];
    runSecurityLogs(makeDeps({
      loadDowngradeLogs: () => [{ severity: 'high', file: 'test.yaml', rule: 'eval', timestamp: '2026-01-01', reason: 'test' }],
      printLine: (m) => { lines.push(m); },
    }));
    expect(lines.some(l => l.includes('test.yaml'))).toBe(true);
  });
});
