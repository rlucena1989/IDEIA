import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getSessionPath, getSessionsIndexPath, generateId, now, saveEngineerSession, loadEngineerSession, listEngineerSessions, indexSession, engineerCommand } from '../engineer';
import type { EngineerSession } from '../engineer';
import { getIO, resetIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';

jest.mock('../../io', () => {
  const { MockIOContainer } = jest.requireActual('../../io/mock');
  let mockIO: MockIOContainer | null = null;
  return {
    __esModule: true,
    getIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
    resetIO: () => { mockIO = null; },
    createIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
  };
});

let io: MockIOContainer;

const mockSession: EngineerSession = {
  id: 'eng_test', task: 'Test task', status: 'completed', iteration: 1, maxIterations: 3,
  collaborationId: 'collab-1', gates: [], artifacts: [], createdAt: '2024-01-01', updatedAt: '2024-01-01',
};

beforeEach(() => {
  resetIO();
  io = getIO() as unknown as MockIOContainer;
  io._reset();
  io.setupProject();
});

afterEach(() => {
  resetIO();
});

describe('getSessionPath', () => {
  it('deve retornar caminho da sessao', () => {
    const p = getSessionPath('/root', 'eng-123');
    expect(p).toContain('engineer');
    expect(p).toContain('eng-123.json');
  });
});

describe('getSessionsIndexPath', () => {
  it('deve retornar caminho do index', () => {
    const p = getSessionsIndexPath('/root');
    expect(p).toContain('engineer');
    expect(p).toContain('index.json');
  });
});

describe('generateId', () => {
  it('deve gerar ID com prefixo eng_', () => {
    const id = generateId();
    expect(id).toMatch(/^eng_\d+_/);
  });
});

describe('now', () => {
  it('deve retornar ISO string', () => {
    const t = now();
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('saveEngineerSession', () => {
  it('deve salvar sessao em JSON', () => {
    saveEngineerSession('/root', mockSession);
    const filePath = getSessionPath('/root', 'eng_test');
    expect(io.fs.exists(filePath)).toBe(true);
    const content = io.fs.read(filePath, 'utf8');
    expect(content).toContain('eng_test');
  });
});

describe('loadEngineerSession', () => {
  it('deve retornar null se sessao nao existe', () => {
    expect(loadEngineerSession('/root', 'missing')).toBeNull();
  });

  it('deve carregar sessao existente', () => {
    const filePath = getSessionPath('/root', 'eng_test');
    io.fs.write(filePath, JSON.stringify(mockSession));
    const session = loadEngineerSession('/root', 'eng_test');
    expect(session).not.toBeNull();
    expect(session!.id).toBe('eng_test');
  });

  it('deve retornar null quando JSON é invalido', () => {
    const filePath = getSessionPath('/root', 'bad');
    io.fs.write(filePath, 'not json');
    expect(loadEngineerSession('/root', 'bad')).toBeNull();
  });
});

describe('listEngineerSessions', () => {
  it('deve retornar vazio se index nao existe', () => {
    expect(listEngineerSessions('/root')).toEqual([]);
  });

  it('deve listar sessoes do index', () => {
    const ip = getSessionsIndexPath('/root');
    io.fs.write(ip, '["eng_test"]');
    const sp = getSessionPath('/root', 'eng_test');
    io.fs.write(sp, JSON.stringify(mockSession));
    const sessions = listEngineerSessions('/root');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('eng_test');
  });

  it('deve retornar vazio quando index contem JSON invalido', () => {
    const ip = getSessionsIndexPath('/root');
    io.fs.write(ip, 'not valid json');
    expect(listEngineerSessions('/root')).toEqual([]);
  });

  it('deve ignorar sessoes corrompidas no index', () => {
    const ip = getSessionsIndexPath('/root');
    io.fs.write(ip, '["good_id", "bad_id"]');
    const sp = getSessionPath('/root', 'good_id');
    io.fs.write(sp, JSON.stringify(mockSession));
    const sp2 = getSessionPath('/root', 'bad_id');
    io.fs.write(sp2, 'corrupted json');
    const sessions = listEngineerSessions('/root');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('eng_test');
  });
});

describe('indexSession', () => {
  it('deve adicionar ID ao index', () => {
    indexSession('/root', 'eng_new');
    const ip = getSessionsIndexPath('/root');
    expect(io.fs.exists(ip)).toBe(true);
    const index = JSON.parse(io.fs.read(ip, 'utf8'));
    expect(index).toContain('eng_new');
  });

  it('nao deve adicionar ID duplicado', () => {
    const ip = getSessionsIndexPath('/root');
    io.fs.write(ip, '["eng_new"]');
    indexSession('/root', 'eng_new');
    const index = JSON.parse(io.fs.read(ip, 'utf8'));
    expect(index.filter((x: string) => x === 'eng_new')).toHaveLength(1);
  });

  it('deve adicionar ID ao inicio do index', () => {
    const ip = getSessionsIndexPath('/root');
    io.fs.write(ip, '["existing"]');
    indexSession('/root', 'eng_new');
    const index = JSON.parse(io.fs.read(ip, 'utf8'));
    expect(index[0]).toBe('eng_new');
  });
});

describe('engineerCommand', () => {
  it('should be defined', () => {
    expect(engineerCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = engineerCommand();
    expect(cmd.name()).toBe('engineer');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('start');
    expect(names).toContain('status');
    expect(names).toContain('log');
  });
});

describe('engineerCommand actions', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as () => never);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('status mostra mensagem quando nao ha sessoes', () => {
    const cmd = engineerCommand();
    cmd.parse(['node', 'test', 'status']);
    expect(logSpy).toHaveBeenCalledWith('No engineer sessions found.');
  });

  it('status --json retorna array vazio', () => {
    const cmd = engineerCommand();
    cmd.parse(['node', 'test', 'status', '--json']);
    const json = JSON.parse(logSpy.mock.calls[0][0]);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(0);
  });

  it('status exibe sessoes listadas', () => {
    const ip = getSessionsIndexPath(process.cwd());
    io.fs.write(ip, '["eng_test"]');
    const sp = getSessionPath(process.cwd(), 'eng_test');
    io.fs.write(sp, JSON.stringify(mockSession));
    const cmd = engineerCommand();
    cmd.parse(['node', 'test', 'status']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('eng_test'));
  });

  it('log deve exibir erro para sessao inexistente', () => {
    const cmd = engineerCommand();
    try { cmd.parse(['node', 'test', 'log', 'missing']); } catch { /* expected */ }
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('missing'));
  });

  it('log deve exibir detalhes da sessao', () => {
    const sp = getSessionPath(process.cwd(), 'eng_test');
    io.fs.write(sp, JSON.stringify(mockSession));
    const cmd = engineerCommand();
    cmd.parse(['node', 'test', 'log', 'eng_test']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('eng_test'));
  });

  it('log --json retorna sessao em JSON', () => {
    const sp = getSessionPath(process.cwd(), 'eng_test');
    io.fs.write(sp, JSON.stringify(mockSession));
    const cmd = engineerCommand();
    cmd.parse(['node', 'test', 'log', 'eng_test', '--json']);
    const json = JSON.parse(logSpy.mock.calls[0][0]);
    expect(json.id).toBe('eng_test');
  });
});

describe('startEngineerMode', () => {
  beforeEach(() => {
    io.shell._setDefault({ status: 0, stdout: '', stderr: '' });
  });

  it('deve criar sessao com valores padrao', async () => {
    jest.mock('node:child_process', () => ({
      execFileSync: jest.fn(() => 'All good'),
    }));
    const { startEngineerMode } = await import('../engineer');
    const session = await startEngineerMode('/root', 'test task', { skipGates: true, maxIterations: 1 });
    expect(session.task).toBe('test task');
    expect(session.status).toBe('completed');
    expect(session.id).toMatch(/^eng_/);
  });

  it('deve usar opcoes personalizadas', async () => {
    const { startEngineerMode } = await import('../engineer');
    const session = await startEngineerMode('/root', 'custom', { maxIterations: 5, model: 'llama3', skipGates: true });
    expect(session.maxIterations).toBe(5);
  });
});
