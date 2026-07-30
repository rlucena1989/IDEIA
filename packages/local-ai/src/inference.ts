import { createLogger } from '@ideia/logger'
import type { LocalAiConfig, LocalInferenceConfig, LocalInferenceResult, LocalEmbeddingConfig, LocalEmbeddingResult } from './types'

const log = createLogger('local-ai:inference')

export class LocalInference {
  private config: LocalAiConfig;

  constructor(config: LocalAiConfig) {
    this.config = config;
  }

  async generate(config: LocalInferenceConfig): Promise<LocalInferenceResult> {
    const endpoint = `${this.config.ollamaEndpoint ?? 'http://127.0.0.1:11434'}/api/generate`;
    const body: Record<string, unknown> = {
      model: config.model,
      prompt: config.prompt,
      stream: false,
    };
    if (config.temperature !== undefined) body.temperature = config.temperature;
    if (config.maxTokens !== undefined) body.max_tokens = config.maxTokens;
    if (config.stop?.length) body.stop = config.stop;
    if (config.systemPrompt) body.system = config.systemPrompt;

    const start = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json() as {
        response: string;
        total_duration?: number;
        tokens_per_second?: number;
        eval_count?: number;
        done: boolean;
      };
      const duration = data.total_duration ? data.total_duration / 1_000_000 : Date.now() - start;

      return {
        text: data.response ?? '',
        model: config.model,
        tokensPerSecond: data.tokens_per_second ?? 0,
        totalTokens: data.eval_count ?? 0,
        ttft: duration,
        finished: data.done ?? true,
      };
    } catch (err) {
      log.error('Local inference failed', { model: config.model, error: String(err) });
      throw err;
    }
  }

  async generateStream(config: LocalInferenceConfig): Promise<AsyncIterable<string>> {
    const endpoint = `${this.config.ollamaEndpoint ?? 'http://127.0.0.1:11434'}/api/generate`;
    const body: Record<string, unknown> = {
      model: config.model,
      prompt: config.prompt,
      stream: true,
    };
    if (config.temperature !== undefined) body.temperature = config.temperature;
    if (config.maxTokens !== undefined) body.max_tokens = config.maxTokens;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    const r = reader;
    return {
      [Symbol.asyncIterator](): AsyncIterator<string> {
        return {
          async next(): Promise<IteratorResult<string>> {
            try {
              const { done, value } = await r.read();
              if (done) return { done: true } as IteratorResult<string>;
              const text = decoder.decode(value, { stream: true });
              const lines = text.split('\n').filter(Boolean);
              const chunks: string[] = [];
              for (const line of lines) {
                try {
                  const parsed = JSON.parse(line);
                  if (parsed.response) chunks.push(parsed.response);
                } catch { chunks.push(line); }
              }
              return { done: false, value: chunks.join('') };
            } catch (err) {
              log.error('Stream error', { error: String(err) });
              return { done: true } as IteratorResult<string>;
            }
          },
        };
      },
    };
  }

  async embed(config: LocalEmbeddingConfig): Promise<LocalEmbeddingResult> {
    const endpoint = `${this.config.ollamaEndpoint ?? 'http://127.0.0.1:11434'}/api/embed`;
    const inputs = Array.isArray(config.input) ? config.input : [config.input];

    const start = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.model, input: inputs }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Ollama embed error: ${response.status}`);
      const data = await response.json() as { embeddings: number[][]; prompt_tokens?: number };
      return {
        embeddings: data.embeddings ?? [],
        model: config.model,
        dimension: data.embeddings?.[0]?.length ?? 0,
        duration: Date.now() - start,
      };
    } catch (err) {
      log.error('Local embedding failed', { model: config.model, error: String(err) });
      throw err;
    }
  }
}

export function createLocalInference(config: LocalAiConfig): LocalInference {
  return new LocalInference(config);
}
