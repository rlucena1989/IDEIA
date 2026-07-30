import { createLogger } from '@ideia/logger';

const logger = createLogger('data-layer:embedding-evaluator');

export interface EmbeddingModelSpec {
  name: string;
  dimensions: number;
  provider: 'local' | 'api';
  apiName?: string;
  sizeMB: number;
  costPer1MTokens?: number;
}

export interface EmbeddingQualityMetrics {
  precisionAt5: number;
  recallAt10: number;
  mrr: number;
  ndcgAt10: number;
  latencyMs: number;
  evaluatedAt: string;
}

export interface EmbeddingModelPerformance extends EmbeddingModelSpec {
  metrics: EmbeddingQualityMetrics;
  score: number;
}

export interface EvaluationQuery {
  query: string;
  relevantIds: string[];
}

const MODELS: EmbeddingModelSpec[] = [
  { name: 'nomic-embed-text', dimensions: 768, provider: 'local', sizeMB: 274 },
  { name: 'text-embedding-3-small', dimensions: 512, provider: 'api', apiName: 'openai', sizeMB: 0, costPer1MTokens: 0.13 },
  { name: 'text-embedding-3-large', dimensions: 3072, provider: 'api', apiName: 'openai', sizeMB: 0, costPer1MTokens: 0.13 },
  { name: 'voyage-code-2', dimensions: 1536, provider: 'api', apiName: 'voyage', sizeMB: 0, costPer1MTokens: 0.12 },
  { name: 'jina-embeddings-v3', dimensions: 1024, provider: 'local', sizeMB: 560 },
  { name: 'mxbai-embed-large', dimensions: 1024, provider: 'local', sizeMB: 670 },
  { name: 'bge-m3', dimensions: 1024, provider: 'local', sizeMB: 2200 },
];

const DEFAULT_EVAL_QUERIES: EvaluationQuery[] = [
  { query: 'how to implement error handling', relevantIds: ['error_handler', 'try_catch_pattern', 'error_boundary'] },
  { query: 'database connection pooling', relevantIds: ['connection_pool', 'db_pool_config', 'pool_timeout'] },
  { query: 'react component pattern', relevantIds: ['react_component', 'hooks_pattern', 'state_management'] },
  { query: 'authentication middleware', relevantIds: ['auth_middleware', 'jwt_verify', 'session_handler'] },
  { query: 'cache invalidation strategy', relevantIds: ['cache_strategy', 'cache_invalidation', 'ttl_pattern'] },
];

export class EmbeddingEvaluator {
  private models: EmbeddingModelSpec[];
  private evalQueries: EvaluationQuery[];
  private performances: Map<string, EmbeddingModelPerformance> = new Map();
  private activeModel: string;

  constructor(
    models?: EmbeddingModelSpec[],
    evalQueries?: EvaluationQuery[],
    activeModel?: string
  ) {
    this.models = models || MODELS;
    this.evalQueries = evalQueries || DEFAULT_EVAL_QUERIES;
    this.activeModel = activeModel || 'nomic-embed-text';
  }

  getActiveModel(): string {
    return this.activeModel;
  }

  setActiveModel(name: string): void {
    this.activeModel = name;
    logger.info('Active embedding model changed', { model: name });
  }

  getModels(): EmbeddingModelSpec[] {
    return [...this.models];
  }

  getAvailableModels(): string[] {
    return this.models.map(m => m.name);
  }

  getPerformance(modelName: string): EmbeddingModelPerformance | undefined {
    return this.performances.get(modelName);
  }

  getAllPerformances(): EmbeddingModelPerformance[] {
    return Array.from(this.performances.values());
  }

  registerEvalQueries(queries: EvaluationQuery[]): void {
    this.evalQueries.push(...queries);
  }

  async evaluateModel(modelName: string): Promise<EmbeddingModelPerformance> {
    const spec = this.models.find(m => m.name === modelName);
    if (!spec) throw new Error(`Unknown model: ${modelName}`);

    const metrics = await this.runEvaluation(spec);
    const score = this.calculateScore(metrics, spec);

    const perf: EmbeddingModelPerformance = { ...spec, metrics, score };
    this.performances.set(modelName, perf);

    logger.info('Model evaluated', { model: modelName, score: score.toFixed(1), precisionAt5: metrics.precisionAt5.toFixed(2) });
    return perf;
  }

