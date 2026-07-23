import { contractCommand, contractValidateAction, contractDiffAction, contractLintAction, contractGenerateClientAction, contractGenerateServerAction, contractCheckAllAction } from '../contract';
import { printHeader, printLine, printResult, finish } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');
jest.mock('../../contracts/validator');
jest.mock('../../contracts/differ');
jest.mock('../../contracts/linter');
jest.mock('../../contracts/generator');

import { getIO } from '../../io';
import { validateSpec, detectSpecType } from '../../contracts/validator';
import { diffSpecs } from '../../contracts/differ';
import { lintSpec } from '../../contracts/linter';
import { generateClient, generateServer } from '../../contracts/generator';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn(), readDirEntries: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  (finish as jest.Mock).mockImplementation(() => {});
  (validateSpec as jest.Mock).mockReturnValue({ valid: true, specType: 'openapi', errors: [], warnings: [], info: { title: 'API', version: '1.0' } });
  (detectSpecType as jest.Mock).mockReturnValue('openapi');
  (diffSpecs as jest.Mock).mockReturnValue({ specType: 'openapi', total: 3, breaking: [], nonBreaking: [{ field: '/users', change: 'added' }] });
  (lintSpec as jest.Mock).mockReturnValue({ specType: 'openapi', score: 85, issues: [] });
  (generateClient as jest.Mock).mockReturnValue([{ path: 'client.ts', content: '// client' }]);
  (generateServer as jest.Mock).mockReturnValue([{ path: 'server.ts', content: '// server' }]);
  mockFs.readDirEntries.mockReturnValue([]);
});

describe('contractValidateAction', () => {
  it('deve validar spec com sucesso', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('openapi: 3.0.0');
    contractValidateAction('openapi', 'spec.yaml');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('Validacao'), true, expect.any(String));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('deve reportar erro se arquivo nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    contractValidateAction('openapi', 'missing.yaml');
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('nao encontrado'));
  });
});

describe('contractDiffAction', () => {
  it('deve comparar specs', () => {
    mockFs.exists.mockReturnValue(true);
    contractDiffAction('old.yaml', 'new.yaml');
    expect(diffSpecs).toHaveBeenCalled();
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('deve reportar erro se arquivo antigo nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    contractDiffAction('missing.yaml', 'new.yaml');
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('nao encontrado'));
  });
});

describe('contractLintAction', () => {
  it('deve executar lint', () => {
    mockFs.exists.mockReturnValue(true);
    contractLintAction('spec.yaml');
    expect(lintSpec).toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('85'));
  });

  it('deve reportar erro se arquivo nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    contractLintAction('missing.yaml');
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('nao encontrado'));
  });
});

describe('contractGenerateClientAction', () => {
  it('deve gerar cliente', () => {
    mockFs.exists.mockReturnValue(true);
    contractGenerateClientAction('spec.yaml', { out: './out' });
    expect(generateClient).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith('Gerado', true, expect.any(String));
  });
});

describe('contractGenerateServerAction', () => {
  it('deve gerar server stub', () => {
    mockFs.exists.mockReturnValue(true);
    contractGenerateServerAction('spec.yaml', { out: './out' });
    expect(generateServer).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith('Gerado', true, expect.any(String));
  });
});

describe('contractCheckAllAction', () => {
  it('deve retornar vazio se nenhum contrato encontrado', () => {
    mockFs.readDirEntries.mockReturnValue([]);
    contractCheckAllAction({ dir: '.' });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhuma spec'));
  });
});

describe('contractCommand', () => {
  it('should be defined', () => {
    expect(contractCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = contractCommand();
    expect(cmd.name()).toBe('contract');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('validate');
    expect(names).toContain('diff');
    expect(names).toContain('lint');
    expect(names).toContain('generate-client');
    expect(names).toContain('generate-server');
    expect(names).toContain('check-all');
  });
});
