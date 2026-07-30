import { randomUUID } from 'crypto'
import { MemoryEntry, EntryCategory } from './types'

export class WorkingMemory {
  private _entries: MemoryEntry[] = []
  private _maxSize = 50
  private _defaultTtlMs = 3600000

  constructor(maxSize = 50, ttlMs = 3600000) { this._maxSize = maxSize; this._defaultTtlMs = ttlMs }

  add(content: string, category: EntryCategory, source: string, tags: string[] = [], importance = 0.5): MemoryEntry {
    this._evictIfNeeded(); this._removeExpired()
    const entry: MemoryEntry = {
      id: randomUUID(), level: 'l3_working', category, content, source, tags,
      confidence: 0.8, importance, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: this._defaultTtlMs,
      status: 'active', metadata: {},
    }
    this._entries.push(entry)
    return entry
  }

  get(id: string): MemoryEntry | undefined {
    this._removeExpired()
    const entry = this._entries.find(e => e.id === id)
    if (entry) { entry.accessCount++; entry.lastAccessed = new Date().toISOString() }
    return entry ? { ...entry } : undefined
  }

  query(query: string): MemoryEntry[] {
    this._removeExpired()
    return this._entries.filter(e => e.content.toLowerCase().includes(query.toLowerCase()) || e.tags.some(t => t.includes(query)))
      .sort((a, b) => b.importance - a.importance)
  }

  getAll(): MemoryEntry[] { this._removeExpired(); return [...this._entries] }

  remove(id: string): boolean {
    const idx = this._entries.findIndex(e => e.id === id)
    if (idx >= 0) { this._entries.splice(idx, 1); return true }
    return false
  }

  getSize(): number { return this._entries.length }

  clear(): void { this._entries = [] }

  private _evictIfNeeded(): void {
    if (this._entries.length >= this._maxSize) {
      this._entries.sort((a, b) => a.importance - b.importance)
      this._entries.shift()
    }
  }

  private _removeExpired(): void {
    const now = Date.now()
    this._entries = this._entries.filter(e => now - new Date(e.createdAt).getTime() < e.ttlMs)
  }
}
