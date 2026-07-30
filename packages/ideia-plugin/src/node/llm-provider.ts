// Theia integration adapter for @ideia/llm-provider
// Wraps the monorepo's LLM providers into the Theia's SSEEvent streaming pattern

import * as devkit from '@ideia/llm-provider';
import { createLogger } from '@ideia/logger';
import { ConfigManager } from '@ideia/config-engine';
import type { SSEEvent } from '../common/ideia-types';
import { createSSEEvent } from '../common/ideia-types';
import type { IDEIA_ConfigService } from '../common/ideia-protocol';

const logger = createLogger('llm-provider');
const config = ConfigManager.getInstance();

export interface LLMProvider {
  readonly name: string;
  chat(messages: Array<{ role: string; content: string }>): AsyncIterable<SSEEvent>;
}

function adaptProvider(inner: devkit.LLMProvider, defaultModel?: string): LLMProvider {
  return {
    get name() { return inner.name; },
    async *chat(messages) {
      try {
        const model = defaultModel || config.get('IDEIA_LLM_MODEL') || 'deepseek-coder';
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
        yield createSSEEvent('error', _err instanceof Error ? _err.message : String(_err));
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

const UNIVERSAL_PROVIDER_ENDPOINTS: Array<{ name: string; endpoint: string; defaultModel: string }> = [
  { name: 'openai',         endpoint: 'https://api.openai.com/v1',                    defaultModel: 'gpt-4o-mini' },
  { name: 'openrouter',     endpoint: 'https://openrouter.ai/api/v1',                  defaultModel: 'openai/gpt-4o-mini' },
  { name: 'deepseek',       endpoint: 'https://api.deepseek.com/v1',                   defaultModel: 'deepseek-chat' },
  { name: 'groq',           endpoint: 'https://api.groq.com/openai/v1',                defaultModel: 'llama-3.1-70b-versatile' },
  { name: 'together',       endpoint: 'https://api.together.xyz/v1',                   defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1' },
  { name: 'deepinfra',      endpoint: 'https://api.deepinfra.com/v1/openai',           defaultModel: 'mistralai/Mixtral-8x22B-Instruct-v0.1' },
  { name: 'fireworks',      endpoint: 'https://api.fireworks.ai/inference/v1',         defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct' },
  { name: 'perplexity',     endpoint: 'https://api.perplexity.ai',                     defaultModel: 'llama-3.1-sonar-small-128k-online' },
  { name: 'cerebras',       endpoint: 'https://api.cerebras.ai/v1',                    defaultModel: 'llama3.1-8b' },
  { name: 'siliconflow',    endpoint: 'https://api.siliconflow.cn/v1',                  defaultModel: 'Pro/Qwen/Qwen2.5-7B-Instruct' },
  { name: 'sambanova',      endpoint: 'https://api.sambanova.ai/v1',                   defaultModel: 'Meta-Llama-3.1-70B-Instruct' },
  { name: 'anyscale',       endpoint: 'https://api.endpoints.anyscale.com/v1',         defaultModel: 'mistralai/Mistral-7B-Instruct-v0.1' },
];

export function createDefaultRouter(configService?: IDEIA_ConfigService): ProviderRouter {
  const router = new ProviderRouter();

  // 1. Ollama local (always)
  router.register(adaptProvider(new devkit.OllamaProvider({ endpoint: 'http://localhost:11434', defaultModel: 'deepseek-coder' }), 'deepseek-coder'));

  // 2. Read API key from config service or env
  let masterKey = process.env.IDEIA_LLM_API_KEY || process.env.OPENAI_API_KEY || '';
  let activeProvider = process.env.IDEIA_LLM_ENDPOINT || '';
  let defaultModel = process.env.IDEIA_LLM_MODEL || '';

  // 3. Register all universal providers that have a key
  for (const ep of UNIVERSAL_PROVIDER_ENDPOINTS) {
    const key = process.env[`${ep.name.toUpperCase()}_API_KEY`] || masterKey;
    if (key) {
      try {
        router.register(adaptProvider(
          new devkit.OpenAIProvider({ endpoint: ep.endpoint, apiKey: key, defaultModel: ep.defaultModel, providerName: ep.name }),
          defaultModel || ep.defaultModel,
        ));
      } catch { /* skip */ }
    }
  }

  // 4. Gemini
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || masterKey;
  if (geminiKey) {
    try {
      router.register(adaptProvider(
        new devkit.GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: geminiKey, defaultModel: 'gemini-2.0-flash' }),
        'gemini-2.0-flash',
      ));
    } catch { /* skip */ }
  }

  // 5. Reasoning
  if (process.env.IDEIA_LLM_REASONING === 'true' || process.env.IDEIA_LLM_REASONING === '1') {
    if (masterKey) {
      try {
        router.register(adaptProvider(new devkit.OpenAIReasoningProvider({ endpoint: 'https://api.openai.com/v1', apiKey: masterKey, defaultModel: 'o3-mini' }), 'o3-mini'));
        const dk = process.env.DEEPSEEK_API_KEY || masterKey;
        if (dk) router.register(adaptProvider(new devkit.DeepSeekReasoningProvider({ endpoint: 'https://api.deepseek.com/v1', apiKey: dk, defaultModel: 'deepseek-reasoner' }), 'deepseek-reasoner'));
      } catch { /* skip */ }
    }
  }

  // 6. Custom endpoint via env
  if (activeProvider && !activeProvider.includes('localhost')) {
    try {
      const custom = devkit.createProvider({ endpoint: activeProvider, apiKey: masterKey, defaultModel: defaultModel });
      router.register(adaptProvider(custom, defaultModel));
    } catch { /* skip */ }
  }

  router.setPriority(['openai', 'openrouter', 'deepseek', 'groq', 'ollama']);
  return router;
}
