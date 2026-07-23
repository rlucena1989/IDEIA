import { featureCommand, featureAnalyzeAction, slugify, ensureDir, generateArtifact } from '../feature';
import fs from 'node:fs';

jest.mock('node:fs');

beforeEach(() => {
  jest.clearAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(false);
  (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
  (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
  (fs.readdirSync as jest.Mock).mockReturnValue([]);
  (fs.statSync as jest.Mock).mockImplementation(() => ({ isDirectory: () => true }));
});

describe('slugify', () => {
  it('deve converter texto para slug', () => {
    expect(slugify('Minha Feature Legal')).toBe('minha-feature-legal');
  });

  it('deve remover caracteres especiais', () => {
    expect(slugify('Olá Mundo! @Teste')).toBe('ol-mundo-teste');
  });

  it('deve tratar texto vazio', () => {
    expect(slugify('')).toBe('');
  });
});

describe('ensureDir', () => {
  it('deve criar diretorio se nao existe', () => {
    ensureDir('/path/to/dir');
    expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to/dir', { recursive: true });
  });

  it('nao deve criar se ja existe', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    ensureDir('/existing/dir');
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
});

describe('generateArtifact', () => {
  it('deve escrever arquivo', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    generateArtifact('/path/file.md', 'conteudo');
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Gerado'));
    logSpy.mockRestore();
  });
});

describe('featureAnalyzeAction', () => {
  it('deve gerar artefatos para feature', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    featureAnalyzeAction('Adicionar login com Google', {});
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Feature'));
    logSpy.mockRestore();
  });

  it('deve gerar ui-checklist quando UI detectada na request', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    featureAnalyzeAction('Criar tela de dashboard', {});
    expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('UI detectada'));
    logSpy.mockRestore();
  });

  it('deve detectar dominio src/modules', () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => p.includes('modules'));
    (fs.readdirSync as jest.Mock).mockReturnValue(['auth', 'users']);
    featureAnalyzeAction('Nova feature qualquer', {});
    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c: string[]) => c[0].includes('feature-brief'));
    expect(writeCall).toBeDefined();
    expect(writeCall[1]).toContain('auth');
  });
});

describe('featureCommand', () => {
  it('should be defined', () => {
    expect(featureCommand).toBeDefined();
  });

  it('should return Command with analyze subcommand', () => {
    const cmd = featureCommand();
    expect(cmd.name()).toBe('feature');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('analyze');
  });
});
