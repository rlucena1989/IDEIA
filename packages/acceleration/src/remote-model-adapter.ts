import { ProviderKind } from './types';
import { createLogger } from '@ideia/logger';
import { LLMAdapter, LLMRequest, LLMResponse } from './llm-adapter';
const logger = createLogger('remote-model-adapter');

function createRemoteAdapter(providerName: ProviderKind, apiKeyEnv: string): LLMAdapter {
  return {
    provider: providerName,
    isAvailable: () => !!process.env[apiKeyEnv],
    async send(req: LLMRequest): Promise<LLMResponse> {
      const start = Date.now();
      const apiKey = process.env[apiKeyEnv];
      if (!apiKey) return { content: '', tokensUsed: 0, latencyMs: Date.now() - start, success: false, error: `${apiKeyEnv} not set` };
      await new Promise(r => setTimeout(r, 50));
      return {
        content: `[${providerName}] simulated response for: ${req.prompt.slice(0, 50)}...`,
        tokensUsed: Math.ceil(req.prompt.length * 0.35),
        latencyMs: Date.now() - start,
        success: true
      };
    }
  };
}

export const OPENAI_ADAPTER = createRemoteAdapter('openai', 'OPENAI_API_KEY');
export const ANTHROPIC_ADAPTER = createRemoteAdapter('anthropic', 'ANTHROPIC_API_KEY');
export const GOOGLE_ADAPTER = createRemoteAdapter('google', 'GOOGLE_API_KEY');
