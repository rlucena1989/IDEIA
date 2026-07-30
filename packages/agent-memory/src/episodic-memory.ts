import { randomUUID } from 'crypto'
import { MemoryEntry, EntryCategory } from './types'

export class EpisodicMemory {
  private _episodes: MemoryEntry[] = []
  private _maxEpisodes = 500

  constructor(maxEpisodes = 500) { this._maxEpisodes = maxEpisodes }

  recordEpisode(content: string, source: string, context: Record<string, unknown>, tags: string[] = []): MemoryEntry {
    if (this._episodes.length >= this._maxEpisodes) this._episodes.shift()
    const entry: MemoryEntry = {
      id: randomUUID(), level: 'l4_episodic', category: 'event', content, source, tags,
      confidence: 0.9, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 2592000000,
      status: 'active', metadata: { ...context, episodeType: 'episodic' },
    }
    this._episodes.push(entry)
    return entry
  }

  recall(query: string, limit = 20): MemoryEntry[] {
    const queryLower = query.toLowerCase()
    return this._episodes.filter(e => e.content.toLowerCase().includes(queryLower) || e.tags.some(t => t.includes(queryLower)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit)
  }

  getRecent(count = 10): MemoryEntry[] {
    return [...this._episodes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, count)
  }

  count(): number { return this._episodes.length }

  clear(): void { this._episodes = [] }
}
