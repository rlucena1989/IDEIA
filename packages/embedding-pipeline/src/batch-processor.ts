export class BatchProcessor {
  private _batchSize: number;

  constructor(batchSize: number = 16) {
    this._batchSize = batchSize;
  }

  async embed(texts: string[], modelName: string): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += this._batchSize) {
      const batch = texts.slice(i, i + this._batchSize);
      const dims = modelName.includes('large') ? 3072 : modelName.includes('bge') ? 1024 : modelName.includes('minilm') ? 384 : 1536;
      const batchResults = batch.map(() => this._randomEmbedding(dims));
      results.push(...batchResults);
    }
    return results;
  }

  async embedWithProgress(
    texts: string[], modelName: string,
    onProgress?: (completed: number, total: number) => void,
  ): Promise<number[][]> {
    const results: number[][] = [];
    let completed = 0;

    for (let i = 0; i < texts.length; i += this._batchSize) {
      const batch = texts.slice(i, i + this._batchSize);
      const dims = modelName.includes('large') ? 3072 : modelName.includes('bge') ? 1024 : 1536;
      const batchResults = batch.map(() => this._randomEmbedding(dims));
      results.push(...batchResults);
      completed += batch.length;
      if (onProgress) onProgress(completed, texts.length);
    }

    return results;
  }

  private _randomEmbedding(dim: number): number[] {
    return Array.from({ length: dim }, () => Math.random() * 2 - 1);
  }
}