export type AmbiguityType = 'scope' | 'user' | 'metric' | 'stack' | 'timeline' | 'budget' | 'integration' | 'security'
export type Stage = 'analysis' | 'clarification' | 'generation' | 'validation' | 'compilation' | 'codegen' | 'verification'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type VerifyMethod = 'test' | 'inspection' | 'analysis' | 'demo'

export interface AmbiguityPattern {
  type: AmbiguityType
  pattern: RegExp
  question: string
}

export interface AmbiguityResult {
  type: AmbiguityType
  match: string
  question: string
  resolved: boolean
  answer?: string
}

export interface Specification {
  id: string
  title: string
  overview: string
  objectives: string[]
  scope: ScopeDefinition
  userProfiles: UserProfile[]
  functionalRequirements: Requirement[]
  nonFunctionalRequirements: Requirement[]
  useCases: UseCase[]
  acceptanceCriteria: Criterion[]
  suggestedArchitecture: Record<string, string>
  createdAt: string
  version: string
}

export interface ScopeDefinition {
  inScope: string[]
  outOfScope: string[]
  constraints: string[]
}

export interface UserProfile {
  name: string
  role: string
  description: string
  permissions?: string[]
}

export interface Requirement {
  id: string
  type: 'functional' | 'non-functional'
  description: string
  priority: 'essential' | 'important' | 'nice-to-have'
  riskLevel?: RiskLevel
  dependencies?: string[]
}

export interface UseCase {
  id: string
  name: string
  actor: string
  precondition: string
  steps: string[]
  postcondition?: string
}

export interface Criterion {
  id: string
  description: string
  type: 'functional' | 'performance' | 'security' | 'usability'
  verify: VerifyMethod
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  section: string
  message: string
  line?: number
}

export interface Token {
  type: string
  value: string
  position: number
}

export interface ASTNode {
  type: string
  position?: number
}

export interface SpecAST extends ASTNode {
  type: 'Spec'
  meta: MetaNode
  body: BodyNode
}

export interface MetaNode extends ASTNode {
  type: 'Meta'
  title: string
  version: string
  author?: string
}

export interface BodyNode extends ASTNode {
  type: 'Body'
  requirements: RequirementListNode
  useCases: UseCaseListNode
  criteria: AcceptanceListNode
  architecture: ArchitectureNode
}

export interface RequirementListNode extends ASTNode { type: 'RequirementList'; items: RequirementNode[] }
export interface RequirementNode extends ASTNode { type: 'Requirement'; reqType: string; id: string; description: string; props: Record<string, unknown> }
export interface UseCaseListNode extends ASTNode { type: 'UseCaseList'; items: UseCaseNode[] }
export interface UseCaseNode extends ASTNode { type: 'UseCase'; id: string; name: string; actor: string; precondition: string; steps: string[] }
export interface AcceptanceListNode extends ASTNode { type: 'AcceptanceList'; items: CriterionNode[] }
export interface CriterionNode extends ASTNode { type: 'Criterion'; id: string; description: string; critType: string; verify: string }
export interface ArchitectureNode extends ASTNode { type: 'Architecture'; entries: Record<string, string> }

export interface CompiledOutput {
  spec: Specification
  ast: SpecAST
  tokens: Token[]
  warnings: string[]
}

export interface DependencyEdge {
  from: string
  to: string
  type: 'depends' | 'conflicts' | 'refines' | 'traces'
}

export interface ImpactReport {
  requirementId: string
  affected: string[]
  severity: RiskLevel
  suggestedAction: string
}

export interface CycleReport {
  hasCycle: boolean
  cycle?: string[]
}

export interface ConflictReport {
  hasConflict: boolean
  conflicts: Array<{ a: string; b: string; reason: string; severity: RiskLevel }>
}

export interface TraceLink {
  sourceId: string
  targetId: string
  sourceType: 'requirement' | 'usecase' | 'criterion' | 'test' | 'code'
  targetType: 'requirement' | 'usecase' | 'criterion' | 'test' | 'code'
  linkType: 'covers' | 'validates' | 'implements' | 'depends'
  strength: number
}

export interface TraceabilityMatrix {
  requirements: string[]
  tests: string[]
  coverage: Array<{ requirementId: string; testIds: string[]; covered: boolean; coveragePercent: number }>
  totalCoverage: number
}

export interface CoverageReport {
  totalRequirements: number
  covered: number
  uncovered: string[]
  coveragePercent: number
  byType: Record<string, number>
}

export interface ChangeImpact {
  requirementId: string
  affectedRequirements: string[]
  affectedUseCases: string[]
  affectedTests: string[]
  affectedCode: string[]
  severity: RiskLevel
  estimatedEffort: 'small' | 'medium' | 'large'
}

export interface PipelineContext {
  spec: Specification
  tokens: Token[]
  ast: SpecAST
  validationIssues: ValidationIssue[]
}

export interface PipelineMetrics {
  totalDurationMs: number
  stageDurations: Record<Stage, number>
  ambiguityCount: number
  validationErrors: number
  compilationWarnings: number
}

export interface PipelineResult {
  success: boolean
  spec: Specification
  compiled: CompiledOutput
  metrics: PipelineMetrics
  issues: ValidationIssue[]
}

export interface ScaffoldOptions {
  outputDir: string
  language: 'typescript' | 'python' | 'rust'
  includeTests: boolean
  includeDocs: boolean
}

export interface ScaffoldFile {
  path: string
  content: string
  language: string
}

export interface VerificationResult {
  passed: boolean
  checks: Array<{ name: string; passed: boolean; message: string }>
}

export interface SpecMetrics {
  totalRequirements: number
  totalUseCases: number
  totalCriteria: number
  ambiguityScore: number
  coveragePercent: number
  complexityScore: number
}

export interface QualityReport {
  valid: boolean
  errors: string[]
  artifactCount: Record<string, number>
}

export interface ComplexityReport {
  totalRequirements: number
  totalUseCases: number
  totalCriteria: number
  avgStepsPerUseCase: number
  avgDependenciesPerReq: number
  specWeight: number
  estimatedDevHours: number
}
