import { GeminiProvider, createGeminiProvider, createProvider } from '../dist/index';
import type { ChatRequest, ChatResponse } from '../src/index';

const API_KEY = 'AIzaSyTestGeminiKey123';

function mockFetchResponse(body: unknown, status = 200): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    headers: new Map(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => ({ json: async () => body }),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => JSON.stringify(body),
  } as any);
}

function setupStreamResponse(chunks: string[]): jest.SpyInstance {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    body: stream,
    headers: new Map(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => ({ body: stream }),
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    json: async () => ({}),
    text: async () => '',
  } as any);
}

function geminiSSE(text: string): string {
  return `data: ${JSON.stringify({
    candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }],
  })}\n\n`;
}

describe('GeminiProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GM-01: constructor with apiKey', () => {
    it('constructs with apiKey', () => {
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      expect(p.name).toBe('gemini');
      expect((p as any).apiKey).toBe(API_KEY);
    });

    it('throws without apiKey', () => {
      expect(() => new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: '' })).toThrow('apiKey');
    });
  });

  describe('GM-02: default model', () => {
    it('default model is gemini-2.0-flash', () => {
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      expect((p as any).defaultModel).toBe('gemini-2.0-flash');
    });

    it('accepts custom defaultModel', () => {
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY, defaultModel: 'gemini-1.5-pro' });
      expect((p as any).defaultModel).toBe('gemini-1.5-pro');
    });
  });

  describe('GM-03: model listing / chat with different models', () => {
    it('sends correct model in URL for chat', async () => {
      mockFetchResponse({
        candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, totalTokenCount: 8 },
      });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY, defaultModel: 'gemini-1.5-pro' });
      await p.chat({
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('gemini-1.5-pro');
      expect(fetchCall[0]).toContain(':generateContent');
    });

    it('uses default model from constructor', async () => {
      mockFetchResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      await p.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      } as ChatRequest);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('gemini-2.0-flash');
    });
  });

  describe('GM-04: chat with system instruction', () => {
    it('sends system messages as systemInstruction in body', async () => {
      mockFetchResponse({
        candidates: [{ content: { parts: [{ text: 'Understood.' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      const result = await p.chat({
        model: 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: 'You are a helpful AI.' },
          { role: 'user', content: 'Hello' },
        ],
      }) as ChatResponse;
      expect(result.content).toBe('Understood.');
      expect(result.model).toBe('gemini-2.0-flash');
      expect(result.provider).toBe('gemini');
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(5);
      expect(result.usage?.totalTokens).toBe(15);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.systemInstruction).toBeDefined();
      expect(body.systemInstruction.parts[0].text).toBe('You are a helpful AI.');
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].role).toBe('user');
    });

    it('maps assistant role to model role', async () => {
      mockFetchResponse({
        candidates: [{ content: { parts: [{ text: 'Continue...' }] } }],
      });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      await p.chat({
        model: 'gemini-2.0-flash',
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello there' },
          { role: 'user', content: 'How are you?' },
        ],
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.contents[0].role).toBe('user');
      expect(body.contents[1].role).toBe('model');
      expect(body.contents[2].role).toBe('user');
    });
  });

  describe('GM-05: streaming chat', () => {
    it('yields content chunks from SSE stream', async () => {
      setupStreamResponse([geminiSSE('Hello'), geminiSSE(' world')]);
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      const iterable = await p.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      }) as AsyncIterable<ChatResponse>;
      const chunks: ChatResponse[] = [];
      for await (const chunk of iterable) {
        chunks.push(chunk);
      }
      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe('Hello');
      expect(chunks[1].content).toBe(' world');
      expect(chunks[0].provider).toBe('gemini');
    });

    it('uses streamGenerateContent endpoint when streaming', async () => {
      setupStreamResponse([geminiSSE('test')]);
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      const iterable = await p.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      }) as AsyncIterable<ChatResponse>;
      for await (const _ of iterable) { /* consume to trigger fetch */ }
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain(':streamGenerateContent');
    });

    it('uses generateContent endpoint when not streaming', async () => {
      mockFetchResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      await p.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain(':generateContent');
      expect(fetchCall[0]).not.toContain('streamGenerateContent');
    });
  });

  describe('GM-06: embedding generation', () => {
    it('returns embeddings for single input', async () => {
      mockFetchResponse({
        embedding: { values: [0.1, 0.2, 0.3] },
      });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      const result = await p.embed({ model: 'text-embedding-004', input: 'hello world' });
      expect(result.embeddings).toHaveLength(1);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result.model).toBe('text-embedding-004');
      expect(result.provider).toBe('gemini');
    });

    it('returns embeddings for multiple inputs', async () => {
      const mock = mockFetchResponse({ embedding: { values: [0.5, 0.6, 0.7] } });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      const result = await p.embed({ model: 'text-embedding-004', input: ['hello', 'world'] });
      expect(mock).toHaveBeenCalledTimes(2);
      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0]).toEqual([0.5, 0.6, 0.7]);
      expect(result.embeddings[1]).toEqual([0.5, 0.6, 0.7]);
    });

    it('uses correct URL for embedding', async () => {
      mockFetchResponse({ embedding: { values: [0.1, 0.2] } });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      await p.embed({ model: 'text-embedding-004', input: 'test' });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('text-embedding-004');
      expect(fetchCall[0]).toContain(':embedContent');
    });
  });

  describe('GM-07: URL construction', () => {
    it('constructs chat URL with API key query parameter', async () => {
      mockFetchResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      await p.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyTestGeminiKey123'
      );
    });

    it('uses provided model name in URL', async () => {
      mockFetchResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      await p.chat({
        model: 'gemini-1.5-flash',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('gemini-1.5-flash');
    });

    it('includes maxOutputTokens in generationConfig', async () => {
      mockFetchResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      await p.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 4096,
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.generationConfig.maxOutputTokens).toBe(4096);
    });
  });

  describe('GM-08: error handling', () => {
    it('throws on non-ok response for chat', async () => {
      mockFetchResponse({ error: 'API key not valid' }, 400);
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: 'bad-key' });
      await expect(p.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('Gemini error: 400');
    });

    it('throws on non-ok response for streaming', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map(),
      } as any);
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      const promise = p.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      });
      const iterable = await promise as AsyncIterable<ChatResponse>;
      await expect(async () => {
        for await (const _ of iterable) { /* triggers fetch */ }
      }).rejects.toThrow('Gemini stream error: 429');
    });

    it('returns empty content on empty candidates', async () => {
      mockFetchResponse({ candidates: [] });
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      const result = await p.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
      }) as ChatResponse;
      expect(result.content).toBe('');
    });

    it('throws on network error', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      await expect(p.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('Network failure');
    });

    it('throws on embed error', async () => {
      mockFetchResponse({ error: 'Not found' }, 404);
      const p = new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      await expect(p.embed({ model: 'text-embedding-004', input: 'test' })).rejects.toThrow('Gemini embed error: 404');
    });
  });

  describe('GM-09: createGeminiProvider factory', () => {
    it('creates GeminiProvider with same config', () => {
      const p = createGeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY });
      expect(p).toBeInstanceOf(GeminiProvider);
      expect(p.name).toBe('gemini');
    });

    it('passes defaultModel to provider', () => {
      const p = createGeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: API_KEY, defaultModel: 'gemini-1.5-pro' });
      expect((p as any).defaultModel).toBe('gemini-1.5-pro');
    });
  });

  describe('GM-10: createProvider routes to Gemini', () => {
    it('routes googleapis endpoint to GeminiProvider', () => {
      const p = createProvider({
        endpoint: 'https://generativelanguage.googleapis.com',
        apiKey: API_KEY,
      });
      expect(p.name).toBe('gemini');
    });

    it('routes gemini endpoint to GeminiProvider', () => {
      const p = createProvider({
        endpoint: 'https://gemini.googleapis.com',
        apiKey: API_KEY,
      });
      expect(p.name).toBe('gemini');
    });

    it('throws for Gemini without apiKey', () => {
      expect(() => createProvider({
        endpoint: 'https://generativelanguage.googleapis.com',
      })).toThrow('API key');
    });
  });
});
