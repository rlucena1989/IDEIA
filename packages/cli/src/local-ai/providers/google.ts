import { AiProvider, ProviderConfig, ProviderResponse, getApiKey } from './index';

/** Classe responsável por processa provider. */
export class GoogleProvider implements AiProvider {
  readonly name = 'google';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async streamQuery(prompt: string, model: string, onDelta: (chunk: string) => void, config?: ProviderConfig): Promise<ProviderResponse> {
    const apiKey = config?.apiKey || getApiKey('google') || '';
    const url = `${config?.baseUrl || this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const start = Date.now();
    let fullContent = '';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2048 } }),
      signal: AbortSignal.timeout(config?.timeoutMs || 60000),
    });

    if (!res.ok) throw new Error(`Google HTTP ${res.status}: ${res.statusText}`);
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
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) { fullContent += text; onDelta(text); }
        } catch { continue; }
      }
    }

    return { content: fullContent.trim(), model, provider: this.name, latencyMs: Date.now() - start };
  }

  async query(prompt: string, model: string, config?: ProviderConfig): Promise<ProviderResponse> {
    const apiKey = config?.apiKey || getApiKey('google') || '';
    const url = `${config?.baseUrl || this.baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    const start = Date.now();

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2048 } }),
      signal: AbortSignal.timeout(config?.timeoutMs || 30000),
    });

    if (!res.ok) throw new Error(`Google HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '',
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }

  async listModels(): Promise<string[]> {
    const apiKey = getApiKey('google') || '';
    if (!apiKey) return [];
    try {
      const res = await fetch(`${this.baseUrl}/models?key=${apiKey}&pageSize=50`);
      if (res.ok) {
        const data = await res.json() as { models?: Array<{ name: string }> };
        return data.models?.map(m => m.name.replace('models/', '')) || [];
      }
    } catch { }
    return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
  }

  async healthCheck(): Promise<boolean> {
    return !!getApiKey('google');
  }
}
