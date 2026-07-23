import { adapterCommand, adapterListAction, adapterDetectAction, adapterValidateAction, findMonorepoRoot, listAdapters, detectProjectStack, validateAdapter } from '../adapter';
import fs from 'node:fs';

jest.mock('node:fs');

const mockPkgJson = JSON.stringify({
  dependencies: { '@nestjs/core': '^10.0.0', express: '^4.18.0' },
  devDependencies: {},
});

beforeEach(() => {
  jest.clearAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(false);
  (fs.readdirSync as jest.Mock).mockReturnValue([]);
  (fs.readFileSync as jest.Mock).mockReturnValue(mockPkgJson);
  (fs.statSync as jest.Mock).mockImplementation(() => ({ isDirectory: () => true }));
  (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
  (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
});

describe('findMonorepoRoot', () => {
  it('deve retornar null quando nao encontrar packages/', () => {
    const root = findMonorepoRoot('/project');
    expect(root).toBeNull();
  });

  it('deve encontrar diretorio com packages/', () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => p.includes('packages'));
    const root = findMonorepoRoot('/project/sub/dir');
    expect(root).not.toBeNull();
  });
});

describe('listAdapters', () => {
  it('deve retornar vazio quando nao ha packages/', () => {
    const adapters = listAdapters('/project');
    expect(adapters).toEqual([]);
  });

  it('deve listar adapters', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['adapter-go', 'adapter-py', 'not-adapter']);
    const adapters = listAdapters('/project');
    expect(adapters).toHaveLength(2);
    expect(adapters[0].name).toBe('adapter-go');
    expect(adapters[1].name).toBe('adapter-py');
  });
});

describe('detectProjectStack', () => {
  it('deve detectar nestjs e express', () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => p.endsWith('package.json'));
    const stack = detectProjectStack('/project');
    expect(stack).toContain('nestjs');
    expect(stack).toContain('express');
  });

  it('deve detectar go', () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => p.endsWith('go.mod'));
    const stack = detectProjectStack('/project');
    expect(stack).toContain('go');
  });

  it('deve detectar fastapi via requirements.txt', () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => p.endsWith('requirements.txt'));
    (fs.readFileSync as jest.Mock).mockReturnValue('fastapi\npydantic');
    const stack = detectProjectStack('/project');
    expect(stack).toContain('fastapi');
  });
});

describe('validateAdapter', () => {
  it('deve retornar problemas para adapter invalido', () => {
    const problems = validateAdapter({ name: 'test', path: '/test', hasPackageJson: false, hasReadme: false, hasSrcOrIndex: false });
    expect(problems).toHaveLength(3);
    expect(problems[0]).toContain('package.json');
  });

  it('deve retornar vazio para adapter valido', () => {
    const problems = validateAdapter({ name: 'test', path: '/test', hasPackageJson: true, hasReadme: true, hasSrcOrIndex: true });
    expect(problems).toEqual([]);
  });
});

describe('adapterListAction', () => {
  it('deve exibir erro quando monorepo nao encontrado', () => {
    const logSpy = jest.spyOn(console, 'error').mockImplementation();
    adapterListAction();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('monorepo'));
    logSpy.mockRestore();
  });

  it('deve exibir mensagem quando nao ha adapters', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    adapterListAction();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum adapter'));
    logSpy.mockRestore();
  });
});

describe('adapterDetectAction', () => {
  it('deve exibir mensagem quando nada detectado', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    adapterDetectAction();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhuma stack'));
    logSpy.mockRestore();
  });
});

describe('adapterValidateAction', () => {
  it('deve exibir erro quando monorepo nao encontrado', () => {
    const logSpy = jest.spyOn(console, 'error').mockImplementation();
    adapterValidateAction();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe('adapterCommand', () => {
  it('should be defined', () => {
    expect(adapterCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = adapterCommand();
    expect(cmd.name()).toBe('adapter');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('list');
    expect(names).toContain('detect');
    expect(names).toContain('validate');
  });
});
