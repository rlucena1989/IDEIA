import { logEvent, verifyTimeline, searchTimeline, exportTimeline, timelineCommand } from '../timeline';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

jest.mock('node:fs');
jest.mock('node:crypto');

let mockFileContent = '';

beforeEach(() => {
  jest.clearAllMocks();
  mockFileContent = '';

  const cwd = process.cwd();
  const timelineDir = path.join(cwd, '.ai/audit');
  const timelinePath = path.join(timelineDir, 'timeline.jsonl');

  (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
    const resolved = path.resolve(p);
    if (resolved === timelinePath || resolved === timelineDir) return true;
    if (resolved === timelineDir || resolved.startsWith(timelineDir)) return true;
    return false;
  });

  (fs.readFileSync as jest.Mock).mockImplementation((_p: string, _enc?: string) => {
    return mockFileContent;
  });

  (fs.appendFileSync as jest.Mock).mockImplementation((_p: string, data: string) => {
    mockFileContent += data;
  });

  (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);

  (crypto.randomUUID as jest.Mock).mockReturnValue('test-uuid-123');

  (crypto.createHash as jest.Mock).mockImplementation(() => {
    let hashContent = '';
    const hashObj: { update: jest.Mock; digest: jest.Mock } = {
      update: jest.fn((content: string) => { hashContent = content; return hashObj; }),
      digest: jest.fn(() => `hash_${hashContent.length}_${String(hashContent).slice(0, 10)}`),
    };
    return hashObj;
  });

  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-123',
    },
    writable: true,
  });
});

function createMockHash(data: string, prevHash: string): string {
  const content = JSON.stringify(data);
  return crypto.createHash('sha256').update(content).digest('hex');
}

describe('logEvent', () => {
  it('deve criar entrada com hash e prev_hash padrao', () => {
    const entry = logEvent('test.event', 'tester', { key: 'value' });
    expect(entry.event_type).toBe('test.event');
    expect(entry.actor).toBe('tester');
    expect(entry.payload).toEqual({ key: 'value' });
    expect(entry.prev_hash).toBe('0'.repeat(64));
    expect(entry.id).toBe('test-uuid-123');
  });
});

describe('verifyTimeline', () => {
  it('deve retornar valido para timeline vazia', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('');
    const result = verifyTimeline();
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(0);
  });

  it('deve validar cadeia de hashes correta', () => {
    const hc1 = JSON.stringify({ id: '1', timestamp: '2024-01-01T00:00:00.000Z', event_type: 'a', actor: 'user', payload: {}, prev_hash: '0'.repeat(64) });
    const hash1 = crypto.createHash('sha256').update(hc1).digest('hex');
    const entry1 = {
      id: '1', timestamp: '2024-01-01T00:00:00.000Z', event_type: 'a', actor: 'user',
      payload: {}, prev_hash: '0'.repeat(64), hash: hash1,
    };

    const hc2 = JSON.stringify({ id: '2', timestamp: '2024-01-01T00:00:01.000Z', event_type: 'b', actor: 'user', payload: {}, prev_hash: hash1 });
    const hash2 = crypto.createHash('sha256').update(hc2).digest('hex');
    const entry2 = {
      id: '2', timestamp: '2024-01-01T00:00:01.000Z', event_type: 'b', actor: 'user',
      payload: {}, prev_hash: hash1, hash: hash2,
    };

    mockFileContent = JSON.stringify(entry1) + '\n' + JSON.stringify(entry2) + '\n';

    const result = verifyTimeline();
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(2);
  });

  it('deve detectar prev_hash quebrado', () => {
    const entry1 = {
      id: '1', timestamp: '2024-01-01T00:00:00.000Z', event_type: 'a', actor: 'user',
      payload: {}, prev_hash: 'broken', hash: 'somehash',
    };
    mockFileContent = JSON.stringify(entry1) + '\n';

    const result = verifyTimeline();
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it('deve detectar hash de conteudo adulterado', () => {
    const hc = JSON.stringify({ id: '1', timestamp: '2024-01-01T00:00:00.000Z', event_type: 'a', actor: 'user', payload: {}, prev_hash: '0'.repeat(64) });
    const realHash = crypto.createHash('sha256').update(hc).digest('hex');

    const entry1 = {
      id: '1', timestamp: '2024-01-01T00:00:00.000Z', event_type: 'tampered', actor: 'user',
      payload: {}, prev_hash: '0'.repeat(64), hash: realHash,
    };
    mockFileContent = JSON.stringify(entry1) + '\n';

    const result = verifyTimeline();
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
  });
});

describe('searchTimeline', () => {
  beforeEach(() => {
    mockFileContent = [
      JSON.stringify({ id: '1', timestamp: '2024-01-01T00:00:00.000Z', event_type: 'type_a', actor: 'user1', payload: {}, prev_hash: '0'.repeat(64), hash: 'h1' }),
      JSON.stringify({ id: '2', timestamp: '2024-01-02T00:00:00.000Z', event_type: 'type_b', actor: 'user2', payload: {}, prev_hash: 'h1', hash: 'h2' }),
      JSON.stringify({ id: '3', timestamp: '2024-01-03T00:00:00.000Z', event_type: 'type_a', actor: 'user3', payload: {}, prev_hash: 'h2', hash: 'h3' }),
    ].join('\n') + '\n';
  });

  it('deve retornar todos os eventos sem filtro', () => {
    const entries = searchTimeline();
    expect(entries).toHaveLength(3);
  });

  it('deve filtrar por tipo', () => {
    const entries = searchTimeline('type_a');
    expect(entries).toHaveLength(2);
    entries.forEach(e => expect(e.event_type).toBe('type_a'));
  });

  it('deve retornar vazio quando nao ha arquivo', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(searchTimeline()).toEqual([]);
  });

  it('deve retornar vazio quando arquivo vazio', () => {
    mockFileContent = '';
    (fs.readFileSync as jest.Mock).mockReturnValue('');
    expect(searchTimeline()).toEqual([]);
  });
});

