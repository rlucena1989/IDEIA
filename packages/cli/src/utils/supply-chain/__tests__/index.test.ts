import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import childProcess from 'node:child_process';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
}));

jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  randomUUID: jest.fn(),
}));

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
}));

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { scan, generateSbom, audit, verifyPackage, printScanReport, CveEntry, ScanResult } from '../index';

const mockExistsSync = fs.existsSync as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;
const mockMkdirSync = fs.mkdirSync as jest.Mock;
const mockRandomUUID = crypto.randomUUID as jest.Mock;
const mockSpawnSync = childProcess.spawnSync as jest.Mock;

const TEST_CWD = '/test/project';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('scan', () => {
  it('parses npm audit output correctly', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('package-lock.json'));
    mockSpawnSync.mockReturnValue({
      stdout: JSON.stringify({
        vulnerabilities: {
          lodash: { range: '>=4.0.0 <4.17.21', cves: ['CVE-2024-1234'], severity: 'high', fixAvailable: { version: '4.17.21' } },
        },
      }),
      stderr: '',
    });
    const result = scan(TEST_CWD);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      package: 'lodash',
      version: '>=4.0.0 <4.17.21',
      cve: 'CVE-2024-1234',
      severity: 'high',
      fixVersion: '4.17.21',
    });
    expect(result.summary.total).toBe(1);
    expect(result.summary.high).toBe(1);
  });

  it('handles npm audit with missing cves', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('package-lock.json'));
    mockSpawnSync.mockReturnValue({
      stdout: JSON.stringify({
        vulnerabilities: {
          foo: { range: '1.0.0', severity: 'critical', fixAvailable: {} },
        },
      }),
      stderr: '',
    });
    const result = scan(TEST_CWD);
    expect(result.entries[0].cve).toContain('NPM-CRITICAL');
    expect(result.entries[0].fixVersion).toBeUndefined();
  });

  it('handles npm audit parse error gracefully', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('package-lock.json'));
    mockSpawnSync.mockReturnValue({ stdout: 'not json', stderr: '' });
    const result = scan(TEST_CWD);
    expect(result.entries).toEqual([]);
  });

  it('handles yarn audit output correctly', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('yarn.lock'));
    mockSpawnSync.mockReturnValue({
      stdout: JSON.stringify({
        type: 'auditAdvisory',
        data: {
          advisory: {
            package_name: 'express',
            vulnerable_versions: '>=4.0.0 <4.18.0',
            cves: ['CVE-2024-5678'],
            severity: 'critical',
            patched_versions: '4.18.0',
          },
        },
      }) + '\n',
      stderr: '',
    });
    const result = scan(TEST_CWD);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      package: 'express',
      cve: 'CVE-2024-5678',
      severity: 'critical',
    });
  });

  it('handles yarn audit with missing advisory fields', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('yarn.lock'));
    mockSpawnSync.mockReturnValue({
      stdout: JSON.stringify({ type: 'auditAdvisory', data: { advisory: {} } }) + '\n',
      stderr: '',
    });
    const result = scan(TEST_CWD);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].package).toBe('unknown');
  });

  it('handles yarn audit parse error gracefully', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('yarn.lock'));
    mockSpawnSync.mockReturnValue({ stdout: '{invalid json}\n', stderr: '' });
    const result = scan(TEST_CWD);
    expect(result.entries).toEqual([]);
  });

  it('returns empty when no lock file exists', () => {
    mockExistsSync.mockReturnValue(false);
    const result = scan(TEST_CWD);
    expect(result.entries).toEqual([]);
    expect(result.summary.total).toBe(0);
  });

  it('handles npm audit crash gracefully', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('package-lock.json'));
    mockSpawnSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const result = scan(TEST_CWD);
    expect(result.entries).toEqual([]);
  });

  it('parses severity summary correctly with mixed severities', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('package-lock.json'));
    mockSpawnSync.mockReturnValue({
      stdout: JSON.stringify({
        vulnerabilities: {
          a: { severity: 'critical' },
          b: { severity: 'high' },
          c: { severity: 'medium' },
          d: { severity: 'low' },
        },
      }),
      stderr: '',
    });
    const result = scan(TEST_CWD);
    expect(result.summary.critical).toBe(1);
    expect(result.summary.high).toBe(1);
    expect(result.summary.medium).toBe(1);
    expect(result.summary.low).toBe(1);
    expect(result.summary.total).toBe(4);
  });
});

