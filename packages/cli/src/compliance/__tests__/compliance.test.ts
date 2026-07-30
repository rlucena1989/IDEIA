import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { getIO } from '../../io';
import { FRAMEWORKS, getFramework, listFrameworks } from '../frameworks';
import { mapRulesToFramework, generateReport } from '../mapper';
import { ComplianceChecker, createComplianceChecker } from '../checker';

jest.mock('node:fs');
jest.mock('yaml');

const mockFs = {
  exists: jest.fn().mockReturnValue(true),
  read: jest.fn().mockReturnValue('{}'),
  stat: jest.fn().mockReturnValue({ mtimeMs: 0, size: 0, isDirectory: () => true }),
  cwd: jest.fn().mockReturnValue('/test'),
  mkDir: jest.fn(),
  write: jest.fn(),
  readDir: jest.fn().mockReturnValue([]),
  remove: jest.fn(),
};

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({ fs: mockFs, shell: {}, http: {} })),
  createIO: jest.fn(),
  resetIO: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(false);
  (YAML.parse as jest.Mock).mockReturnValue({});
});

describe('FRAMEWORKS', () => {
  it('contains all expected framework IDs', () => {
    const ids = FRAMEWORKS.map(f => f.id);
    expect(ids).toEqual(expect.arrayContaining(['soc2', 'pci-dss', 'gdpr', 'lgpd', 'iso27001', 'hipaa']));
    expect(ids).toHaveLength(6);
  });

  it('has unique framework IDs', () => {
    const ids = FRAMEWORKS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getFramework', () => {
  it('returns correct framework by ID', () => {
    const soc2 = getFramework('soc2');
    expect(soc2).toBeDefined();
    expect(soc2?.name).toBe('SOC 2');
    expect(soc2?.requirements).toHaveLength(6);
  });

  it('returns undefined for unknown framework', () => {
    expect(getFramework('unknown-framework')).toBeUndefined();
  });
});

describe('listFrameworks', () => {
  it('returns all framework IDs', () => {
    const ids = listFrameworks();
    expect(ids).toHaveLength(FRAMEWORKS.length);
    expect(ids).toContain('iso27001');
    expect(ids).toContain('hipaa');
  });
});

describe('mapRulesToFramework', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (YAML.parse as jest.Mock).mockReturnValue({});
  });

  it('returns zero score with empty rules', () => {
    const result = mapRulesToFramework('/test', 'soc2');
    expect(result.framework).toBe('soc2');
    expect(result.frameworkName).toBe('SOC 2');
    expect(result.matched).toBe(0);
    expect(result.score).toBe(0);
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it('returns error mapping for unknown framework', () => {
    const result = mapRulesToFramework('/test', 'nonexistent');
    expect(result.score).toBe(0);
    expect(result.matched).toBe(0);
    expect(result.gaps).toContain('Framework nao encontrado');
  });
});

describe('generateReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (YAML.parse as jest.Mock).mockReturnValue({});
  });

  it('generates report with all frameworks', () => {
    const report = generateReport('/test');
    expect(report.mappings).toHaveLength(FRAMEWORKS.length);
    expect(report.generatedAt).toBeDefined();
    expect(report.overallScore).toBe(0);
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});

describe('ComplianceChecker', () => {
  let checker: ComplianceChecker;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue(JSON.stringify({ name: 'test-project', scripts: { build: 'tsc' } }));
    mockFs.stat.mockReturnValue({ mtimeMs: 0, size: 0, isDirectory: () => true });
    mockFs.cwd.mockReturnValue('/test');
    checker = new ComplianceChecker('/test');
  });

  it('runAll() returns report with all frameworks', () => {
    const report = checker.runAll();
    expect(report.results).toHaveLength(FRAMEWORKS.length);
    expect(report.summary.totalChecks).toBeGreaterThan(0);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.generatedAt).toBeDefined();
  });

  it('runChecksForFramework() runs checks for specific framework', () => {
    const soc2 = getFramework('soc2')!;
    const result = checker.runChecksForFramework(soc2);
    expect(result.frameworkId).toBe('soc2');
    expect(result.totalChecks).toBeGreaterThan(0);
    expect(result.passed).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
  });

  it('saveReport() writes report to disk', () => {
    const report = checker.runAll();
    const filePath = checker.saveReport(report);
    expect(mockFs.mkDir).toHaveBeenCalled();
    expect(mockFs.write).toHaveBeenCalled();
    expect(filePath).toContain(path.join('.ai', 'reports', 'compliance'));
  });

  it('generateMarkdownReport() produces formatted output', () => {
    const report = checker.runAll();
    const md = checker.generateMarkdownReport(report);
    expect(md).toContain('# Compliance Report');
    expect(md).toContain('SOC 2');
    expect(md).toContain('Overall Score');
    expect(md).toContain('pass');
    expect(md).toContain('manual');
  });
});

describe('createComplianceChecker', () => {
  it('creates checker using cwd when no root given', () => {
    mockFs.cwd.mockReturnValue('/auto-cwd');
    const checker = createComplianceChecker();
    expect(mockFs.cwd).toHaveBeenCalled();
    expect(checker).toBeInstanceOf(ComplianceChecker);
  });

  it('creates checker with explicit root', () => {
    const checker = createComplianceChecker('/custom-root');
    expect(checker).toBeInstanceOf(ComplianceChecker);
  });
});
