import { createLogger } from '@ideia/logger'
import {
  TriagerInput, TriagerOutput, FeatureRiskClass, StudyDepth, GateId,
} from './types'

const logger = createLogger('g0-g9-cycle:triager')

export class Triager {
  classify(input: TriagerInput): TriagerOutput {
    const riskClass = this.determineRisk(input)
    const depth = this.determineDepth(riskClass, input)
    const gatesToSkip = this.determineSkipGates(riskClass, input)
    const rationale = this.buildRationale(riskClass, depth, input)

    return {
      riskClass,
      depth,
      rationale,
      recommendedDepth: riskClass === 'L' ? (input.isCosmetic ? 'skip-gates' : 'light') : 'full',
      gatesToSkip,
    }
  }

  private determineRisk(input: TriagerInput): FeatureRiskClass {
    if (
      input.touchesAuth ||
      input.touchesPayment ||
      input.touchesSecurity ||
      input.touchesMigration
    ) return 'H'

    if (
      input.touchesData ||
      input.isNewFeatureInStable ||
      input.moduleType === 'core'
    ) return 'M'

    if (
      input.isCosmetic ||
      input.isTextChange ||
      input.moduleType === 'cosmetic'
    ) return 'L'
    if (input.isIsolatedAdjust) return 'L'

    if (input.estimatedEffort === 'large') return 'M'

    return 'L'
  }

  private determineDepth(risk: FeatureRiskClass, _input: TriagerInput): StudyDepth {
    switch (risk) {
      case 'H': return 'full'
      case 'M': return 'full'
      case 'L': return 'light'
    }
  }

  private determineSkipGates(risk: FeatureRiskClass, input: TriagerInput): GateId[] {
    const skip: GateId[] = []
    if (risk === 'L') {
      skip.push('G4', 'G9')
      if (input.isCosmetic || input.isTextChange) {
        skip.push('G1', 'G2', 'G3', 'G5')
      }
    }
    if (risk === 'M' && !input.isNewFeatureInStable) {
      skip.push('G4')
    }
    return skip
  }

  private buildRationale(risk: FeatureRiskClass, depth: StudyDepth, input: TriagerInput): string {
    const reasons: string[] = []
    if (input.touchesAuth) reasons.push('autenticação/authorização (segurança)')
    if (input.touchesPayment) reasons.push('pagamento (financeiro)')
    if (input.touchesSecurity) reasons.push('segurança')
    if (input.touchesMigration) reasons.push('migração de dados')
    if (input.touchesData) reasons.push('manipulação de dados sensíveis')
    if (input.isNewFeatureInStable) reasons.push('feature nova em módulo estável')
    if (input.isCosmetic) reasons.push('ajuste cosmético')
    if (input.isTextChange) reasons.push('alteração de texto')
    if (input.isIsolatedAdjust) reasons.push('ajuste isolado reversível')

    const reasonStr = reasons.length > 0 ? `Fatores: ${reasons.join(', ')}.` : 'Sem fatores de risco específicos.'
    return `Risco ${risk} → profundidade ${depth}. ${reasonStr}`
  }
}
