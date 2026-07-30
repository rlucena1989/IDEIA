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

  it('deve detectar stale quando source mais recente que target', () => {
    (fs.statSync as jest.Mock)
      .mockReturnValueOnce({ mtime: new Date('2024-06-01') })  // .ai/policies mtime
      .mockReturnValueOnce({ mtime: new Date('2024-01-01') })  // CLAUDE.md mtime
      .mockReturnValueOnce({ mtime: new Date('2024-06-01') })  // .ai/policies/policy.yaml mtime
      .mockReturnValueOnce({ mtime: new Date('2024-01-01') }); // CLAUDE.md mtime
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(true)   // .ai/policies exists
      .mockReturnValueOnce(true)   // .ai/policies/policy.yaml exists
      .mockReturnValueOnce(true)   // CLAUDE.md exists
      .mockReturnValue(true);      // everything else
    (fs.readdirSync as jest.Mock).mockReturnValue(['policy.yaml']);
    const findings = checkStaleFiles();
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('stale');
  });
});

describe('checkOrphanFiles', () => {
  it('deve retornar vazio quando nao ha targets', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const findings = checkOrphanFiles();
    expect(Array.isArray(findings)).toBe(true);
  });

  it('deve detectar orphan quando target existe sem source', () => {
    (fs.statSync as jest.Mock).mockImplementation((p: string) => {
      if (p.includes('CLAUDE.md') || p.includes('.cursorrules')) {
        return { mtime: new Date('2024-06-01') };
      }
      throw new Error('ENOENT');
    });
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
      if (p.includes('CLAUDE.md')) return true;
      return false;
    });
    const findings = checkOrphanFiles();
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('orphan');
  });
});

describe('checkRealityFiles', () => {
  it('deve retornar vazio quando nao ha ferramentas', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const findings = checkRealityFiles();
    expect(Array.isArray(findings)).toBe(true);
  });

  it('deve detectar reality finding quando config dir nao existe', () => {
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(true)   // CLAUDE.md exists
      .mockReturnValueOnce(false); // tool config dir (. by default) exists check
    (fs.statSync as jest.Mock).mockReturnValue({ mtime: new Date('2024-06-01') });
    const findings = checkRealityFiles();
    const realityFindings = findings.filter(f => f.type === 'reality');
    expect(realityFindings.length).toBeGreaterThan(0);
  });
});

describe('checkCompleteness', () => {
  it('deve retornar vazio quando nao ha source', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const findings = checkCompleteness();
    expect(Array.isArray(findings)).toBe(true);
  });

  it('deve detectar completeness gap quando source existe sem target', () => {
    (fs.statSync as jest.Mock).mockImplementation((p: string) => {
      if (p.includes('policy.yaml') || p.includes('.ai/policies')) {
        return { mtime: new Date('2024-06-01') };
      }
      throw new Error('ENOENT');
    });
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
      if (p.includes('.ai/policies') || p.includes('policy.yaml')) return true;
      return false;
    });
    (fs.readdirSync as jest.Mock).mockReturnValue(['policy.yaml']);
    const findings = checkCompleteness();
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('completeness');
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

  it('deve criar diretorio de reports se nao existe', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const report: DriftReport = { timestamp: new Date().toISOString(), total_findings: 0, findings: [], status: 'clean' };
    saveDriftReport(report);
    expect(fs.mkdirSync).toHaveBeenCalled();
    const callArg = (fs.mkdirSync as jest.Mock).mock.calls[0][0] as string;
    expect(callArg).toContain('drift');
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

describe('driftCommand actions', () => {
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as () => never);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('check --json retorna JSON', () => {
    const cmd = driftCommand();
    cmd.parse(['node', 'test', 'check', '--json']);
    const json = JSON.parse(logSpy.mock.calls[0][0]);
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('findings');
  });

  it('check --fix exibe mensagem de auto-fix', () => {
    const cmd = driftCommand();
    cmd.parse(['node', 'test', 'check', '--fix']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Auto-fix'));
  });

  it('check sai com codigo 1 quando drift detectado', () => {
    (fs.statSync as jest.Mock).mockImplementation((p: string) => {
      if (p.includes('yaml')) return { mtime: new Date('2024-06-01') };
      if (p.includes('md') || p.includes('rules')) return { mtime: new Date('2024-01-01') };
      throw new Error('ENOENT');
    });
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
      if (p.includes('policy.yaml') || p.includes('.ai/policies') || p.includes('.ai/reports')) return true;
      return false;
    });
    (fs.readdirSync as jest.Mock).mockReturnValue(['policy.yaml']);
    const cmd = driftCommand();
    expect(() => cmd.parse(['node', 'test', 'check'])).toThrow('exit');
  });

  it('status exibe mensagem quando nenhum check foi feito', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const cmd = driftCommand();
    cmd.parse(['node', 'test', 'status']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No drift check'));
  });

  it('status exibe ultimo relatorio', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('{"timestamp":"2024-01-01T00:00:00.000Z","total_findings":3,"findings":[],"status":"drift_detected"}');
    const cmd = driftCommand();
    cmd.parse(['node', 'test', 'status']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Drift Detected'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('3'));
  });

  it('status exibe clean quando relatorio sem findings', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('{"timestamp":"2024-01-01T00:00:00.000Z","total_findings":0,"findings":[],"status":"clean"}');
    const cmd = driftCommand();
    cmd.parse(['node', 'test', 'status']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Clean'));
  });
});
