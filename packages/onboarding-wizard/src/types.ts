export type WizardMode = 'quick' | 'expert'

export type ProfileType = 'solo-dev' | 'tech-lead' | 'automator' | 'enterprise' | 'custom'

export type AutonomyLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4'

export interface ProfileOption {
  id: ProfileType
  label: string
  description: string
  icon: string
  tooltip: string
  recommendedFor: string
}

export interface WizardStep {
  id: string
  title: string
  description: string
  required: boolean
  expertOnly: boolean
  fields: WizardField[]
}

export interface WizardField {
  id: string
  label: string
  type: 'text' | 'select' | 'multiselect' | 'toggle' | 'number' | 'slider'
  required: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  defaultValue?: string | number | boolean | string[]
}

export interface WizardAnswer {
  stepId: string
  answers: Record<string, string | number | boolean | string[]>
}

export interface WizardState {
  mode: WizardMode
  currentStep: number
  profile: ProfileType | null
  autonomyLevel: AutonomyLevel | null
  answers: Map<string, Record<string, string | number | boolean | string[]>>
  started: boolean
  completed: boolean
  startedAt: number
  completedAt: number | null
}

export interface WizardSummary {
  profile: ProfileType
  profileLabel: string
  autonomyLevel: AutonomyLevel
  totalSteps: number
  completedSteps: number
  mode: WizardMode
  config: Record<string, unknown>
  duration: number
}

export const PROFILES: ProfileOption[] = [
  {
    id: 'solo-dev',
    label: 'Solo Dev',
    description: 'Individual developer working on personal projects',
    icon: '👤',
    tooltip: 'Best for freelancers and solo founders. Quick setup with minimal config.',
    recommendedFor: 'Personal projects and small teams of 1-2'
  },
  {
    id: 'tech-lead',
    label: 'Tech Lead',
    description: 'Technical lead managing a team and codebase',
    icon: '👑',
    tooltip: 'Includes code review, team metrics, and governance features.',
    recommendedFor: 'Teams of 3-15 developers'
  },
  {
    id: 'automator',
    label: 'Automator',
    description: 'CI/CD and workflow automation specialist',
    icon: '⚡',
    tooltip: 'Focus on pipelines, automation rules, and integration hooks.',
    recommendedFor: 'DevOps and platform engineering'
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    description: 'Organization-wide deployment with compliance',
    icon: '🏢',
    tooltip: 'Full security, audit, SSO, and compliance controls enabled.',
    recommendedFor: 'Organizations with 50+ developers'
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Full manual configuration from scratch',
    icon: '🔧',
    tooltip: 'All options available. Best for experienced users with specific needs.',
    recommendedFor: 'Users who want full control'
  }
]

export const AUTONOMY_OPTIONS: { value: AutonomyLevel; label: string; description: string }[] = [
  { value: 'N1', label: 'Supervisionado', description: 'IA sugere, humano aprova' },
  { value: 'N2', label: 'Semi-autônomo', description: 'IA executa com supervisão seletiva' },
  { value: 'N3', label: 'Autônomo', description: 'IA executa e reporta' },
  { value: 'N4', label: 'Total', description: 'IA age independentemente' }
]
