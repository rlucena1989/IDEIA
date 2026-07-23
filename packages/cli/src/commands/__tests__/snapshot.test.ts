import { fileExists, readJsonSafe, countFiles, countLines, getHealthScore, generateSnapshot, snapshotCommand } from '../snapshot';
import { printHeader, printLine, finish } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');
jest.mock('../detect');

import { getIO } from '../../io';
import { detectStack } from '../detect';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  (finish as jest.Mock).mockImplementation(() => {});
  (detectStack as jest.Mock).mockReturnValue({ languages: ['typescript'], frameworks: ['nestjs'] });
  mockFs.exists.mockReturnValue(false);
  mockFs.read.mockReturnValue('');
  mockFs.readDir.mockReturnValue([]);
});

describe('fileExists', () => {
  it('deve retornar true quando arquivo existe', () => {
    mockFs.exists.mockReturnValue(true);
    expect(fileExists('/root', 'package.json')).toBe(true);
  });

  it('deve retornar false quando arquivo nao existe', () => {
    expect(fileExists('/root', 'missing.json')).toBe(false);
  });
});

describe('readJsonSafe', () => {
  it('deve retornar objeto vazio se arquivo nao existe', () => {
    expect(readJsonSafe('/root', 'missing.json')).toEqual({});
  });

  it('deve fazer parse do JSON', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('{"key":"value"}');
    expect(readJsonSafe('/root', 'config.json')).toEqual({ key: 'value' });
  });

  it('deve retornar objeto vazio se JSON for invalido', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('invalid');
    expect(readJsonSafe('/root', 'bad.json')).toEqual({});
  });
});

describe('countFiles', () => {
  it('deve retornar 0 se diretorio nao existe', () => {
    expect(countFiles('/nonexistent')).toBe(0);
  });

  it('deve contar arquivos sem filtro', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.readDir.mockReturnValue(['a.ts', 'b.ts', 'c.js']);
    expect(countFiles('/root')).toBe(3);
  });

  it('deve contar arquivos com regex', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.readDir.mockReturnValue(['a.ts', 'b.ts', 'c.js']);
    expect(countFiles('/root', /\.ts$/)).toBe(2);
  });
});

describe('countLines', () => {
  it('deve retornar 0 se arquivo nao existe', () => {
    expect(countLines('/missing.txt')).toBe(0);
  });

  it('deve contar linhas nao vazias', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('line1\nline2\n\nline3\n');
    expect(countLines('/file.txt')).toBe(3);
  });
});

describe('getHealthScore', () => {
  it('deve retornar 0 se nada existe', () => {
    const health = getHealthScore('/root');
    expect(health.score).toBe(0);
    expect(health.checks).toBe(8);
    expect(health.passed).toBe(0);
  });

  it('deve retornar 100 se tudo existe', () => {
    mockFs.exists.mockReturnValue(true);
    const health = getHealthScore('/root');
    expect(health.score).toBe(100);
    expect(health.passed).toBe(8);
  });

  it('deve retornar 50 se metade existe', () => {
    let callCount = 0;
    mockFs.exists.mockImplementation(() => {
      callCount++;
      return callCount <= 4;
    });
    const health = getHealthScore('/root');
    expect(health.score).toBe(50);
    expect(health.passed).toBe(4);
  });
});

describe('generateSnapshot', () => {
  it('deve gerar snapshot com dados basicos', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read
      .mockReturnValueOnce('{"version":"1.0.0"}')
      .mockReturnValueOnce('# Rule content');
    mockFs.readDir
      .mockReturnValueOnce(['policy1.yaml'])
      .mockReturnValueOnce(['my-agent.yaml'])
      .mockReturnValueOnce(['task1.md'])
      .mockReturnValueOnce(['drift-2024.json']);
    const snapshot = generateSnapshot('/root');
    expect(snapshot).toHaveProperty('project');
    expect(snapshot).toHaveProperty('health');
    expect(snapshot).toHaveProperty('governance');
    expect(snapshot.project.name).toBe('root');
    expect(snapshot.health.score).toBe(100);
  });

  it('deve lidar com ambiente vazio', () => {
    mockFs.exists.mockReturnValue(false);
    const snapshot = generateSnapshot('/empty');
    expect(snapshot).toBeDefined();
    expect(snapshot.health.score).toBe(0);
  });
});

describe('snapshotCommand', () => {
  it('should be defined', () => {
    expect(snapshotCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = snapshotCommand();
    expect(cmd.name()).toBe('snapshot');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('generate');
    expect(names).toContain('status');
  });
});
