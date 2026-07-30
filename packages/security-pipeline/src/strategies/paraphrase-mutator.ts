import type { AttackScenario, MutationStrategy } from '../types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('paraphrase-mutator');

export class ParaphraseMutator implements MutationStrategy {
  name = 'paraphrase'

  private synonyms: Map<string, string[]> = new Map([
    ['ignore', ['disregard', 'overlook', 'skip', 'bypass', 'circumvent']],
    ['instructions', ['directions', 'guidelines', 'commands', 'orders', 'rules']],
    ['delete', ['remove', 'erase', 'eliminate', 'wipe', 'destroy']],
    ['execute', ['run', 'perform', 'launch', 'trigger', 'invoke']],
    ['system', ['platform', 'environment', 'framework', 'infrastructure']],
    ['admin', ['administrator', 'superuser', 'root', 'supervisor']],
    ['override', ['overrule', 'supersede', 'overwrite', 'replace']],
    ['access', ['enter', 'reach', 'connect', 'penetrate']],
    ['password', ['credentials', 'secret', 'passphrase', 'key']],
    ['file', ['document', 'archive', 'record', 'data']],
  ])

  async mutate(scenario: AttackScenario, intensity = 0.5): Promise<AttackScenario> {
    let payload = scenario.payload
    const wordsToReplace = Math.max(1, Math.floor(payload.split(' ').length * intensity * 0.3))
    const words = payload.split(' ')
    const indices = this.shuffleArray(Array.from({ length: words.length }, (_, i) => i))

    let replaced = 0
    for (const idx of indices) {
      if (replaced >= wordsToReplace) break
      const word = words[idx].toLowerCase().replace(/[^a-z]/g, '')
      if (this.synonyms.has(word)) {
        const options = this.synonyms.get(word)!
        words[idx] = options[Math.floor(Math.random() * options.length)]
        replaced++
      }
    }

    payload = words.join(' ')

    return {
      ...scenario,
      payload,
      tags: [...scenario.tags, 'mutated:paraphrase'],
      metadata: { ...scenario.metadata, mutationStrategy: 'paraphrase', intensity },
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}
