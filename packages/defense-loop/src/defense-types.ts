import { Severity, DetectorType, RuleType, RuleAction, RuleSource, ResponseStrategy, CycleStatus, ConfidenceLabel, Recommendation } from './types'
import { AttackClassification } from './attack-types'

export type FrontierTechnique = 'adversarial_training_loop' | 'constitutional_defense' | 'meta_learning' | 'gnn_detection' | 'federated_learning' | 'formal_verification' | 'counterfactual_explanation'

export interface DefenseAction {
  type: ResponseStrategy
  target: string
  priority: number
  playbookId?: string
}

export interface DetectionResult {
  isThreat: boolean
  confidence: number
  technique: string
  matchedPatterns: string[]
  severity: Severity
}

export interface PolicyRule {
  id: string
  type: RuleType
  pattern?: string
  reference?: number[]
  threshold?: number
  action: RuleAction
  severity: Severity
  source: RuleSource
  createdAt: Date
  metadata?: Record<string, unknown>
  rollbackPlan?: { steps: string[]; estimatedTimeMs: number }
}

export interface ResponseStep {
  id: string
  action: string
  target: string
  parameters: Record<string, unknown>
  timeout: number
  rollback?: ResponseStep
}

export interface ResponsePlaybook {
  id: string
  name: string
  severity: Severity
  steps: ResponseStep[]
  createdAt: number
  version: number
}

export interface ResponsePlan {
  id: string
  severity: Severity
  actions: DefenseAction[]
  playbook: ResponsePlaybook
  estimatedContainmentTime: number
  requiresApproval: boolean
}

export interface DefenseCycleResult {
  id: string
  scenario: import('./attack-types').AttackScenario
  analysis: import('./attack-types').BypassTechnique
  rule: PolicyRule
  abTestResult: { passed: boolean; fpRate: number; confidence: ConfidenceLabel }
  deployedAt: number
  fpRate: number
  status: CycleStatus
}

export interface StrategyResult {
  strategy: ResponseStrategy
  applied: boolean
  transformedPayload?: string
  honeypotId?: string
  auditEntry: { action: string; target: string; severity: string; timestamp: number; hash: string }
}

export interface AdaptationEvent {
  id: string
  attackType: string
  ruleGenerated: string
  abTestPassed: boolean
  fpRate: number
}
