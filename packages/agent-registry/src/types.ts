export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline'

export interface AgentMetrics {
  tasksCompleted: number
  avgLatency: number
  successRate: number
  tokensConsumed: number
}

export interface ExecutionMetrics {
  executionTime: number
  tokensUsed: number
  confidence: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface AgentContract {
  agentId: string
  version: string
  capabilities: string[]
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  performanceSLO: {
    maxLatency: number
    maxTokens: number
    minSuccessRate: number
  }
  dependencies: string[]
}

export interface AgentResult<TOutput = unknown> {
  status: 'success' | 'failure'
  output: TOutput
  metrics: ExecutionMetrics
}

export interface IAgent<TOutput = unknown> {
  readonly id: string
  readonly contract: AgentContract
  readonly status: AgentStatus
  execute(input: unknown): Promise<AgentResult<TOutput>>
  validate(input: unknown): ValidationResult
  cancel(): Promise<void>
  getMetrics(): Promise<AgentMetrics>
}

export interface Orchestrator {
  selectAgent(task: Task): IAgent
  executePipeline(plan: Plan): Promise<ExecutionResult>
  replan(step: Step, state: ExecutionState): Promise<Step | null>
  getAgentStatus(): Promise<Map<string, AgentStatus>>
}

export interface Task {
  id: string
  description: string
  requiredCapability: string
  priority: number
  input: unknown
}

export interface Step {
  id: string
  agentId: string
  input: unknown
  retryCount: number
  maxRetries: number
  lastError?: string
}

export interface Plan {
  steps: Step[]
}

export interface ExecutionState {
  current: number
  history: ExecutionHistoryEntry[]
}

export interface ExecutionHistoryEntry {
  agent: string
  step: string
  result: AgentResult
  timestamp: number
}

export interface ExecutionResult {
  status: 'success' | 'failure' | 'needs-human'
  state: ExecutionState
  error?: string
}

export interface AgentHandoff {
  fromAgent: string
  toAgent: string
  task: Task
  state: ExecutionState
  decisions: Decision[]
  artifacts: Artifact[]
  risks: Risk[]
  context: ContextBundle
}

export interface Decision {
  id: string
  agent: string
  description: string
  timestamp: number
  rationale: string
}

export interface Artifact {
  id: string
  name: string
  type: string
  content: unknown
}

export interface Risk {
  id: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  mitigation?: string
}

export interface ContextBundle {
  project: string
  sessionId: string
  metadata: Record<string, unknown>
}
