import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { queryOllama } from '../ollama';
import { hashPrompt } from '../classifier';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'ollama-test-'));
const TEST_PROMPT = 'what is 2+2?';
const TEST_MODEL = 'nomic-embed-text';
const TEST_ROUTE = 'test';

describe('ollama', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn() as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    try { fs.rmSync(path.join(TEST_ROOT, '.ai'), { recursive: true, force: true }); } catch {}
  });

  it('returns response text on successful call', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: '4', eval_count: 5 }),
    });
    const result = await queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE);
    expect(result).toBe('4');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toBe('http://localhost:11434/api/generate');
    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.model).toBe(TEST_MODEL);
    expect(callBody.prompt).toBe(TEST_PROMPT);
    expect(callBody.stream).toBe(false);
  });

  it('trims response text', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: '  4  ', eval_count: 5 }),
    });
    const result = await queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE);
    expect(result).toBe('4');
  });

  it('returns empty string when response is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ eval_count: 0 }),
    });
    const result = await queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE);
    expect(result).toBe('');
  });

  it('throws on HTTP 404 error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false, status: 404, statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'model not found' }),
    });
    await expect(queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE)).rejects.toThrow('ollama HTTP 404');
  });

  it('throws on HTTP 500 error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false, status: 500, statusText: 'Server Error',
      json: () => Promise.resolve({ error: 'server error' }),
    });
    await expect(queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE)).rejects.toThrow('ollama HTTP 500');
  });

  it('throws on network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:11434'));
    await expect(queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE)).rejects.toThrow('connect ECONNREFUSED');
  });



  it('writes inference log on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: '4', eval_count: 5 }),
    });
    await queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE);
    const logPath = path.join(TEST_ROOT, '.ai/reports/local-ai/inferences.jsonl');
    expect(fs.existsSync(logPath)).toBe(true);
    const logContent = fs.readFileSync(logPath, 'utf8').trim();
    expect(logContent).toBeTruthy();
    const entry = JSON.parse(logContent);
    expect(entry.model).toBe(TEST_MODEL);
    expect(entry.route).toBe(TEST_ROUTE);
    expect(entry.success).toBe(true);
    expect(entry.prompt_hash).toBe(hashPrompt(TEST_PROMPT));
  });

  it('writes inference log on error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false, status: 404, statusText: 'Not Found',
      json: () => Promise.resolve({}),
    });
    try { await queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE); } catch {}
    const logPath = path.join(TEST_ROOT, '.ai/reports/local-ai/inferences.jsonl');
    expect(fs.existsSync(logPath)).toBe(true);
    const logContent = fs.readFileSync(logPath, 'utf8').trim();
    expect(logContent).toBeTruthy();
    const entry = JSON.parse(logContent);
    expect(entry.success).toBe(false);
    expect(entry.model).toBe(TEST_MODEL);
  });

  it('uses custom timeout when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'done', eval_count: 1 }),
    });
    const result = await queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE, 5000);
    expect(result).toBe('done');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('sends Content-Type JSON header', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'ok' }),
    });
    await queryOllama(TEST_PROMPT, TEST_MODEL, TEST_ROOT, TEST_ROUTE);
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });
});
