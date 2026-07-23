import { AiProvider, ProviderConfig, ProviderResponse, getApiKey } from './index';

/** Classe responsável por processa provider. */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private baseUrl = 'https://api.anthropic.com/v1';

  async streamQuery(prompt: string, model: string, onDelta: (chunk: string) => void, config?: ProviderConfig): Promise<ProviderResponse> {
    const apiKey = config?.apiKey || getApiKey('anthropic') || '';
    const url = `${config?.baseUrl || this.baseUrl}/messages`;
    const start = Date.now();
    let fullContent = '';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }], stream: true }),
      signal: AbortSignal.timeout(config?.timeoutMs || 60000),
    });

    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${res.statusText}`);
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
        try {
          const json = JSON.parse(trimmed.slice(5).trim());
          const text = json.delta?.text || json.content_block?.text || '';
          if (text) { fullContent += text; onDelta(text); }
        } catch { continue; }
      }
    }

    return { content: fullContent.trim(), model, provider: this.name, latencyMs: Date.now() - start };
  }

  async query(prompt: string, model: string, config?: ProviderConfig): Promise<ProviderResponse> {
    const apiKey = config?.apiKey || getApiKey('anthropic') || '';
    const url = `${config?.baseUrl || this.baseUrl}/messages`;
    const start = Date.now();

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(config?.timeoutMs || 30000),
    });

    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json() as { content?: Array<{ text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };

    return {
      content: data.content?.[0]?.text?.trim() || '',
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
      tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };
  }

  async listModels(): Promise<string[]> {
    return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
  }

  async healthCheck(): Promise<boolean> {
    return !!getApiKey('anthropic');
  }
}
