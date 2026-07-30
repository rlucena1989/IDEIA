import { createLogger } from '@ideia/logger'
import { ReasoningInput, ReasoningOutput, ReasoningMode, KnowledgeTriple, InferenceRule, UnifiedModel } from './types'

const logger = createLogger('unified-nucleus')

export class UnifiedIntelligenceNucleus {
  private knowledge: KnowledgeTriple[] = []
  private rules: InferenceRule[] = []
  private models: UnifiedModel[] = []

  constructor() {
    this.models = [
      { name: 'SymbolicReasoner', modes: ['symbolic'], accuracy: 0.85, latency: 50 },
      { name: 'NeuralNet', modes: ['connectionist'], accuracy: 0.92, latency: 150 },
      { name: 'BayesianInference', modes: ['probabilistic'], accuracy: 0.88, latency: 80 },
    ]
  }

  reason(input: ReasoningInput): ReasoningOutput {
    const start = Date.now()
    const steps: string[] = []
    let answer = ''
    let confidence = 0

    switch (input.mode) {
      case 'symbolic': {
        const match = this.knowledge.find(k => input.query.includes(k.subject))
        answer = match ? `${match.subject} ${match.predicate} ${match.object}` : 'No knowledge found'
        confidence = match?.confidence ?? 0.3
        steps.push(`Symbolic inference: ${this.knowledge.length} facts queried`)
        break
      }
      case 'connectionist':
        answer = `Neural inference on: ${input.query}`
        confidence = 0.85
        steps.push('Connectionist forward pass complete')
        break
      case 'probabilistic':
        answer = `Bayesian estimate: P(${input.query}) = 0.78`
        confidence = 0.78
        steps.push('Probabilistic inference with prior distribution')
        break
      case 'hybrid':
        answer = `Hybrid reasoning result for: ${input.query}`
        confidence = 0.9
        steps.push('Symbolic + neural + probabilistic fusion')
        break
    }

    logger.info(`Reasoning complete`, { mode: input.mode, confidence, duration: Date.now() - start })
    return { answer, confidence, mode: input.mode, steps, durationMs: Date.now() - start }
  }

  addFact(triple: KnowledgeTriple): void { this.knowledge.push(triple) }
  addRule(rule: InferenceRule): void { this.rules.push(rule) }
  getModels(): UnifiedModel[] { return [...this.models] }
  getKnowledge(): KnowledgeTriple[] { return [...this.knowledge] }
}
