import { Logger } from '@ideia/logger'

export * from './attack-types'
export * from './defense-types'
export * from './evaluation-types'

export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type DetectorType = 'regex' | 'embedding' | 'llm' | 'behavioral' | 'ensemble'
export type RuleType = 'regex' | 'embedding' | 'llm_classifier' | 'behavioral'
export type RuleAction = 'block' | 'review' | 'log'
export type RuleSource = 'auto_generated' | 'manual' | 'study' | 'constitutional'
export type ResponseStrategy = 'block' | 'transform' | 'deflect' | 'log' | 'escalate'
export type LoopMode = 'closed' | 'open' | 'hybrid'
export type CycleStatus = 'testing' | 'deploying' | 'active' | 'failed' | 'rolled_back'
export type AgentActionType = 'read' | 'write' | 'execute' | 'network' | 'spawn' | 'eval' | 'fs' | 'env' | 'auth' | 'unknown'
export type GraphEdgeType = 'call' | 'return' | 'data_flow' | 'control_flow'
export type ClientType = 'financial' | 'healthcare' | 'tech' | 'government' | 'other'
export type DataSensitivityLevel = 1 | 2 | 3 | 4 | 5
export type Recommendation = 'deploy' | 'refine' | 'reject'
export type ConfidenceLabel = 'low' | 'medium' | 'high'
export type ResponseStrategyAction = 'log' | 'block_agent' | 'revoke_tokens' | 'quarantine_agent' | 'lock_workspace' | 'freeze_workspace' | 'block' | 'flag_for_review' | 'forensic_capture' | 'notify' | 'alert_all' | 'notify_executives' | 'auto_recover' | 'revoke_all_tokens' | 'monitor'

export interface DefenseTask { id: string; attackType: string; positiveSamples: import('./attack-types').ActionSample[]; negativeSamples: import('./attack-types').ActionSample[]; lossFunction: (params: MetaParams, samples: import('./attack-types').ActionSample[]) => number }
export interface MetaParams { detectionThreshold: number; ensembleWeights: number[]; patternWeights?: number[]; embeddingWeights?: number[]; learningRate?: number }
export interface AgentAction { id: string; type: AgentActionType | string; target: string; timestamp: number; parentActionId?: string; metadata: Record<string, unknown> }
export interface FederatedClientConfig { clientId: string; clientType: string; dataSensitivityLevel: number; epsilon: number; localEpochs: number; batchSize: number; learningRate: number }
export interface EventBus { publish(...args: unknown[]): unknown; subscribe(...args: unknown[]): unknown }
export interface PolicyEngine { evaluate(...args: unknown[]): unknown; addRule(...args: unknown[]): unknown; updateRule(...args: unknown[]): unknown; removeRule(...args: unknown[]): unknown }
export interface GANAttackGenerator { generateAttacks(count: number): Promise<Array<Record<string, any>>>; adjustParameters(params: Record<string, unknown>): Promise<void> }