describe('generateSbom', () => {
  it('generates CycloneDX SBOM from package.json', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      dependencies: { express: '^4.18.0' },
      devDependencies: { jest: '^29.0.0' },
    }));
    mockRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000000');
    const sbom = generateSbom(TEST_CWD);
    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.5');
    expect(sbom.serialNumber).toBe('urn:uuid:00000000-0000-0000-0000-000000000000');
    const components = sbom.components as Array<Record<string, unknown>>;
    expect(components).toHaveLength(2);
    expect(components[0]).toMatchObject({ type: 'library', name: 'express', version: '4.18.0' });
    expect(components[1]).toMatchObject({ type: 'library', name: 'jest', version: '29.0.0' });
  });

  it('returns empty components when no package.json', () => {
    mockExistsSync.mockReturnValue(false);
    const sbom = generateSbom(TEST_CWD);
    expect(sbom.components).toEqual([]);
  });

  it('returns empty components on parse error', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not json');
    const sbom = generateSbom(TEST_CWD);
    expect(sbom.components).toEqual([]);
  });

  it('handles missing dependencies gracefully', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));
    const sbom = generateSbom(TEST_CWD);
    expect(sbom.components).toEqual([]);
  });

  it('generates valid purl for each component', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      dependencies: { '@scope/pkg': '^2.0.0' },
    }));
    mockRandomUUID.mockReturnValue('11111111-1111-1111-1111-111111111111');
    const sbom = generateSbom(TEST_CWD);
    const components = sbom.components as Array<Record<string, string>>;
    expect(components[0].purl).toBe('pkg:npm/@scope/pkg@2.0.0');
  });
});

describe('audit', () => {
  const entries: CveEntry[] = [
    { package: 'lodash', version: '4.17.20', cve: 'CVE-2024-1234', severity: 'high' },
  ];

  it('returns all entries as added when no baseline', () => {
    mockExistsSync.mockReturnValue(false);
    const result = audit(entries);
    expect(result.changed).toBe(false);
    expect(result.added).toEqual(entries);
    expect(result.removed).toEqual([]);
  });

  it('detects new vulnerabilities vs baseline', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify([]));
    const result = audit(entries, '/path/to/baseline.json');
    expect(result.changed).toBe(true);
    expect(result.added).toEqual(entries);
    expect(result.removed).toEqual([]);
  });

  it('detects fixed vulnerabilities vs baseline', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(entries));
    const result = audit([], '/path/to/baseline.json');
    expect(result.changed).toBe(true);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual(entries);
  });

  it('detects no change when same as baseline', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(entries));
    const result = audit(entries, '/path/to/baseline.json');
    expect(result.changed).toBe(false);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('handles baseline parse error gracefully', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not json');
    const result = audit(entries, '/path/to/baseline.json');
    expect(result.added).toEqual(entries);
    expect(result.changed).toBe(false);
  });
});

describe('verifyPackage', () => {
  it('returns verified true with integrity when npm pack succeeds', () => {
    mockSpawnSync.mockReturnValue({
      stdout: JSON.stringify([{ integrity: 'sha512-abc123' }]),
      stderr: '',
    });
    const result = verifyPackage('test-pkg', TEST_CWD);
    expect(result.verified).toBe(true);
    expect(result.integrity).toBe('sha512-abc123');
  });

  it('returns verified false with error when stderr present', () => {
    mockSpawnSync.mockReturnValue({
      stdout: '',
      stderr: 'npm ERR! package not found',
    });
    const result = verifyPackage('nonexistent', TEST_CWD);
    expect(result.verified).toBe(false);
    expect(result.error).toBe('npm ERR! package not found');
  });

  it('returns integrity unknown when missing from response', () => {
    mockSpawnSync.mockReturnValue({
      stdout: JSON.stringify([{}]),
      stderr: '',
    });
    const result = verifyPackage('test-pkg', TEST_CWD);
    expect(result.verified).toBe(true);
    expect(result.integrity).toBe('unknown');
  });
});

describe('printScanReport', () => {
  const scanResult: ScanResult = {
    entries: [
      { package: 'lodash', version: '4.17.20', cve: 'CVE-2024-1234', severity: 'high', fixVersion: '4.17.21' },
    ],
    summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0 },
  };

  it('prints JSON output when json=true', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printScanReport(scanResult, TEST_CWD, true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(scanResult, null, 2));
    logSpy.mockRestore();
  });

  it('writes report file when json=false', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printScanReport(scanResult, TEST_CWD);
    expect(mockMkdirSync).toHaveBeenCalledWith(path.join(TEST_CWD, '.ai', 'reports'), { recursive: true });
    expect(mockWriteFileSync).toHaveBeenCalled();
    const writeArg = mockWriteFileSync.mock.calls[0][1] as string;
    expect(writeArg).toContain('Supply Chain Scan Report');
    expect(writeArg).toContain('CVE-2024-1234');
    expect(writeArg).toContain('fix: 4.17.21');
    logSpy.mockRestore();
  });

  it('prints report to console', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printScanReport(scanResult, TEST_CWD);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
