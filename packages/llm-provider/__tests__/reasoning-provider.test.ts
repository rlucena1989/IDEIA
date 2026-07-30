import {
  OpenAIReasoningProvider,
  DeepSeekReasoningProvider,
  ProviderRouter,
  createProvider,
  OllamaProvider,
  OpenAIProvider,
} from '../dist/index';

const API_KEY = 'sk-test-reasoning-key';
const baseEndpoint = 'https://api.openai.com/v1';

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

function mockFetchStream(chunks: string[]): jest.SpyInstance {
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

function sseData(content: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content }, index: 0 }],
    model: 'o3-mini',
  })}\n\n`;
}

function sseDone(): string {
  return 'data: [DONE]\n\n';
}

describe('OpenAIReasoningProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('RM-01: constructor', () => {
    it('constructs with apiKey and defaults', () => {
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      expect(p.name).toBe('openai-reasoning');
    });

    it('default model is o3-mini', () => {
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      expect((p as any).defaultModel).toBe('o3-mini');
    });

    it('default timeout is 300000', () => {
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      expect((p as any).timeout).toBe(300000);
    });

    it('throws without apiKey', () => {
      expect(() => new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: '' })).toThrow('apiKey');
    });

    it('uses custom defaultModel', () => {
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY, defaultModel: 'o1' });
      expect((p as any).defaultModel).toBe('o1');
    });
  });

  describe('RM-02: adaptMessages (system→user rewrite)', () => {
    it('rewrites system messages to user role', async () => {
      mockFetchResponse({
        choices: [{ message: { content: 'reply' } }],
        model: 'o3-mini',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      const result = (await p.chat({
        model: 'o3-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
        ],
      })) as any;
      expect(result.content).toBe('reply');
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[0].content).toBe('You are a helpful assistant');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toBe('Hello');
    });
  });

  describe('RM-03: max_completion_tokens instead of max_tokens', () => {
    it('sends max_completion_tokens in request body', async () => {
      mockFetchResponse({
        choices: [{ message: { content: 'reply' } }],
        model: 'o3-mini',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      await p.chat({
        model: 'o3-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 4096,
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.max_completion_tokens).toBe(4096);
      expect(body.max_tokens).toBeUndefined();
    });

    it('defaults max_completion_tokens to 16384 when not specified', async () => {
      mockFetchResponse({
        choices: [{ message: { content: 'reply' } }],
        model: 'o3-mini',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      await p.chat({
        model: 'o3-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.max_completion_tokens).toBe(16384);
    });
  });

  describe('RM-04: reasoning_effort setting', () => {
    it('sets reasoning_effort for o1 models', async () => {
      mockFetchResponse({
        choices: [{ message: { content: 'reply' } }],
        model: 'o1-mini',
      });
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      await p.chat({
        model: 'o1-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.reasoning_effort).toBe('medium');
    });

    it('does not set reasoning_effort for o3 models', async () => {
      mockFetchResponse({
        choices: [{ message: { content: 'reply' } }],
        model: 'o3-mini',
      });
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      await p.chat({
        model: 'o3-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.reasoning_effort).toBeUndefined();
    });
  });

  describe('RM-05: streamChat format', () => {
    it('yields content chunks from SSE stream', async () => {
      mockFetchStream([sseData('Hello'), sseData(' world'), sseDone()]);
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      const iterable = (await p.chat({
        model: 'o3-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      })) as AsyncIterable<any>;
      const chunks: any[] = [];
      for await (const chunk of iterable) {
        chunks.push(chunk);
      }
      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe('Hello');
      expect(chunks[1].content).toBe(' world');
      expect(chunks[0].provider).toBe('openai-reasoning');
    });
  });

  describe('RM-06: chat non-streaming', () => {
    it('returns ChatResponse with usage', async () => {
      mockFetchResponse({
        choices: [{ message: { content: 'test response' } }],
        model: 'o3-mini-2025-01',
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      });
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      const result = (await p.chat({
        model: 'o3-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      })) as any;
      expect(result.content).toBe('test response');
      expect(result.model).toBe('o3-mini-2025-01');
      expect(result.provider).toBe('openai-reasoning');
      expect(result.usage?.promptTokens).toBe(20);
      expect(result.usage?.completionTokens).toBe(10);
      expect(result.usage?.totalTokens).toBe(30);
    });
  });

  describe('RM-07: embedding call', () => {
    it('returns embeddings from API', async () => {
      mockFetchResponse({
        data: [{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }],
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      const result = await p.embed({ model: 'text-embedding-3-small', input: ['hello', 'world'] });
      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result.model).toBe('text-embedding-3-small');
      expect(result.provider).toBe('openai-reasoning');
      expect(result.usage?.promptTokens).toBe(10);
    });
  });

  describe('RM-08: error handling', () => {
    it('throws on non-ok response for chat', async () => {
      mockFetchResponse({ error: 'Unauthorized' }, 401);
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      await expect(
        p.chat({
          model: 'o3-mini',
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      ).rejects.toThrow('OpenAI reasoning error: 401');
    });

    it('throws on non-ok response for embed', async () => {
      mockFetchResponse({ error: 'Forbidden' }, 403);
      const p = new OpenAIReasoningProvider({ endpoint: baseEndpoint, apiKey: API_KEY });
      await expect(p.embed({ model: 'text-embedding-3-small', input: 'test' })).rejects.toThrow('OpenAI embed error: 403');
    });
  });
});

describe('DeepSeekReasoningProvider', () => {
  const dsEndpoint = 'https://api.deepseek.com/v1';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('RM-09: constructor', () => {
    it('constructs with apiKey', () => {
      const p = new DeepSeekReasoningProvider({ endpoint: dsEndpoint, apiKey: API_KEY });
      expect(p.name).toBe('deepseek-reasoning');
    });

    it('default model is deepseek-reasoner', () => {
      const p = new DeepSeekReasoningProvider({ endpoint: dsEndpoint, apiKey: API_KEY });
      expect((p as any).defaultModel).toBe('deepseek-reasoner');
    });

    it('default timeout is 300000', () => {
      const p = new DeepSeekReasoningProvider({ endpoint: dsEndpoint, apiKey: API_KEY });
      expect((p as any).timeout).toBe(300000);
    });

    it('throws without apiKey', () => {
      expect(() => new DeepSeekReasoningProvider({ endpoint: dsEndpoint, apiKey: '' })).toThrow('apiKey');
    });
  });

  describe('RM-10: chat with reasoning_content parsing', () => {
    it('parses reasoning_content and formats response', async () => {
      mockFetchResponse({
        choices: [
          {
            message: {
              content: 'The answer is 42.',
              reasoning_content: 'Let me think step by step...',
            },
          },
        ],
        model: 'deepseek-reasoner',
        usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 },
      });
      const p = new DeepSeekReasoningProvider({ endpoint: dsEndpoint, apiKey: API_KEY });
      const result = (await p.chat({
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: 'What is the meaning of life?' }],
      })) as any;
      expect(result.content).toContain('[Raciocínio]');
      expect(result.content).toContain('Let me think step by step...');
      expect(result.content).toContain('[Resposta]');
      expect(result.content).toContain('The answer is 42.');
      expect(result.provider).toBe('deepseek-reasoning');
      expect(result.usage?.promptTokens).toBe(15);
    });

    it('handles empty reasoning_content gracefully', async () => {
      mockFetchResponse({
        choices: [
          {
            message: {
              content: 'Direct answer.',
              reasoning_content: '',
            },
          },
        ],
        model: 'deepseek-reasoner',
      });
      const p = new DeepSeekReasoningProvider({ endpoint: dsEndpoint, apiKey: API_KEY });
      const result = (await p.chat({
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: 'Hi' }],
      })) as any;
      expect(result.content).toBe('Direct answer.');
    });
  });

  describe('RM-11: response format [Rationale]...[Response]', () => {
    it('formats response with Portuguese bracketed sections', async () => {
      mockFetchResponse({
        choices: [
          {
            message: {
              content: 'Final output.',
              reasoning_content: 'Reasoning process.',
            },
          },
        ],
        model: 'deepseek-reasoner',
      });
      const p = new DeepSeekReasoningProvider({ endpoint: dsEndpoint, apiKey: API_KEY });
      const result = (await p.chat({
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: 'Explain' }],
      })) as any;
      expect(result.content).toBe('[Raciocínio]\nReasoning process.\n\n[Resposta]\nFinal output.');
    });
  });

  describe('RM-12: streaming not yet supported', () => {
    it('does not support streaming (stream flag is ignored, non-streaming used)', async () => {
      mockFetchResponse({
        choices: [
          {
            message: { content: 'non-stream reply', reasoning_content: 'thinking' },
          },
        ],
        model: 'deepseek-reasoner',
      });
      const p = new DeepSeekReasoningProvider({ endpoint: dsEndpoint, apiKey: API_KEY });
      const result = (await p.chat({
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      })) as any;
      expect(result.content).toContain('[Resposta]');
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.stream).toBe(false);
    });
  });

  describe('RM-13: error on embed', () => {
    it('throws when embed is called', async () => {
      const p = new DeepSeekReasoningProvider({ endpoint: dsEndpoint, apiKey: API_KEY });
      await expect(p.embed({ model: 'deepseek-reasoner', input: 'test' })).rejects.toThrow(
        'DeepSeek reasoning models do not support embeddings',
      );
    });
  });
});

describe('ProviderRouter', () => {
  let router: ProviderRouter;

  beforeEach(() => {
    router = new ProviderRouter();
  });

  describe('RM-14: register provider', () => {
    it('registers and lists providers', () => {
      const p = new OpenAIReasoningProvider({ endpoint: 'https://api.openai.com/v1', apiKey: API_KEY });
      router.register(p);
      expect(router.listProviders()).toEqual(['openai-reasoning']);
    });

    it('registers multiple providers', () => {
      const p1 = new OllamaProvider({ endpoint: 'http://localhost:11434' });
      const p2 = new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey: API_KEY });
      router.register(p1);
      router.register(p2);
      expect(router.listProviders()).toEqual(['ollama', 'openai']);
    });
  });

  describe('RM-15: select by name', () => {
    it('returns provider by name', () => {
      const p = new DeepSeekReasoningProvider({ endpoint: 'https://api.deepseek.com/v1', apiKey: API_KEY });
      router.register(p);
      expect(router.getProvider('deepseek-reasoning')).toBe(p);
    });

    it('returns undefined for unknown name', () => {
      expect(router.getProvider('nonexistent')).toBeUndefined();
    });
  });

  describe('RM-16: getActive', () => {
    it('returns first registered provider', () => {
      const p1 = new OllamaProvider({ endpoint: 'http://localhost:11434' });
      const p2 = new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey: API_KEY });
      router.register(p1);
      router.register(p2);
      expect(router.getActive()).toBe(p1);
    });

    it('throws when no providers registered', () => {
      expect(() => router.getActive()).toThrow('No LLM provider registered');
    });
  });

  describe('RM-17: priority ordering', () => {
    it('reorders by setPriority', () => {
      const p1 = new OllamaProvider({ endpoint: 'http://localhost:11434' });
      const p2 = new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey: API_KEY });
      const p3 = new DeepSeekReasoningProvider({ endpoint: 'https://api.deepseek.com/v1', apiKey: API_KEY });
      router.register(p1);
      router.register(p2);
      router.register(p3);
      router.setPriority(['deepseek-reasoning', 'ollama']);
      expect(router.listProviders()).toEqual(['deepseek-reasoning', 'ollama', 'openai']);
    });
  });

  describe('RM-18: fallback', () => {
    it('getActive returns first after priority change', () => {
      const p1 = new OllamaProvider({ endpoint: 'http://localhost:11434' });
      const p2 = new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey: API_KEY });
      router.register(p1);
      router.register(p2);
      router.setPriority(['openai']);
      expect(router.getActive()).toBe(p2);
    });
  });
});

describe('createProvider with reasoning=true', () => {
  describe('RM-19: routes to OpenAIReasoningProvider', () => {
    it('creates OpenAIReasoningProvider for o3 model with reasoning=true', () => {
      const p = createProvider({
        endpoint: 'https://api.openai.com/v1',
        apiKey: API_KEY,
        defaultModel: 'o3-mini',
        reasoning: true,
      });
      expect(p.name).toBe('openai-reasoning');
    });

    it('creates OpenAIReasoningProvider for o1 model with reasoning=true', () => {
      const p = createProvider({
        endpoint: 'https://api.openai.com/v1',
        apiKey: API_KEY,
        defaultModel: 'o1',
        reasoning: true,
      });
      expect(p.name).toBe('openai-reasoning');
    });

    it('creates DeepSeekReasoningProvider for r1 model with reasoning=true', () => {
      const p = createProvider({
        endpoint: 'https://api.deepseek.com/v1',
        apiKey: API_KEY,
        defaultModel: 'deepseek-reasoner',
        reasoning: true,
      });
      expect(p.name).toBe('deepseek-reasoning');
    });

    it('creates DeepSeekReasoningProvider for deepseek-reasoner model with reasoning=true', () => {
      const p = createProvider({
        endpoint: 'https://api.deepseek.com',
        apiKey: API_KEY,
        defaultModel: 'deepseek-reasoner',
        reasoning: true,
      });
      expect(p.name).toBe('deepseek-reasoning');
    });
  });

  describe('RM-20: createProvider without reasoning flag', () => {
    it('creates standard OpenAIProvider for non-o3 model without reasoning flag', () => {
      const p = createProvider({
        endpoint: 'https://api.openai.com/v1',
        apiKey: API_KEY,
        defaultModel: 'gpt-4o',
      });
      expect(p.name).toBe('openai');
    });

    it('creates standard OpenAIProvider for deepseek-chat without reasoning flag', () => {
      const p = createProvider({
        endpoint: 'https://api.deepseek.com',
        apiKey: API_KEY,
        defaultModel: 'deepseek-chat',
      });
      expect(p.name).toBe('deepseek');
    });
  });

  describe('RM-21: createProvider error for reasoning without apiKey', () => {
    it('throws when OpenAI reasoning is requested without apiKey', () => {
      expect(() =>
        createProvider({
          endpoint: 'https://api.openai.com/v1',
          defaultModel: 'o3-mini',
          reasoning: true,
        }),
      ).toThrow('API key');
    });

    it('throws when DeepSeek reasoning is requested without apiKey', () => {
      expect(() =>
        createProvider({
          endpoint: 'https://api.deepseek.com',
          defaultModel: 'deepseek-reasoner',
          reasoning: true,
        }),
      ).toThrow('API key');
    });
  });
});
