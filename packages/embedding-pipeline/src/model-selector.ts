import { EmbeddingModel, ModelStats } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('model-selector');

export class ModelSelector {
  private _models: Map<string, EmbeddingModel> = new Map();
  private _stats: Map<string, ModelStats> = new Map();

  constructor() {
    this._registerBuiltIn();
  }

  private _registerBuiltIn(): void {
    this.register({
      name: 'text-embedding-3-small', dimensions: 1536, costPer1KTokens: 0.00002,
      quality: 'high', local: false, maxTokens: 8191,
    });
    this.register({
      name: 'text-embedding-3-large', dimensions: 3072, costPer1KTokens: 0.00013,
      quality: 'high', local: false, maxTokens: 8191,
    });
    this.register({
      name: 'bge-m3', dimensions: 1024, costPer1KTokens: 0,
      quality: 'medium', local: true, maxTokens: 8192,
    });
    this.register({
      name: 'minilm-l6-v2', dimensions: 384, costPer1KTokens: 0,
      quality: 'low', local: true, maxTokens: 512,
    });
  }

  register(model: EmbeddingModel): void {
    this._models.set(model.name, model);
    this._stats.set(model.name, {
      totalTokens: 0, totalCost: 0, totalCalls: 0, cacheHits: 0, lastUsed: 0,
    });
  }

  select(text: string, quality: 'low' | 'medium' | 'high' | 'auto', preferredModel?: string): EmbeddingModel {
    if (preferredModel) {
      const model = this._models.get(preferredModel);
      if (model) return model;
    }
    if (quality === 'high') return this._models.get('text-embedding-3-large')!;
    if (quality === 'medium') return this._models.get('text-embedding-3-small')!;
    if (quality === 'low') return this._models.get('minilm-l6-v2')!;
    return this._selectAuto(text);
  }

  private _selectAuto(text: string): EmbeddingModel {
    const length = text.length;
    const isCode = this._isCode(text);
    if (length > 5000) return this._models.get('text-embedding-3-small')!;
    if (isCode) return this._models.get('bge-m3')!;
    if (length < 200) return this._models.get('minilm-l6-v2')!;
    return this._models.get('text-embedding-3-small')!;
  }

  private _isCode(text: string): boolean {
    const patterns = ['function', 'class', 'import', 'export', 'const', 'let', '=>', 'interface', 'type'];
    return patterns.some(p => text.includes(p));
  }

  calculateCost(model: EmbeddingModel, tokens: number): number {
    return (tokens / 1000) * model.costPer1KTokens;
  }

  getModel(name: string): EmbeddingModel | undefined {
    return this._models.get(name);
  }

  getStats(name: string): ModelStats | undefined {
    return this._stats.get(name);
  }

  getAllStats(): Map<string, ModelStats> {
    return this._stats;
  }
}