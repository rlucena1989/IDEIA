import { SearchWeights, SearchContext } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('adaptive-weight-learner');

export class AdaptiveWeightLearner {
  private _feedbackHistory: Array<{ query: string; weights: SearchWeights; effectiveness: number }> = [];

  async tune(query: string, _context?: SearchContext): Promise<SearchWeights> {
    const hasExactTerms = /"[^"]+"/.test(query);
    const hasCodePattern = new RegExp('`\\w+`').test(query);
    const hasQuestion = query.includes('?');
    const queryLength = query.length;
    const keywordRatio = query.match(/\b\w+\b/g)?.length || 0;

    if (hasExactTerms) return { text: 0.8, vector: 0.15, sparse: 0.05 };
    if (hasCodePattern) return { text: 0.7, vector: 0.2, sparse: 0.1 };
    if (hasQuestion) return { text: 0.25, vector: 0.6, sparse: 0.15 };

    const queryType = this._classifyQueryType(query);

    if (queryType === 'code_search') return { text: 0.85, vector: 0.1, sparse: 0.05 };
    if (queryType === 'semantic_search') return { text: 0.15, vector: 0.7, sparse: 0.15 };
    if (queryLength > 200) return { text: 0.15, vector: 0.7, sparse: 0.15 };
    if (keywordRatio > 8) return { text: 0.65, vector: 0.25, sparse: 0.1 };

    const historical = this._getBestHistoricalWeights(query);
    if (historical) return historical;

    return { text: 0.4, vector: 0.4, sparse: 0.2 };
  }

  async learnFromFeedback(query: string, clicked: string[], skipped: string[]): Promise<void> {
    const effectiveness = clicked.length / (clicked.length + skipped.length || 1);
    const currentWeights = await this.tune(query);
    this._feedbackHistory.push({ query, weights: currentWeights, effectiveness });
    if (this._feedbackHistory.length > 1000) {
      this._feedbackHistory = this._feedbackHistory.slice(-500);
    }
  }

  getFeedbackCount(): number {
    return this._feedbackHistory.length;
  }

  private _classifyQueryType(query: string): string {
    if (/function|class|import|const|let|var|=>|interface|type|async|await/.test(query)) return 'code_search';
    if (/conceito|o que e|definicao|significado|explique|diferenca/i.test(query)) return 'semantic_search';
    if (/como|exemplo|implementar|configurar|fazer|criar/i.test(query)) return 'hybrid';
    return 'hybrid';
  }

  private _getBestHistoricalWeights(query: string): SearchWeights | null {
    const similar = this._feedbackHistory.filter(f => this._similarity(f.query, query) > 0.7);
    if (similar.length < 3) return null;
    const avgEffectiveness = similar.reduce((s, f) => s + f.effectiveness, 0) / similar.length;
    if (avgEffectiveness > 0.8) return similar[0].weights;
    return null;
  }

  private _similarity(a: string, b: string): number {
    const setA = new Set(a.toLowerCase().split(/\W+/));
    const setB = new Set(b.toLowerCase().split(/\W+/));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}
