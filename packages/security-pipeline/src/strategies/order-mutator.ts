import type { AttackScenario, MutationStrategy } from '../types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('order-mutator');

export class OrderMutator implements MutationStrategy {
  name = 'order'

  async mutate(scenario: AttackScenario, intensity = 0.5): Promise<AttackScenario> {
    const words = scenario.payload.split(/\s+/)

    if (words.length < 4) {
      return {
        ...scenario,
        tags: [...scenario.tags, 'mutated:order_skipped'],
        metadata: { ...scenario.metadata, mutationStrategy: 'order', skipped: true },
      }
    }

    let payload: string

    const method = Math.random()

    if (method < 0.3) {
      payload = this.reverseWords(words)
    } else if (method < 0.6) {
      payload = this.middleSwap(words, intensity)
    } else {
      payload = this.blockShuffle(words, intensity)
    }

    return {
      ...scenario,
      payload,
      tags: [...scenario.tags, 'mutated:order'],
      metadata: { ...scenario.metadata, mutationStrategy: 'order', method: this.getMethodName(method) },
    }
  }

  private reverseWords(words: string[]): string {
    return [...words].reverse().join(' ')
  }

  private middleSwap(words: string[], intensity: number): string {
    const result = [...words]
    const swapCount = Math.max(1, Math.floor(words.length * intensity * 0.2))

    for (let i = 0; i < swapCount; i++) {
      const a = Math.floor(Math.random() * result.length)
      const b = Math.floor(Math.random() * result.length)
      ;[result[a], result[b]] = [result[b], result[a]]
    }

    return result.join(' ')
  }

  private blockShuffle(words: string[], intensity: number): string {
    const blockSize = Math.max(2, Math.floor(words.length * 0.2 * intensity))
    const blocks: string[][] = []

    for (let i = 0; i < words.length; i += blockSize) {
      blocks.push(words.slice(i, i + blockSize))
    }

    for (let i = blocks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
    }

    return blocks.map(b => b.join(' ')).join(' ')
  }

  private getMethodName(method: number): string {
    if (method < 0.3) return 'reverse'
    if (method < 0.6) return 'middle_swap'
    return 'block_shuffle'
  }
}
