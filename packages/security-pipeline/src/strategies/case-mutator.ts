import type { AttackScenario, MutationStrategy } from '../types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('case-mutator');

export class CaseMutator implements MutationStrategy {
  name = 'case'

  private casePatterns: Array<(s: string) => string> = [
    (s: string) => s.split(' ').map(w => w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(' '),
    (s: string) => s.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(''),
    (s: string) => s.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join(''),
    (s: string) => s.toLowerCase(),
    (s: string) => s.toUpperCase(),
    (s: string) => {
      const words = s.split(' ')
      return words.map((w, i) => i === 0 ? w[0]?.toUpperCase() + w.slice(1) : w).join(' ')
    },
    (s: string) => {
      const words = s.split(' ')
      return words.map(w => {
        if (w.length <= 1) return w
        const keepUpper = ['I', 'A']
        if (keepUpper.includes(w)) return w
        return w[0].toUpperCase() + w.slice(1).toLowerCase()
      }).join(' ')
    },
    (s: string) => {
      const important = ['IGNORE', 'ALL', 'SYSTEM', 'ADMIN', 'OVERRIDE', 'EXECUTE', 'DELETE']
      let result = s.toLowerCase()
      for (const word of important) {
        result = result.replace(new RegExp(word.toLowerCase(), 'g'), word)
      }
      return result
    },
  ]

  async mutate(scenario: AttackScenario, _intensity = 0.5): Promise<AttackScenario> {
    const pattern = this.casePatterns[Math.floor(Math.random() * this.casePatterns.length)]
    const payload = pattern(scenario.payload)

    return {
      ...scenario,
      payload,
      tags: [...scenario.tags, 'mutated:case'],
      metadata: { ...scenario.metadata, mutationStrategy: 'case' },
    }
  }
}