export interface AdaptedPolicy { params: MetaParams; accuracy: number; samplesUsed: number; adaptationTimeMs: number; confidence: number }
export interface MetaAdaptationMetrics { totalAdaptations: number; totalTasks: number; avgAdaptationTime: number; avgConfidence?: number; avgSamplesUsed?: number }
export interface EvasionClassifier { name: string; classify(payload: string): Promise<{ type: import('./attack-types').BypassTechnique['type']; confidence: number }> }
export interface ConstitutionalPrinciple { id: string; name: string; description: string; severity: string; verify(rule: import('./defense-types').PolicyRule): Promise<PrincipleViolation[]> }
export interface PrincipleViolation { principleId: string; ruleId: string; description: string; fixSuggestion: string }
export interface ConstitutionalCritique { violations: PrincipleViolation[]; overallScore: number; recommendation: 'approve' | 'revise' | 'reject' }
export interface ConstitutionalHealth { totalRulesCritiqued: number; averageConstitutionalScore: number; mostViolatedPrinciple: string; rulesApproved: number; rulesRevised: number }
export interface ActionVariant { variant: string; allowed: boolean; rulesMatched: string[]; editDistance: number; changeDescription: string }
export interface CounterfactualExplanation { action: string; blockedBy: import('./defense-types').PolicyRule; counterfactuals: ActionVariant[]; minimalChange: ActionVariant; narrative: string; timestamp: number; confidence?: number }
export interface DetectionMetrics { detectionRate: number; falsePositiveRate: number; falseNegativeRate: number; avgDetectionLatencyMs: number; attacksByType: Record<string, number>; ensembleAccuracy: number }
export interface AnalysisMetrics { classificationAccuracy: number; severityCalibration: number; avgSeverityScore: number; novelTechniqueRate: number; intentMatchRate: number }
export interface ResponseMetrics { avgResponseTimeMs: number; containTimeMs: number; rollbackTimeMs: number; strategiesApplied: Record<string, number>; escalationRate: number }
export interface LearningMetrics { learningRate: number; patternCoverage: number; signatureQuality: number; modelFineTuneCount: number; transferLearningEffectiveness: number }
export interface DetectionEvent { actualThreat: boolean; detected: boolean; latencyMs: number; attackType?: string; timestamp: number }
export interface AnalysisEvent { classificationCorrect: boolean; predictedSeverity: number; actualSeverity: number; isNovel: boolean; intentCorrect: boolean; timestamp: number; severityScore?: number }
export interface ResponseEvent { timestamp: number; scenarioId: string; responseResult: import('./defense-types').StrategyResult; metrics: ResponseMetrics; responseTimeMs: number; strategy?: string }
export interface AdaptationMetrics { totalCycles?: number; adaptationRate?: number; improvements?: Array<{ cycle: number; improvement: number }>; totalAdaptations: number; successfulAdaptations: number; successRate: number; averageFP: number; mostCommonAttack: string; byType: Record<string, number> }
export interface AdaptationEvent { id: string; attackType: string; ruleGenerated: string; abTestPassed: boolean; fpRate: number; baselineFPRate: number; improvement: number; timestamp: number }
export interface DefenseCycleV3Result { id: string; attack: import('./attack-types').AttackScenario; detection: { standardResult: unknown; gnnAnomaly?: AnomalyReport }; analysis: { bypassTechnique: import('./attack-types').BypassTechnique; constitutionalCritique?: ConstitutionalCritique[] }; adaptation: { rule: import('./defense-types').PolicyRule; metaAdaptation?: unknown; formalVerification: VerificationResult }; deployment: { strategy: string; abTestResult: import('./evaluation-types').ABTestResult; deployedAt: number }; feedback: { counterfactual?: CounterfactualExplanation; federatedRound?: number; atlState?: ATLState }; techniquesApplied: string[] }
export interface FrontierCycleMetrics { cycleNumber: number; detectionRate: number; fpRate: number; avgResponseTime: number; techniquesUsed: string[]; totalCycles: number; techniquesEnabled: number; byTechnique?: unknown; averageTimePerCycle?: number; deploymentRate?: number }
export interface ATLState { generatorIteration: number; discriminatorAccuracy: number; nashEquilibriumDetected: boolean; convergenceDelta: number; [key: string]: unknown }
export interface ATLMetrics { totalIterations: number; finalAccuracy: number; nashEquilibrium: boolean; convergenceIterations: number; accuracyCurve: number[] }
export interface GraphEdge { source: string; target: string; type: string; weight: number }
export interface ComputationalGraph { nodes: GraphNode[]; edges: GraphEdge[]; metadata: Record<string, unknown> }
export interface GraphNode { id: string; label?: string; actionType?: string; features: number[]; timestamp?: number; type?: string; attributes?: Record<string, unknown> }
export interface AnomalyScore { nodeId: string; score: number; features: string[]; threshold: number; globalScore?: number; perNodeScores?: Record<string, number> }
export interface AnomalyReport { detected: boolean; graphComplexity: { nodes: number; edges: number; density?: number }; attackClassification: string; confidence: number; anomalousNodes: string[] }
export interface Subgraph { nodes: GraphNode[] | string[]; edges: GraphEdge[]; score: number; anomalyScore?: number; attackType?: string }
export interface GradientUpdate { clientId: string; gradients: number[][]; metrics: Record<string, number>; roundNumber?: number; noiseAdded?: number; encryptedGradients?: boolean | number[][]; sampleCount?: number; timestamp?: number; proof?: string }
export interface GlobalModelState { roundNumber: number; parameters: number[][]; participatingClients: string[]; round?: number; convergenceMetric?: number; aggregationTimestamp?: number }
export interface FederatedMetrics { registeredClients: number; activeClients: number; avgAccuracy: number; roundCount: number; totalRounds?: number; totalGradientUpdates?: number; lastRoundClients?: number; avgPrivacyBudget?: number; convergenceMetric?: number }
export interface PrivacyAccountant { totalEpsilonBudget: number; worstCaseClient: string; averageClientLoss?: number; clientCount?: number }
export interface VerificationResult { verified: boolean; checkedProperties: PropertyResult[]; verificationTimeMs: number; model: FormalModel; counterexamples?: Counterexample[]; bmcDepth?: number }
export interface FormalState { id: string; predicates: string[] | Record<string, unknown>; label?: string }
export interface FormalTransition { from: string; to: string; condition: string }
export interface PropertyResult { property: string; satisfied: boolean; details: string; confidence?: number }
export interface FormalModel { states: FormalState[]; transitions: FormalTransition[]; invariantProperties?: unknown[] }
export interface Counterexample { id: string; description: string; trace: string[] }
export interface AuditEntry { action: string; target: string; severity: string; timestamp: number; hash: string }
export interface RuleGenerationStrategy { name: string; priority: number; generate(analysis: import('./attack-types').BypassTechnique): Promise<import('./defense-types').PolicyRule> }
export interface DetectionMethod { name: string; evaluate(payload: string, context: Record<string, unknown>): Promise<import('./defense-types').DetectionResult> }