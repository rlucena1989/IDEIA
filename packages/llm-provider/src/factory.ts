import { LLMProvider, LLMProviderConfig } from './types';
import { OllamaProvider } from './ollama-provider';
import { OpenAIProvider } from './openai-provider';
import { OpenAIReasoningProvider } from './openai-reasoning-provider';
import { DeepSeekReasoningProvider } from './deepseek-provider';
import { GeminiProvider } from './gemini-provider';
import { ConfigManager } from '@ideia/config-engine';

const config = ConfigManager.getInstance();

export const KNOWN_PROVIDERS: Record<string, { name: string; defaultModel: string; chatOnly?: boolean }> = {
  'openrouter':       { name: 'openrouter',       defaultModel: 'openai/gpt-4o-mini' },
  'openai':           { name: 'openai',           defaultModel: 'gpt-4o-mini' },
  'deepseek':         { name: 'deepseek',         defaultModel: 'deepseek-chat' },
  'together':         { name: 'together',         defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1' },
  'groq':             { name: 'groq',             defaultModel: 'llama-3.1-70b-versatile' },
  'deepinfra':        { name: 'deepinfra',        defaultModel: 'mistralai/Mixtral-8x22B-Instruct-v0.1' },
  'fireworks':        { name: 'fireworks',        defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct' },
  'perplexity':       { name: 'perplexity',       defaultModel: 'llama-3.1-sonar-small-128k-online' },
  'anyscale':         { name: 'anyscale',         defaultModel: 'mistralai/Mistral-7B-Instruct-v0.1' },
  'huggingface':      { name: 'huggingface',      defaultModel: 'meta-llama/Llama-3.2-3B-Instruct', chatOnly: true },
  'cerebras':         { name: 'cerebras',         defaultModel: 'llama3.1-8b' },
  'siliconflow':      { name: 'siliconflow',      defaultModel: 'Pro/Qwen/Qwen2.5-7B-Instruct' },
  'sambanova':        { name: 'sambanova',         defaultModel: 'Meta-Llama-3.1-70B-Instruct' },
};

function detectProviderFromUrl(endpoint: string): string | null {
  const url = endpoint.toLowerCase();
  for (const [key, _info] of Object.entries(KNOWN_PROVIDERS)) {
    if (url.includes(key)) return key;
  }
  return null;
}

export function createProvider(config: LLMProviderConfig & { apiKey?: string; reasoning?: boolean }): LLMProvider {
  const url = config.endpoint.toLowerCase();
  const model = (config.defaultModel || '').toLowerCase();

  if (config.reasoning) {
    if (model.includes('o1') || model.includes('o3')) {
      if (!config.apiKey) throw new Error('OpenAI reasoning endpoint requires an API key.');
      return new OpenAIReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'o3-mini' });
    }
    if (model.includes('r1') || model.includes('deepseek-reasoner')) {
      if (!config.apiKey) throw new Error('DeepSeek reasoning endpoint requires an API key.');
      return new DeepSeekReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'deepseek-reasoner' });
    }
  }

  if (url.includes('googleapis') || url.includes('gemini')) {
    if (!config.apiKey) throw new Error('Gemini endpoint requires an API key. Set GEMINI_API_KEY or GOOGLE_API_KEY.');
    return new GeminiProvider({ ...config, apiKey: config.apiKey });
  }

  if (url.includes('anthropic') || url.includes('claude')) {
    if (!config.apiKey) throw new Error('Anthropic endpoint requires an API key.');
    return new OpenAIProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'claude-3-haiku', providerName: 'anthropic' });
  }

  if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('ollama')) return new OllamaProvider(config);

  const detected = detectProviderFromUrl(url);
  if (detected) {
    const info = KNOWN_PROVIDERS[detected];
    if (!config.apiKey) throw new Error(`${info.name} endpoint requires an API key.`);
    if (model.includes('o1') || model.includes('o3')) return new OpenAIReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || info.defaultModel });
    return new OpenAIProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || info.defaultModel, providerName: info.name });
  }

  if (model.includes('o1') || model.includes('o3')) {
    if (!config.apiKey) throw new Error('Reasoning model requires an API key.');
    return new OpenAIReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'o3-mini' });
  }

  if (model.includes('r1') || model.includes('deepseek-reasoner')) {
    if (!config.apiKey) throw new Error('DeepSeek reasoning model requires an API key.');
    return new DeepSeekReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'deepseek-reasoner' });
  }

  if (config.apiKey) return new OpenAIProvider({ ...config, apiKey: config.apiKey, providerName: 'openai-compatible' });

  return new OllamaProvider(config);
}

export function createProviderFromEnv(): LLMProvider {
  const endpoint = config.get('IDEIA_LLM_ENDPOINT') || 'http://localhost:11434';
  const apiKey = config.get('IDEIA_LLM_API_KEY');
  const model = config.get('IDEIA_LLM_MODEL');
  return createProvider({ endpoint, apiKey, defaultModel: model });
}
