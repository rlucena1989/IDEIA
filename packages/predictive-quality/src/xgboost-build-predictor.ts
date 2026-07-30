import { ChangeSet, Prediction } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('xgboost-build-predictor');

export class XGBoostBuildPredictor {
  async predict(changes: ChangeSet): Promise<Prediction> {
    const features = this._extractFeatures(changes);
    const probability = this._simplePredict(features);
    const topFactors = features.map((f, i) => ({ feature: `feature_${i}`, impact: f })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 3);
    return {
      probability, riskLevel: probability > 0.7 ? 'high' : probability > 0.4 ? 'medium' : 'low',
      topFactors, recommendedAction: this._getRecommendedAction(probability),
    };
  }

  private _extractFeatures(changes: ChangeSet): number[] {
    return [
      changes.files.length, changes.authors.length, changes.isWeekend ? 1 : 0,
      changes.nightCommit ? 1 : 0, changes.docsOnly ? 1 : 0,
      changes.testChanges / Math.max(changes.files.length, 1),
      changes.avgFileComplexity, changes.hasDependencyChange ? 1 : 0,
      changes.lastBuildSuccessRate, changes.hour / 24,
      changes.hasNewDependency ? 1 : 0, changes.isLargeRefactor ? 1 : 0,
    ];
  }

  private _simplePredict(features: number[]): number {
    const weights = [0.1, 0.05, 0.15, 0.1, -0.1, -0.2, 0.08, 0.12, -0.15, 0.03, 0.1, 0.08];
    const raw = features.reduce((sum, f, i) => sum + f * (weights[i] ?? 0), 0);
    return 1 / (1 + Math.exp(-raw));
  }

  private _getRecommendedAction(probability: number): string {
    if (probability > 0.7) return 'run_full_test_suite';
    if (probability > 0.4) return 'run_smoke_tests';
    return 'skip_heavy_tests';
  }
}
