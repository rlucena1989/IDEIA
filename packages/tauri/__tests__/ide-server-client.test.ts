import { IdeApiClient } from '../src/ide-server-client';

const mockFetch = jest.fn();
global.fetch = mockFetch;

class MockWebSocket {
  onmessage: ((event: { data: string }) => void) | null = null;
  close = jest.fn();
  constructor(_url: string) {}
}

(global as Record<string, unknown>).WebSocket = MockWebSocket;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IdeApiClient', () => {
  it('constructs with default baseUrl', () => {
    const client = new IdeApiClient();
    expect(client).toBeDefined();
  });

  it('constructs with custom baseUrl', () => {
    const client = new IdeApiClient({ baseUrl: 'http://localhost:4173' });
    expect(client).toBeDefined();
  });

  it('checkHealth returns true when server responds', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const client = new IdeApiClient();
    const healthy = await client.checkHealth();
    expect(healthy).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('http://127.0.0.1:3001/api/ide/status');
  });

  it('checkHealth returns false on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const client = new IdeApiClient();
    const healthy = await client.checkHealth();
    expect(healthy).toBe(false);
  });

  it('getFileContent fetches with correct path', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ content: 'file content' }) });
    const client = new IdeApiClient();
    const content = await client.getFileContent('/test/file.ts');
    expect(content).toBe('file content');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/api/files/read',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('/test/file.ts'),
      })
    );
  });

  it('writeFile sends POST with path and content', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const client = new IdeApiClient();
    await client.writeFile('/test/file.ts', 'new content');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/api/files/write',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('new content'),
      })
    );
  });

  it('listDirectory returns entries', async () => {
    const entries = [
      { name: 'src', path: '/test/src', type: 'directory' },
      { name: 'index.ts', path: '/test/src/index.ts', type: 'file' },
    ];
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ entries }) });
    const client = new IdeApiClient();
    const result = await client.listDirectory('/test');
    expect(result).toEqual(entries);
  });

  it('chatCompletion sends messages and returns content', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ content: 'Hello!' }) });
    const client = new IdeApiClient();
    const result = await client.chatCompletion([{ role: 'user', content: 'Hi' }]);
    expect(result).toBe('Hello!');
  });

  it('connectWebSocket creates WebSocket connection', () => {
    const client = new IdeApiClient();
    client.connectWebSocket();
  });

  it('onMessage registers handler', () => {
    const client = new IdeApiClient();
    const handler = jest.fn();
    client.onMessage('test', handler);
  });

  it('disconnect closes WebSocket', () => {
    const client = new IdeApiClient();
    client.connectWebSocket();
    client.disconnect();
  });

  it('throws on getFileContent when server errors', async () => {
    mockFetch.mockResolvedValue({ ok: false, statusText: 'Not Found' });
    const client = new IdeApiClient();
    await expect(client.getFileContent('/missing')).rejects.toThrow('Not Found');
  });

  it('throws on chatCompletion when server errors', async () => {
    mockFetch.mockResolvedValue({ ok: false, statusText: 'Internal Server Error' });
    const client = new IdeApiClient();
    await expect(client.chatCompletion([{ role: 'user', content: 'Hi' }])).rejects.toThrow('Internal Server Error');
  });
});
