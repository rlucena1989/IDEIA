import { AiProvider, ProviderConfig, ProviderResponse } from './index';

export class OllamaProvider implements AiProvider {
  readonly name = 'ollama';
  private baseUrl = 'http://localhost:11434';

  async query(prompt: string, model: string, config?: ProviderConfig): Promise<ProviderResponse> {
    const url = `${config?.baseUrl || this.baseUrl}/api/generate`;
    const start = Date.now();

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(config?.timeoutMs || 30000),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json() as { response?: string; eval_count?: number };

    return {
      content: (data.response || '').trim(),
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
      tokens: data.eval_count,
    };
  }

  async streamQuery(prompt: string, model: string, onDelta: (chunk: string) => void, config?: ProviderConfig): Promise<ProviderResponse> {
    const url = `${config?.baseUrl || this.baseUrl}/api/generate`;
    const start = Date.now();
    let fullContent = '';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: true }),
      signal: AbortSignal.timeout(config?.timeoutMs || 60000),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${res.statusText}`);
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
        if (!trimmed) continue;
        try {
          const json = JSON.parse(trimmed);
          if (json.response) {
            fullContent += json.response;
            onDelta(json.response);
          }
          if (json.done) break;
        } catch { continue; }
      }
    }

    return {
      content: fullContent.trim(),
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (res.ok) {
        const data = await res.json() as { models?: Array<{ name: string }> };
        return data.models?.map(m => m.name) || [];
      }
    } catch { }
    return ['llama3.2', 'mistral', 'codellama'];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }
}
