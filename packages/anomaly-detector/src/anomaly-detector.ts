import { createLogger } from '@ideia/logger';
import { DetectionResult, AnomalyReport } from './types';
import { EnsembleDetector } from './ensemble-detector';
import { RuleBasedDetector } from './rule-based-detector';
import { StatisticalDetector, ZScoreDetector, MADDetector, IQRDetector, EWMADetector } from './statistical-detector';
import { MLDetector, IsolationForestDetector, LOFDetector, OneClassSVMDetector } from './ml-detector';

export class AnomalyDetector {
  private _ensemble: EnsembleDetector;
  private _ruleBased: RuleBasedDetector;
  private _statistical: StatisticalDetector;
  private _ml: MLDetector;
  private _logger = createLogger('anomaly-detector');

  constructor() {
    this._ensemble = new EnsembleDetector();
    this._ruleBased = new RuleBasedDetector();
    this._statistical = new StatisticalDetector();
    this._ml = new MLDetector();
  }

  get ensemble(): EnsembleDetector {
    return this._ensemble;
  }

  get ruleBased(): RuleBasedDetector {
    return this._ruleBased;
  }

  get statistical(): StatisticalDetector {
    return this._statistical;
  }

  get ml(): MLDetector {
    return this._ml;
  }

  static createZScoreDetector(): ZScoreDetector {
    return new ZScoreDetector();
  }

  static createMADDetector(): MADDetector {
    return new MADDetector();
  }

  static createIQRDetector(): IQRDetector {
    return new IQRDetector();
  }

  static createEWMADetector(): EWMADetector {
    return new EWMADetector();
  }

  static createIsolationForestDetector(config?: {
    contamination?: number;
    nEstimators?: number;
    randomState?: number;
  }): IsolationForestDetector {
    return new IsolationForestDetector(config);
  }

  static createLOFDetector(): LOFDetector {
    return new LOFDetector();
  }

  static createOneClassSVMDetector(nu?: number, gamma?: number): OneClassSVMDetector {
    return new OneClassSVMDetector(nu, gamma);
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
    const result = this._ensemble.detect(
      statisticalValues,
      newValue,
      ruleContext,
      mlSample,
      mlSamples,
      agentId,
    );

    this._logger.info('Detection completed', {
      score: result.ensembleScore,
      level: result.report.level,
      factors: result.report.factors.length,
    });

    return result;
  }
}
