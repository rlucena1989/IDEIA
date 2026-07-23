import { getSessionPath, getSessionsIndexPath, generateId, now, saveEngineerSession, loadEngineerSession, listEngineerSessions, indexSession, engineerCommand } from '../engineer';
import type { EngineerSession } from '../engineer';

jest.mock('../../io');
import { getIO } from '../../io';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn() };

const mockSession: EngineerSession = {
  id: 'eng_test', task: 'Test task', status: 'completed', iteration: 1, maxIterations: 3,
  collaborationId: 'collab-1', gates: [], artifacts: [], createdAt: '2024-01-01', updatedAt: '2024-01-01',
};

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
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
    expect(mockFs.mkDir).toHaveBeenCalled();
    expect(mockFs.write).toHaveBeenCalledWith(expect.stringContaining('.json'), expect.stringContaining('eng_test'));
  });
});

describe('loadEngineerSession', () => {
  it('deve retornar null se sessao nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    expect(loadEngineerSession('/root', 'missing')).toBeNull();
  });

  it('deve carregar sessao existente', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue(JSON.stringify(mockSession));
    const session = loadEngineerSession('/root', 'eng_test');
    expect(session).not.toBeNull();
    expect(session!.id).toBe('eng_test');
  });
});

describe('listEngineerSessions', () => {
  it('deve retornar vazio se index nao existe', () => {
    mockFs.exists.mockReturnValue(false);
    expect(listEngineerSessions('/root')).toEqual([]);
  });

  it('deve listar sessoes do index', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read
      .mockReturnValueOnce('["eng_test"]')
      .mockReturnValueOnce(JSON.stringify(mockSession));
    const sessions = listEngineerSessions('/root');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('eng_test');
  });
});

describe('indexSession', () => {
  it('deve adicionar ID ao index', () => {
    mockFs.exists.mockReturnValue(false);
    indexSession('/root', 'eng_new');
    expect(mockFs.write).toHaveBeenCalled();
    const writeArg = (mockFs.write as jest.Mock).mock.calls[0][1];
    expect(writeArg).toContain('eng_new');
  });

  it('nao deve escrever se ID ja existe no index', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('["eng_new"]');
    indexSession('/root', 'eng_new');
    expect(mockFs.write).not.toHaveBeenCalled();
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
