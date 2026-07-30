import { queryProvider, getAvailableProviders } from './provider-router';
import { createLogger } from '@ideia/logger';
import { queryOllama } from './ollama';
const logger = createLogger('provider-bridge');

interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMChatRequest {
  model: string;
  messages: LLMChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

interface LLMChatResponse {
  content: string;
  model: string;
  provider: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

let llmProviderAvailable = false;
let llmModule: {
  OllamaProvider: new (config: { endpoint: string; defaultModel?: string; timeout?: number }) => {
    chat(req: LLMChatRequest): Promise<LLMChatResponse | AsyncIterable<LLMChatResponse>>;
  };
  OpenAIProvider: new (config: { endpoint: string; apiKey: string; defaultModel?: string }) => {
    chat(req: LLMChatRequest): Promise<LLMChatResponse | AsyncIterable<LLMChatResponse>>;
  };
  createProvider: (config: { endpoint: string; apiKey?: string; defaultModel?: string }) => {
    chat(req: LLMChatRequest): Promise<LLMChatResponse | AsyncIterable<LLMChatResponse>>;
  };
  createProviderFromEnv: () => {
    chat(req: LLMChatRequest): Promise<LLMChatResponse | AsyncIterable<LLMChatResponse>>;
  };
  ProviderRouter: new () => {
    register(p: { name: string; chat(req: LLMChatRequest): Promise<LLMChatResponse | AsyncIterable<LLMChatResponse>> }): void;
    getActive(): { name: string; chat(req: LLMChatRequest): Promise<LLMChatResponse | AsyncIterable<LLMChatResponse>> };
  };
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  llmModule = require('@ideia/llm-provider');
  llmProviderAvailable = true;
} catch {
  llmProviderAvailable = false;
}

export function isLLMProviderAvailable(): boolean {
  return llmProviderAvailable;
}

export interface BridgeResult {
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  bridgeActive: boolean;
}

async function queryLLMProviderChat(model: string, prompt: string, config?: { apiKey?: string; baseUrl?: string; timeoutMs?: number }): Promise<string> {
  if (!llmModule) throw new Error('LLM provider module not available');

  const endpoint = config?.baseUrl || process.env.IDEIA_LLM_ENDPOINT || 'http://localhost:11434';
  const apiKey = config?.apiKey || process.env.IDEIA_LLM_API_KEY;

  const provider = llmModule.createProvider({ endpoint, apiKey, defaultModel: model });
  const response = await provider.chat({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  if (response && typeof response === 'object' && 'content' in response) {
    return (response as LLMChatResponse).content;
  }
  throw new Error('LLM provider returned unexpected response format');
}

export async function queryViaBridge(
  prompt: string,
  model: string,
  root: string,
  config?: { apiKey?: string; baseUrl?: string; timeoutMs?: number }
): Promise<BridgeResult> {
  const start = Date.now();

  if (llmProviderAvailable) {
    try {
      const content = await queryLLMProviderChat(model, prompt, config);
      return {
        content,
        model,
        provider: 'llm-provider',
        latencyMs: Date.now() - start,
        bridgeActive: true,
      };
    } catch {
      const content = await queryOllama(prompt, model, root, 'bridge-fallback', config?.timeoutMs || 30000);
      return {
        content,
        model,
        provider: 'ollama',
        latencyMs: Date.now() - start,
        bridgeActive: false,
      };
    }
  }

  const providerConfig = config ? { apiKey: config.apiKey, baseUrl: config.baseUrl, timeoutMs: config.timeoutMs } : undefined;
  const result = await queryProvider(prompt, model, model, root, providerConfig);
  return {
    content: result.content,
    model: result.model,
    provider: result.provider,
    latencyMs: result.latencyMs,
    bridgeActive: false,
  };
}

export function getBridgeProviderStatus(root: string): Array<{
  name: string;
  available: boolean;
  bridgeActive: boolean;
}> {
  const statuses: Array<{ name: string; available: boolean; bridgeActive: boolean }> = [];

  if (llmProviderAvailable) {
    statuses.push({ name: '@ideia/llm-provider', available: true, bridgeActive: true });
  }

  const legacyProviders = getAvailableProviders(root);
  for (const p of legacyProviders) {
    statuses.push({
      name: `legacy:${p.name}`,
      available: true,
      bridgeActive: false,
    });
  }

  return statuses;
}
