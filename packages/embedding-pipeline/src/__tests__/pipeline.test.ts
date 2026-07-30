import { EmbeddingPipeline } from '../embedding-pipeline';
import { ChunkingStrategy } from '../chunking-strategy';
import { ModelSelector } from '../model-selector';
import { NATSKVCache } from '../nats-kv-cache';
import { BatchProcessor } from '../batch-processor';
import { ColBERTEmbedder } from '../colbert-embedder';
import { SPLADEEmbedder } from '../splade-embedder';
import { ONNXEmbeddingOptimizer } from '../onnx-embedding-optimizer';

describe('ChunkingStrategy', () => {
  let chunker: ChunkingStrategy;
  beforeEach(() => { chunker = new ChunkingStrategy(); });

  it('should use paragraph strategy for well-structured text', () => {
    const text = 'Para 1.\n\nPara 2.\n\nPara 3.';
    const chunks = chunker.chunk(text, 100);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].strategy).toBe('paragraph');
  });

  it('should fallback to token strategy for single text', () => {
    const text = 'A '.repeat(200);
    const chunks = chunker.chunk(text, 50);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should handle empty text', () => {
    const chunks = chunker.chunk('', 100);
    expect(chunks.length).toBe(1);
  });

  it('should estimate tokens', () => {
    const tokens = chunker.estimateTokens('hello world');
    expect(tokens).toBe(3);
  });

  it('should handle sentence splitting', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const chunks = chunker.chunk(text, 50);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ModelSelector', () => {
  let selector: ModelSelector;
  beforeEach(() => { selector = new ModelSelector(); });

  it('should select model by quality', () => {
    expect(selector.select('text', 'high').name).toBe('text-embedding-3-large');
    expect(selector.select('text', 'low').name).toBe('minilm-l6-v2');
    expect(selector.select('text', 'medium').name).toBe('text-embedding-3-small');
  });

  it('should auto-select bge-m3 for code', () => {
    const code = 'function hello() { return "world"; }';
    expect(selector.select(code, 'auto').name).toBe('bge-m3');
  });

  it('should prefer cheap model for long texts', () => {
    expect(selector.select('A'.repeat(6000), 'auto').name).toBe('text-embedding-3-small');
  });

  it('should calculate cost correctly', () => {
    const model = selector.getModel('text-embedding-3-small')!;
    const cost = selector.calculateCost(model, 1000);
    expect(cost).toBe(0.00002);
  });

  it('should prefer minilm for very short texts', () => {
    expect(selector.select('Hi', 'auto').name).toBe('minilm-l6-v2');
  });

  it('should respect preferred model', () => {
    const model = selector.select('text', 'auto', 'bge-m3');
    expect(model.name).toBe('bge-m3');
  });

  it('should track model stats', () => {
    const stats = selector.getAllStats();
    expect(stats.size).toBeGreaterThanOrEqual(4);
  });
});

describe('NATSKVCache', () => {
  let cache: NATSKVCache;
  beforeEach(() => { cache = new NATSKVCache(1); });

  it('should cache and retrieve embeddings', async () => {
    await cache.set('hello', [0.1, 0.2, 0.3], 'test-model');
    const result = await cache.get('hello', 'test-model');
    expect(result).toBeDefined();
    expect(result![0]).toBeCloseTo(0.1);
  });

  it('should return null for missing entries', async () => {
    const result = await cache.get('nonexistent', 'model');
    expect(result).toBeNull();
  });

  it('should support batch retrieval', async () => {
    await cache.set('a', [0.1], 'm1');
    await cache.set('b', [0.2], 'm1');
    const results = await cache.getBatch(['a', 'b', 'c'], 'm1');
    expect(results.get('a')).toBeDefined();
    expect(results.get('c')).toBeNull();
  });

  it('should invalidate entries', async () => {
    await cache.set('key', [1.0], 'm');
    await cache.invalidate('key', 'm');
    expect(await cache.get('key', 'm')).toBeNull();
  });

  it('should purge expired entries', async () => {
    await cache.set('old', [1.0], 'm');
    const purged = await cache.purge(0);
    expect(purged).toBe(1);
    expect(cache.getSize()).toBe(0);
  });

  it('should clear all', async () => {
    await cache.set('k1', [0.1], 'm1');
    await cache.set('k2', [0.2], 'm2');
    cache.clear();
    expect(cache.getSize()).toBe(0);
  });
});

