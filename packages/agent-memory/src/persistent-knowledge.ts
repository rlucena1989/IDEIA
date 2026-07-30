import { randomUUID, createHash } from 'crypto'
import { MemoryEntry } from './types'

export class PersistentKnowledge {
  private _entries: MemoryEntry[] = []
  private _maxEntries = 1000

  constructor(maxEntries = 1000) { this._maxEntries = maxEntries }

  persist(content: string, source: string, tags: string[] = [], importance = 0.7): MemoryEntry {
    if (this._entries.length >= this._maxEntries) { this._entries.sort((a, b) => a.importance - b.importance); this._entries.shift() }
    const hash = createHash('sha256').update(content + source).digest('hex').slice(0, 12)
    const existing = this._entries.find(e => e.id === hash)
    if (existing) { existing.accessCount++; existing.lastAccessed = new Date().toISOString(); return existing }
    const entry: MemoryEntry = {
      id: hash, level: 'l6_persistent', category: 'pattern', content, source, tags,
      confidence: 0.95, importance, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 0, status: 'active', metadata: { persistent: true },
    }
    this._entries.push(entry)
    return entry
  }

  search(query: string): MemoryEntry[] {
    const q = query.toLowerCase()
    return this._entries.filter(e => e.content.toLowerCase().includes(q) || e.source.toLowerCase().includes(q) || e.tags.some(t => t.includes(q)))
  }

  count(): number { return this._entries.length }

  clear(): void { this._entries = [] }
}
