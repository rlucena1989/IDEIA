import type { AttackScenario, MutationStrategy } from '../types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('encoding-mutator');

export class EncodingMutator implements MutationStrategy {
  name = 'encoding'

  private encodings: Array<(s: string) => string> = [
    (s: string) => Buffer.from(s).toString('base64'),
    (s: string) => [...s].map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    (s: string) => [...s].map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(''),
    (s: string) => s.normalize('NFKD'),
    (s: string) => [...s].map(c => '&#' + c.charCodeAt(0) + ';').join(''),
    (s: string) => [...s].map(c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(''),
    (s: string) => [...s].map(c => c.charCodeAt(0) > 127 ? '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0') : c).join(''),
    (s: string) => {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(s)
      return Array.from(bytes).map(b => '\\x' + b.toString(16).padStart(2, '0')).join('')
    },
  ]

  async mutate(scenario: AttackScenario, _intensity = 0.5): Promise<AttackScenario> {
    const encoding = this.encodings[Math.floor(Math.random() * this.encodings.length)]
    const payload = `[DECODE:encoding] ${encoding(scenario.payload)}`

    return {
      ...scenario,
      payload,
      tags: [...scenario.tags, 'mutated:encoding'],
      metadata: { ...scenario.metadata, mutationStrategy: 'encoding', encodingType: encoding.name },
    }
  }
}
