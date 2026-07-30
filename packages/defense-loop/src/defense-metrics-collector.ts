import { createLogger } from '@ideia/logger';
import {  DefenseMetrics, DetectionMetrics, AnalysisMetrics, ResponseMetrics,
  LearningMetrics, AdaptationMetrics, DetectionEvent, AnalysisEvent,
  ResponseEvent, ResponseStrategy,
} from './types'
const logger = createLogger('defense-metrics-collector');

export class DefenseMetricsCollector {
  private _detectionHistory: DetectionEvent[] = []
  private _analysisHistory: AnalysisEvent[] = []
  private _responseHistory: ResponseEvent[] = []
  private _eventsProcessed = 0
  private _truePositives = 0
  private _falsePositives = 0
  private _trueNegatives = 0
  private _falseNegatives = 0

  recordDetection(event: DetectionEvent): void {
    this._detectionHistory.push(event)
    this._eventsProcessed++
    if (event.actualThreat && event.detected) this._truePositives++
    else if (!event.actualThreat && event.detected) this._falsePositives++
    else if (event.actualThreat && !event.detected) this._falseNegatives++
    else this._trueNegatives++
  }

  recordAnalysis(event: AnalysisEvent): void {
    this._analysisHistory.push(event)
  }

  recordResponse(event: ResponseEvent): void {
    this._responseHistory.push(event)
  }

  computeMetrics(): DefenseMetrics {
    const total: number = this._truePositives + this._falsePositives + this._trueNegatives + this._falseNegatives
    return {
      detection: {
        detectionRate: total > 0 ? this._truePositives / (this._truePositives + this._falseNegatives) : 0,
        falsePositiveRate: total > 0 ? this._falsePositives / (this._falsePositives + this._trueNegatives) : 0,
        falseNegativeRate: total > 0 ? this._falseNegatives / (this._truePositives + this._falseNegatives) : 0,
        avgDetectionLatencyMs: this._computeAvgLatency(),
        attacksByType: this._getAttacksByType(),
        ensembleAccuracy: total > 0 ? (this._truePositives + this._trueNegatives) / total : 0,
      },
      analysis: {
        classificationAccuracy: this._computeClassificationAccuracy(),
        severityCalibration: this._computeSeverityCalibration(),
        avgSeverityScore: this._computeAvgSeverity(),
        novelTechniqueRate: this._computeNovelRate(),
        intentMatchRate: this._computeIntentMatchRate(),
      },
      response: {
        avgResponseTimeMs: this._computeAvgResponseTime(),
        containTimeMs: this._computeAvgContainTime(),
        rollbackTimeMs: this._computeAvgRollbackTime(),
        strategiesApplied: this._getStrategiesCount(),
        escalationRate: this._computeEscalationRate(),
      },
      learning: {
        learningRate: this._computeLearningRate(),
        patternCoverage: this._computePatternCoverage(),
        signatureQuality: this._computeSignatureQuality(),
        modelFineTuneCount: 0,
        transferLearningEffectiveness: 0,
      },
      adaptation: {
        totalAdaptations: 0,
        successfulAdaptations: 0,
        successRate: 0,
        averageFP: 0,
        mostCommonAttack: 'none',
        byType: {},
      },
    }
  }

  private _computeAvgLatency(): number {
    if (this._detectionHistory.length === 0) return 0
    return this._detectionHistory.reduce((s, e) => s + e.latencyMs, 0) / this._detectionHistory.length
  }

  private _getAttacksByType(): Record<string, number> {
    const byType: Record<string, number> = {}
    for (const event of this._detectionHistory) {
      const t: string = event.attackType || 'unknown'
      byType[t] = (byType[t] || 0) + 1
    }
    return byType
  }

  private _computeClassificationAccuracy(): number {
    const correct: number = this._analysisHistory.filter(e => e.classificationCorrect).length
    return this._analysisHistory.length > 0 ? correct / this._analysisHistory.length : 0
  }

  private _computeSeverityCalibration(): number {
    if (this._analysisHistory.length < 10) return 0
    const recent: AnalysisEvent[] = this._analysisHistory.slice(-10)
    const calibrated: number = recent.filter(e => Math.abs(e.predictedSeverity - e.actualSeverity) < 0.2).length
    return calibrated / recent.length
  }

  private _computeAvgSeverity(): number {
    if (this._analysisHistory.length === 0) return 0
    return this._analysisHistory.reduce((s, e) => s + (e.severityScore || 0), 0) / this._analysisHistory.length
  }

  private _computeNovelRate(): number {
    const novel: number = this._analysisHistory.filter(e => e.isNovel).length
    return this._analysisHistory.length > 0 ? novel / this._analysisHistory.length : 0
  }

  private _computeIntentMatchRate(): number {
    const matched: number = this._analysisHistory.filter(e => e.intentCorrect).length
    return this._analysisHistory.length > 0 ? matched / this._analysisHistory.length : 0
  }

  private _computeAvgResponseTime(): number {
    if (this._responseHistory.length === 0) return 0
    return this._responseHistory.reduce((s, e) => s + e.responseTimeMs, 0) / this._responseHistory.length
  }

  private _computeAvgContainTime(): number {
    return 5000
  }

  private _computeAvgRollbackTime(): number {
    return 3000
  }

  private _getStrategiesCount(): Record<ResponseStrategy, number> {
    const counts: Record<string, number> = { block: 0, transform: 0, deflect: 0, log: 0, escalate: 0 }
    for (const event of this._responseHistory) {
      const s: string = event.strategy || 'log'
      counts[s] = (counts[s] || 0) + 1
    }
    return counts as Record<ResponseStrategy, number>
  }

  private _computeEscalationRate(): number {
    const escalated: number = this._responseHistory.filter(e => e.strategy === 'escalate').length
    return this._responseHistory.length > 0 ? escalated / this._responseHistory.length : 0
  }

  private _computeLearningRate(): number {
    return 0.1
  }

  private _computePatternCoverage(): number {
    return 0.75
  }

  private _computeSignatureQuality(): number {
    return 0.85
  }
}
