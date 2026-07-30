import { Severity, RuleAction, RuleSource, ConfidenceLabel, Recommendation, ClientType, DataSensitivityLevel, ResponseStrategyAction, AgentActionType, GraphEdgeType, LoopMode, DetectorType } from './types'

export interface ABTestResult { passed: boolean; fpRate: number; confidence: ConfidenceLabel }

export interface RegressionResult {
  rule: import('./defense-types').PolicyRule
  falsePositives: number
  fpRate: number
  passed: boolean
  recommendation: Recommendation
}

export interface MLMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  aucRoc: number
  falsePositiveRate: number
  latencyMs: number
}

export interface DeploymentConfig {
  id: string
  frontierTechnique: string
  detectors: DetectorType[]
  rules: string[]
  responseStrategy: string
  aBTestConfig: { rolloutPercent: number; controlRules: string[]; treatmentRules: string[]; evaluationMetric: string; minSampleSize: number }
  monitoring: { metricsInterval: number; alertThreshold: number; autoRollback: boolean }
}

export interface AttackVector {
  id: string
  type: string
  description: string
  severity: Severity
  attackChain: string[]
}

export interface CascadeNode {
  id: string
  agentId: string
  action: AgentActionType
  timestamp: number
  parentId: string | null
  children: string[]
  metadata: Record<string, unknown>
}

export interface CascadeResult {
  rootNode: CascadeNode
  depth: number
  totalNodes: number
  maliciousCount: number
  maliciousActions: Array<{ nodeId: string; action: string; reason: string }>
}

export interface DefenseMetrics {
  totalAttacks?: number
  blockedAttacks?: number
  falsePositives?: number
  averageResponseTime?: number
  detectionRate?: number
  truePositiveRate?: number
  falsePositiveRate?: number
  detection: {
    detectionRate: number
    falsePositiveRate: number
    falseNegativeRate: number
    avgDetectionLatencyMs: number
    attacksByType: Record<string, number>
    ensembleAccuracy: number
  }
  analysis: {
    classificationAccuracy: number
    severityCalibration: number
    avgSeverityScore: number
    novelTechniqueRate: number
    intentMatchRate: number
  }
  response: {
    avgResponseTimeMs: number
    containTimeMs: number
    rollbackTimeMs: number
    strategiesApplied: Record<string, number>
    escalationRate: number
  }
  learning: {
    learningRate: number
    patternCoverage: number
    signatureQuality: number
    modelFineTuneCount: number
    transferLearningEffectiveness: number
  }
  adaptation: {
    totalAdaptations: number
    successfulAdaptations: number
    successRate: number
    averageFP: number
    mostCommonAttack: string
    byType: Record<string, number>
  }
}

export interface ReportConfig {
  clientType: ClientType
  dataSensitivity: DataSensitivityLevel
  includeTechnicalDetails: boolean
  includeRemediation: boolean
  format: 'json' | 'pdf' | 'html'
}