import { createLogger } from '@ideia/logger';

const logger = createLogger('model-manager');

export type ModelCategory = 'chat' | 'code' | 'embedding' | 'classification' | 'summarization';

export type ModelProvider = 'ollama' | 'openai' | 'deepseek';

export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
  baseUrl?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  capabilities: ModelCategory[];
}

export interface ModelEvaluation {
  modelName: string;
  benchmark: string;
  score: number;
  metrics: Record<string, number>;
  timestamp: string;
}

export interface ModelEntry {
  name: string;
  config: ModelConfig;
  evaluations: ModelEvaluation[];
}

export class ModelManager {
  private models: Map<string, ModelEntry> = new Map();

  registerModel(name: string, config: ModelConfig): void {
    if (this.models.has(name)) {
      logger.warn(`Model "${name}" already registered, overwriting`);
    }
    this.models.set(name, {
      name,
      config,
      evaluations: [],
    });
    logger.info(`Model "${name}" registered (${config.provider}/${config.modelName})`);
  }

  getModel(name: string): ModelEntry | undefined {
    return this.models.get(name);
  }

  listModels(filter?: { provider?: ModelProvider; category?: ModelCategory }): ModelEntry[] {
    const all = Array.from(this.models.values());
    if (!filter) return all;

    return all.filter(m => {
      if (filter.provider && m.config.provider !== filter.provider) return false;
      if (filter.category && !m.config.capabilities.includes(filter.category)) return false;
      return true;
    });
  }

  evaluateModel(name: string, benchmark: string, score: number, metrics: Record<string, number>): ModelEvaluation | undefined {
    const model = this.models.get(name);
    if (!model) {
      logger.error(`Cannot evaluate: model "${name}" not found`);
      return undefined;
    }

    const evaluation: ModelEvaluation = {
      modelName: name,
      benchmark,
      score,
      metrics,
      timestamp: new Date().toISOString(),
    };

    model.evaluations.push(evaluation);
    logger.info(`Model "${name}" evaluated on "${benchmark}": ${score}`);
    return evaluation;
  }

  compareModels(models: string[], benchmark: string): Array<{ name: string; score: number }> {
    const results: Array<{ name: string; score: number }> = [];

    for (const name of models) {
      const model = this.models.get(name);
      if (!model) continue;

      const evalForBenchmark = model.evaluations.find(e => e.benchmark === benchmark);
      if (evalForBenchmark) {
        results.push({ name, score: evalForBenchmark.score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  getBestModel(task: ModelCategory): { name: string; score: number } | undefined {
    let best: { name: string; score: number } | undefined;
    let bestScore = -1;

    for (const [name, entry] of this.models.entries()) {
      if (!entry.config.capabilities.includes(task)) continue;
      if (entry.evaluations.length === 0) continue;

      const avgScore = entry.evaluations.reduce((sum, e) => sum + e.score, 0) / entry.evaluations.length;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        best = { name, score: Math.round(avgScore * 100) / 100 };
      }
    }

    return best;
  }
}

export function createModelManager(): ModelManager {
  return new ModelManager();
}