describe('BatchProcessor', () => {
  let bp: BatchProcessor;
  beforeEach(() => { bp = new BatchProcessor(2); });

  it('should embed texts in batches', async () => {
    const results = await bp.embed(['hello', 'world', 'test'], 'text-embedding-3-small');
    expect(results.length).toBe(3);
    expect(results[0].length).toBe(1536);
  });

  it('should report progress', async () => {
    const progresses: number[] = [];
    await bp.embedWithProgress(['a', 'b', 'c'], 'bge-m3', (completed, total) => {
      progresses.push(completed);
    });
    expect(progresses.length).toBeGreaterThan(0);
  });

  it('should use correct dimensions for large model', async () => {
    const results = await bp.embed(['test'], 'text-embedding-3-large');
    expect(results[0].length).toBe(3072);
  });
});

describe('ColBERTEmbedder', () => {
  let colbert: ColBERTEmbedder;
  beforeEach(() => { colbert = new ColBERTEmbedder(); });

  it('should encode query', async () => {
    const emb = await colbert.encodeQuery('test query');
    expect(emb.length).toBeGreaterThan(0);
    expect(emb[0].length).toBe(128);
  });

  it('should encode document', async () => {
    const emb = await colbert.encodeDocument('document text here');
    expect(emb.length).toBeGreaterThan(0);
  });

  it('should calculate maxSim', () => {
    const qEmb = [[0.1, 0.2], [0.3, 0.4]];
    const dEmb = [[0.5, 0.6], [0.7, 0.8]];
    const score = colbert.maxSim(qEmb, dEmb);
    expect(score).toBeGreaterThan(0);
  });

  it('should compute late interaction score', async () => {
    const score = await colbert.lateInteractionScore('query', 'document content');
    expect(score).toBeGreaterThan(0);
  });
});

describe('SPLADEEmbedder', () => {
  let splade: SPLADEEmbedder;
  beforeEach(() => { splade = new SPLADEEmbedder(); });

  it('should encode text as sparse vector', () => {
    const result = splade.encode('hello world hello');
    expect(result.size).toBeGreaterThan(0);
  });

  it('should limit terms', () => {
    const text = Array.from({ length: 200 }, (_, i) => 'word' + i).join(' ');
    const result = splade.encode(text);
    expect(result.size).toBeLessThanOrEqual(100);
  });

  it('should compute dot product', () => {
    const a = new Map([[1, 0.5], [2, 0.3]]);
    const b = new Map([[1, 0.4], [3, 0.2]]);
    const dot = splade.dotProduct(a, b);
    expect(dot).toBeCloseTo(0.2);
  });

  it('should handle empty input', () => {
    const result = splade.encode('');
    expect(result.size).toBe(0);
  });
});

describe('ONNXEmbeddingOptimizer', () => {
  let onnx: ONNXEmbeddingOptimizer;
  beforeEach(() => { onnx = new ONNXEmbeddingOptimizer(); });

  it('should generate optimization plan', () => {
    const plan = onnx.optimize({
      quantization: 'int8', graphOptimization: 'all',
      executionProvider: 'tensorrt', intraOpThreads: 4, interOpThreads: 2,
    });
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.estimatedSpeedup).toBeGreaterThan(1);
  });

  it('should estimate memory reduction', () => {
    const plan = onnx.optimize({
      quantization: 'int8', graphOptimization: 'basic',
      executionProvider: 'cpu', intraOpThreads: 1, interOpThreads: 1,
    });
    expect(plan.estimatedMemoryReduction).toBe(0.75);
  });

  it('should benchmark latency', async () => {
    const result = await onnx.benchmarkLatency(['text1', 'text2'], {
      quantization: 'fp16', graphOptimization: 'basic',
      executionProvider: 'cuda', intraOpThreads: 2, interOpThreads: 1,
    });
    expect(result.p50Latency).toBeGreaterThanOrEqual(0);
    expect(result.throughput).toBeGreaterThan(0);
  });

  it('should estimate speedup for fp16', () => {
    const plan = onnx.optimize({
      quantization: 'fp16', graphOptimization: 'basic',
      executionProvider: 'cpu', intraOpThreads: 1, interOpThreads: 1,
    });
    expect(plan.estimatedSpeedup).toBeGreaterThan(0);
  });
});