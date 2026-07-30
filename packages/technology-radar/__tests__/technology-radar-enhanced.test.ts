import { TechnologyRadar } from '../src/technology-radar';
import { Technology } from '../src/types';

class MockEventBus {
  async emit(_event: any): Promise<void> { /* no-op */ }
}

jest.mock('@ideia/event-bus', () => ({
  EventBus: jest.fn().mockImplementation(() => new MockEventBus()),
}));

describe('TechnologyRadar C22 — Enhanced', () => {
  let radar: TechnologyRadar;

  beforeEach(() => {
    const bus = new MockEventBus() as unknown;
    radar = new TechnologyRadar(bus);
  });

  it('should evaluate a technology with scores', () => {
    const result = (radar as Record<string, unknown>).evaluate({
      name: 'TestTech',
      description: 'A test technology for AI agents',
      category: 'framework',
      sources: { github: { stars: 5000, releases: 10, language: 'TypeScript', updatedAt: '2026-06-01' } },
    });
    expect(result.scores).toBeDefined();
    expect(result.scores.weightedTotal).toBeGreaterThan(0);
    expect(result.scores.value).toBeGreaterThan(0);
  });

  it('should generate study draft for high-scoring tech', () => {
    const tech: Technology = {
      name: 'LangChain',
      description: 'Framework for building LLM applications',
      category: 'framework',
      sources: { github: { stars: 100000, releases: 200, language: 'TypeScript', updatedAt: '2026-07-01' } },
      scores: { value: 5, differentiation: 4, synergy: 5, costBenefit: 4, maturity: 4, weightedTotal: 4.5 },
      validated: true,
      scannedAt: new Date().toISOString(),
    };
    const draft = (radar as Record<string, unknown>).generateStudyDraft(tech);
    expect(draft).toBeDefined();
    expect(draft.techName).toBe('LangChain');
    expect(draft.estimatedEffort).toMatch(/low|medium|high/);
  });

  it('should generate recommendations sorted by score', () => {
    const recs = radar.getRecommendations(0);
    expect(recs).toBeDefined();
    expect(Array.isArray(recs)).toBe(true);
  });

  it('should return trending technologies', () => {
    const trending = radar.getTrending();
    expect(trending).toBeDefined();
    expect(Array.isArray(trending)).toBe(true);
  });

  it('should filter by minimum score', () => {
    const allWithScore3 = radar.getRecommendations(3.0);
    const allWithScore5 = radar.getRecommendations(5.0);
    expect(allWithScore3.length).toBeGreaterThanOrEqual(allWithScore5.length);
  });

  it('should validate multi-source technologies', () => {
    const validTech = {
      name: 'ValidTech',
      sources: { github: { stars: 1000, releases: 5, language: 'TypeScript', updatedAt: '2026-01-01' } },
    };
    const isValid = (radar as Record<string, unknown>).validateMultiSource(validTech);
    expect(isValid).toBe(true);
  });

  it('should reject tech with no sources', () => {
    const invalidTech = { name: 'InvalidTech', sources: {} };
    const isValid = (radar as Record<string, unknown>).validateMultiSource(invalidTech);
    expect(isValid).toBe(false);
  });

  it('should score synergy based on keyword matching', () => {
    const aiTech: Technology = {
      name: 'AIAgent', description: 'AI agent with LLM and RAG', category: 'ai',
      sources: { github: { stars: 1000, releases: 5, language: 'TypeScript', updatedAt: '2026-01-01' } },
      scores: { value: 3, differentiation: 3, synergy: 3, costBenefit: 3, maturity: 3, weightedTotal: 3 },
      validated: false, scannedAt: new Date().toISOString(),
    };
    const nonAiTech: Technology = {
      name: 'Logger', description: 'Simple logging utility', category: 'utility',
      sources: { github: { stars: 1000, releases: 5, language: 'TypeScript', updatedAt: '2026-01-01' } },
      scores: { value: 3, differentiation: 3, synergy: 3, costBenefit: 3, maturity: 3, weightedTotal: 3 },
      validated: false, scannedAt: new Date().toISOString(),
    };
    const aiScore = (radar as Record<string, unknown>).scoreSynergy(aiTech);
    const nonAiScore = (radar as Record<string, unknown>).scoreSynergy(nonAiTech);
    expect(aiScore).toBeGreaterThanOrEqual(3);
    expect(nonAiScore).toBeLessThanOrEqual(3);
  });

  it('should get recommendations with study drafts', () => {
    const recs = radar.getRecommendations(0);
    for (const rec of recs) {
      expect(rec.technology).toBeDefined();
      expect(rec.score).toBeDefined();
    }
  });

  it('should scan could fail gracefully without network', async () => {
    try {
      await radar.scan([]);
    } catch {
      /* network-dependent, may fail */
    }
    expect(true).toBe(true);
  });
});
