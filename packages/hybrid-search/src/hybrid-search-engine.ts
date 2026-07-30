import { createLogger } from '@ideia/logger';
import {  SearchQuery, FusionResult, SearchWeights, ContextOutput, ComposeOptions,
} from './types';
import { RRFScorer } from './rrf-scorer';
import { CrossEncoderReRanker } from './cross-encoder-reranker';
import { ColBERTSearcher } from './colbert-searcher';
import { SPLADESearcher } from './splade-searcher';
import { AdaptiveWeightLearner } from './adaptive-weight-learner';
const logger = createLogger('hybrid-search-engine');

class KeywordSearcher {
  async search(query: string, topK = 20): Promise<import('./types').RankedItem[]> {
    const tokens = query.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
    return tokens.map((token, i) => ({
      id: `kw-${token}-${i}`,
      score: 1 / (i + 1),
      rank: i + 1,
      source: 'text' as const,
      metadata: {},
      content: token,
    })).slice(0, topK);
  }
}

class VectorSearcher {
  async search(_query: string | number[], topK = 20): Promise<import('./types').RankedItem[]> {
    return Array.from({ length: topK }, (_, i) => ({
      id: `vec-${i}`,
      score: 1 - (i / topK),
      rank: i + 1,
      source: 'vector' as const,
      metadata: {},
      content: `vector_result_${i}`,
    }));
  }
}

export class HybridSearchEngine {
  private _keywordSearcher: KeywordSearcher;
  private _vectorSearcher: VectorSearcher;

  constructor(
    private _rrfScorer: RRFScorer,
    private _crossEncoder: CrossEncoderReRanker,
    private _colBERT: ColBERTSearcher,
    private _spladeSearcher: SPLADESearcher,
    private _weightTuner: AdaptiveWeightLearner
  ) {
    this._keywordSearcher = new KeywordSearcher();
    this._vectorSearcher = new VectorSearcher();
  }

  async search(query: SearchQuery): Promise<FusionResult[]> {
    const topK = query.topK ?? 10;
    const text = query.text;
    const embedding = query.embedding;

    const weights = await this._weightTuner.tune(text);

    const [textResults, vectorResults, sparseResults] = await Promise.all([
      this._keywordSearcher.search(text, topK * 3),
      embedding
        ? this._vectorSearcher.search(embedding, topK * 3)
        : this._vectorSearcher.search(text, topK * 3),
      this._spladeSearcher.search(text, topK * 3),
    ]);

    const fused = this._rrfScorer.fuse(
      [textResults, vectorResults, sparseResults],
      ['text', 'vector', 'sparse'],
      weights,
      query.fusionAlgorithm ?? 'rrf'
    );

    const reranked = await this._crossEncoder.rerank(
      text,
      fused.slice(0, Math.min(20, fused.length)),
      topK
    );

    let finalResults = reranked;
    if (text.length > 100) {
      const colbertScores = await this._colBERT.rank(
        text,
        reranked.map(r => r.content)
      );
      finalResults = reranked
        .map((r, i) => ({ ...r, colbertScore: colbertScores[i] }))
        .sort((a, b) => (b.colbertScore ?? 0) - (a.colbertScore ?? 0));
    }

    return finalResults.slice(0, topK);
  }

  async searchWithDebug(query: SearchQuery): Promise<{
    results: FusionResult[];
    debug: { weights: SearchWeights; textCount: number; vectorCount: number; sparseCount: number; latencyMs: number };
  }> {
    const start = Date.now();
    const results = await this.search(query);
    return {
      results,
      debug: {
        weights: { text: 0.4, vector: 0.4, sparse: 0.2 },
        textCount: 0,
        vectorCount: 0,
        sparseCount: 0,
        latencyMs: Date.now() - start,
      },
    };
  }
}

export class HybridSearchContextComposer {
  constructor(
    private _engine: HybridSearchEngine,
    private _crossEncoder: CrossEncoderReRanker,
    private _colBERT: ColBERTSearcher
  ) {}

  async compose(query: string, options: ComposeOptions = {}): Promise<ContextOutput> {
    const startTime = Date.now();
    const maxTokens = options.maxTokens ?? 4000;

    const results = await this._engine.search({ text: query, topK: 10, fusionAlgorithm: 'weighted_rrf' });

    let contextText = '';
    let totalTokens = 0;

    for (const doc of results) {
      const entry = `[${doc.id}] ${doc.content.substring(0, 1000)}`;
      const entryTokens = Math.ceil(entry.length / 4);
      if (totalTokens + entryTokens > maxTokens) break;
      contextText += entry + '\n\n';
      totalTokens += entryTokens;
    }

    return {
      documents: results,
      contextText,
      totalTokens,
      searchMetadata: {
        queryType: 'auto',
        fusionAlgorithm: 'weighted_rrf',
        totalCandidates: results.length,
        latencyMs: Date.now() - startTime,
      },
    };
  }
}
