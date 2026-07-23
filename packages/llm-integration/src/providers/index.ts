import { AiMessage, AiStreamChunk } from '@ideia/theia-ai';
import { LlmProvider, LlmProviderConfig, ChatOptions, ChatResponse, ModelDescriptor, HealthStatus } from './types';

export class OllamaProvider implements LlmProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';
  readonly config: LlmProviderConfig;

  constructor(config?: Partial<LlmProviderConfig>) {
    this.config = {
      id: 'ollama',
      name: 'Ollama (Local)',
      baseUrl: config?.baseUrl || 'http://localhost:11434',
      defaultModel: config?.defaultModel || 'qwen2.5-coder:7b',
      capabilities: {
        maxConcurrentRequests: 4,
        requiresApiKey: false,
        supportsStreaming: true,
        supportsFunctions: false,
        supportsTools: false,
        supportsVision: false,
        supportsEmbeddings: true,
        supportsFineTuned: false,
        rateLimit: { requestsPerMinute: 60, tokensPerMinute: 100000 },
      },
      ...config,
    };
  }

  async chat(model: string, messages: AiMessage[], options?: ChatOptions): Promise<ChatResponse> {
    return { id: '', model, provider: this.id, content: '', finishReason: 'stop', latencyMs: 0, cached: false, createdAt: new Date().toISOString() };
  }

  async *streamChat(model: string, messages: AiMessage[], options?: ChatOptions): AsyncIterable<AiStreamChunk> {}

  async embed(model: string, input: string | string[]): Promise<number[][]> { return []; }

  async listModels(): Promise<ModelDescriptor[]> { return []; }

  async healthCheck(): Promise<HealthStatus> {
    return { healthy: true, provider: this.id, latencyMs: 0, modelsAvailable: 0, rateLimitRemaining: 60, uptimeHours: 24 };
  }
}

export class OpenAiProvider implements LlmProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly config: LlmProviderConfig;

  constructor(config?: Partial<LlmProviderConfig>) {
    this.config = {
      id: 'openai',
      name: 'OpenAI',
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
      baseUrl: config?.baseUrl || 'https://api.openai.com/v1',
      defaultModel: config?.defaultModel || 'gpt-4o',
      capabilities: {
        maxConcurrentRequests: 10,
        requiresApiKey: true,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsTools: true,
        supportsVision: true,
        supportsEmbeddings: true,
        supportsFineTuned: true,
        rateLimit: { requestsPerMinute: 500, tokensPerMinute: 200000 },
      },
      ...config,
    };
  }

  async chat(model: string, messages: AiMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        tools: options?.tools,
        stream: false,
      }),
      signal: options?.signal,
    });
    const data = await response.json();
    const choice = data.choices?.[0];
    return {
      id: data.id,
      model: data.model,
      provider: this.id,
      content: choice?.message?.content || '',
      toolCalls: choice?.message?.tool_calls,
      finishReason: choice?.finish_reason || 'stop',
      latencyMs: 0,
      cached: false,
      createdAt: new Date().toISOString(),
    };
  }

  async *streamChat(model: string, messages: AiMessage[], options?: ChatOptions): AsyncIterable<AiStreamChunk> {}

  async embed(model: string, input: string | string[]): Promise<number[][]> {
    const response = await fetch(`${this.config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'text-embedding-3-small',
        input: Array.isArray(input) ? input : [input],
      }),
    });
    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }

  async listModels(): Promise<ModelDescriptor[]> { return []; }

  async healthCheck(): Promise<HealthStatus> {
    return { healthy: true, provider: this.id, latencyMs: 0, modelsAvailable: 0, rateLimitRemaining: 500, uptimeHours: 8760 };
  }
}

export class AnthropicProvider implements LlmProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';
  readonly config: LlmProviderConfig;

  constructor(config?: Partial<LlmProviderConfig>) {
    this.config = {
      id: 'anthropic',
      name: 'Anthropic',
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY,
      baseUrl: config?.baseUrl || 'https://api.anthropic.com/v1',
      defaultModel: config?.defaultModel || 'claude-4-sonnet',
      capabilities: {
        maxConcurrentRequests: 5,
        requiresApiKey: true,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsTools: true,
        supportsVision: true,
        supportsEmbeddings: false,
        supportsFineTuned: false,
        rateLimit: { requestsPerMinute: 50, tokensPerMinute: 100000 },
      },
      ...config,
    };
  }

  async chat(model: string, messages: AiMessage[], options?: ChatOptions): Promise<ChatResponse> {
    return { id: '', model, provider: this.id, content: '', finishReason: 'stop', latencyMs: 0, cached: false, createdAt: new Date().toISOString() };
  }

  async *streamChat(model: string, messages: AiMessage[], options?: ChatOptions): AsyncIterable<AiStreamChunk> {}

  async embed(model: string, input: string | string[]): Promise<number[][]> { return []; }

  async listModels(): Promise<ModelDescriptor[]> { return []; }

  async healthCheck(): Promise<HealthStatus> {
    return { healthy: true, provider: this.id, latencyMs: 0, modelsAvailable: 0, rateLimitRemaining: 50, uptimeHours: 8760 };
  }
}

export class GoogleGeminiProvider implements LlmProvider {
  readonly id = 'google';
  readonly name = 'Google Gemini';
  readonly config: LlmProviderConfig;

  constructor(config?: Partial<LlmProviderConfig>) {
    this.config = {
      id: 'google',
      name: 'Google Gemini',
      apiKey: config?.apiKey || process.env.GEMINI_API_KEY,
      baseUrl: config?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: config?.defaultModel || 'gemini-2.0-flash',
      capabilities: {
        maxConcurrentRequests: 10,
        requiresApiKey: true,
        supportsStreaming: true,
        supportsFunctions: true,
        supportsTools: true,
        supportsVision: true,
        supportsEmbeddings: true,
        supportsFineTuned: false,
        rateLimit: { requestsPerMinute: 360, tokensPerMinute: 100000 },
      },
      ...config,
    };
  }

  async chat(model: string, messages: AiMessage[], options?: ChatOptions): Promise<ChatResponse> {
    return { id: '', model, provider: this.id, content: '', finishReason: 'stop', latencyMs: 0, cached: false, createdAt: new Date().toISOString() };
  }

  async *streamChat(model: string, messages: AiMessage[], options?: ChatOptions): AsyncIterable<AiStreamChunk> {}

  async embed(model: string, input: string | string[]): Promise<number[][]> { return []; }

  async listModels(): Promise<ModelDescriptor[]> { return []; }

  async healthCheck(): Promise<HealthStatus> {
    return { healthy: true, provider: this.id, latencyMs: 0, modelsAvailable: 0, rateLimitRemaining: 360, uptimeHours: 8760 };
  }
}
