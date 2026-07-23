// Theia integration adapter for @ideia/llm-provider
// Wraps the monorepo's LLM providers into the Theia's SSEEvent streaming pattern

import * as devkit from '@ideia/llm-provider';
import type { SSEEvent } from '../common/ideia-types';
import { createSSEEvent } from '../common/ideia-types';

export interface LLMProvider {
  readonly name: string;
  chat(messages: Array<{ role: string; content: string }>): AsyncIterable<SSEEvent>;
}

function adaptProvider(inner: devkit.LLMProvider, defaultModel?: string): LLMProvider {
  return {
    get name() { return inner.name; },
    async *chat(messages) {
      try {
        const model = defaultModel || process.env.IDEIA_LLM_MODEL || 'deepseek-coder';
        const result = await inner.chat({ model, messages: messages as devkit.ChatMessage[], stream: true });
        if (Symbol.asyncIterator in (result as object)) {
          for await (const chunk of result as AsyncIterable<devkit.ChatResponse>) {
            if (chunk.content) yield createSSEEvent('message', chunk.content);
          }
        } else {
          const response = result as devkit.ChatResponse;
          if (response.content) yield createSSEEvent('message', response.content);
        }
      } catch (_err) {
        yield createSSEEvent('error', err instanceof Error ? err.message : String(err));
      }
    },
  };
}

export class ProviderRouter {
  private providers = new Map<string, LLMProvider>();
  private priority: string[] = [];

  register(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
    this.priority.push(provider.name);
  }

  setPriority(names: string[]): void {
    const valid = names.filter(n => this.providers.has(n));
    if (valid.length > 0) this.priority = valid;
  }

  getActive(): LLMProvider {
    for (const name of this.priority) {
      const p = this.providers.get(name);
      if (p) return p;
    }
    throw new Error('No LLM provider available');
  }

  listProviders(): string[] { return Array.from(this.providers.keys()); }
}

export function createDefaultRouter(): ProviderRouter {
  const router = new ProviderRouter();
  const endpoint = process.env.IDEIA_LLM_ENDPOINT || 'http://localhost:11434';
  const apiKey = process.env.IDEIA_LLM_API_KEY;
  const model = process.env.IDEIA_LLM_MODEL;

  if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
    router.register(adaptProvider(new devkit.OllamaProvider({ endpoint, defaultModel: model }), model));
    if (apiKey) {
      router.register(adaptProvider(new devkit.OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey, defaultModel: model || 'gpt-4o-mini' }), model || 'gpt-4o-mini'));
    }
  } else {
    try {
      const provider = devkit.createProvider({ endpoint, apiKey, defaultModel: model });
      router.register(adaptProvider(provider, model));
    } catch {
      router.register(adaptProvider(new devkit.OllamaProvider({ endpoint, defaultModel: model }), model));
    }
    if (!endpoint.includes('openai') && apiKey) {
      router.register(adaptProvider(new devkit.OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey, defaultModel: 'gpt-4o-mini' }), 'gpt-4o-mini'));
    }
  }

  router.setPriority(['ollama', 'openai', 'deepseek']);
  return router;
}
