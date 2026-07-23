import { complianceCommand, complianceMapAction, complianceCheckAction, complianceReportAction, complianceGapAction, complianceBadgesAction, complianceImportAction } from '../compliance';
import { printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../compliance/frameworks');
jest.mock('../../compliance/mapper');
jest.mock('../../io');

import { listFrameworks, getFramework } from '../../compliance/frameworks';
import { mapRulesToFramework, generateReport } from '../../compliance/mapper';
import { getIO } from '../../io';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  (listFrameworks as jest.Mock).mockReturnValue(['soc2', 'pci-dss']);
  (getFramework as jest.Mock).mockReturnValue({ id: 'soc2', name: 'SOC 2', requirements: [{ id: 'REQ-1', title: 'Access Control', description: 'Control access', keywords: ['access'] }] });
  (mapRulesToFramework as jest.Mock).mockReturnValue({
    framework: 'soc2', frameworkName: 'SOC 2', score: 75, matched: 3, total: 4,
    matches: [{ requirement: 'REQ-1', rule: 'Access control implementado' }],
    gaps: ['REQ-2: Encryption at rest'],
  });
  (generateReport as jest.Mock).mockReturnValue({
    overallScore: 75,
    mappings: [{ framework: 'soc2', frameworkName: 'SOC 2', score: 75, matched: 3, total: 4, gaps: ['REQ-2'] }],
  });
});

describe('complianceMapAction', () => {
  it('deve mapear regras para todos os frameworks', () => {
    complianceMapAction();
    expect(listFrameworks).toHaveBeenCalled();
    expect(mapRulesToFramework).toHaveBeenCalledTimes(2);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('SOC 2'));
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('Mapeamento concluido'), true);
  });
});

describe('complianceCheckAction', () => {
  it('deve exibir conformidade para framework valido', () => {
    complianceCheckAction('soc2');
    expect(mapRulesToFramework).toHaveBeenCalledWith(expect.any(String), 'soc2');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('SOC 2'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Conformidade'));
  });

  it('deve reportar erro para framework invalido', () => {
    (getFramework as jest.Mock).mockReturnValue(null);
    complianceCheckAction('invalid');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'), false);
  });

  it('deve mostrar matches e gaps', () => {
    complianceCheckAction('soc2');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('correspondentes'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Lacunas'));
  });
});

describe('complianceReportAction', () => {
  it('deve gerar relatorio com score geral', () => {
    complianceReportAction();
    expect(generateReport).toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('75'));
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('MEDIO'), false);
  });

  it('deve exibir BOM quando score >= 80', () => {
    (generateReport as jest.Mock).mockReturnValue({
      overallScore: 85,
      mappings: [{ framework: 'soc2', frameworkName: 'SOC 2', score: 85, matched: 4, total: 4, gaps: [] }],
    });
    complianceReportAction();
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('BOM'), true);
  });

  it('deve exibir BAIXO quando score < 50', () => {
    (generateReport as jest.Mock).mockReturnValue({
      overallScore: 30,
      mappings: [{ framework: 'soc2', frameworkName: 'SOC 2', score: 30, matched: 1, total: 4, gaps: ['REQ-2'] }],
    });
    complianceReportAction();
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('BAIXO'), false);
  });
});

describe('complianceGapAction', () => {
  it('deve mostrar lacunas para framework', () => {
    complianceGapAction('soc2');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('REQ-2'));
  });

  it('deve exibir sucesso quando nao houver lacunas', () => {
    (mapRulesToFramework as jest.Mock).mockReturnValue({
      framework: 'soc2', frameworkName: 'SOC 2', score: 100, matched: 4, total: 4, matches: [], gaps: [],
    });
    complianceGapAction('soc2');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('Nenhuma lacuna'), true);
  });

  it('deve reportar erro para framework invalido', () => {
    (getFramework as jest.Mock).mockReturnValue(null);
    complianceGapAction('invalid');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'), false);
  });
});

describe('complianceBadgesAction', () => {
  it('deve gerar badges para todos frameworks', () => {
    complianceBadgesAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Badges'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('SOC 2'));
  });
});

describe('complianceImportAction', () => {
  it('deve importar regras sugeridas para framework valido', () => {
    complianceImportAction('soc2');
    expect(mockFs.mkDir).toHaveBeenCalled();
    expect(mockFs.write).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('importadas'), true);
  });

  it('deve reportar erro para framework invalido', () => {
    (getFramework as jest.Mock).mockReturnValue(null);
    complianceImportAction('invalid');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'), false);
  });
});

describe('complianceCommand', () => {
  it('should be defined', () => {
    expect(complianceCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = complianceCommand();
    expect(cmd.name()).toBe('compliance');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(expect.arrayContaining(['map', 'check', 'report', 'gap', 'badges', 'import']));
  });
});
