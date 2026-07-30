import { ChatMessage, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, LLMProvider, LLMProviderConfig } from './types';
import { streamJSON } from './utils';

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
    if (!this.apiKey) throw new Error('OpenAIReasoningProvider requires an apiKey');
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    const model = request.model || this.defaultModel;
    const mappedMessages: ChatMessage[] = request.messages.map(m => ({
      ...m, role: m.role === 'system' ? 'user' : m.role,
    }));
    const body: Record<string, unknown> = {
      model, messages: mappedMessages,
      max_completion_tokens: request.maxTokens ?? 16384,
    };
    if (model.startsWith('o1')) body.reasoning_effort = 'medium';
    if (request.stream) { body.stream = true; return this.streamChat(body, signal); }

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body), signal,
    });
    if (!response.ok) throw new Error(`OpenAI reasoning error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content || '', model: data.model || model, provider: this.name,
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, completionTokens: data.usage.completion_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
    };
  }

  private async *streamChat(body: Record<string, unknown>, signal?: AbortSignal): AsyncIterable<ChatResponse> {
    for await (const chunk of streamJSON(`${this.endpoint}/v1/chat/completions`, body, this.apiKey, signal)) {
      const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
      const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
      yield { content: (delta?.content as string) || '', model: (chunk.model as string) || (body.model as string), provider: this.name };
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.endpoint}/v1/embeddings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: request.model || 'text-embedding-3-small', input: request.input }),
    });
    if (!response.ok) throw new Error(`OpenAI embed error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return {
      embeddings: data.data?.map((d: { embedding: number[] }) => d.embedding) || [],
      model: data.model || request.model, provider: this.name,
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
    };
  }
}
