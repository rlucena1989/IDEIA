process.env.GTI_TEST_MODE = '1';

import { Command } from 'commander';
import { RemoteAdapter } from '../src/transport/remote-adapter';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const program = new Command();
const baseUrl = 'http://localhost:3999';

function makeAdapter(config: Record<string, unknown> = {}): RemoteAdapter {
  return new RemoteAdapter(program, { baseUrl, ...config });
}

function okResponse(data: unknown): Response {
  const resp = {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  };
  return resp as unknown as Response;
}

function errResponse(status: number, body: string): Response {
  const resp = {
    ok: false,
    status,
    statusText: 'Error',
    text: () => Promise.resolve(body),
    json: () => Promise.resolve({ message: body }),
  };
  return resp as unknown as Response;
}

const networkError = new Error('fetch failed: ECONNREFUSED');

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

describe('RemoteAdapter — connection / health check', () => {
  it('should detect server is up via /health', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ status: 'ok' }));
    const adapter = makeAdapter();
    const available = await adapter.checkServer();
    expect(available).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('should detect server is down via /health', async () => {
    mockFetch.mockRejectedValueOnce(networkError);
    const adapter = makeAdapter();
    const available = await adapter.checkServer();
    expect(available).toBe(false);
  });

  it('should reset cached server check', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ status: 'ok' }));
    const adapter = makeAdapter();
    expect(await adapter.checkServer()).toBe(true);
    adapter.resetServerCheck();
    mockFetch.mockResolvedValueOnce(errResponse(503, 'unavailable'));
    expect(await adapter.checkServer()).toBe(false);
  });

  it('should cache server check result', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ status: 'ok' }));
    const adapter = makeAdapter();
    expect(await adapter.checkServer()).toBe(true);
    mockFetch.mockClear();
    expect(await adapter.checkServer()).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return status when server is online', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockResolvedValueOnce(okResponse({ status: 'running', version: '1.0.0' }));
    const adapter = makeAdapter();
    const result = await adapter.getStatus();
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ status: 'running', version: '1.0.0' });
  });

  it('should return error status when server is offline', async () => {
    mockFetch.mockRejectedValueOnce(networkError);
    const adapter = makeAdapter({ fallbackToLocal: false });
    const result = await adapter.getStatus();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('offline');
  });

  it('should return error status when status endpoint returns non-ok', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockResolvedValueOnce(errResponse(500, 'internal error'));
    const adapter = makeAdapter();
    const result = await adapter.getStatus();
    expect(result.ok).toBe(false);
    expect(result.code).toBe(500);
  });
});

