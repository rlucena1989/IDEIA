export type SpecStatus = 'draft' | 'review' | 'approved' | 'implementing' | 'done'

export interface Requirement {
  id: string
  description: string
  category: 'functional' | 'non-functional' | 'architectural' | 'security'
  priority: 'critical' | 'high' | 'medium' | 'low'
  acceptanceCriteria: string[]
}

export interface DesignDoc {
  overview: string
  architecture: string
  components: ComponentSpec[]
  dataFlow: string[]
  decisions: ADRReference[]
}

export interface ComponentSpec {
  name: string
  responsibility: string
  interfaces: InterfaceSpec[]
  dependencies: string[]
}

export interface InterfaceSpec {
  name: string
  type: 'input' | 'output' | 'bidirectional'
  contract: string
}

export interface ADRReference {
  id: string
  title: string
  decision: string
  rationale: string
}

export interface Task {
  id: string
  title: string
  description: string
  dependencies: string[]
  estimatedEffort: 'small' | 'medium' | 'large'
  acceptanceCriteria: string[]
  status: 'pending' | 'in-progress' | 'done'
  assignedTo?: string
}

export interface TestCase {
  id: string
  description: string
  type: 'unit' | 'integration' | 'e2e'
  given: string
  when: string
  then: string
  expectedResult: string
}

export interface Spec {
  id: string
  title: string
  version: number
  status: SpecStatus
  requirements: Requirement[]
  design: DesignDoc
  tasks: Task[]
  acceptanceCriteria: TestCase[]
  createdAt: string
  updatedAt: string
  approvedBy?: string
  changelog: SpecChange[]
}

export interface SpecChange {
  version: number
  date: string
  author: string
  description: string
}

export type SteeringMode = 'always' | 'fileMatch' | 'manual'

export interface SteeringFile {
  path: string
  mode: SteeringMode
  fileMatch?: string[]
  content: string
  description: string
}

export type HookEvent = 'preToolUse' | 'fileSaved' | 'taskComplete' | 'specChange' | 'sessionEnd'
export type HookAction = 'askAgent' | 'runCommand' | 'validateSpec' | 'runTests'

export interface Hook {
  name: string
  description: string
  when: {
    event: HookEvent
    toolTypes?: string[]
    filePatterns?: string[]
  }
  then: {
    action: HookAction
    prompt?: string
    command?: string
    timeoutMs?: number
  }
  enabled: boolean
}

export interface SpecGenerationConfig {
  specDir: string
  templateDir?: string
  autoGenerate?: boolean
  validationLevel?: 'strict' | 'normal' | 'relaxed'
}

export interface SteeringConfig {
  spec: SpecGenerationConfig
  steering: {
    files: SteeringFile[]
    defaultMode: SteeringMode
  }
  hooks: Hook[]
}
