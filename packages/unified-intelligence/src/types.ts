export type ReasoningMode = 'symbolic' | 'connectionist' | 'probabilistic' | 'hybrid'
export interface ReasoningInput { query: string; context: Record<string, unknown>; mode: ReasoningMode }
export interface ReasoningOutput { answer: string; confidence: number; mode: ReasoningMode; steps: string[]; durationMs: number }
export interface KnowledgeTriple { subject: string; predicate: string; object: string; confidence: number }
export interface InferenceRule { id: string; premise: string; conclusion: string; strength: number }
export interface UnifiedModel { name: string; modes: ReasoningMode[]; accuracy: number; latency: number }
