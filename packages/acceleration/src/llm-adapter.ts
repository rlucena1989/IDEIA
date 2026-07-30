import { ProviderKind } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('llm-adapter');

export interface LLMRequest {
  model: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  stream: boolean;
}

export interface LLMResponse {
  content: string;
  tokensUsed: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface LLMAdapter {
  readonly provider: ProviderKind;
  send(req: LLMRequest): Promise<LLMResponse>;
  isAvailable(): boolean;
}

export const MOCK_ADAPTER: LLMAdapter = {
  provider: 'mock' as ProviderKind,
  async send(req: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    await new Promise(r => setTimeout(r, 10));
    return {
      content: `[mock] received prompt (${req.prompt.length} chars), tokens=${req.maxTokens}`,
      tokensUsed: Math.ceil(req.prompt.length * 0.35),
      latencyMs: Date.now() - start,
      success: true
    };
  },
  isAvailable: () => true
};
