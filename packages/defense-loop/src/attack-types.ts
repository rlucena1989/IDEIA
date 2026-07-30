import { Severity } from './types'

export type AttackType = 'prompt_injection' | 'jailbreak' | 'encoding_evasion' | 'context_manipulation' | 'splitting_evasion' | 'data_exfiltration' | 'novel'
export type AttackSource = 'red_team' | 'anomaly_detector' | 'incident_response' | 'manual'

export type AttackClassification = 'prompt_injection' | 'jailbreak' | 'data_exfiltration' | 'adversarial_input' | 'encoding_evasion' | 'context_manipulation' | 'role_play_attack' | 'token_manipulation' | 'novel'
export type AttackClassificationLabel = 'confirmed' | 'suspicious' | 'normal'
export type IntentType = 'direct_attack' | 'social_engineering' | 'reconnaissance' | 'data_exfiltration' | 'legitimate'

export interface AttackScenario {
  id: string
  type: AttackType
  payload: string
  target: string
  timestamp: number
  source: AttackSource
}

export interface BypassTechnique {
  id: string
  type: 'encoding_evasion' | 'semantic_evasion' | 'contextual_evasion' | 'splitting_evasion' | 'novel_technique'
  pattern?: string
  embedding?: number[]
  severity: Severity
  recommendation: string
  confidence: number
  bypassVector: string[]
}

export interface ActionSample {
  id: string
  action: string
  malicious: boolean
  payload: string
}
