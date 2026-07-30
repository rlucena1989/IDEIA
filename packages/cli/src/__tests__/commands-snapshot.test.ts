import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockFsExists = jest.fn();
const mockFsRead = jest.fn();
const mockFsReadDir = jest.fn();
const mockFsMkDir = jest.fn();
const mockFsWrite = jest.fn();

jest.mock('../io', () => ({
  getIO: () => ({
    fs: {
      exists: (p: any) => mockFsExists(p),
      read: (p: string, enc: string) => mockFsRead(p, enc),
      readDir: (p: any) => mockFsReadDir(p),
      mkDir: (p: string, r: boolean) => mockFsMkDir(p, r),
      write: (p: string, c: string) => mockFsWrite(p, c),
    },
  }),
}));

jest.mock('../commands/detect', () => ({
  detectStack: () => ({ languages: ['typescript'], frameworks: ['nestjs'], packageManager: 'npm', ciProviders: [], buildTool: null, testFramework: 'jest' }),
}));

describe('commands - snapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('snapshotCommand retorna Command com generate e status', () => {
    const { snapshotCommand } = require('../commands/snapshot');
    const cmd = snapshotCommand();
    expect(cmd.name()).toBe('snapshot');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('generate');
    expect(names).toContain('status');
  });

  it('fileExists retorna true quando arquivo existe', () => {
    mockFsExists.mockReturnValue(true);
    const { fileExists } = require('../commands/snapshot');
    expect(fileExists('/root', 'path', 'to', 'file')).toBe(true);
    expect(mockFsExists).toHaveBeenCalled();
  });

  it('fileExists retorna false quando arquivo nao existe', () => {
    mockFsExists.mockReturnValue(false);
    const { fileExists } = require('../commands/snapshot');
    expect(fileExists('/root', 'missing')).toBe(false);
  });

  it('readJsonSafe retorna objeto vazio para arquivo inexistente', () => {
    mockFsExists.mockReturnValue(false);
    const { readJsonSafe } = require('../commands/snapshot');
    expect(readJsonSafe('/root', 'missing.json')).toEqual({});
  });

  it('readJsonSafe retorna parsed JSON', () => {
    mockFsExists.mockReturnValue(true);
    mockFsRead.mockReturnValue(JSON.stringify({ hello: 'world' }));
    const { readJsonSafe } = require('../commands/snapshot');
    expect(readJsonSafe('/root', 'data.json')).toEqual({ hello: 'world' });
  });

  it('readJsonSafe retorna vazio para JSON invalido', () => {
    mockFsExists.mockReturnValue(true);
    mockFsRead.mockReturnValue('not json');
    const { readJsonSafe } = require('../commands/snapshot');
    expect(readJsonSafe('/root', 'bad.json')).toEqual({});
  });

  it('countFiles retorna 0 para diretorio inexistente', () => {
    mockFsExists.mockReturnValue(false);
    const { countFiles } = require('../commands/snapshot');
    expect(countFiles('/nonexistent')).toBe(0);
  });

  it('countFiles retorna numero de arquivos', () => {
    mockFsExists.mockReturnValue(true);
    mockFsReadDir.mockReturnValue(['a.ts', 'b.ts', 'c.js']);
    const { countFiles } = require('../commands/snapshot');
    expect(countFiles('/dir')).toBe(3);
  });

  it('countFiles com pattern filtra corretamente', () => {
    mockFsExists.mockReturnValue(true);
    mockFsReadDir.mockReturnValue(['a.ts', 'b.ts', 'c.js']);
    const { countFiles } = require('../commands/snapshot');
    expect(countFiles('/dir', /\.ts$/)).toBe(2);
  });

  it('countLines retorna 0 para arquivo inexistente', () => {
    mockFsExists.mockReturnValue(false);
    const { countLines } = require('../commands/snapshot');
    expect(countLines('/missing')).toBe(0);
  });

  it('countLines retorna numero de linhas nao vazias', () => {
    mockFsExists.mockReturnValue(true);
    mockFsRead.mockReturnValue('line1\nline2\n\nline3\n');
    const { countLines } = require('../commands/snapshot');
    expect(countLines('/file.txt')).toBe(3);
  });

  it('getHealthScore retorna score baseado em checks', () => {
    mockFsExists.mockReturnValue(true);
    const { getHealthScore } = require('../commands/snapshot');
    const result = getHealthScore('/root');
    expect(result.score).toBe(100);
    expect(result.checks).toBe(8);
    expect(result.passed).toBe(8);
    expect(result.failed).toBe(0);
  });

  it('getHealthScore retorna score 0 quando tudo falha', () => {
    mockFsExists.mockReturnValue(false);
    const { getHealthScore } = require('../commands/snapshot');
    const result = getHealthScore('/root');
    expect(result.score).toBe(0);
    expect(result.checks).toBe(8);
    expect(result.passed).toBe(0);
  });

  it('generateSnapshot retorna estrutura completa', () => {
    mockFsExists.mockReturnValue(true);
    mockFsRead.mockImplementation((p: any) => {
      if (p.includes('package.json')) return JSON.stringify({ version: '2.0.0' });
      if (p.includes('session-mode.json')) return JSON.stringify({ timestamp: '2024-01-01', mode: 'dev', summary: 'test' });
      return 'line1\nline2\nline3\n';
    });
    mockFsReadDir.mockReturnValue([]);

    const { generateSnapshot } = require('../commands/snapshot');
    const snap = generateSnapshot('/test-project');

    expect(snap.generated_at).toBeTruthy();
    expect(snap.project.name).toBe('test-project');
    expect(snap.project.version).toBe('2.0.0');
    expect(snap.health.status).toBe('healthy');
    expect(snap.health.score).toBe(100);
    expect(snap.governance.laws_exists).toBe(true);
    expect(snap.drift.status).toBe('unknown');
    expect(snap.tasks.total).toBe(0);
  });

  it('generateSnapshot fallback para versao 0.0.0 quando nao ha package.json', () => {
    mockFsExists.mockImplementation((p: any) => {
      if (p.includes('package.json')) return false;
      return true;
    });
    mockFsRead.mockReturnValue('');
    mockFsReadDir.mockReturnValue([]);

    const { generateSnapshot } = require('../commands/snapshot');
    const snap = generateSnapshot('/test');
    expect(snap.project.version).toBe('0.0.0');
  });
});
