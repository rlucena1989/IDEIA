// ==========================================================================
// runner.ts — HypothesisTestRunner — Executor de experimentos e testes estatisticos
// ==========================================================================

import { createLogger } from '@ideia/logger';
import { HypothesisRegistry } from './registry';
import {
  HypothesisDefinition,
  HypothesisTestResult,
  ExperimentConfig,
  ExperimentResult,
  ExperimentData,
  ProgressCallback,
} from './types';

const logger = createLogger('hypothesis-testing:runner');

export class HypothesisTestRunner {
  private registry: HypothesisRegistry;
  private experiments: Map<string, ExperimentResult> = new Map();
  private onProgress?: ProgressCallback;

  constructor(registry: HypothesisRegistry, onProgress?: ProgressCallback) {
    this.registry = registry;
    this.onProgress = onProgress;
  }

  async runExperiment(config: ExperimentConfig): Promise<ExperimentResult> {
    const hyp = this.registry.getHypothesis(config.hypothesisId);
    if (!hyp) throw new Error('Hypothesis ' + config.hypothesisId + ' not found');

    const startTime = new Date();
    const controlData: number[] = [];
    const treatmentData: number[] = [];
    let error: string | undefined;

    logger.info('Running experiment: ' + config.id + ' for hypothesis: ' + config.hypothesisId);

    try {
      const totalRuns = config.repetitions * config.tasks.length;
      let completed = 0;

      for (let rep = 0; rep < config.repetitions; rep++) {
        for (const task of config.tasks) {
          const controlResult = await this.executeTask(task, config.controlConfig);
          controlData.push(controlResult);
          const treatmentResult = await this.executeTask(task, config.treatmentConfig);
          treatmentData.push(treatmentResult);
          completed++;
          if (this.onProgress) {
            this.onProgress(config.id, 'running', completed / totalRuns);
          }
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const endTime = new Date();
    const result: ExperimentResult = {
      experimentId: config.id,
      hypothesisId: config.hypothesisId,
      controlData,
      treatmentData,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: endTime.getTime() - startTime.getTime(),
      error,
    };

    this.experiments.set(config.id, result);

    if (!error) {
      const testResult = await this.registry.test(config.hypothesisId, {
        control: controlData,
        treatment: treatmentData,
      });
      logger.info('Experiment ' + config.id + ' complete. Status: ' + testResult.status);
    } else {
      logger.error('Experiment ' + config.id + ' failed', { error });
    }

    return result;
  }

  private async executeTask(task: string, config: Record<string, unknown>): Promise<number> {
    const baseScore = 0.7;
    const noise = (Math.random() - 0.5) * 0.2;
    const configBonus = Object.keys(config).length * 0.01;
    const taskBonus = task.length > 0 ? 0.02 : 0;
    return Math.min(1, Math.max(0, baseScore + noise + configBonus + taskBonus));
  }

  async runAllHypotheses(baseConfig: { tasks: string[]; repetitions: number }): Promise<ExperimentResult[]> {
    const results: ExperimentResult[] = [];
    const hypotheses = this.registry.getAllHypotheses();

    for (let i = 0; i < hypotheses.length; i++) {
      const hyp = hypotheses[i];
      const config: ExperimentConfig = {
        id: 'exp-' + hyp.id + '-' + Date.now(),
        hypothesisId: hyp.id,
        controlConfig: this.buildControlConfig(hyp),
        treatmentConfig: this.buildTreatmentConfig(hyp),
        sampleSize: hyp.sampleSize,
        repetitions: baseConfig.repetitions,
        tasks: baseConfig.tasks,
      };
      if (this.onProgress) {
        this.onProgress('batch', 'starting', i / hypotheses.length);
      }
      const result = await this.runExperiment(config);
      results.push(result);
    }
    return results;
  }

  private buildControlConfig(hyp: HypothesisDefinition): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    config[hyp.independentVariable.name] = hyp.independentVariable.levels[0];
    for (const cv of hyp.controlVariables) {
      config[cv.name] = cv.value;
    }
    return config;
  }

  private buildTreatmentConfig(hyp: HypothesisDefinition): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    config[hyp.independentVariable.name] = hyp.independentVariable.levels[1];
    for (const cv of hyp.controlVariables) {
      config[cv.name] = cv.value;
    }
    return config;
  }

  getExperiment(id: string): ExperimentResult | undefined {
    return this.experiments.get(id);
  }

  getAllExperiments(): ExperimentResult[] {
    return Array.from(this.experiments.values());
  }

  getStats(): { totalExperiments: number; totalDuration: number; avgDuration: number } {
    const all = this.getAllExperiments();
    const totalDuration = all.reduce((s, e) => s + e.duration, 0);
    return {
      totalExperiments: all.length,
      totalDuration,
      avgDuration: all.length > 0 ? totalDuration / all.length : 0,
    };
  }
}