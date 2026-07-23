export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  id?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: string;
  usage?: { promptTokens: number; totalTokens: number };
}

export interface LLMProviderConfig {
  endpoint: string;
  apiKey?: string;
  defaultModel?: string;
  timeout?: number;
}

export interface LLMProvider {
  readonly name: string;
  chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

function parseSSEStream(response: Response): ReadableStream<string> {
  let buffer = '';
  return new ReadableStream({
    start(controller) {
      if (!response.body) throw new Error('Response body is null');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      function push(): void {
        reader.read().then(({ done, value }) => {
          if (done) { controller.close(); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              controller.enqueue(trimmed.slice(6));
            }
          }
          push();
        }).catch(e => controller.error(e));
      }
      push();
    },
  });
}

async function* streamJSON(url: string, body: unknown, apiKey?: string, signal?: AbortSignal): AsyncIterable<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status} ${response.statusText}`);
  }

  const stream = parseSSEStream(response);
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value === '[DONE]') break;
    try {
      const chunk = JSON.parse(value) as Record<string, unknown>;
      yield chunk;
    } catch { /* skip malformed SSE */ }
  }
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private endpoint: string;
  private defaultModel: string;
  private timeout: number;

  constructor(config: LLMProviderConfig) {
    this.endpoint = config.endpoint.replace(/\/+$/, '');
    this.defaultModel = config.defaultModel || 'deepseek-coder';
    this.timeout = config.timeout || 120000;
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    const model = request.model || this.defaultModel;

    if (request.stream) {
      return this.streamChat(model, request.messages, signal);
    }

    const response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: request.messages, stream: false }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.message?.content || '',
      model: data.model || model,
      provider: this.name,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  }

  private async *streamChat(model: string, messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<ChatResponse> {
    const url = `${this.endpoint}/api/chat`;
    const body = { model, messages, stream: true };

    for await (const chunk of streamJSON(url, body, undefined, signal)) {
      const message = chunk.message as Record<string, unknown> | undefined;
      yield {
        content: (message?.content as string) || '',
        model: (chunk.model as string) || model,
        provider: this.name,
      };
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.endpoint}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: request.model || this.defaultModel, input: request.input }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embed error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      embeddings: data.embeddings || [],
      model: data.model || request.model,
      provider: this.name,
    };
  }
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private endpoint: string;
  private apiKey: string;
  private defaultModel: string;
  private timeout: number;

  constructor(config: LLMProviderConfig & { apiKey: string }) {
    this.endpoint = config.endpoint.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
    this.timeout = config.timeout || 120000;

    if (!this.apiKey) {
      throw new Error('OpenAIProvider requires an apiKey');
    }
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    const model = request.model || this.defaultModel;
    const body: Record<string, unknown> = {
      model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    };

    if (request.stream) {
      body.stream = true;
      return this.streamChat(body, signal);
    }

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content || '',
      model: data.model || model,
      provider: this.name,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  }

  private async *streamChat(body: Record<string, unknown>, signal?: AbortSignal): AsyncIterable<ChatResponse> {
    const url = `${this.endpoint}/v1/chat/completions`;

    for await (const chunk of streamJSON(url, body, this.apiKey, signal)) {
      const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
      const choice = choices?.[0];
      const delta = choice?.delta as Record<string, unknown> | undefined;
      yield {
        content: (delta?.content as string) || '',
        model: (chunk.model as string) || (body.model as string),
        provider: this.name,
      };
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.endpoint}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'text-embedding-3-small',
        input: request.input,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embed error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      embeddings: data.data?.map((d: { embedding: number[] }) => d.embedding) || [],
      model: data.model || request.model,
      provider: this.name,
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
    };
  }
}

export { GeminiProvider, createGeminiProvider } from './gemini-provider';

export function createProvider(config: LLMProviderConfig & { apiKey?: string; reasoning?: boolean }): LLMProvider {
  const url = config.endpoint.toLowerCase();
  const model = (config.defaultModel || '').toLowerCase();

  if (config.reasoning) {
    if (model.includes('o1') || model.includes('o3')) {
      if (!config.apiKey) {
        throw new Error('OpenAI reasoning endpoint requires an API key.');
      }
      return new OpenAIReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'o3-mini' });
    }
    if (model.includes('r1') || model.includes('deepseek-reasoner')) {
      if (!config.apiKey) {
        throw new Error('DeepSeek reasoning endpoint requires an API key.');
      }
      return new DeepSeekReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'deepseek-reasoner' });
    }
  }

  if (url.includes('googleapis') || url.includes('gemini')) {
    if (!config.apiKey) {
      throw new Error('Gemini endpoint requires an API key. Set GEMINI_API_KEY or GOOGLE_API_KEY.');
    }
    return new GeminiProvider({ ...config, apiKey: config.apiKey });
  }

  if (url.includes('api.openai.com') || url.includes('openai')) {
    if (!config.apiKey) {
      throw new Error('OpenAI endpoint requires an API key. Set IDEIA_LLM_API_KEY or pass apiKey in config.');
    }
    if (model.startsWith('o1') || model.startsWith('o3')) {
      return new OpenAIReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'o3-mini' });
    }
    return new OpenAIProvider({ ...config, apiKey: config.apiKey });
  }

  if (url.includes('anthropic') || url.includes('claude')) {
    if (!config.apiKey) {
      throw new Error('Anthropic endpoint requires an API key.');
    }
    return new OpenAIProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'claude-3-haiku' });
  }

  if (url.includes('deepseek')) {
    if (!config.apiKey) {
      throw new Error('DeepSeek endpoint requires an API key.');
    }
    if (model.includes('r1') || model.includes('reasoner')) {
      return new DeepSeekReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'deepseek-reasoner' });
    }
    return new OpenAIProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'deepseek-chat' });
  }

  if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('ollama')) {
    return new OllamaProvider(config);
  }

  if (config.apiKey) {
    return new OpenAIProvider({ ...config, apiKey: config.apiKey });
  }

  return new OllamaProvider(config);
}

export function createProviderFromEnv(): LLMProvider {
  const endpoint = process.env.IDEIA_LLM_ENDPOINT || 'http://localhost:11434';
  const apiKey = process.env.IDEIA_LLM_API_KEY;
  const model = process.env.IDEIA_LLM_MODEL;
  return createProvider({ endpoint, apiKey, defaultModel: model });
}

export class OpenAIReasoningProvider implements LLMProvider {
  readonly name = 'openai-reasoning';
  private endpoint: string;
  private apiKey: string;
  private defaultModel: string;
  private timeout: number;

  constructor(config: LLMProviderConfig & { apiKey: string }) {
    this.endpoint = config.endpoint.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'o3-mini';
    this.timeout = config.timeout || 300000;

    if (!this.apiKey) {
      throw new Error('OpenAIReasoningProvider requires an apiKey');
    }
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    const model = request.model || this.defaultModel;
    const isStreaming = request.stream;

    const mappedMessages = request.messages.map(m => ({
      role: m.role === 'system' ? 'user' as const : m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model,
      messages: mappedMessages,
      max_completion_tokens: request.maxTokens ?? 16384,
    };

    const isO1 = model.startsWith('o1');
    if (isO1) {
      body.reasoning_effort = 'medium';
    }

    if (isStreaming) {
      body.stream = true;
      return this.streamChat(body, signal);
    }

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI reasoning error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content || '',
      model: data.model || model,
      provider: this.name,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  }

  private async *streamChat(body: Record<string, unknown>, signal?: AbortSignal): AsyncIterable<ChatResponse> {
    const url = `${this.endpoint}/v1/chat/completions`;

    for await (const chunk of streamJSON(url, body, this.apiKey, signal)) {
      const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
      const choice = choices?.[0];
      const delta = choice?.delta as Record<string, unknown> | undefined;
      yield {
        content: (delta?.content as string) || '',
        model: (chunk.model as string) || (body.model as string),
        provider: this.name,
      };
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.endpoint}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'text-embedding-3-small',
        input: request.input,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embed error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      embeddings: data.data?.map((d: { embedding: number[] }) => d.embedding) || [],
      model: data.model || request.model,
      provider: this.name,
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
    };
  }
}

export class DeepSeekReasoningProvider implements LLMProvider {
  readonly name = 'deepseek-reasoning';
  private endpoint: string;
  private apiKey: string;
  private defaultModel: string;
  private timeout: number;

  constructor(config: LLMProviderConfig & { apiKey: string }) {
    this.endpoint = config.endpoint.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'deepseek-reasoner';
    this.timeout = config.timeout || 300000;

    if (!this.apiKey) {
      throw new Error('DeepSeekReasoningProvider requires an apiKey');
    }
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    const model = request.model || this.defaultModel;

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 8192,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`DeepSeek reasoning error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const reasoningContent = choice?.message?.reasoning_content || '';

    return {
      content: reasoningContent
        ? `[Raciocínio]\n${reasoningContent}\n\n[Resposta]\n${choice?.message?.content || ''}`
        : choice?.message?.content || '',
      model: data.model || model,
      provider: this.name,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new Error('DeepSeek reasoning models do not support embeddings');
  }
}

