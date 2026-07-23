import { AiProvider, ProviderConfig, ProviderResponse, getApiKey } from './index';

/** Classe responsável por processa ai provider. */
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  private baseUrl = 'https://api.openai.com/v1';

  async streamQuery(prompt: string, model: string, onDelta: (chunk: string) => void, config?: ProviderConfig): Promise<ProviderResponse> {
    const apiKey = config?.apiKey || getApiKey('openai') || '';
    const url = `${config?.baseUrl || this.baseUrl}/chat/completions`;
    const start = Date.now();
    let fullContent = '';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: true, max_tokens: 2048 }),
      signal: AbortSignal.timeout(config?.timeoutMs || 60000),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${res.statusText}`);
    if (!res.body) throw new Error('Response body is null');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) { fullContent += content; onDelta(content); }
        } catch { continue; }
      }
    }

    return { content: fullContent.trim(), model, provider: this.name, latencyMs: Date.now() - start };
  }

  async query(prompt: string, model: string, config?: ProviderConfig): Promise<ProviderResponse> {
    const apiKey = config?.apiKey || getApiKey('openai') || '';
    const url = `${config?.baseUrl || this.baseUrl}/chat/completions`;
    const start = Date.now();

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 2048 }),
      signal: AbortSignal.timeout(config?.timeoutMs || 30000),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number } };

    return {
      content: data.choices?.[0]?.message?.content?.trim() || '',
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
      tokens: data.usage?.total_tokens,
    };
  }

  async listModels(): Promise<string[]> {
    const apiKey = getApiKey('openai') || '';
    if (!apiKey) return [];
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json() as { data?: Array<{ id: string }> };
        return data.data?.map(m => m.id) || [];
      }
    } catch { }
    return [];
  }

  async healthCheck(): Promise<boolean> {
    return !!getApiKey('openai');
  }
}