describe('exportTimeline', () => {
  it('deve exportar todas as entradas', () => {
    mockFileContent = JSON.stringify({ id: '1', event_type: 'a', actor: 'user', payload: {}, prev_hash: '0'.repeat(64), hash: 'h1', timestamp: '2024-01-01T00:00:00.000Z' }) + '\n';
    const entries = exportTimeline();
    expect(entries).toHaveLength(1);
  });

  it('deve retornar vazio quando nao ha arquivo', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(exportTimeline()).toEqual([]);
  });

  it('deve retornar vazio quando arquivo vazio', () => {
    mockFileContent = '';
    (fs.readFileSync as jest.Mock).mockReturnValue('');
    expect(exportTimeline()).toEqual([]);
  });
});

describe('timelineCommand actions', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  let originalUUID: typeof crypto.randomUUID;

  beforeAll(() => {
    originalUUID = crypto.randomUUID;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockFileContent = '';
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);

    (crypto.randomUUID as jest.Mock).mockReturnValue('cmd-test-uuid');
    (crypto.createHash as jest.Mock).mockImplementation(() => {
      let hashContent = '';
      const hashObj: { update: jest.Mock; digest: jest.Mock } = {
        update: jest.fn((content: string) => { hashContent = content; return hashObj; }),
        digest: jest.fn(() => 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
      };
      return hashObj;
    });

    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
      const resolved = path.resolve(p);
      if (resolved.includes('.ai') && resolved.includes('audit')) return true;
      return false;
    });
    (fs.readFileSync as jest.Mock).mockImplementation(() => mockFileContent);
    (fs.appendFileSync as jest.Mock).mockImplementation((_p: string, data: string) => {
      mockFileContent += data;
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('log registra evento na timeline', () => {
    const entry = logEvent('cli.event', 'cli_user', { source: 'cli' });
    expect(entry.event_type).toBe('cli.event');
    expect(entry.actor).toBe('cli_user');
    expect(entry.payload).toEqual({ source: 'cli' });
  });

  it('verify exibe integridade para timeline vazia', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('');
    const cmd = timelineCommand();
    cmd.parse(['node', 'test', 'verify']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('vazia'));
  });

  it('verify exibe ALERTA para cadeia quebrada', () => {
    mockFileContent = JSON.stringify({ id: '1', timestamp: '2024-01-01T00:00:00.000Z', event_type: 'a', actor: 'user', payload: {}, prev_hash: 'broken', hash: 'h1' }) + '\n';
    const cmd = timelineCommand();
    cmd.parse(['node', 'test', 'verify']);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('ALERTA'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('search retorna mensagem quando vazio', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('');
    const cmd = timelineCommand();
    cmd.parse(['node', 'test', 'search']);
    expect(logSpy).toHaveBeenCalledWith('Nenhum evento encontrado.');
  });

  it('search --json retorna array JSON', () => {
    mockFileContent = JSON.stringify({ id: '1', timestamp: '2024-01-01T00:00:00.000Z', event_type: 'a', actor: 'user', payload: {}, prev_hash: '0'.repeat(64), hash: 'h1' }) + '\n';
    const cmd = timelineCommand();
    cmd.parse(['node', 'test', 'search', '--json']);
    const json = JSON.parse(logSpy.mock.calls[0][0]);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(1);
  });

  it('replay exibe mensagem quando vazio', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('');
    const cmd = timelineCommand();
    cmd.parse(['node', 'test', 'replay']);
    expect(logSpy).toHaveBeenCalledWith('Nenhum evento para replay.');
  });

  it('export exibe JSON da timeline', () => {
    mockFileContent = JSON.stringify({ id: '1', timestamp: '2024-01-01T00:00:00.000Z', event_type: 'test', actor: 'user', payload: {}, prev_hash: '0'.repeat(64), hash: 'h1' }) + '\n';
    const cmd = timelineCommand();
    cmd.parse(['node', 'test', 'export']);
    const json = JSON.parse(logSpy.mock.calls[0][0]);
    expect(Array.isArray(json)).toBe(true);
  });

  it('log com payload invalido exibe erro', () => {
    const cmd = timelineCommand();
    cmd.parse(['node', 'test', 'log', '-t', 'evt', '-a', 'user', '-p', 'invalid json']);
    expect(errorSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
