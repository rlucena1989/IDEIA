import { DiscriminatorNetwork } from './discriminator-network';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ensemble-defense');

export class EnsembleDefense {
  private _models: DiscriminatorNetwork[] = [];
  private _weights: number[] = [];
  private _validationHistory: number[][] = [];

  constructor(nModels = 5, private _embedDim = 768) {
    for (let i = 0; i < nModels; i++) {
      this._models.push(new DiscriminatorNetwork(_embedDim));
    }
    this._weights = Array.from({ length: nModels }, () => 1 / nModels);
    this._validationHistory = Array.from({ length: nModels }, () => []);
  }

  predict(embedding: number[]): { meanScore: number; variance: number; individualScores: number[] } {
    const individualScores = this._models.map((m, i) => m.forward(embedding) * this._weights[i]);
    const meanScore = individualScores.reduce((a, b) => a + b, 0);
    const variance = individualScores.reduce((a, b) => a + Math.pow(b - meanScore, 2), 0) / individualScores.length;
    return { meanScore, variance, individualScores: individualScores.map((s, i) => this._weights[i] > 0 ? s / this._weights[i] : 0) };
  }

  predictBatch(embeddings: number[][]): number[] {
    return embeddings.map(e => this.predict(e).meanScore);
  }

  updateWeights(validationAccuracy: number[]): void {
    this._validationHistory = this._validationHistory.map((hist, i) => [...hist, validationAccuracy[i] ?? 0]);
    const recent = this._validationHistory.map(hist => {
      const last5 = hist.slice(-5);
      return last5.reduce((a, b) => a + b, 0) / Math.max(last5.length, 1);
    });
    const total = recent.reduce((a, b) => a + b, 0);
    if (total > 0) {
      this._weights = recent.map(acc => acc / total);
    }
  }

  addModel(): void {
    this._models.push(new DiscriminatorNetwork(this._embedDim));
    this._weights.push(0);
    const n = this._weights.length;
    this._weights = Array.from({ length: n }, () => 1 / n);
    this._validationHistory.push([]);
  }

  removeModel(idx: number): void {
    if (idx >= 0 && idx < this._models.length) {
      this._models.splice(idx, 1);
      this._weights.splice(idx, 1);
      this._validationHistory.splice(idx, 1);
      const n = this._weights.length;
      if (n > 0) this._weights = Array.from({ length: n }, () => 1 / n);
    }
  }

  getModelCount(): number {
    return this._models.length;
  }

  getConfidence(): number {
    const testEmb = Array.from({ length: 10 }, () => Array.from({ length: this._embedDim }, () => Math.random() * 2 - 1));
    const predictions = this.predictBatch(testEmb);
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / predictions.length;
    return 1 - variance;
  }
}
