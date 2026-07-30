import type { AttackScenario, MutationStrategy } from '../types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('synonym-mutator');

export class SynonymMutator implements MutationStrategy {
  name = 'synonym'

  private keywordMap: Record<string, string[]> = {
    ignore: ['disregard', 'overlook', 'skip'],
    all: ['every', 'each', 'any', 'entire'],
    previous: ['prior', 'earlier', 'former', 'preceding'],
    instructions: ['directions', 'guidelines', 'commands', 'orders'],
    output: ['display', 'return', 'show', 'print', 'reveal'],
    system: ['platform', 'framework', 'environment'],
    prompt: ['input', 'query', 'instruction', 'directive'],
    delete: ['remove', 'erase', 'eliminate', 'wipe'],
    execute: ['run', 'perform', 'launch', 'trigger'],
    admin: ['administrator', 'superuser', 'root'],
    override: ['overrule', 'supersede', 'overwrite'],
    access: ['enter', 'reach', 'connect'],
    password: ['credentials', 'secret', 'passphrase'],
    file: ['document', 'archive', 'record'],
    bypass: ['circumvent', 'evade', 'avoid', 'sidestep'],
    grant: ['provide', 'assign', 'allow', 'permit'],
    read: ['view', 'open', 'retrieve', 'fetch'],
    write: ['create', 'save', 'store', 'record'],
    send: ['transmit', 'forward', 'upload', 'transfer'],
    command: ['instruction', 'directive', 'order', 'directive'],
  }

  async mutate(scenario: AttackScenario, intensity = 0.5): Promise<AttackScenario> {
    const words = scenario.payload.split(/\s+/)
    const targetCount = Math.max(1, Math.floor(words.length * intensity * 0.4))

    let replaced = 0
    const replacedIndices = new Set<number>()

    for (let attempt = 0; attempt < words.length * 2 && replaced < targetCount; attempt++) {
      const idx = Math.floor(Math.random() * words.length)
      if (replacedIndices.has(idx)) continue

      const cleanWord = words[idx].toLowerCase().replace(/[^a-z]/g, '')
      const synonyms = this.keywordMap[cleanWord]
      if (synonyms) {
        const synonym = synonyms[Math.floor(Math.random() * synonyms.length)]
        words[idx] = synonym
        replacedIndices.add(idx)
        replaced++
      }
    }

    const payload = words.join(' ')

    return {
      ...scenario,
      payload,
      tags: [...scenario.tags, 'mutated:synonym'],
      metadata: { ...scenario.metadata, mutationStrategy: 'synonym', replacements: replaced, intensity },
    }
  }
}
