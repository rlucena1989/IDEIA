import { ChatMessage, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, LLMProvider, LLMProviderConfig } from './types';
import { streamJSON } from './utils';

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
    if (request.stream) return this.streamChat(model, request.messages, signal);

    const response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: request.messages, stream: false }), signal,
    });
    if (!response.ok) throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return {
      content: data.message?.content || '', model: data.model || model, provider: this.name,
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, completionTokens: data.usage.completion_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
    };
  }

  private async *streamChat(model: string, messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<ChatResponse> {
    for await (const chunk of streamJSON(`${this.endpoint}/api/chat`, { model, messages, stream: true }, undefined, signal)) {
      const message = chunk.message as Record<string, unknown> | undefined;
      yield { content: (message?.content as string) || '', model: (chunk.model as string) || model, provider: this.name };
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.endpoint}/api/embed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: request.model || this.defaultModel, input: request.input }),
    });
    if (!response.ok) throw new Error(`Ollama embed error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return { embeddings: data.embeddings || [], model: data.model || request.model, provider: this.name };
  }
}
