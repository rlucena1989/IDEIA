// ==========================================================================
// detector.ts — BiasDetector engine principal
// ==========================================================================

import * as crypto from 'crypto';
import { DemographicParityMetric } from './metrics/demographic-parity';
import { EqualOpportunityMetric } from './metrics/equal-opportunity';
import { EqualizedOddsMetric } from './metrics/equalized-odds';
import { DisparateImpactMetric } from './metrics/disparate-impact';
import { StatisticalParityMetric } from './metrics/statistical-parity';
import { TheilIndexMetric } from './metrics/theil-index';
import { CompositeScoreMetric } from './metrics/composite-score';
import { ConfidenceIntervalCalculator } from './confidence-interval';
import { AuditChain } from './audit-chain';
import type { BiasInput, BiasReport, BiasMetricResult, BiasDetectorConfig, BiasThresholds, BiasStatus, MetricName, Severity } from './types';
import { DEFAULT_CONFIG } from './types';

export class BiasDetector {
  private metrics: Array<{
    name: MetricName; displayName: string;
    compute: (pred: boolean[], actual: boolean[], sens: boolean[]) => number;
    threshold: (t: BiasThresholds) => number;
    interpret: (v: number, t: number) => { interpretation: string; severity: Severity; recommendation: string };
  }>;
  private confidenceCalc: ConfidenceIntervalCalculator;
  private auditChain: AuditChain;

  constructor(private config: BiasDetectorConfig = DEFAULT_CONFIG) {
    this.confidenceCalc = new ConfidenceIntervalCalculator(config.bootstrapIterations, config.confidenceLevel);
    this.auditChain = new AuditChain();
    this.metrics = [
      { name: 'demographic_parity', displayName: 'Demographic Parity', compute: DemographicParityMetric.compute, threshold: t => t.demographicParity, interpret: DemographicParityMetric.interpret },
      { name: 'equal_opportunity', displayName: 'Equal Opportunity', compute: EqualOpportunityMetric.compute, threshold: t => t.equalOpportunity, interpret: EqualOpportunityMetric.interpret },
      { name: 'equalized_odds', displayName: 'Equalized Odds', compute: EqualizedOddsMetric.compute, threshold: t => t.equalizedOdds, interpret: EqualizedOddsMetric.interpret },
      { name: 'disparate_impact', displayName: 'Disparate Impact', compute: DisparateImpactMetric.compute, threshold: t => t.disparateImpactMin, interpret: DisparateImpactMetric.interpret },
      { name: 'statistical_parity_difference', displayName: 'Statistical Parity Diff', compute: StatisticalParityMetric.compute, threshold: t => t.statisticalParityDiff, interpret: StatisticalParityMetric.interpret },
      { name: 'theil_index', displayName: 'Theil Index', compute: TheilIndexMetric.compute, threshold: t => t.theilIndex, interpret: TheilIndexMetric.interpret },
    ];
  }

  analyze(input: BiasInput): BiasReport {
    this.validateInput(input);
    const metricResults = this.computeAllMetrics(input);
    const compositeResult = CompositeScoreMetric.compute(metricResults, this.config.thresholds.compositeScore);
    const recommendations = this.generateRecommendations(metricResults);
    const criticalViolations = metricResults.filter(m => m.severity === 'critical' || m.severity === 'high').map(m => m.displayName + ': ' + m.interpretation);
    const overallStatus = this.determineStatus(metricResults, compositeResult);

    const report: BiasReport = {
      id: 'bias-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex'),
      timestamp: new Date().toISOString(),
      metadata: {
        modelName: input.metadata?.modelName ?? 'unknown',
        sessionId: input.metadata?.sessionId ?? 'session-' + Date.now(),
        domain: input.metadata?.domain ?? this.config.domain,
        sampleSize: input.predictions.length,
        privilegedCount: input.sensitiveAttributes.filter(Boolean).length,
        unprivilegedCount: input.sensitiveAttributes.filter(a => !a).length,
      },
      metrics: [...metricResults, compositeResult],
      overallStatus,
      compositeScore: compositeResult.value,
      recommendations,
      criticalViolations,
      reportHash: '',
      previousHash: this.auditChain.getLastHash(),
      detectorVersion: this.config.detectorVersion,
    };
    const reportString = JSON.stringify(report, Object.keys(report).sort());
    report.reportHash = crypto.createHash('sha256').update(reportString).digest('hex');
    this.auditChain.addEntry(report);
    return report;
  }

  private validateInput(input: BiasInput): void {
    const { predictions, groundTruth, sensitiveAttributes } = input;
    const n = predictions.length;
    if (n === 0) throw new Error('Empty input');
    if (groundTruth.length !== n || sensitiveAttributes.length !== n) throw new Error('Mismatched input lengths');
    if (n < this.config.minSampleSize) throw new Error('Sample size ' + n + ' < min ' + this.config.minSampleSize + '');
    for (let i = 0; i < n; i++) {
      if (predictions[i] == null || groundTruth[i] == null || sensitiveAttributes[i] == null) throw new Error('Null at index ' + i);
    }
  }

  private computeAllMetrics(input: BiasInput): BiasMetricResult[] {
    const { predictions, groundTruth, sensitiveAttributes } = input;
    const activeMetrics = this.config.requiredMetrics.length > 0
      ? this.metrics.filter(m => this.config.requiredMetrics.includes(m.name))
      : this.metrics;
    return activeMetrics.map(metric => {
      const value = metric.compute(predictions, groundTruth, sensitiveAttributes);
      const threshold = metric.threshold(this.config.thresholds);
      const ci = this.confidenceCalc.compute(predictions, groundTruth, sensitiveAttributes, metric.compute);
      const { interpretation, severity, recommendation } = metric.interpret(value, threshold);
      const passed = metric.name === 'disparate_impact' ? value >= threshold : value <= threshold;
      return {
        name: metric.name, displayName: metric.displayName, value, threshold, passed,
        confidenceLower: ci.lower, confidenceUpper: ci.upper, pValue: ci.pValue,
        interpretation, severity, recommendation,
      };
    });
  }

  private generateRecommendations(metrics: BiasMetricResult[]): string[] {
    const recs: string[] = [];
    for (const m of metrics) { if (!m.passed) recs.push(m.recommendation); }
    if (metrics.filter(m => !m.passed).length >= 3) recs.push('Multiple violations. Consider comprehensive retraining with debiasing.');
    if (metrics.some(m => m.severity === 'critical')) recs.push('Critical violations require immediate review before deployment.');
    return [...new Set(recs)];
  }

  private determineStatus(metrics: BiasMetricResult[], composite: BiasMetricResult): BiasStatus {
    if (metrics.some(m => m.severity === 'critical') || composite.value > this.config.thresholds.compositeScore * 1.5) return 'fail';
    if (metrics.filter(m => !m.passed).length > 1 || composite.value > this.config.thresholds.compositeScore) return 'warn';
    return 'pass';
  }

  getAuditChain() { return this.auditChain.getChain(); }
  resetAuditChain(): void { this.auditChain = new AuditChain(); }
}
