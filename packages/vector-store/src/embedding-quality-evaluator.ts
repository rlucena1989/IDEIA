import { createLogger } from '@ideia/logger';
import { InMemoryVectorStore, EmbeddingProvider } from './index';

const logger = createLogger('vector-store:embedding-quality');

export interface EvalQuery {
  query: string;
  relevantContent: string[];
}

export interface EvalMetrics {
  precision: number;
  recall: number;
  mrr: number;
  ndcg: number;
  latencyMs: number;
}

export interface EvalRun {
  timestamp: string;
  modelName: string;
  metrics: EvalMetrics;
  queriesCount: number;
}

export class PeriodicEmbeddingEvaluator {
  private store: InMemoryVectorStore;
  private provider: EmbeddingProvider;
  private evalQueries: EvalQuery[];
  private evalHistory: EvalRun[] = [];
  private maxHistory: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    store: InMemoryVectorStore,
    provider: EmbeddingProvider,
    evalQueries: EvalQuery[],
    maxHistory = 50,
  ) {
    this.store = store;
    this.provider = provider;
    this.evalQueries = evalQueries;
    this.maxHistory = maxHistory;
  }

  start(intervalMs = 3600000): void {
    if (this.timer) return;
    logger.info('Starting periodic embedding quality evaluation');
    this.runEvaluation().catch(err => logger.error('Initial embedding eval failed', { error: String(err) }));
    this.timer = setInterval(() => {
      this.runEvaluation().catch(err => logger.error('Periodic embedding eval failed', { error: String(err) }));
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runEvaluation(): Promise<EvalRun> {
    const start = performance.now();

    let totalPrecision = 0;
    let totalRecall = 0;
    let totalMrr = 0;
    let totalNdcg = 0;
    let queriesCount = 0;

    for (const eq of this.evalQueries) {
      const results = this.store.search(eq.query, 10);
      const retrievedContent = results.map(r => r.record.content);

      const truePositives = retrievedContent.filter(rc => eq.relevantContent.includes(rc)).length;
      const precision = eq.relevantContent.length > 0 ? truePositives / Math.min(retrievedContent.length, eq.relevantContent.length) : 0;
      const recall = eq.relevantContent.length > 0 ? truePositives / eq.relevantContent.length : 0;

      let mrr = 0;
      for (let i = 0; i < retrievedContent.length; i++) {
        if (eq.relevantContent.includes(retrievedContent[i])) {
          mrr = 1 / (i + 1);
          break;
        }
      }

      let dcg = 0;
      let idcg = 0;
      for (let i = 0; i < Math.min(retrievedContent.length, eq.relevantContent.length); i++) {
        const rel = eq.relevantContent.includes(retrievedContent[i]) ? 1 : 0;
        dcg += rel / Math.log2(i + 2);
        idcg += 1 / Math.log2(i + 2);
      }
      const ndcg = idcg > 0 ? dcg / idcg : 0;

      totalPrecision += precision;
      totalRecall += recall;
      totalMrr += mrr;
      totalNdcg += ndcg;
      queriesCount++;
    }

    const metrics: EvalMetrics = {
      precision: queriesCount > 0 ? totalPrecision / queriesCount : 0,
      recall: queriesCount > 0 ? totalRecall / queriesCount : 0,
      mrr: queriesCount > 0 ? totalMrr / queriesCount : 0,
      ndcg: queriesCount > 0 ? totalNdcg / queriesCount : 0,
      latencyMs: Math.round(performance.now() - start),
    };

    const evalRun: EvalRun = {
      timestamp: new Date().toISOString(),
      modelName: this.provider.name,
      metrics,
      queriesCount,
    };

    this.evalHistory.push(evalRun);
    if (this.evalHistory.length > this.maxHistory) {
      this.evalHistory = this.evalHistory.slice(-this.maxHistory);
    }

    logger.info('Embedding quality evaluation', {
      model: this.provider.name,
      precision: metrics.precision.toFixed(3),
      recall: metrics.recall.toFixed(3),
      mrr: metrics.mrr.toFixed(3),
      ndcg: metrics.ndcg.toFixed(3),
      latency: `${metrics.latencyMs}ms`,
    });

    return evalRun;
  }

  getHistory(): EvalRun[] {
    return [...this.evalHistory];
  }

  getTrend(): { improving: boolean; changePct: number } {
    if (this.evalHistory.length < 2) return { improving: true, changePct: 0 };
    const recent = this.evalHistory.slice(-5);
    const scores = recent.map(r => r.metrics.precision + r.metrics.recall + r.metrics.mrr + r.metrics.ndcg);
    const first = scores[0];
    const last = scores[scores.length - 1];
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
    return { improving: changePct >= 0, changePct: Math.round(changePct * 100) / 100 };
  }
}
