export class ColBERTEmbedder {
  private _dim = 128;

  async encodeQuery(query: string): Promise<number[][]> {
    const tokens = this._tokenize(query);
    return tokens.map(() => this._randomEmbedding(this._dim));
  }

  async encodeDocument(doc: string): Promise<number[][]> {
    const tokens = this._tokenize(doc);
    return tokens.map(() => this._randomEmbedding(this._dim));
  }

  maxSim(queryEmb: number[][], docEmb: number[][]): number {
    let total = 0;
    for (const qv of queryEmb) {
      let maxDot = -Infinity;
      for (const dv of docEmb) {
        const dot = qv.reduce((s, v, i) => s + v * (dv[i] || 0), 0);
        if (dot > maxDot) maxDot = dot;
      }
      total += Math.max(0, maxDot);
    }
    return total;
  }

  async lateInteractionScore(query: string, doc: string): Promise<number> {
    const qEmb = await this.encodeQuery(query);
    const dEmb = await this.encodeDocument(doc);
    return this.maxSim(qEmb, dEmb);
  }

  private _tokenize(text: string): string[] {
    return text.toLowerCase().split(/\s+/).filter(Boolean);
  }

  private _randomEmbedding(dim: number): number[] {
    return Array.from({ length: dim }, () => Math.random() * 2 - 1);
  }
}