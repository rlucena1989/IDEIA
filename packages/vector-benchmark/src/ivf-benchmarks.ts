import { BenchmarkResult, BenchmarkConfig, IndexConfig, IndexHandle, DistanceMetric } from './types'

export class IVFFlatBenchmark implements IndexHandle {
  private _centroids: Map<number, number[][]> = new Map()
  private _centroidVectors: Map<number, number[]> = new Map()
  private _nCentroids: number
  private _dim: number
  private _metric: DistanceMetric

  constructor(private _config: any) {
    this._nCentroids = _config.nCentroids || 100
    this._dim = _config.dimension
    this._metric = _config.metric || 'cosine'
  }

  async build(vectors: number[][], ids: number[]): Promise<number> {
    const start = Date.now()
    const nCentroids = Math.min(this._nCentroids, vectors.length)
    const centroids: number[][] = []
    for (let i = 0; i < nCentroids; i++) centroids.push([...vectors[Math.floor(Math.random() * vectors.length)]])
    const assignments = new Array(vectors.length).fill(0)
    for (let iter = 0; iter < 20; iter++) {
      let changed = 0
      for (let i = 0; i < vectors.length; i++) {
        let minDist = Infinity; let best = 0
        for (let j = 0; j < nCentroids; j++) { const d = this._distance(vectors[i], centroids[j]); if (d < minDist) { minDist = d; best = j } }
        if (assignments[i] !== best) { assignments[i] = best; changed++ }
      }
      if (changed === 0) break
      for (let j = 0; j < nCentroids; j++) {
        const assigned = vectors.filter((_, i) => assignments[i] === j)
        if (assigned.length > 0) {
          const newCentroid = new Array(this._dim).fill(0)
          for (const v of assigned) for (let d = 0; d < this._dim; d++) newCentroid[d] += v[d]
          centroids[j] = newCentroid.map(v => v / assigned.length)
        }
      }
    }
    for (let i = 0; i < vectors.length; i++) {
      const cId = assignments[i]
      if (!this._centroids.has(cId)) this._centroids.set(cId, [])
      this._centroids.get(cId)!.push(vectors[i])
      this._centroidVectors.set(cId, centroids[cId])
    }
    return Date.now() - start
  }

  async search(query: number[], topK: number, _params: Record<string, number>): Promise<{ ids: number[]; distances: number[] }> {
    const nProbe = _params.nprobe || 10
    const centroidDists = Array.from(this._centroidVectors.entries()).map(([id, vec]) => ({ id, dist: this._distance(query, vec) }))
    centroidDists.sort((a, b) => a.dist - b.dist)
    const probeCentroids = centroidDists.slice(0, nProbe).map(c => c.id)
    const allResults: Array<{ id: number; dist: number }> = []
    for (const cId of probeCentroids) {
      const vectors = this._centroids.get(cId) || []
      for (const v of vectors) {
        const dist = this._distance(query, v)
        allResults.push({ id: Math.random(), dist }) // simplified: no real ID tracking
      }
    }
    allResults.sort((a, b) => a.dist - b.dist)
    const top = allResults.slice(0, topK)
    return { ids: top.map(r => r.id), distances: top.map(r => r.dist) }
  }

  async insert(_vector: number[], _id: number): Promise<void> {}
  async delete(_id: number): Promise<void> {}
  getMemoryUsage(): number { return this._centroids.size * this._dim * 4 }
  getIndexSize(): number { return this._centroids.size }
  async cleanup(): Promise<void> { this._centroids.clear(); this._centroidVectors.clear() }

  private _distance(a: number[], b: number[]): number {
    let sum = 0
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
    return Math.sqrt(sum)
  }
}

export class IVFPQBenchmark implements IndexHandle {
  private _vectors: number[][] = []

  constructor(private _config: any) {}

  async build(vectors: number[][], ids: number[]): Promise<number> {
    const start = Date.now()
    this._vectors = vectors.map(v => [...v])
    return Date.now() - start
  }

  async search(query: number[], topK: number, _params: Record<string, number>): Promise<{ ids: number[]; distances: number[] }> {
    const dists = this._vectors.map((v, i) => ({ id: i, dist: this._euclidean(query, v) }))
    dists.sort((a, b) => a.dist - b.dist)
    return { ids: dists.slice(0, topK).map(r => r.id), distances: dists.slice(0, topK).map(r => r.dist) }
  }

  async insert(_vector: number[], _id: number): Promise<void> {}
  async delete(_id: number): Promise<void> {}
  getMemoryUsage(): number { return 0 }
  getIndexSize(): number { return this._vectors.length }
  async cleanup(): Promise<void> { this._vectors = [] }

  private _euclidean(a: number[], b: number[]): number {
    let sum = 0
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
    return Math.sqrt(sum)
  }
}

export class DiskANNBenchmark implements IndexHandle {
  constructor(private _config: any) {}
  async build(_vectors: number[][], _ids: number[]): Promise<number> { return 0 }
  async search(_query: number[], _topK: number, _params: Record<string, number>): Promise<{ ids: number[]; distances: number[] }> { return { ids: [], distances: [] } }
  async insert(_vector: number[], _id: number): Promise<void> {}
  async delete(_id: number): Promise<void> {}
  getMemoryUsage(): number { return 0 }
  getIndexSize(): number { return 0 }
  async cleanup(): Promise<void> {}
}

