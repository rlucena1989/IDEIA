import { EmbeddingResult, PipelineConfig } from './types';
import { createLogger } from '@ideia/logger';
import { ChunkingStrategy } from './chunking-strategy';
import { ModelSelector } from './model-selector';
import { NATSKVCache } from './nats-kv-cache';
import { BatchProcessor } from './batch-processor';
const logger = createLogger('embedding-pipeline');

export class EmbeddingPipeline {
  private _metricHits = 0;
  private _metricMisses = 0;
  private _config: PipelineConfig;

  constructor(
    private _chunker: ChunkingStrategy,
    private _modelSelector: ModelSelector,
    private _cache: NATSKVCache,
    private _batchProcessor: BatchProcessor,
    config?: Partial<PipelineConfig>,
  ) {
    this._config = {
      defaultModel: 'text-embedding-3-small',
      defaultQuality: 'auto',
      maxChunkSize: 512,
      batchSize: 16,
      enableCache: true,
      cacheTTLDays: 7,
      ...config,
    };
  }

  async embed(text: string, options?: { model?: string; quality?: 'low' | 'medium' | 'high' | 'auto' }): Promise<EmbeddingResult> {
    const chunks = this._chunker.chunk(text, this._config.maxChunkSize);
    const firstChunk = chunks[0];
    const selectedModel = this._modelSelector.select(
      firstChunk.text,
      options?.quality || this._config.defaultQuality,
      options?.model,
    );

    if (this._config.enableCache) {
      const cached = await this._cache.get(firstChunk.text, selectedModel.name);
      if (cached) {
        this._metricHits++;
        return {
          id: this._hashContent(text),
          text: firstChunk.text,
          embedding: cached,
          model: selectedModel.name,
          dimensions: selectedModel.dimensions,
          chunkStrategy: firstChunk.strategy,
          tokens: firstChunk.tokens,
          cost: 0,
          cached: true,
          timestamp: Date.now(),
        };
      }
    }
    this._metricMisses++;

    const embedding = await this._batchProcessor.embed([firstChunk.text], selectedModel.name);
    if (this._config.enableCache && embedding[0]) {
      await this._cache.set(firstChunk.text, embedding[0], selectedModel.name);
    }

    const cost = this._modelSelector.calculateCost(selectedModel, firstChunk.tokens);

    return {
      id: this._hashContent(text),
      text: firstChunk.text,
      embedding: embedding[0]!,
      model: selectedModel.name,
      dimensions: selectedModel.dimensions,
      chunkStrategy: firstChunk.strategy,
      tokens: firstChunk.tokens,
      cost,
      cached: false,
      timestamp: Date.now(),
    };
  }

  async embedBatch(texts: string[], options?: { model?: string; quality?: 'low' | 'medium' | 'high' | 'auto' }): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += this._config.batchSize) {
      const batch = texts.slice(i, i + this._config.batchSize);
      const batchResults = await Promise.all(batch.map(t => this.embed(t, options)));
      results.push(...batchResults);
    }
    return results;
  }

  getCacheHitRate(): number {
    const total = this._metricHits + this._metricMisses;
    return total > 0 ? this._metricHits / total : 0;
  }

  private _hashContent(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  }
}