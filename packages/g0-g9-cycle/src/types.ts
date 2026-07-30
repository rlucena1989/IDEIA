import type { RiskLevel } from '@ideia/risk-approval'
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export type StudyDepth = 'light' | 'full'
export type FeatureRiskClass = 'L' | 'M' | 'H'

export type GateId = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9'

export type GateStatus = 'pending' | 'in-progress' | 'passed' | 'failed' | 'skipped'

export interface GateResult {
  gate: GateId
  name: string
  status: GateStatus
  durationMs: number
  output?: string
  error?: string
  blocking: boolean
}

export interface CycleState {
  cycleId: string
  featureName: string
  riskClass: FeatureRiskClass
  depth: StudyDepth
  gates: Map<GateId, GateResult>
  currentGate: GateId
  startedAt: string
  completedAt?: string
  status: 'running' | 'completed' | 'failed' | 'aborted'
  studyId?: string
  specId?: string
  planId?: string
  prUrl?: string
}

export interface CycleReport {
  cycleId: string
  featureName: string
  riskClass: FeatureRiskClass
  depth: StudyDepth
  status: 'completed' | 'failed' | 'aborted'
  gates: GateResult[]
  totalDurationMs: number
  startedAt: string
  completedAt: string
  summary: string
}

export interface TriagerInput {
  featureName: string
  description: string
  touchesAuth?: boolean
  touchesPayment?: boolean
  touchesData?: boolean
  touchesMigration?: boolean
  touchesSecurity?: boolean
  isCosmetic?: boolean
  isTextChange?: boolean
  isIsolatedAdjust?: boolean
  isNewFeatureInStable?: boolean
  moduleType?: 'core' | 'stable' | 'experimental' | 'cosmetic'
  estimatedEffort?: 'small' | 'medium' | 'large'
  hasParallelFeatures?: boolean
}

export interface TriagerOutput {
  riskClass: FeatureRiskClass
  depth: StudyDepth
  rationale: string
  recommendedDepth: 'skip-gates' | 'light' | 'full'
  gatesToSkip: GateId[]
}

export interface DorIAInput {
  studyCommitted: boolean
  objectiveClear: boolean
  stakeholdersConfirmed: boolean
  acceptanceCriteriaInGherkin: boolean
  eachCriterionHasTest: boolean
  testDataAvailable: boolean
  dependenciesIdentified: boolean
  architectureCompatible: boolean
  capacityEstimated: boolean
  parallelFeaturesIdentified: boolean
  integrationPointsMapped: boolean
  noFileOverlap: boolean
}

export interface DorIAOutput {
  passed: boolean
  failures: string[]
  warnings: string[]
  score: number
}

export interface SyncGateInput {
  studyPath: string
  specPath: string
  implementationBranch: string
  codeDiffersFromStudy: boolean
  codeDiffersFromSpec: boolean
  adrsOutdated: boolean
}

export interface SyncGateOutput {
  passed: boolean
  issues: string[]
  syncRequired: boolean
  filesToUpdate: string[]
}

export interface SkillsDistillationInput {
  cycleId: string
  featureName: string
  lessons: string[]
  sessionLogs: string[]
  steeringPaths: string[]
}

export interface SkillsDistillationOutput {
  passed: boolean
  distilledSkills: string[]
  steeringUpdated: string[]
  lessonsCount: number
}

export interface G0G9Config {
  studiesRoot: string
  defaultAuthor: string
  skipG0?: boolean
  skipGates?: GateId[]
  autoApproveGates?: GateId[]
}
