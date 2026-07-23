import { TokenEconomyEngine, DEFAULT_TOKEN_ECONOMY_CONFIG } from '../runtime/token-economy-engine';
import { DEFAULT_CONTEXT_STORE_CONFIG } from '../runtime/context-store';
import { DEFAULT_SUMMARIZER_CONFIG } from '../runtime/context-summarizer';
import { DEFAULT_PROMPT_ROUTER_CONFIG } from '../runtime/prompt-router';

describe('TokenEconomyEngine', () => {
  it('constructor uses defaults', () => {
    const engine = new TokenEconomyEngine();
    expect(engine.getContextStore()).toBeDefined();
    expect(engine.getDecisionCache()).toBeDefined();
  });

  it('constructor merges custom config', () => {
    const engine = new TokenEconomyEngine({
      contextStore: { maxItems: 50, maxTokensPerItem: 16000, maxTotalTokens: 256000, ttlMs: 7200000 },
    });
    expect(engine.getContextStore().getConfig().maxItems).toBe(50);
  });

  it('optimize returns report', () => {
    const engine = new TokenEconomyEngine();
    const report = engine.optimize('bugfix', 'Fix login bug', ['src/login.ts'], 5000);
    expect(report.taskType).toBe('bugfix');
    expect(report.tokensSaved).toBeGreaterThanOrEqual(0);
    expect(report.selectedMode).toBeDefined();
  });

  it('estimateSavings returns estimate', () => {
    const engine = new TokenEconomyEngine();
    const est = engine.estimateSavings('Add new feature with auth and database', 'feature', 10);
    expect(est.totalOriginalTokens).toBeGreaterThan(0);
    expect(est.tokensSaved).toBeGreaterThan(0);
  });

  it('getStats returns default stats', () => {
    const engine = new TokenEconomyEngine();
    const stats = engine.getStats();
    expect(stats.contextItems).toBe(0);
    expect(stats.cacheEntries).toBe(0);
  });

  it('DEFAULT_TOKEN_ECONOMY_CONFIG has correct structure', () => {
    expect(DEFAULT_TOKEN_ECONOMY_CONFIG.contextStore).toEqual(DEFAULT_CONTEXT_STORE_CONFIG);
    expect(DEFAULT_TOKEN_ECONOMY_CONFIG.summarizer).toEqual(DEFAULT_SUMMARIZER_CONFIG);
    expect(DEFAULT_TOKEN_ECONOMY_CONFIG.promptRouter).toEqual(DEFAULT_PROMPT_ROUTER_CONFIG);
  });
});