export class ProviderRouter {
  private providers: LLMProvider[] = [];

  register(provider: LLMProvider): void {
    this.providers.push(provider);
  }

  setPriority(names: string[]): void {
    const ordered: LLMProvider[] = [];
    for (const name of names) {
      const provider = this.providers.find(p => p.name === name);
      if (provider) ordered.push(provider);
    }
    const remaining = this.providers.filter(p => !names.includes(p.name));
    this.providers = [...ordered, ...remaining];
  }

  getActive(): LLMProvider {
    if (this.providers.length === 0) throw new Error('No LLM provider registered');
    return this.providers[0];
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.find(p => p.name === name);
  }

  listProviders(): string[] {
    return this.providers.map(p => p.name);
  }
}

export function createDefaultRouter(): ProviderRouter {
  const router = new ProviderRouter();
  const endpoint = process.env.IDEIA_LLM_ENDPOINT || 'http://localhost:11434';
  const apiKey = process.env.IDEIA_LLM_API_KEY;
  const model = process.env.IDEIA_LLM_MODEL;
  const reasoningEnabled = process.env.IDEIA_LLM_REASONING === 'true' || process.env.IDEIA_LLM_REASONING === '1';

  if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
    router.register(new OllamaProvider({ endpoint, defaultModel: model }));
    if (apiKey) {
      router.register(new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey, defaultModel: model || 'gpt-4o-mini' }));
    }
  } else {
    const provider = createProvider({ endpoint, apiKey, defaultModel: model });
    router.register(provider);
    if (!endpoint.includes('openai') && apiKey) {
      router.register(new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey, defaultModel: 'gpt-4o-mini' }));
    }
  }

  if (reasoningEnabled && apiKey) {
    router.register(new OpenAIReasoningProvider({ endpoint: 'https://api.openai.com/v1', apiKey, defaultModel: 'o3-mini' }));
    router.register(new DeepSeekReasoningProvider({ endpoint: 'https://api.deepseek.com/v1', apiKey, defaultModel: 'deepseek-reasoner' }));
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiApiKey) {
    router.register(new GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: geminiApiKey, defaultModel: 'gemini-2.0-flash' }));
  }

  return router;
}
