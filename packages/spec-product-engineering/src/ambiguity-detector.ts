import { createLogger } from '@ideia/logger'
import { AmbiguityPattern, AmbiguityResult } from './types'

const logger = createLogger('ambiguity-detector')

const DEFAULT_PATTERNS: AmbiguityPattern[] = [
  { type: 'scope', pattern: /sistema|plataforma|aplicativo/i, question: 'Qual escopo: sistema web, mobile, desktop ou API?' },
  { type: 'user', pattern: /usuário|usuario|pessoa|cliente|Cliente|Usuario/i, question: 'Quem sao os usuarios finais (perfil, papel, quantidade)?' },
  { type: 'metric', pattern: /rápido|rapido|melhor|otimizado|eficiente|performance/i, question: 'Qual metrica define sucesso? (tempo, custo, qualidade?)' },
  { type: 'stack', pattern: /stack|tecnologia|linguagem|framework/i, question: 'Ha preferencia de stack tecnologica?' },
  { type: 'timeline', pattern: /prazo|urgente|ontem|ASAP|quanto antes|logo/i, question: 'Qual o prazo esperado e marcos intermediarios?' },
  { type: 'budget', pattern: /orçamento|orcamento|custo|investimento|gratuito|free/i, question: 'Qual a faixa de orcamento disponivel?' },
  { type: 'integration', pattern: /integrar|conectar|comunicar|api externa/i, question: 'Quais sistemas externos precisam ser integrados?' },
  { type: 'security', pattern: /seguro|protegido|privacidade|lgpd|gdpr/i, question: 'Ha requisitos especificos de seguranca ou compliance?' },
]

export class AmbiguityDetector {
  private patterns: AmbiguityPattern[]

  constructor(patterns?: AmbiguityPattern[]) {
    this.patterns = patterns ?? DEFAULT_PATTERNS
  }

  detect(text: string): AmbiguityResult[] {
    const results: AmbiguityResult[] = []
    for (const p of this.patterns) {
      const match = text.match(p.pattern)
      if (match) {
        results.push({
          type: p.type,
          match: match[0],
          question: p.question,
          resolved: false,
        })
      }
    }
    logger.info(`Ambiguity detection complete`, { found: results.length })
    return results
  }

  resolve(result: AmbiguityResult, answer: string): AmbiguityResult {
    return { ...result, answer, resolved: true }
  }

  addPattern(pattern: AmbiguityPattern): void {
    this.patterns.push(pattern)
  }
}
