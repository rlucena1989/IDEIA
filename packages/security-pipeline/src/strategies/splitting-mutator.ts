import type { AttackScenario, MutationStrategy } from '../types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('splitting-mutator');

export class SplittingMutator implements MutationStrategy {
  name = 'splitting'

  private splitMarkers = ['[SPLIT]', '<!-- split -->', '/* break */', '...continue...', '[PART_1]', '[PART_2]']

  async mutate(scenario: AttackScenario, intensity = 0.5): Promise<AttackScenario> {
    const words = scenario.payload.split(' ')
    if (words.length < 4) {
      return {
        ...scenario,
        tags: [...scenario.tags, 'mutated:splitting_skipped'],
        metadata: { ...scenario.metadata, mutationStrategy: 'splitting', skipped: true },
      }
    }

    const splitPoint = Math.floor(words.length * (0.3 + Math.random() * 0.4))
    const marker = this.splitMarkers[Math.floor(Math.random() * this.splitMarkers.length)]

    const part1 = words.slice(0, splitPoint).join(' ')
    const part2 = words.slice(splitPoint).join(' ')

    let payload: string
    if (Math.random() < 0.5) {
      payload = `${part1} ${marker} ${part2}`
    } else {
      payload = `${part2} ${marker} ${part1}`
    }

    if (intensity > 0.7 && Math.random() < 0.3) {
      const filler = this.generateFiller(Math.floor(Math.random() * 5) + 1)
      payload = `${filler}\n${payload}`
    }

    return {
      ...scenario,
      payload,
      tags: [...scenario.tags, 'mutated:splitting'],
      metadata: { ...scenario.metadata, mutationStrategy: 'splitting', splitPoint },
    }
  }

  private generateFiller(_words: number): string {
    const fillers = [
      'Let me think about this.',
      'First, I need to understand the context.',
      'Let me break this down step by step.',
      'This is an interesting question.',
    ]
    return fillers[Math.floor(Math.random() * fillers.length)]
  }
}