describe('RemoteAdapter — command execution', () => {
  it('should execute command remotely when server is up', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockResolvedValueOnce(okResponse({ ok: true, code: 0, message: 'done', data: { output: 'ok' } }));
    const adapter = makeAdapter();
    const result = await adapter.executeCommand('deploy', ['--env=prod']);
    expect(result.ok).toBe(true);
    expect(result.message).toBe('done');
    expect(mockFetch).toHaveBeenNthCalledWith(2,
      expect.stringContaining('/execute'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should fallback to local when remote fails and fallback is enabled', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockRejectedValueOnce(networkError);
    const handler = jest.fn().mockResolvedValue({ ok: true, code: 0, message: 'local ok' });
    const adapter = makeAdapter();
    adapter.register('deploy', handler);
    const result = await adapter.executeCommand('deploy');
    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('should throw when remote fails and fallbackToLocal is disabled', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockRejectedValueOnce(networkError);
    const adapter = makeAdapter({ fallbackToLocal: false });
    await expect(adapter.executeCommand('deploy')).rejects.toThrow('Remote execution failed');
  });

  it('should fallback to local when server is offline', async () => {
    mockFetch.mockRejectedValueOnce(networkError);
    const handler = jest.fn().mockResolvedValue({ ok: true, code: 0, message: 'local fallback' });
    const adapter = makeAdapter();
    adapter.register('deploy', handler);
    const result = await adapter.executeCommand('deploy');
    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('should return error when server offline and fallback disabled', async () => {
    mockFetch.mockRejectedValueOnce(networkError);
    const adapter = makeAdapter({ fallbackToLocal: false });
    const result = await adapter.executeCommand('deploy');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not available');
  });
});

describe('RemoteAdapter — handle(argv)', () => {
  it('should execute remote and return result', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockResolvedValueOnce(okResponse({ ok: true, code: 0, message: 'remote ok' }));
    const adapter = makeAdapter();
    const result = await adapter.handle(['node', 'ideia', 'deploy', '--env=prod']);
    expect(result.ok).toBe(true);
  });

  it('should fallback to local when remote handle fails', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockRejectedValueOnce(networkError);
    const handler = jest.fn().mockResolvedValue({ ok: true, code: 0, message: 'local handle' });
    const adapter = makeAdapter();
    adapter.register('deploy', handler);
    const result = await adapter.handle(['node', 'ideia', 'deploy']);
    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalled();
  });
});

describe('RemoteAdapter — executePlan', () => {
  it('should execute plan remotely', async () => {
    const plan = { steps: [{ action: 'deploy', params: { env: 'prod' } }] };
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockResolvedValueOnce(okResponse({ ok: true, code: 0, message: 'plan done', data: { results: [{ step: 0, result: { ok: true } }] } }));
    const adapter = makeAdapter();
    const result = await adapter.executePlan(plan);
    expect(result.ok).toBe(true);
  });

  it('should fallback to local for plan when server offline', async () => {
    mockFetch.mockRejectedValueOnce(networkError);
    const handler = jest.fn().mockResolvedValue({ ok: true, code: 0, message: 'local' });
    const adapter = makeAdapter();
    adapter.register('deploy', handler);
    const result = await adapter.executePlan({ steps: [{ action: 'deploy', params: { env: 'prod' } }] });
    expect(result.ok).toBe(true);
    expect(result.message).toContain('locally');
  });

  it('should return error for plan when offline and no fallback', async () => {
    mockFetch.mockRejectedValueOnce(networkError);
    const adapter = makeAdapter({ fallbackToLocal: false });
    const result = await adapter.executePlan({ steps: [{ action: 'test', params: {} }] });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not available');
  });

  it('should handle plan execution failure with error status', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockResolvedValueOnce(errResponse(400, 'Bad Request'));
    const adapter = makeAdapter({ fallbackToLocal: false });
    const plan = { steps: [{ action: 'test', params: {} }] };
    const result = await adapter.executePlan(plan);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('400');
  });
});

describe('RemoteAdapter — auth and headers', () => {
  it('should send api key header when configured', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockResolvedValueOnce(okResponse({ ok: true, code: 0, message: 'done' }));
    const adapter = makeAdapter({ apiKey: 'secret-123', fallbackToLocal: false });
    await adapter.executeCommand('test');
    const execCall = mockFetch.mock.calls[1];
    const headers = (execCall[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer secret-123');
  });

  it('should not send auth header when no api key', async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ status: 'ok' }))
      .mockResolvedValueOnce(okResponse({ ok: true, code: 0, message: 'done' }));
    const adapter = makeAdapter({ fallbackToLocal: false });
    await adapter.executeCommand('test');
    const execCall = mockFetch.mock.calls[1];
    const headers = (execCall[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });
});

describe('RemoteAdapter — register', () => {
  it('should delegate register and handlers work via local adapter', async () => {
    const handler = jest.fn().mockResolvedValue({ ok: true, code: 0, message: 'registered cmd' });
    const adapter = makeAdapter();
    adapter.register('test-cmd', handler);
    mockFetch.mockRejectedValueOnce(networkError);
    const result = await adapter.executeCommand('test-cmd');
    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ args: [] }),
    );
  });
});
