import { supplyChainCommand, supplyChainScanAction, supplyChainSbomAction, supplyChainAuditAction, supplyChainVerifyAction } from '../supply-chain';

jest.mock('../../utils/supply-chain/index');
jest.mock('../../io');
import { scan, generateSbom, audit, verifyPackage, printScanReport } from '../../utils/supply-chain/index';
import { getIO } from '../../io';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  (scan as jest.Mock).mockReturnValue({ summary: { critical: 0 }, entries: [] });
  (printScanReport as jest.Mock).mockImplementation(() => {});
  (generateSbom as jest.Mock).mockReturnValue({ components: [{ name: 'dep1' }] });
  (audit as jest.Mock).mockReturnValue({ changed: false, added: [], removed: [] });
  (verifyPackage as jest.Mock).mockReturnValue({ verified: true, integrity: 'sha256-abc', error: null });
});

describe('supplyChainScanAction', () => {
  it('deve executar scan', () => {
    supplyChainScanAction({});
    expect(scan).toHaveBeenCalled();
    expect(printScanReport).toHaveBeenCalled();
  });

  it('deve chamar exit se ci e critical > 0', () => {
    (scan as jest.Mock).mockReturnValue({ summary: { critical: 3 }, entries: [] });
    supplyChainScanAction({ ci: true });
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe('supplyChainSbomAction', () => {
  it('deve gerar SBOM', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    supplyChainSbomAction();
    expect(generateSbom).toHaveBeenCalled();
    expect(mockFs.write).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe('supplyChainAuditAction', () => {
  it('deve executar auditoria', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    supplyChainAuditAction({});
    expect(audit).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe('supplyChainVerifyAction', () => {
  it('deve verificar pacote', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    supplyChainVerifyAction('express');
    expect(verifyPackage).toHaveBeenCalledWith('express', expect.any(String));
    logSpy.mockRestore();
  });
});

describe('supplyChainCommand', () => {
  it('should be defined', () => {
    expect(supplyChainCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = supplyChainCommand();
    expect(cmd.name()).toBe('supply-chain');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('scan');
    expect(names).toContain('sbom');
    expect(names).toContain('audit');
    expect(names).toContain('verify');
  });
});
