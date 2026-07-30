import { ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, LLMProvider, LLMProviderConfig } from './types';

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
    if (!this.apiKey) throw new Error('DeepSeekReasoningProvider requires an apiKey');
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    const model = request.model || this.defaultModel;
    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model, messages: request.messages, max_tokens: request.maxTokens ?? 8192, stream: false }),
      signal,
    });
    if (!response.ok) throw new Error(`DeepSeek reasoning error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    const choice = data.choices?.[0];
    const reasoningContent = choice?.message?.reasoning_content || '';
    return {
      content: reasoningContent
        ? `[Raciocínio]\n${reasoningContent}\n\n[Resposta]\n${choice?.message?.content || ''}`
        : choice?.message?.content || '',
      model: data.model || model, provider: this.name,
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, completionTokens: data.usage.completion_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
    };
  }

  async embed(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new Error('DeepSeek reasoning models do not support embeddings');
  }
}
