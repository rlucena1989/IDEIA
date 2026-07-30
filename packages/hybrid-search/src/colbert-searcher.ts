export class ColBERTSearcher {
  private _embeddingCache = new Map<string, number[]>();

  async encode(text: string): Promise<number[]> {
    const cached = this._embeddingCache.get(text);
    if (cached) return cached;

    const tokens = text.toLowerCase().split(/\s+/);
    const embedding = tokens.map((_, i) => Math.sin(i / tokens.length * Math.PI));
    const padded = Array.from({ length: 128 }, (_, i) => embedding[i] ?? 0);
    this._embeddingCache.set(text, padded);
    return padded;
  }

  async rank(query: string, documents: string[]): Promise<number[]> {
    const qEmb = await this.encode(query);
    const scores: number[] = [];

    for (const doc of documents) {
      const dEmb = await this.encode(doc);
      const maxSim = this._maxSim(qEmb, dEmb);
      scores.push(maxSim);
    }

    return scores;
  }

  async search(query: string, topK = 10): Promise<Array<{ id: string; score: number; content: string }>> {
    const qEmb = await this.encode(query);
    const results = Array.from({ length: 20 }, (_, i) => ({
      id: `colbert-${i}`,
      score: Math.random() * (qEmb[0] ?? 0.5),
      content: `colbert_result_${i}`,
    }));
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  clearCache(): void {
    this._embeddingCache.clear();
  }

  get cacheSize(): number {
    return this._embeddingCache.size;
  }

  private _maxSim(a: number[], b: number[]): number {
    let max = 0;
    for (const va of a) {
      for (const vb of b) {
        const sim = va * vb;
        if (sim > max) max = sim;
      }
    }
    return max;
  }
}
