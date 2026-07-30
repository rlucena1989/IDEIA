export type SubagentRole = 'scout' | 'guard' | 'orchestrator' | 'build' | 'check'

export interface SubagentRoleConfig {
  role: SubagentRole
  modelTier: 'cheap' | 'medium' | 'expensive'
  temperature: number
  description: string
  responsibilities: string[]
}

export const ROLE_CONFIGS: Record<SubagentRole, SubagentRoleConfig> = {
  scout: {
    role: 'scout',
    modelTier: 'cheap',
    temperature: 0.7,
    description: 'Explores codebase, indexes, call graphs, and gathers context',
    responsibilities: [
      'Read and index source files',
      'Build dependency graphs',
      'Find relevant code sections',
      'Report code structure overview',
    ],
  },
  guard: {
    role: 'guard',
    modelTier: 'cheap',
    temperature: 0.2,
    description: 'Adversarially stress-tests proposals before planning',
    responsibilities: [
      'Identify edge cases and failure modes',
      'Stress-test proposed solutions',
      'Check security implications',
      'Validate assumptions',
    ],
  },
  orchestrator: {
    role: 'orchestrator',
    modelTier: 'expensive',
    temperature: 0.5,
    description: 'Synthesizes plans from scout + guard output',
    responsibilities: [
      'Synthesize findings into actionable plan',
      'Assign tasks to sub-agents',
      'Track progress across phases',
      'Resolve conflicts',
    ],
  },
  build: {
    role: 'build',
    modelTier: 'medium',
    temperature: 0.3,
    description: 'Implements code following the architecture plan',
    responsibilities: [
      'Write implementation code',
      'Follow coding standards',
      'Create necessary files',
      'Self-review before submission',
    ],
  },
  check: {
    role: 'check',
    modelTier: 'cheap',
    temperature: 0.1,
    description: 'Validates implementation against spec with independent review',
    responsibilities: [
      'Verify against spec and acceptance criteria',
      'Run quality checks',
      'Report violations',
      'Loop back to build if failed',
    ],
  },
}

export interface SubagentPipelineConfig {
  roles: SubagentRole[]
  modelAssignments: Partial<Record<SubagentRole, string>>
  maxScoutIterations: number
  maxBuildCheckLoops: number
  requireGuard: boolean
}

export const DEFAULT_PIPELINE_CONFIG: SubagentPipelineConfig = {
  roles: ['scout', 'guard', 'orchestrator', 'build', 'check'],
  modelAssignments: {
    scout: 'haiku',
    guard: 'haiku',
    orchestrator: 'sonnet',
    build: 'sonnet',
    check: 'haiku',
  },
  maxScoutIterations: 3,
  maxBuildCheckLoops: 3,
  requireGuard: true,
}
