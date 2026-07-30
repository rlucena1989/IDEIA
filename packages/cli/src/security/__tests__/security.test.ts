import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import {
  classifySeverity,
  createBaseline,
  loadBaseline,
  detectDowngrades,
  BaselineEntry,
  DowngradeFinding,
} from '../baseline';
import {
  evaluateFindings,
  logDowngradeAttempt,
  loadDowngradeLogs,
} from '../detector';

jest.mock('node:fs');
jest.mock('yaml');

const ROOT = '/test/project';

beforeEach(() => {
  jest.clearAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(false);
  (YAML.parse as jest.Mock).mockReturnValue({});
});

describe('classifySeverity', () => {
  it('classifies critical for passwords/credentials/secrets', () => {
    expect(classifySeverity('senha do banco')).toBe('critical');
    expect(classifySeverity('credential management')).toBe('critical');
    expect(classifySeverity('api secret key')).toBe('critical');
    expect(classifySeverity('password policy')).toBe('critical');
  });

  it('classifies high for security/block/proibido', () => {
    expect(classifySeverity('seguranca da informacao')).toBe('high');
    expect(classifySeverity('security measure')).toBe('high');
    expect(classifySeverity('block access')).toBe('high');
    expect(classifySeverity('proibido compartilhar')).toBe('high');
  });

  it('classifies medium for valid/test/cobertura', () => {
    expect(classifySeverity('valid token')).toBe('medium');
    expect(classifySeverity('test coverage')).toBe('medium');
    expect(classifySeverity('cobertura de codigo')).toBe('medium');
  });

  it('classifies low for anything else', () => {
    expect(classifySeverity('random text')).toBe('low');
    expect(classifySeverity('build system')).toBe('low');
  });
});

describe('createBaseline', () => {
  it('generates entries from laws.yaml', () => {
    const lawsPath = path.join(ROOT, '.ai/laws.yaml');
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => p === lawsPath);
    (fs.readFileSync as jest.Mock).mockReturnValue('rules:\n  - "senha do admin"\n  - "validar token"');
    (YAML.parse as jest.Mock).mockReturnValue({ rules: ['senha do admin', 'validar token'] });

    const entries = createBaseline(ROOT);

    expect(entries).toHaveLength(1);
    expect(entries[0].file).toBe('.ai/laws.yaml');
    expect(entries[0].rules).toHaveLength(2);
    expect(entries[0].rules[0].severity).toBe('critical');
    expect(entries[0].rules[1].severity).toBe('medium');
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('skips non-existent files', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const entries = createBaseline(ROOT);

    expect(entries).toHaveLength(0);
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});

describe('loadBaseline', () => {
  it('loads existing baseline', () => {
    const baselinePath = path.join(ROOT, '.ai/security/baseline.json');
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => p === baselinePath);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
      { file: '.ai/laws.yaml', rules: [{ text: 'senha do admin', severity: 'critical' }] },
    ]));

    const result = loadBaseline(ROOT);

    expect(result).toHaveLength(1);
    expect(result[0].file).toBe('.ai/laws.yaml');
    expect(result[0].rules[0].text).toBe('senha do admin');
  });

  it('returns empty array when baseline does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(loadBaseline(ROOT)).toEqual([]);
  });
});

describe('detectDowngrades', () => {
  it('finds removed rules', () => {
    const baseline: BaselineEntry[] = [
      {
        file: '.ai/laws.yaml',
        rules: [
          { text: 'senha do admin', severity: 'critical' },
          { text: 'validar token', severity: 'medium' },
        ],
      },
    ];
    const current: BaselineEntry[] = [
      {
        file: '.ai/laws.yaml',
        rules: [
          { text: 'senha do admin', severity: 'critical' },
        ],
      },
    ];

    const findings = detectDowngrades(baseline, current);

    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('validar token');
    expect(findings[0].action).toBe('removed');
  });

  it('detects entire file removal', () => {
    const baseline: BaselineEntry[] = [
      { file: '.ai/laws.yaml', rules: [{ text: 'senha do admin', severity: 'critical' }] },
    ];
    const current: BaselineEntry[] = [];

    const findings = detectDowngrades(baseline, current);

    expect(findings).toHaveLength(1);
    expect(findings[0].action).toBe('removed');
  });

  it('returns empty for no changes', () => {
    const baseline: BaselineEntry[] = [
      { file: '.ai/laws.yaml', rules: [{ text: 'senha do admin', severity: 'critical' }] },
    ];
    const current: BaselineEntry[] = [
      { file: '.ai/laws.yaml', rules: [{ text: 'senha do admin', severity: 'critical' }] },
    ];

    expect(detectDowngrades(baseline, current)).toEqual([]);
  });
});

