import { AdaptiveThresholdEngine } from './adaptive-threshold-engine';
import { createLogger } from '@ideia/logger';
import { ChangeContext, GateEvaluation } from './types';
const logger = createLogger('adaptive-gate-engine');

export class AdaptiveGateEngine {
  constructor(private _engine: AdaptiveThresholdEngine) {}

  async evaluate(metric: string, baseThreshold: number, actualValue: number, context: ChangeContext): Promise<GateEvaluation> {
    const adjusted = await this._engine.adjustThreshold(metric, baseThreshold, context);
    return {
      metric, threshold: adjusted.adjustedValue, actual: actualValue,
      passed: actualValue >= adjusted.adjustedValue, confidence: adjusted.confidence,
      factors: adjusted.contributingFactors,
    };
  }

  async recordAndAdapt(evaluation: GateEvaluation, context: ChangeContext): Promise<void> {
    await this._engine.recordOutcome(evaluation.metric, evaluation.threshold, evaluation.passed, context);
  }
}
