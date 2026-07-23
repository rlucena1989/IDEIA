import { ProviderKind } from './types';
import { LLMAdapter, LLMRequest, LLMResponse } from './llm-adapter';
import { execSync } from 'node:child_process';

export const OLLAMA_ADAPTER: LLMAdapter = {
  provider: 'ollama' as ProviderKind,
  async send(req: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    try {
      const result = execSync(`ollama run ${req.model} "${req.prompt.replace(/"/g, '\\"')}"`, { stdio: 'pipe', timeout: 120000 });
      const content = result.toString().trim();
      return {
        content,
        tokensUsed: Math.ceil(req.prompt.length * 0.35),
        latencyMs: Date.now() - start,
        success: true
      };
    } catch (_err) {
      return { content: '', tokensUsed: 0, latencyMs: Date.now() - start, success: false, error: String(err) };
    }
  },
  isAvailable: () => {
    try {
      execSync('ollama list', { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
};

export const LOCAL_MOCK_ADAPTER: LLMAdapter = {
  provider: 'local' as ProviderKind,
  async send(req: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    await new Promise(r => setTimeout(r, 5));
    return {
      content: `[local] simulated response for: ${req.prompt.slice(0, 50)}...`,
      tokensUsed: Math.ceil(req.prompt.length * 0.35),
      latencyMs: Date.now() - start,
      success: true
    };
  },
  isAvailable: () => true
};
