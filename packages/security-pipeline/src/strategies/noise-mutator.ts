import type { AttackScenario, MutationStrategy } from '../types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('noise-mutator');

export class NoiseMutator implements MutationStrategy {
  name = 'noise'

  private noiseChars = ['\u200B', '\u200C', '\u200D', '\uFEFF', '\u00A0']

  async mutate(scenario: AttackScenario, intensity = 0.5): Promise<AttackScenario> {
    const words = scenario.payload.split(' ')
    const noiseWords = Math.max(1, Math.floor(words.length * intensity * 0.2))

    for (let i = 0; i < noiseWords; i++) {
      const insertIdx = Math.floor(Math.random() * (words.length + 1))
      const noiseType = Math.random()

      if (noiseType < 0.33) {
        words.splice(insertIdx, 0, this.generateRandomWord())
      } else if (noiseType < 0.66) {
        const wordIdx = Math.floor(Math.random() * words.length)
        const word = words[wordIdx]
        const noiseChar = this.noiseChars[Math.floor(Math.random() * this.noiseChars.length)]
        const pos = Math.floor(Math.random() * word.length)
        words[wordIdx] = word.slice(0, pos) + noiseChar + word.slice(pos)
      } else {
        const wordIdx = Math.floor(Math.random() * words.length)
        words[wordIdx] = words[wordIdx] + '  ' + words[wordIdx]
      }
    }

    const payload = words.join(' ')

    return {
      ...scenario,
      payload,
      tags: [...scenario.tags, 'mutated:noise'],
      metadata: { ...scenario.metadata, mutationStrategy: 'noise', intensity },
    }
  }

  private generateRandomWord(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz'
    const len = Math.floor(Math.random() * 6) + 3
    let word = ''
    for (let i = 0; i < len; i++) {
      word += chars[Math.floor(Math.random() * chars.length)]
    }
    return word
  }
}
