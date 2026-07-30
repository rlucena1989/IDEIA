export type BiasType = 'gender' | 'racial' | 'socioeconomic' | 'locale' | 'accessibility' | 'assumption' | 'framework'

export type HarmCategory = 'violence' | 'hate_speech' | 'sexual' | 'self_harm' | 'harassment' | 'malicious_code'

export type SafetySeverity = 'info' | 'warning' | 'error' | 'critical'

export type AlignmentPrinciple = 'safety_first' | 'user_consent' | 'transparency' | 'privacy' | 'auditability' | 'conservatism' | 'honesty'

export interface SafetyVerdict {
  passed: boolean
  score: number
  reason: string
  severity: SafetySeverity
}

export interface BiasRule {
  id: string
  type: BiasType
  pattern: RegExp
  message: string
  severity: 'info' | 'warning' | 'error'
  suggestion: string
}

export interface BiasDetectionResult {
  detected: boolean
  biases: Array<{ type: BiasType; match: string; line: number; severity: 'info' | 'warning' | 'error'; suggestion: string }>
  score: number
}

export interface HarmClassification {
  category: HarmCategory
  score: number
  evidence: string[]
}

export interface ConstitutionPrinciple {
  id: string
  name: string
  description: string
  rules: string[]
}

export interface ConstitutionVerdict {
  principle: AlignmentPrinciple
  passed: boolean
  reason: string
  riskLevel: 'low' | 'medium' | 'high'
  suggestion?: string
}

export interface RepresentationVector {
  concept: string
  values: Float64Array
  dimensionality: number
}

export interface DebateRound {
  round: number
  proponent: string
  opponent: string
  proArgument: string
  conArgument: string
  proScore: number
  conScore: number
  verdict: string | null
}
