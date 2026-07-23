import { featureFlagCommand, featureFlagPlanAction, featureFlagListAction, featureFlagStatusAction, loadFlags, saveFlags } from '../feature-flag';
import { printHeader, printLine, printResult, finish } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');

import { getIO } from '../../io';
import type { FeatureFlag } from '../feature-flag';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  (finish as jest.Mock).mockImplementation(() => {});
});

describe('loadFlags', () => {
  it('deve retornar array vazio quando config nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    const flags = loadFlags('/root');
    expect(flags).toEqual([]);
  });

  it('deve carregar flags do JSON', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('[{"name":"test-flag","status":"active"}]');
    const flags = loadFlags('/root');
    expect(flags).toHaveLength(1);
    expect(flags[0].name).toBe('test-flag');
  });

  it('deve retornar vazio quando JSON for invalido', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('not valid json');
    const flags = loadFlags('/root');
    expect(flags).toEqual([]);
  });
});

describe('saveFlags', () => {
  it('deve salvar flags em arquivo', () => {
    const flags: FeatureFlag[] = [{ name: 'test', description: 'Test', status: 'active', type: 'boolean', createdAt: '', updatedAt: '' }];
    saveFlags('/root', flags);
    expect(mockFs.mkDir).toHaveBeenCalled();
    expect(mockFs.write).toHaveBeenCalled();
    const writeArg = (mockFs.write as jest.Mock).mock.calls[0][1];
    expect(writeArg).toContain('test');
  });
});

describe('featureFlagPlanAction', () => {
  it('deve criar nova flag', () => {
    mockFs.exists.mockReturnValue(false);
    featureFlagPlanAction('minha-feature');
    expect(mockFs.write).toHaveBeenCalled();
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('minha-feature'));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('deve rejeitar flag duplicada', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('[{"name":"minha-feature","status":"inactive"}]');
    featureFlagPlanAction('minha-feature');
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('ja existe'));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});

describe('featureFlagListAction', () => {
  it('deve listar flags vazio', () => {
    mockFs.exists.mockReturnValue(false);
    featureFlagListAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhuma'));
  });

  it('deve listar flags existentes', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('[{"name":"flag-a","status":"active","type":"boolean"},{"name":"flag-b","status":"inactive","type":"boolean"}]');
    featureFlagListAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('flag-a'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('flag-b'));
  });
});

describe('featureFlagStatusAction', () => {
  it('deve exibir status da flag', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('[{"name":"minha-flag","description":"Teste","status":"active","type":"boolean","createdAt":"2024-01-01","updatedAt":"2024-01-01"}]');
    featureFlagStatusAction('minha-flag');
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('minha-flag'));
  });

  it('deve reportar erro se flag nao existir', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('[]');
    featureFlagStatusAction('inexistente');
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('nao encontrada'));
  });
});

describe('featureFlagCommand', () => {
  it('should be defined', () => {
    expect(featureFlagCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = featureFlagCommand();
    expect(cmd.name()).toBe('feature-flag');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('plan');
    expect(names).toContain('list');
    expect(names).toContain('status');
  });
});
