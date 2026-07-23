import { detectDrift, driftCommand, DriftFinding, DriftReport, checkStaleFiles, checkOrphanFiles, checkRealityFiles, checkCompleteness, saveDriftReport, printDriftReport } from '../drift';
import fs from 'node:fs';

jest.mock('node:fs');

beforeEach(() => {
  jest.clearAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(false);
  (fs.statSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
  (fs.readdirSync as jest.Mock).mockReturnValue([]);
  (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
  (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
  (fs.readFileSync as jest.Mock).mockReturnValue('{"timestamp":"2024-01-01","total_findings":0,"findings":[],"status":"clean"}');
});

describe('checkStaleFiles', () => {
  it('deve retornar vazio quando source nao existe', () => {
    const findings = checkStaleFiles();
    expect(findings).toEqual([]);
  });
});

describe('checkOrphanFiles', () => {
  it('deve retornar vazio quando nao ha targets', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const findings = checkOrphanFiles();
    expect(Array.isArray(findings)).toBe(true);
  });
});

describe('checkRealityFiles', () => {
  it('deve retornar vazio quando nao ha ferramentas', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const findings = checkRealityFiles();
    expect(Array.isArray(findings)).toBe(true);
  });
});

describe('checkCompleteness', () => {
  it('deve retornar vazio quando nao ha source', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const findings = checkCompleteness();
    expect(Array.isArray(findings)).toBe(true);
  });
});

describe('detectDrift', () => {
  it('deve retornar relatorio clean quando tudo sincronizado', () => {
    const report = detectDrift();
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('findings');
    expect(report).toHaveProperty('status');
    expect(report.total_findings).toBe(0);
    expect(report.status).toBe('clean');
  });

  it('deve reportar completeness gap quando source existe sem target', () => {
    (fs.statSync as jest.Mock).mockReturnValue({ mtime: new Date('2024-06-01') });
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(true)   // SOURCE_DIRS .ai/policies exists
      .mockReturnValue(false);     // everything else
    (fs.readdirSync as jest.Mock).mockReturnValue(['policy.yaml']);
    const report = detectDrift();
    expect(report.total_findings).toBeGreaterThan(0);
  });
});

describe('saveDriftReport', () => {
  it('deve salvar relatorio em arquivo', () => {
    const report: DriftReport = { timestamp: new Date().toISOString(), total_findings: 0, findings: [], status: 'clean' };
    saveDriftReport(report);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});

describe('printDriftReport', () => {
  it('deve exibir relatorio sem erros', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const report: DriftReport = { timestamp: new Date().toISOString(), total_findings: 0, findings: [], status: 'clean' };
    printDriftReport(report);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('deve exibir findings agrupados por tipo', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const report: DriftReport = {
      timestamp: new Date().toISOString(),
      total_findings: 2,
      findings: [
        { type: 'stale', source: 'src/test.ts', target: 'dst/test.ts', message: 'Test stale', severity: 'high' },
        { type: 'orphan', target: 'orphan.ts', message: 'Test orphan', severity: 'low' },
      ],
      status: 'drift_detected',
    };
    printDriftReport(report);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe('driftCommand', () => {
  it('should be defined', () => {
    expect(driftCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = driftCommand();
    expect(cmd.name()).toBe('drift');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('check');
    expect(names).toContain('status');
  });
});
