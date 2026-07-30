export type AgentRole = 'intent' | 'plan' | 'code' | 'test' | 'doc' | 'sec' | 'deploy'
export type ConsensusLevel = 'approval' | 'majority' | 'unanimous'
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface IAgent {
  role: AgentRole
  execute(input: AgentInput): Promise<AgentOutput>
  getCapabilities(): string[]
}

export interface AgentInput {
  taskId: string
  context: string
  data: unknown
  constraints?: string[]
}

export interface AgentOutput {
  taskId: string
  role: AgentRole
  result: unknown
  confidence: number
  issues: string[]
  durationMs: number
}

export interface IntentInput {
  rawText: string
  projectContext?: string
}

export interface IntentOutput {
  intent: string
  objectives: string[]
  scope: string[]
  constraints: string[]
  entities: string[]
  ambiguities: Ambiguity[]
  risk: RiskLevel
}

export interface Ambiguity {
  type: string
  description: string
  question: string
}

export interface PlanInput {
  intent: IntentOutput
  availableAgents: string[]
  constraints: string[]
}

export interface PlanOutput {
  steps: PlanStep[]
  estimatedDuration: number
  criticalPath: string[]
  risks: string[]
}

export interface PlanStep {
  id: string
  agent: AgentRole
  action: string
  dependsOn: string[]
  estimatedTokens: number
  timeout: number
}

export interface CodeInput {
  specification: string
  language: string
  constraints: string[]
  testFiles?: string[]
}

export interface CodeOutput {
  files: CodeFile[]
  quality: CodeQuality
  suggestions: string[]
}

export interface CodeFile {
  path: string
  content: string
  language: string
}

export interface CodeQuality {
  score: number
  issues: string[]
  coverage?: number
}

export interface TestInput {
  codeFiles: CodeFile[]
  testFramework: string
  coverageTarget: number
}

export interface TestOutput {
  testFiles: CodeFile[]
  testResults: TestResult[]
  coverage: number
}

export interface TestResult {
  suite: string
  passed: boolean
  total: number
  failed: number
  durationMs: number
}

export interface ContractDefinition {
  id: string
  fromRole: AgentRole
  toRole: AgentRole
  inputType: string
  outputType: string
  validation: string
  timeout: number
}

export interface ConsensusResult {
  accepted: boolean
  votes: ConsensusVote[]
  objections: string[]
  resolution?: string
}

export interface ConsensusVote {
  agentRole: AgentRole
  approved: boolean
  reason?: string
}

export interface OrchestrationContext {
  taskId: string
  currentStep: number
  totalSteps: number
  outputs: Map<string, AgentOutput>
  status: TaskStatus
  errors: string[]
}
