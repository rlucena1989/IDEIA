import { createLogger } from '@ideia/logger';
import { BenchmarkResult, BenchmarkConfig, IndexConfig, IndexHandle, DistanceMetric } from './types';

const logger = createLogger('hnsw-benchmark');

function defaultRandom(): number { return Math.random(); }

export class HNSWBenchmark implements IndexHandle {
  private _nodes: Map<number, { vector: number[]; neighbors: Map<number, number[]> }> = new Map()
  private _enterPoint: number | null = null
  private _M: number
  private _efConstruction: number
  private _maxLevel: number = 0
  private _levelMult: number
  private _dim: number
  private _metric: DistanceMetric

  constructor(private _config: any) {
    this._M = _config.M || 16
    this._efConstruction = _config.efConstruction || 200
    this._dim = _config.dimension
    this._metric = _config.metric || 'cosine'
    this._levelMult = 1 / Math.log(this._M)
  }

  async build(vectors: number[][], ids: number[]): Promise<number> {
    const start = Date.now()
    for (let i = 0; i < vectors.length; i++) await this.insert(vectors[i], ids[i])
    return Date.now() - start
  }

  async search(query: number[], topK: number, _params: Record<string, number>): Promise<{ ids: number[]; distances: number[] }> {
    const ef = _params.ef || this._efConstruction
    const visited = new Set<number>()
    const candidates: Array<{ id: number; dist: number }> = []
    const result: Array<{ id: number; dist: number }> = []

    if (this._enterPoint === null) return { ids: [], distances: [] }

    let currDist = this._distance(query, this._nodes.get(this._enterPoint)!.vector)
    candidates.push({ id: this._enterPoint, dist: currDist })
    visited.add(this._enterPoint)

    while (candidates.length > 0) {
      const closest = candidates.reduce((a, b) => a.dist < b.dist ? a : b)
      const furthestInResult = result.length > 0 ? result[result.length - 1] : null

      if (furthestInResult && closest.dist > furthestInResult.dist) break

      const node = this._nodes.get(closest.id)
      if (!node) break
      for (const [level, neighbors] of node.neighbors) {
        for (const nId of neighbors) {
          if (!visited.has(nId)) {
            visited.add(nId)
            const dist = this._distance(query, this._nodes.get(nId)!.vector)
            if (result.length < topK || dist < result[result.length - 1].dist) {
              candidates.push({ id: nId, dist })
              result.push({ id: nId, dist })
              result.sort((a, b) => a.dist - b.dist)
              if (result.length > topK) result.pop()
            }
          }
        }
      }
      candidates.splice(candidates.indexOf(closest), 1)
    }

    return { ids: result.map(r => r.id), distances: result.map(r => r.dist) }
  }

  async insert(vector: number[], id: number): Promise<void> {
    const level = this._randomLevel()
    const neighbors = new Map<number, number[]>()
    this._nodes.set(id, { vector, neighbors })

    if (this._enterPoint === null) {
      this._enterPoint = id
      this._maxLevel = level
      return
    }

    let currNode = this._enterPoint
    let currLevel = this._maxLevel

    while (currLevel > level) {
      const changed = this._searchAtLevel(vector, currNode, currLevel, 1)
      if (changed.length > 0) currNode = changed[0].id
      currLevel--
    }

    for (let lvl = Math.min(level, this._maxLevel); lvl >= 0; lvl--) {
      const nearest = this._searchAtLevel(vector, currNode, lvl, this._M)
      const neighborsList = nearest.map(n => n.id).slice(0, this._M)
      neighbors.set(lvl, neighborsList)

      for (const nId of neighborsList) {
        const nNode = this._nodes.get(nId)
        if (nNode) {
          if (!nNode.neighbors.has(lvl)) nNode.neighbors.set(lvl, [])
          const nNeighbors = nNode.neighbors.get(lvl)!
          nNeighbors.push(id)
          if (nNeighbors.length > this._M) {
            const all = nNeighbors.map(n => ({ id: n, dist: this._distance(this._nodes.get(n)!.vector, nNode.vector) }))
            all.sort((a, b) => a.dist - b.dist)
            nNode.neighbors.set(lvl, all.slice(0, this._M).map(n => n.id))
          }
        }
      }
    }

    if (level > this._maxLevel) this._maxLevel = level
  }

  async delete(id: number): Promise<void> {
    this._nodes.delete(id)
    if (this._enterPoint === id) this._enterPoint = this._nodes.size > 0 ? this._nodes.keys().next().value ?? null : null
  }

  getMemoryUsage(): number { return this._nodes.size * this._dim * 4 }
  getIndexSize(): number { return this._nodes.size }

  async cleanup(): Promise<void> { this._nodes.clear(); this._enterPoint = null; this._maxLevel = 0 }

  private _randomLevel(): number {
    return Math.floor(-Math.log(defaultRandom()) * this._levelMult)
  }

  private _searchAtLevel(query: number[], entryId: number, level: number, ef: number): Array<{ id: number; dist: number }> {
    const visited = new Set<number>()
    let candidates: Array<{ id: number; dist: number }> = []
    const result: Array<{ id: number; dist: number }> = []

    const entryDist = this._distance(query, this._nodes.get(entryId)!.vector)
    candidates.push({ id: entryId, dist: entryDist })
    visited.add(entryId)

    while (candidates.length > 0) {
      const closest = candidates.reduce((a, b) => a.dist < b.dist ? a : b)
      const furthest = result.length > 0 ? result[result.length - 1] : null
      if (furthest && closest.dist > furthest.dist) break

      const node = this._nodes.get(closest.id)
      if (!node) break
      const neighbors = node.neighbors.get(level) || []
      for (const nId of neighbors) {
        if (!visited.has(nId)) {
          visited.add(nId)
          const dist = this._distance(query, this._nodes.get(nId)!.vector)
          if (result.length < ef || dist < result[result.length - 1].dist) {
            candidates.push({ id: nId, dist })
            result.push({ id: nId, dist })
            result.sort((a, b) => a.dist - b.dist)
            if (result.length > ef) result.pop()
          }
        }
      }
      candidates.splice(candidates.indexOf(closest), 1)
    }
    return result
  }

  private _distance(a: number[], b: number[]): number {
    if (this._metric === 'cosine') {
      let dot = 0, magA = 0, magB = 0
      for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i] }
      const cos = dot / (Math.sqrt(magA) * Math.sqrt(magB))
      return 1 - cos
    }
    let sum = 0
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
    return Math.sqrt(sum)
  }
}

