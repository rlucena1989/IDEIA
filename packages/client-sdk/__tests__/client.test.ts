import { IdeiaClient } from '../src/client';
import type { StatusResult, CommandResult} from '../src/types';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('IdeiaClient', () => {
  let client: IdeiaClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new IdeiaClient({ baseUrl: 'http://localhost:3001', apiKey: 'test-key' });
  });

  it('should fetch status', async () => {
    const expected: StatusResult = { status: 'healthy', uptime: 100, memory: { rss: 0, heapTotal: 0, heapUsed: 0 } };
    mockFetch.mockResolvedValue({ ok: true, json: async () => expected });

    const result = await client.status();
    expect(result).toEqual(expected);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/status', expect.any(Object));
  });

  it('should run a command', async () => {
    const expected: CommandResult = { success: true, data: { command: 'test', args: [] } };
    mockFetch.mockResolvedValue({ ok: true, json: async () => expected });

    const result = await client.runCommand('test');
    expect(result).toEqual(expected);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/command', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'test', args: undefined }),
    }));
  });

  it('should execute a plan', async () => {
    const expected: CommandResult = { success: true, data: { planId: 'p1', status: 'executing' } };
    mockFetch.mockResolvedValue({ ok: true, json: async () => expected });

    const result = await client.executePlan('p1');
    expect(result).toEqual(expected);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/plan/execute', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ planId: 'p1' }),
    }));
  });

  it('should include API key header', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'healthy', uptime: 0, memory: { rss: 0, heapTotal: 0, heapUsed: 0 } }) });

    await client.status();
    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
    }));
  });

  it('should throw on error response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });

    await expect(client.status()).rejects.toThrow('HTTP 401: Unauthorized');
  });
});
