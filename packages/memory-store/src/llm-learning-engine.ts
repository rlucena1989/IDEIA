/**
 * llm-learning-engine.ts — LearningEngine com LLM (Item 9)
 *
 * Gera recomendações adaptativas baseadas em padrões detectados.
 * Fallback para engine heurística baseada em threshold.
 */

export interface LearningRecommendation {
  id: string;
  category: 'optimization' | 'best-practice' | 'security' | 'performance' | 'maintenance';
  title: string;
  description: string;
  confidence: number;
  source: 'llm' | 'heuristic';
  affectedFiles?: string[];
}

export interface LearningEngineConfig {
  llmEndpoint?: string;
  llmModel?: string;
}

export class LlmLearningEngine {
  private config: LearningEngineConfig;

  constructor(config: LearningEngineConfig = {}) {
    this.config = { llmEndpoint: 'http://127.0.0.1:11434', llmModel: 'phi-4-mini', ...config };
  }

  async generateRecommendations(patterns: Array<{ name: string; type: string; confidence: number }>, context?: string): Promise<LearningRecommendation[]> {
    const heuristic = this.heuristicRecommendations(patterns);
    try {
      const llmRecs = await this.llmRecommendations(patterns, context);
      return this.merge(heuristic, llmRecs);
    } catch {
      return heuristic;
    }
  }

  private heuristicRecommendations(patterns: Array<{ name: string; type: string; confidence: number }>): LearningRecommendation[] {
    return patterns
      .filter(p => p.confidence > 0.3)
      .map((p, i) => ({
        id: `rec-${i}`,
        category: this.mapCategory(p.type),
        title: `Improve ${p.name}`,
        description: `Pattern "${p.name}" detected ${Math.round(p.confidence * 100)}% confidence`,
        confidence: p.confidence,
        source: 'heuristic' as const,
      }));
  }

  private async llmRecommendations(patterns: Array<{ name: string; type: string; confidence: number }>, context?: string): Promise<LearningRecommendation[]> {
    const input = `<patterns>${JSON.stringify(patterns.slice(0, 10))}</patterns>${context ? `\n<context>${context}</context>` : ''}`;
    const response = await fetch(`${this.config.llmEndpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.llmModel,
        messages: [
          { role: 'system', content: 'Generate actionable recommendations from development patterns. Respond JSON: {"recommendations":[{"category":"optimization|best-practice|security|performance|maintenance","title":"...","description":"...","confidence":0.0}]}' },
          { role: 'user', content: input },
        ],
        stream: false,
        options: { temperature: 0.2, num_predict: 512 },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('LLM unavailable');
    const data = await response.json() as { message?: { content?: string } };
    const content = data?.message?.content || '';
    const parsed = JSON.parse(content);
    if (!parsed.recommendations) return [];
    return parsed.recommendations.map((r: { category: string; title: string; description: string; confidence: number }, i: number) => ({
      id: `llm-rec-${i}`,
      category: r.category as LearningRecommendation['category'],
      title: r.title,
      description: r.description,
      confidence: r.confidence || 0.5,
      source: 'llm' as const,
    }));
  }

  private mapCategory(type: string): LearningRecommendation['category'] {
    const map: Record<string, LearningRecommendation['category']> = {
      'code-structure': 'optimization',
      architecture: 'best-practice',
      error: 'maintenance',
      workflow: 'optimization',
    };
    return map[type] || 'best-practice';
  }

  private merge(h: LearningRecommendation[], l: LearningRecommendation[]): LearningRecommendation[] {
    const seen = new Set<string>();
    return [...l, ...h].filter(r => {
      if (seen.has(r.title)) return false;
      seen.add(r.title);
      return true;
    }).sort((a, b) => b.confidence - a.confidence);
  }
}
