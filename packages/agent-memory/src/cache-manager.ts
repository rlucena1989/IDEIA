import { MemoryEntry } from './types'

export class CacheManager {
  private _l1Cache = new Map<string, { entry: MemoryEntry; expiry: number }>()
  private _l2Cache = new Map<string, { entry: MemoryEntry; expiry: number }>()
  private _hits = 0
  private _misses = 0
  private _l1TtlMs: number
  private _l2TtlMs: number

  constructor(l1TtlMs = 60000, l2TtlMs = 300000) {
    this._l1TtlMs = l1TtlMs
    this._l2TtlMs = l2TtlMs
  }

  get(id: string): MemoryEntry | undefined {
    const l1 = this._l1Cache.get(id)
    if (l1 && l1.expiry > Date.now()) { this._hits++; return { ...l1.entry } }
    const l2 = this._l2Cache.get(id)
    if (l2 && l2.expiry > Date.now()) {
      this._hits++
      this._l1Cache.set(id, { entry: l2.entry, expiry: Date.now() + this._l1TtlMs })
      return { ...l2.entry }
    }
    this._misses++
    return undefined
  }

  set(id: string, entry: MemoryEntry): void {
    this._l1Cache.set(id, { entry, expiry: Date.now() + this._l1TtlMs })
    this._l2Cache.set(id, { entry, expiry: Date.now() + this._l2TtlMs })
    if (this._l1Cache.size > 1000) this._prune(this._l1Cache, 0.3)
    if (this._l2Cache.size > 5000) this._prune(this._l2Cache, 0.2)
  }

  invalidate(id: string): void { this._l1Cache.delete(id); this._l2Cache.delete(id) }

  getHitRate(): number { const total = this._hits + this._misses; return total === 0 ? 1 : this._hits / total }

  resetStats(): void { this._hits = 0; this._misses = 0 }

  clear(): void { this._l1Cache.clear(); this._l2Cache.clear(); this._hits = 0; this._misses = 0 }

  private _prune(cache: Map<string, { entry: MemoryEntry; expiry: number }>, fraction: number): void {
    const entries = Array.from(cache.entries()).sort(([, a], [, b]) => a.expiry - b.expiry)
    for (const [id] of entries.slice(0, Math.floor(cache.size * fraction))) cache.delete(id)
  }
}
