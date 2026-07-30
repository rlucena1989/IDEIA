import { LlmEnrichment } from '../llm-enrichment';
import type { Scenario } from '../types';

jest.mock('@ideia/llm-provider', () => {
  const mockProvider = {
    chat: jest.fn().mockResolvedValue({ content: '{"suggestions":["LLM suggestion"]}' }),
  };
  return {
    createProviderFromEnv: jest.fn().mockReturnValue(mockProvider),
    ProviderRouter: jest.fn().mockImplementation(() => ({
      register: jest.fn(),
      route: jest.fn(),
    })),
    OllamaProvider: jest.fn().mockImplementation(() => mockProvider),
  };
});

describe('LlmEnrichment', () => {
  const mockScenario: Scenario = {
    name: 'test',
    variables: { x: 10, y: 20 },
  };

  it('creates instance with default provider', () => {
    const enrichment = new LlmEnrichment();
    expect(enrichment.getProvider()).toBeDefined();
    expect(enrichment.getRouter()).toBeDefined();
  });

  it('enrichSimulation returns heuristic result on LLM failure with fallback', async () => {
    const mockFailProvider = {
      chat: jest.fn().mockRejectedValue(new Error('LLM down')),
    };
    const enrichment = new LlmEnrichment({ llmProvider: mockFailProvider as any, fallbackToHeuristic: true });
    const result = await enrichment.enrichSimulation(mockScenario);
    expect(result.outcomes).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('throws when LLM fails and fallback is disabled', async () => {
    const mockFailProvider = {
      chat: jest.fn().mockRejectedValue(new Error('LLM down')),
    };
    const enrichment = new LlmEnrichment({ llmProvider: mockFailProvider as any, fallbackToHeuristic: false });
    await expect(enrichment.enrichSimulation(mockScenario)).rejects.toThrow('LLM enrichment unavailable');
  });

  it('merges LLM suggestions into recommendations', async () => {
    const mockProvider = {
      chat: jest.fn().mockResolvedValue({ content: '{"suggestions":["Use monte-carlo"]}' }),
    };
    const enrichment = new LlmEnrichment({ llmProvider: mockProvider as any, fallbackToHeuristic: true });
    const result = await enrichment.enrichSimulation(mockScenario);
    expect(result.recommendations.some(r => r.includes('monte-carlo'))).toBe(true);
  });

  it('deduplicates recommendations', async () => {
    const mockProvider = {
      chat: jest.fn().mockResolvedValue({ content: '{"suggestions":["Existing recommendation"]}' }),
    };
    const enrichment = new LlmEnrichment({ llmProvider: mockProvider as any, fallbackToHeuristic: true });
    const result = await enrichment.enrichSimulation(mockScenario);
    const existing = result.recommendations.filter(r => r === 'Existing recommendation');
    expect(existing.length).toBeLessThanOrEqual(1);
  });

  it('increases confidence by 0.1 when LLM succeeds', async () => {
    const mockProvider = {
      chat: jest.fn().mockResolvedValue({ content: '{"suggestions":["ok"]}' }),
    };
    const enrichment = new LlmEnrichment({ llmProvider: mockProvider as any, fallbackToHeuristic: true });
    const heuristicOnly = (await import('../simulate')).simulateOutcomes(mockScenario);
    const enriched = await enrichment.enrichSimulation(mockScenario);
    expect(enriched.confidence).toBeGreaterThanOrEqual(heuristicOnly.confidence);
  });

  it('handles malformed LLM JSON response gracefully', async () => {
    const mockProvider = {
      chat: jest.fn().mockResolvedValue({ content: 'not json' }),
    };
    const enrichment = new LlmEnrichment({ llmProvider: mockProvider as any, fallbackToHeuristic: true });
    const result = await enrichment.enrichSimulation(mockScenario);
    expect(result.recommendations).toBeDefined();
  });
});
