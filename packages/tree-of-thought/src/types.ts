export type SearchStrategy = 'bfs' | 'dfs' | 'mcts' | 'beam' | 'top-down' | 'bottom-up' | 'lateral-thinking' | 'first-principles' | 'diagnostic' | 'compositional'
export type ThoughtStatus = 'active' | 'evaluated' | 'pruned' | 'selected'

export const ThoughtState = {
  ACTIVE: 'active' as ThoughtStatus,
  EVALUATED: 'evaluated' as ThoughtStatus,
  PRUNED: 'pruned' as ThoughtStatus,
  SELECTED: 'selected' as ThoughtStatus,
  GENERATED: 'active' as ThoughtStatus,
}

export type ThoughtStateType = typeof ThoughtState[keyof typeof ThoughtState]

export type ThoughtStrategy = SearchStrategy

export interface Goal {
  description: string
  criteria?: string[]
  constraints?: string[]
  successThreshold?: number
  id?: string
  type?: string
  complexity?: number
  urgency?: number
  risk?: number
  domain?: string
  context?: Record<string, unknown>
}

export interface FreeEnergyComponents {
  expectedFreeEnergy?: number
  epistemicValue?: number
  pragmaticValue?: number
  complexity?: number
  epistemic: number
  pragmatic: number
  total: number
  ambiguity?: number
  risk?: number
}

export interface SearchConfig {
  maxDepth: number
  branchingFactor: number
  timeout: number
  strategy: SearchStrategy
  beamWidth?: number
  pruningThreshold?: number
  ensembleThreshold?: number
}

export interface CausalScore {
  nodeId?: string
  causalStrength?: number
  confidence?: number
  interventionEffects?: Record<string, number>
  influence?: number
  sourceId?: string
  targetId?: string
  isCausal?: boolean
  interventionEffect?: number
}

export interface ThoughtGraph {
  nodes: ThoughtNode[]
  edges: ThoughtEdge[]
}

export interface ThoughtEdge {
  source: string
  target: string
  type: string
  weight: number
}

export interface Thought {
  id: string
  content: string
  state?: ThoughtStatus
  parentId?: string | null
  children: string[]
  depth: number
  value?: number
  confidence?: number
  createdAt?: string
  metadata?: Record<string, unknown>
  visits?: number
  status?: string
  causalScore?: number
  mergedFrom?: string[]
  isRoot?: boolean
  diffusionSeed?: number
  diffusionConfidence?: number
  repairedFrom?: string
  repairCount?: number
}

export interface GoTConfig {
  maxBranches: number
  maxDepth: number
  aggregationStrategy: 'sum' | 'max' | 'mean'
  convergenceThreshold: number
}

export const DEFAULT_GOT_CONFIG: GoTConfig = {
  maxBranches: 5,
  maxDepth: 10,
  aggregationStrategy: 'sum',
  convergenceThreshold: 0.05,
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  maxDepth: 10,
  branchingFactor: 3,
  timeout: 60000,
  strategy: 'bfs',
}

export interface ThoughtNode {
  id: string
  content: string
  parentId: string | null
  children: string[]
  depth: number
  value: number
  visits: number
  status: ThoughtStatus
  createdAt: string
  isRoot?: boolean
}

export interface ThoughtTree {
  rootId: string
  nodes: Map<string, ThoughtNode>
  strategy: SearchStrategy
  maxDepth: number
  branchingFactor: number
}

export interface PlannedStep {
  id: string
  description: string
  status: string
  dependencies: string[]
  effort: number
}

export interface EvaluationResult {
  nodeId: string
  score: number
  confidence: number
  reasoning: string
  isPromising: boolean
}

export interface SearchResult {
  bestPath: string[]
  bestValue: number
  nodesExplored: number
  totalEvaluations: number
  durationMs: number
}

export interface EvaluationScore {
  score?: number
  confidence?: number
  reasoning?: string
  total?: number
  coverage?: number
  granularity?: number
  acyclicity?: number
  cost?: number
}

export interface BenchmarkResult {
  strategy?: SearchStrategy
  avgTime?: number
  avgScore?: number
  nodesExplored?: number
  successRate?: number
  technique?: string
  passAt1?: number
  passAt5?: number
  branchesExplored?: number
  timeToSolution?: number
  tokensConsumed?: number
  costRelative?: number
}

export interface Constraint {
  type: string
  description: string
  severity: 'hard' | 'soft'
  id?: string
  smtExpression?: string
  domain?: string
}

export interface Violation {
  constraint?: string
  message?: string
  severity: 'error' | 'warning'
  constraintId?: string
  constraintType?: string
  suggestedFix?: string
  location?: { startOffset: number; endOffset: number }
}

export interface ValidationResult {
  valid?: boolean
  violations: Violation[]
  confidence?: number
  isValid?: boolean
  stats?: {
    totalConstraints: number
    passed: number
    failed: number
    warnings: number
  }
}

export interface ThoughtDistribution {
  thoughts?: Thought[]
  entropy?: number
  timestamp?: string
  mean: number[]
  variance?: number[]
  temperature?: number
  step?: number
}

export interface ValueNetworkInput {
  thought?: string
  context?: string[]
  constraints?: string[]
  thoughtEmbedding?: number[]
  goalEmbedding?: number[]
  depthNormalized?: number
  branchPosition?: number
  parentValue?: number
}