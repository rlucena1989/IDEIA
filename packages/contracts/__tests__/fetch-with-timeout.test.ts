import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { fetchWithTimeout, fetchWithRetry } from '../src/fetch-with-timeout';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns response when fetch succeeds', async () => {
    const mockResponse = { ok: true, status: 200 } as Response;
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

    const response = await fetchWithTimeout('https://example.com/api', { timeout: 5000 });
    expect(response).toBe(mockResponse);

    fetchSpy.mockRestore();
  });

  it('rejects when fetch throws', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    await expect(fetchWithTimeout('https://example.com/api', { timeout: 1000 })).rejects.toThrow('Network error');

    fetchSpy.mockRestore();
  });
});

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('succeeds on first attempt', async () => {
    const mockResponse = { ok: true } as Response;
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

    const response = await fetchWithRetry('https://example.com/api', { retries: 2, retryDelay: 10 });
    expect(response).toBe(mockResponse);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it('retries on failure and succeeds', async () => {
    const mockResponse = { ok: true } as Response;
    const fetchSpy = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce(mockResponse);

    const response = await fetchWithRetry('https://example.com/api', { retries: 3, retryDelay: 10 });
    expect(response).toBe(mockResponse);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    fetchSpy.mockRestore();
  });

  it('throws after exhausting retries', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Persistent error'));

    await expect(fetchWithRetry('https://example.com/api', { retries: 2, retryDelay: 10 })).rejects.toThrow('Persistent error');
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    fetchSpy.mockRestore();
  });
});