  async evaluateAllModels(): Promise<EmbeddingModelPerformance[]> {
    const results: EmbeddingModelPerformance[] = [];
    for (const model of this.models) {
      try {
        const perf = await this.evaluateModel(model.name);
        results.push(perf);
      } catch (e) {
        logger.warn('Model evaluation failed', { model: model.name, error: String(e) });
      }
    }
    return results;
  }

  selectBestModel(minPrecision = 0.8, maxLatency = 150): string {
    const candidates = Array.from(this.performances.values()).filter(
      p => p.metrics.precisionAt5 >= minPrecision && p.metrics.latencyMs <= maxLatency
    );

    if (candidates.length === 0) {
      return 'nomic-embed-text';
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].name;
  }

  private async runEvaluation(spec: EmbeddingModelSpec): Promise<EmbeddingQualityMetrics> {
    const startTime = Date.now();
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalMrr = 0;
    let totalNdcg = 0;

    for (const query of this.evalQueries) {
      const retrieved = await this.simulateRetrieval(spec, query.query, 10);
      const relevant = query.relevantIds;
      const retrievedIds = retrieved.map(r => r.id);

      const truePositives = retrievedIds.filter(id => relevant.includes(id)).length;
      const precision = relevant.length > 0 ? truePositives / retrievedIds.length : 0;
      const recall = relevant.length > 0 ? truePositives / relevant.length : 0;

      let mrr = 0;
      for (let i = 0; i < retrievedIds.length; i++) {
        if (relevant.includes(retrievedIds[i])) {
          mrr = 1 / (i + 1);
          break;
        }
      }

      let dcg = 0;
      let idcg = 0;
      for (let i = 0; i < Math.min(retrievedIds.length, relevant.length); i++) {
        const rel = relevant.includes(retrievedIds[i]) ? 1 : 0;
        dcg += rel / Math.log2(i + 2);
        idcg += 1 / Math.log2(i + 2);
      }
      const ndcg = idcg > 0 ? dcg / idcg : 0;

      totalPrecision += precision;
      totalRecall += recall;
      totalMrr += mrr;
      totalNdcg += ndcg;
    }

    const count = this.evalQueries.length;
    return {
      precisionAt5: Math.round((totalPrecision / count) * 100) / 100,
      recallAt10: Math.round((totalRecall / count) * 100) / 100,
      mrr: Math.round((totalMrr / count) * 100) / 100,
      ndcgAt10: Math.round((totalNdcg / count) * 100) / 100,
      latencyMs: Date.now() - startTime,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private async simulateRetrieval(spec: EmbeddingModelSpec, query: string, topK: number): Promise<Array<{ id: string; score: number }>> {
    await new Promise(r => setTimeout(r, 5 + Math.random() * 20));
    const results: Array<{ id: string; score: number }> = [];
    for (let i = 0; i < topK; i++) {
      results.push({ id: `doc_${i}`, score: Math.random() });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  private calculateScore(metrics: EmbeddingQualityMetrics, _spec: EmbeddingModelSpec): number {
    const precisionScore = metrics.precisionAt5 / 0.9 * 25;
    const recallScore = metrics.recallAt10 / 0.85 * 25;
    const mrrScore = metrics.mrr / 0.8 * 20;
    const ndcgScore = metrics.ndcgAt10 / 0.85 * 20;
    const latencyScore = metrics.latencyMs < 50 ? 10 : metrics.latencyMs < 150 ? 7 : metrics.latencyMs < 300 ? 4 : 1;
    return Math.round(Math.min(100, precisionScore + recallScore + mrrScore + ndcgScore + latencyScore));
  }
}

export function createEmbeddingEvaluator(models?: EmbeddingModelSpec[], evalQueries?: EvaluationQuery[], activeModel?: string): EmbeddingEvaluator {
  return new EmbeddingEvaluator(models, evalQueries, activeModel);
}
