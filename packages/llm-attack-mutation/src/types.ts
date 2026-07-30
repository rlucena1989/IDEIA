export type AttackCategory = 'jailbreak' | 'injection' | 'extraction' | 'manipulation' | 'evasion'
export type MutationStrategy = 'substitution' | 'insertion' | 'deletion' | 'reordering' | 'encoding' | 'translation'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface AttackPrompt {
  id: string
  content: string
  category: AttackCategory
  riskLevel: RiskLevel
  targetModel: string
}

export interface MutationResult {
  originalId: string
  variant: string
  strategy: MutationStrategy
  score: number
  bypassesDefenses: boolean
  tokensAdded: number
}

export interface AttackVariant {
  id: string
  parentId: string
  content: string
  strategy: MutationStrategy
  generation: number
  fitness: number
}

export interface RedTeamingReport {
  timestamp: string
  targetModel: string
  totalAttempts: number
  successfulBypasses: number
  bypassRate: number
  vulnerabilities: VulnerabilityFinding[]
  recommendations: string[]
}

export interface VulnerabilityFinding {
  category: AttackCategory
  prompt: string
  severity: RiskLevel
  description: string
  mitigation: string
}

export interface DefenseMechanism {
  name: string
  description: string
  effectiveness: number
  falsePositiveRate: number
}
