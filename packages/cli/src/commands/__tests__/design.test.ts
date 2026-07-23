import { designCommand, designValidateAction, designTokensAction, designComponentsAction, designPatternsAction, designCheckAction, runScanner, loadTokens, loadComponents, loadPatterns } from '../design';
import { printHeader, printLine, finish } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');
import { getIO } from '../../io';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn(), readDirEntries: jest.fn() };
const mockShell = { exec: jest.fn(), execString: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: mockShell, http: { post: jest.fn(), get: jest.fn() } });
  (finish as jest.Mock).mockImplementation(() => {});
});

describe('runScanner', () => {
  it('deve retornar falha quando scanner nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    const result = runScanner('/root');
    expect(result.passed).toBe(false);
    expect(result.output).toContain('not found');
  });

  it('deve retornar resultado do scanner', () => {
    mockFs.exists.mockReturnValue(true);
    mockShell.exec.mockReturnValue({ status: 0, stdout: 'OK' });
    const result = runScanner('/root');
    expect(result.passed).toBe(true);
  });
});

describe('loadTokens', () => {
  it('deve retornar null se arquivo nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    expect(loadTokens('/root')).toBeNull();
  });

  it('deve carregar tokens do JSON', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('{"colors":{"primary":"#000"}}');
    const tokens = loadTokens('/root');
    expect(tokens).toEqual({ colors: { primary: '#000' } });
  });
});

describe('loadComponents', () => {
  it('deve retornar vazio se arquivo nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    expect(loadComponents('/root')).toEqual([]);
  });

  it('deve extrair nomes de componentes', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('components:\n  button:\n  input:\n');
    const components = loadComponents('/root');
    expect(components).toEqual(['button', 'input']);
  });
});

describe('loadPatterns', () => {
  it('deve retornar vazio se arquivo nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    expect(loadPatterns('/root')).toEqual([]);
  });
});

describe('designValidateAction', () => {
  it('deve executar validacao', () => {
    mockFs.exists.mockReturnValue(false);
    designValidateAction();
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});

describe('designTokensAction', () => {
  it('deve exibir mensagem se tokens nao existem', () => {
    mockFs.exists.mockReturnValue(false);
    designTokensAction({ format: 'json' });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });
});

describe('designComponentsAction', () => {
  it('deve exibir mensagem se catalogo vazio', () => {
    mockFs.exists.mockReturnValue(false);
    designComponentsAction({});
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });
});

describe('designPatternsAction', () => {
  it('deve exibir mensagem se padroes vazios', () => {
    mockFs.exists.mockReturnValue(false);
    designPatternsAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('No layout patterns'));
  });
});

describe('designCheckAction', () => {
  it('deve verificar arquivo', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('<button></button>');
    designCheckAction('test.html');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Botão vazio'));
  });

  it('deve reportar arquivo nao encontrado', () => {
    mockFs.exists.mockReturnValue(false);
    designCheckAction('missing.html');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });
});

describe('designCommand', () => {
  it('should be defined', () => {
    expect(designCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = designCommand();
    expect(cmd.name()).toBe('design');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('validate');
    expect(names).toContain('tokens');
    expect(names).toContain('components');
    expect(names).toContain('patterns');
    expect(names).toContain('check');
  });
});
