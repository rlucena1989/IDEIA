import { AiProvider, ProviderConfig, ProviderResponse, getApiKey } from './index';

export class OpenRouterProvider implements AiProvider {
  readonly name = 'openrouter';
  private baseUrl = 'https://openrouter.ai/api/v1';

  async query(prompt: string, model: string, config?: ProviderConfig): Promise<ProviderResponse> {
    const apiKey = config?.apiKey || getApiKey('openrouter') || '';
    const url = `${config?.baseUrl || this.baseUrl}/chat/completions`;
    const start = Date.now();

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ai-devkit.local',
        'X-Title': 'AI-Devkit',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(config?.timeoutMs || 30000),
    });

    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number } };

    return {
      content: data.choices?.[0]?.message?.content?.trim() || '',
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
      tokens: data.usage?.total_tokens,
    };
  }

  async streamQuery(prompt: string, model: string, onDelta: (chunk: string) => void, config?: ProviderConfig): Promise<ProviderResponse> {
    const apiKey = config?.apiKey || getApiKey('openrouter') || '';
    const url = `${config?.baseUrl || this.baseUrl}/chat/completions`;
    const start = Date.now();

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ai-devkit.local',
        'X-Title': 'AI-Devkit',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        stream: true,
      }),
      signal: AbortSignal.timeout(config?.timeoutMs || 60000),
    });

    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${res.statusText}`);
    if (!res.body) throw new Error('No response body');

    let content = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const json = line.slice(6).trim();
        if (json === '[DONE]') continue;
        try {
          const parsed = JSON.parse(json) as { choices?: Array<{ delta?: { content?: string } }> };
          const text = parsed.choices?.[0]?.delta?.content || '';
          if (text) {
            content += text;
            onDelta(text);
          }
        } catch { /* skip parse errors */ }
      }
    }

    return { content, model, provider: this.name, latencyMs: Date.now() - start };
  }

  async listModels(): Promise<string[]> {
    const apiKey = getApiKey('openrouter') || '';
    if (!apiKey) return [];
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json() as { data?: Array<{ id: string }> };
        return (data.data || []).map(m => m.id).slice(0, 50);
      }
    } catch { /* ignore */ }
    return [];
  }

  async healthCheck(): Promise<boolean> {
    const apiKey = getApiKey('openrouter') || '';
    if (!apiKey) return false;
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
