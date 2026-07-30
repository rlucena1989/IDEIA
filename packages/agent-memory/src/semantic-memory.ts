import { randomUUID } from 'crypto'
import { MemoryEntry, EntryCategory } from './types'

export class SemanticMemory {
  private _facts: MemoryEntry[] = []
  private _maxFacts = 200

  constructor(maxFacts = 200) { this._maxFacts = maxFacts }

  addFact(content: string, source: string, category: EntryCategory, tags: string[] = [], confidence = 0.8): MemoryEntry {
    if (this._facts.length >= this._maxFacts) { this._facts.sort((a, b) => a.importance - b.importance); this._facts.shift() }
    const entry: MemoryEntry = {
      id: randomUUID(), level: 'l5_semantic', category, content, source, tags,
      confidence, importance: confidence, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 31536000000,
      status: 'active', metadata: { factType: 'semantic' },
    }
    this._facts.push(entry)
    return entry
  }

  query(query: string): MemoryEntry[] {
    const q = query.toLowerCase()
    return this._facts.filter(f => f.content.toLowerCase().includes(q) || f.tags.some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => b.confidence - a.confidence)
  }

  updateConfidence(factId: string, confidence: number): boolean {
    const fact = this._facts.find(f => f.id === factId)
    if (fact) { fact.confidence = confidence; fact.updatedAt = new Date().toISOString(); return true }
    return false
  }

  count(): number { return this._facts.length }

  clear(): void { this._facts = [] }
}
