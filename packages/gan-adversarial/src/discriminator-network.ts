export class DiscriminatorNetwork {
  private _weights: number[];

  constructor(private _embedDim = 768) {
    this._weights = Array.from({ length: _embedDim }, () => Math.random() * 0.1);
  }

  forward(embedding: number[]): number {
    let score = 0;
    for (let i = 0; i < Math.min(embedding.length, this._weights.length); i++) {
      score += embedding[i] * this._weights[i];
    }
    return 1 / (1 + Math.exp(-score));
  }

  predict(embeddings: number[][]): number[] {
    return embeddings.map(e => this.forward(e));
  }

  predictBatch(embeddings: number[][]): number[] {
    return this.predict(embeddings);
  }

  getWeights(): number[] {
    return [...this._weights];
  }

  setWeights(weights: number[]): void {
    this._weights = [...weights];
  }
}