describe('evaluateFindings', () => {
  const criticalFinding: DowngradeFinding = {
    file: '.ai/laws.yaml', rule: 'senha do admin', severity: 'critical', action: 'removed',
  };
  const nonCriticalFinding: DowngradeFinding = {
    file: '.ai/laws.yaml', rule: 'validar token', severity: 'medium', action: 'removed',
  };

  it('blocks on critical without force', () => {
    const result = evaluateFindings([criticalFinding], false);
    expect(result.blocked).toBe(true);
    expect(result.criticalCount).toBe(1);
    expect(result.message).toContain('BLOQUEADO');
  });

  it('bypasses with force', () => {
    const result = evaluateFindings([criticalFinding], true, 'test bypass');
    expect(result.blocked).toBe(false);
    expect(result.criticalCount).toBe(1);
    expect(result.message).toContain('BYPASS');
  });

  it('warns on non-critical findings', () => {
    const result = evaluateFindings([nonCriticalFinding], false);
    expect(result.blocked).toBe(false);
    expect(result.criticalCount).toBe(0);
    expect(result.message).toContain('ATENCAO');
  });

  it('returns ok for no findings', () => {
    const result = evaluateFindings([], false);
    expect(result.blocked).toBe(false);
    expect(result.criticalCount).toBe(0);
    expect(result.message).toContain('Nenhum downgrade detectado');
  });
});

describe('logDowngradeAttempt', () => {
  it('writes to log file with reason', () => {
    const finding: DowngradeFinding = {
      file: '.ai/laws.yaml', rule: 'senha do admin', severity: 'critical', action: 'removed',
    };

    logDowngradeAttempt(ROOT, finding, 'audit request');

    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.appendFileSync).toHaveBeenCalled();
    const logContent = (fs.appendFileSync as jest.Mock).mock.calls[0][1] as string;
    const parsed = JSON.parse(logContent);
    expect(parsed.file).toBe('.ai/laws.yaml');
    expect(parsed.rule).toBe('senha do admin');
    expect(parsed.reason).toBe('audit request');
    expect(parsed.timestamp).toBeDefined();
  });

  it('writes with default reason when omitted', () => {
    const finding: DowngradeFinding = {
      file: '.ai/laws.yaml', rule: 'senha do admin', severity: 'critical', action: 'removed',
    };

    logDowngradeAttempt(ROOT, finding);

    const logContent = (fs.appendFileSync as jest.Mock).mock.calls[0][1] as string;
    const parsed = JSON.parse(logContent);
    expect(parsed.reason).toBe('sem motivo');
  });
});

describe('loadDowngradeLogs', () => {
  it('loads existing logs', () => {
    const logPath = path.join(ROOT, '.ai/reports/security/downgrades.jsonl');
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => p === logPath);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      '{"file":"a","rule":"b","severity":"critical","action":"removed","reason":"test"}\n' +
      '{"file":"c","rule":"d","severity":"high","action":"removed","reason":"test2"}\n'
    );

    const logs = loadDowngradeLogs(ROOT);

    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ file: 'a', rule: 'b' });
    expect(logs[1]).toMatchObject({ file: 'c', rule: 'd' });
  });

  it('returns empty array when no logs exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(loadDowngradeLogs(ROOT)).toEqual([]);
  });
});
