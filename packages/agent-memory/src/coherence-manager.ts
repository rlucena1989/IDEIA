import { createLogger } from '@ideia/logger'
import { MemoryEntry } from './types'

const logger = createLogger('agent-memory:coherence')

export class CoherenceManager {
  private _contradictions: Array<{ statementA: MemoryEntry; statementB: MemoryEntry; reason: string }> = []

  check(facts: MemoryEntry[], newFact: MemoryEntry): MemoryEntry[] {
    const conflicts: MemoryEntry[] = []
    for (const fact of facts) {
      if (this._isContradictory(fact, newFact)) {
        conflicts.push(fact)
        this._contradictions.push({ statementA: fact, statementB: newFact, reason: `Contradiction detected between '${fact.content.slice(0, 50)}' and '${newFact.content.slice(0, 50)}'` })
      }
    }
    if (conflicts.length > 0) logger.warn(`Coherence check found ${conflicts.length} conflict(s)`, { count: conflicts.length })
    return conflicts
  }

  private _isContradictory(a: MemoryEntry, b: MemoryEntry): boolean {
    const aLower = a.content.toLowerCase()
    const bLower = b.content.toLowerCase()
    const negations = ['not ', "n't ", 'never ', 'no ', 'without ']
    for (const neg of negations) {
      if (aLower.includes(neg) !== bLower.includes(neg)) {
        const aCore = aLower.replace(new RegExp(neg, 'g'), '')
        const bCore = bLower.replace(new RegExp(neg, 'g'), '')
        if (aCore === bCore || aCore.includes(bCore) || bCore.includes(aCore)) return true
      }
    }
    return false
  }

  getContradictions(): Array<{ statementA: MemoryEntry; statementB: MemoryEntry; reason: string }> {
    return [...this._contradictions]
  }

  resolve(entryId: string): boolean {
    const idx = this._contradictions.findIndex(c => c.statementA.id === entryId || c.statementB.id === entryId)
    if (idx >= 0) { this._contradictions.splice(idx, 1); return true }
    return false
  }

  clear(): void { this._contradictions = [] }
}
