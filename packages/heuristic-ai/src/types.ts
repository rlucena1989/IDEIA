export interface HeuristicRule {
  id: string; name: string; condition: string; weight: number; category: string; enabled: boolean
}
export interface HeuristicScore {
  ruleId: string; score: number; confidence: number; reasoning: string
}
export interface DecisionContext {
  input: Record<string, unknown>; rules: HeuristicRule[]; weights: Record<string, number>
}
export interface DecisionResult {
  decision: string; score: number; confidence: number; topRules: HeuristicScore[]; alternatives: string[]
}
export interface HeuristicOptimization {
  ruleId: string; beforeWeight: number; afterWeight: number; performanceGain: number
}
