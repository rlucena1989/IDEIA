export class FreshQNNIndex {
  private _freshness = new Map<number, number>()
  private _pqCodes = new Map<number, number[]>()

  constructor(private _dim: number, private _m: number) {}

  async insert(id: number, vector: number[]): Promise<void> {
    const code = this._quantize(vector)
    this._pqCodes.set(id, code)
    this._freshness.set(id, Date.now())
  }

  async search(query: number[], topK: number, freshnessWeight = 0.3): Promise<Array<{ id: number; score: number; freshness: number }>> {
    const scored: Array<{ id: number; score: number; freshness: number }> = []
    const now = Date.now()
    for (const [id, code] of this._pqCodes) {
      const vecDist = this._approximateDistance(query, code)
      const lastUpdated = this._freshness.get(id) || 0
      const freshnessScore = 1 - (now - lastUpdated) / (7 * 86400000)
      const combined = vecDist * (1 - freshnessWeight) + (1 - freshnessScore) * freshnessWeight
      scored.push({ id, score: 1 - combined, freshness: freshnessScore })
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, topK)
  }

  async refresh(id: number, vector: number[]): Promise<void> {
    await this.insert(id, vector)
  }

  getStalenessReport(): Array<{ id: number; stalenessHours: number }> {
    const now = Date.now()
    return Array.from(this._freshness.entries()).map(([id, time]) => ({
      id,
      stalenessHours: (now - time) / 3600000,
    }))
  }

  private _quantize(vector: number[]): number[] {
    const subDim = Math.ceil(this._dim / this._m)
    const code: number[] = []
    for (let i = 0; i < this._m; i++) {
      const start = i * subDim
      const end = Math.min(start + subDim, this._dim)
      const subVec = vector.slice(start, end)
      const centroid = subVec.reduce((a, b) => a + b, 0) / subVec.length
      code.push(Math.floor(centroid * 127 + 128))
    }
    return code
  }

  private _approximateDistance(query: number[], code: number[]): number {
    const subDim = Math.ceil(this._dim / this._m)
    let dist = 0
    for (let i = 0; i < this._m; i++) {
      const start = i * subDim
      const end = Math.min(start + subDim, this._dim)
      const centroid = (code[i] - 128) / 127
      for (let j = start; j < end; j++) {
        dist += (query[j] - centroid) ** 2
      }
    }
    return Math.sqrt(dist)
  }
}
