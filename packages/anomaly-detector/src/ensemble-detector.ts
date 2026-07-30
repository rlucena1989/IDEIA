import { DetectionResult, AnomalyReport } from './types';
import { createLogger } from '@ideia/logger';
import { RuleBasedDetector } from './rule-based-detector';
import { StatisticalDetector } from './statistical-detector';
import { MLDetector } from './ml-detector';
const logger = createLogger('ensemble-detector');

export interface EnsembleConfig {
  weights: Record<string, number>;
  thresholdWarn: number;
  thresholdFlag: number;
  thresholdBlock: number;
  thresholdQuarantine: number;
}

const _defaultEnsembleConfig: EnsembleConfig = {
  weights: {
    zscore: 0.1,
    mad: 0.1,
    iqr: 0.1,
    ewma: 0.1,
    isolation_forest: 0.15,
    lof: 0.1,
    one_class_svm: 0.1,
    rule: 0.25,
  },
  thresholdWarn: 0.3,
  thresholdFlag: 0.5,
  thresholdBlock: 0.75,
  thresholdQuarantine: 0.9,
};

export class EnsembleDetector {
  private _ruleBased: RuleBasedDetector;
  private _statistical: StatisticalDetector;
  private _ml: MLDetector;
  private _config: EnsembleConfig;
  private _additionalDetectors: Array<{
    name: string;
    detect: () => number;
  }> = [];

  constructor(config?: Partial<EnsembleConfig>) {
    this._ruleBased = new RuleBasedDetector();
    this._statistical = new StatisticalDetector();
    this._ml = new MLDetector();
    this._config = { ..._defaultEnsembleConfig, ...config };
  }

  registerDetector(name: string, detectFn: () => number): void {
    this._additionalDetectors.push({ name, detect: detectFn });
  }

  detect(
    statisticalValues: number[],
    newValue: number,
    ruleContext: Record<string, number>,
    mlSample: number[],
    mlSamples?: number[][],
    agentId = 'unknown',
  ): {
    results: DetectionResult[];
    ensembleScore: number;
    report: AnomalyReport;
  } {
    const allResults: DetectionResult[] = [];

    const ruleResults = this._ruleBased.detect(ruleContext);
    allResults.push(...ruleResults);

    const statResults = this._statistical.detect(statisticalValues, newValue);
    allResults.push(...statResults);

    if (mlSamples) {
      this._ml.train(mlSamples);
    }
    const mlResults = this._ml.detect(mlSample);
    allResults.push(...mlResults);

    for (const det of this._additionalDetectors) {
      const score = det.detect();
      allResults.push({
        detectorName: det.name,
        score,
        threshold: 0.5,
        isAnomaly: score > 0.5,
        details: {},
      });
    }

    let ensembleScore = 0;
    let totalWeight = 0;
    for (const result of allResults) {
      const weight = this._config.weights[result.detectorName] ?? 0.05;
      ensembleScore += result.score * weight;
      totalWeight += weight;
    }
    ensembleScore = totalWeight > 0 ? ensembleScore / totalWeight : 0;

    const level = ensembleScore >= this._config.thresholdQuarantine
      ? 'critical'
      : ensembleScore >= this._config.thresholdFlag
        ? 'suspicious'
        : 'normal';

    let recommendation: string;
    if (ensembleScore >= this._config.thresholdQuarantine) {
      recommendation = 'quarantine_agent';
    } else if (ensembleScore >= this._config.thresholdBlock) {
      recommendation = 'block_immediately';
    } else if (ensembleScore >= this._config.thresholdFlag) {
      recommendation = 'flag_for_review';
    } else if (ensembleScore >= this._config.thresholdWarn) {
      recommendation = 'warn_and_log';
    } else {
      recommendation = 'allow';
    }

    const report: AnomalyReport = {
      agentId,
      timestamp: Date.now(),
      score: ensembleScore,
      level,
      factors: allResults.map((r) => ({ name: r.detectorName, score: r.score })),
      recommendation,
      metadata: { detectorCount: allResults.length },
    };

    return { results: allResults, ensembleScore, report };
  }
}
