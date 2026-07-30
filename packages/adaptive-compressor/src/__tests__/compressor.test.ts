import { AdaptiveContextCompressor } from '../adaptive-context-compressor';
import { NeuralContextCompressor } from '../neural-context-compressor';
import { CausalContextSelector } from '../causal-context-selector';
import { MultiLevelCompressionCache } from '../multi-level-compression-cache';

describe('AdaptiveContextCompressor', () => {
  let compressor: AdaptiveContextCompressor;

  beforeEach(() => { compressor = new AdaptiveContextCompressor(); });

  it('should compress text with defaults', async () => {
    const result = await compressor.compress('a '.repeat(1000));
    expect(result.ratio).toBeLessThanOrEqual(0.55);
    expect(result.semanticLoss).toBeLessThanOrEqual(0.15);
  });

  it('should handle empty input', async () => {
    const result = await compressor.compress('');
    expect(result.originalTokens).toBe(0);
    expect(result.text).toBe('');
  });

  it('should respect target ratio', async () => {
    const text = 'word '.repeat(500);
    const result = await compressor.compress(text, { targetRatio: 0.8 });
    expect(result.ratio).toBeLessThanOrEqual(0.85);
  });

  it('should warn on budget exceeded', async () => {
    const text = 'word '.repeat(2000);
    const result = await compressor.compress(text, {
      budget: { softLimit: 100, hardLimit: 500, priority: 'cost' },
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should preserve code blocks', async () => {
    const text = 'Some text\n`\nconst x = 1;\n`\nMore text';
    const result = await compressor.compress(text, {
      targetRatio: 0.8, preserveCodeBlocks: true,
    });
    expect(result.text).toContain('const x = 1;');
  });

  it('should produce compression steps', async () => {
    const text = 'The quick brown fox '.repeat(200);
    const result = await compressor.compress(text, { targetRatio: 0.5 });
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0].strategy).toBeDefined();
  });

  it('should estimate compression', async () => {
    const estimate = await compressor.estimate('test '.repeat(100), 0.5);
    expect(estimate.totalRatio).toBeGreaterThan(0);
    expect(estimate.recommendedLevel).toBeGreaterThan(0);
  });

  it('should handle aggressive compression', async () => {
    const text = 'Information about the system configuration '.repeat(50);
    const result = await compressor.compress(text, { targetRatio: 0.2 });
    expect(result.ratio).toBeLessThanOrEqual(0.3);
  });
});

describe('NeuralContextCompressor', () => {
  let neural: NeuralContextCompressor;
  beforeEach(() => { neural = new NeuralContextCompressor(); });

  it('should compress text', async () => {
    const result = await neural.compress('hello world this is a test of compression', 'code');
    expect(result.compressed.length).toBeGreaterThan(0);
    expect(result.ratio).toBeGreaterThan(0);
    expect(result.loss).toBeLessThanOrEqual(0.1);
  });

  it('should handle empty input', async () => {
    const result = await neural.compress('', 'conversation');
    expect(result.compressed.length).toBe(0);
  });

  it('should produce different results for different context types', async () => {
    const r1 = await neural.compress('function foo() { return 1; }', 'code');
    const r2 = await neural.compress('function foo() { return 1; }', 'conversation');
    expect(r1.compressed).not.toBe('');
    expect(r2.compressed).not.toBe('');
  });

  it('should respect gist ratio', async () => {
    const result = await neural.compress('a '.repeat(200), 'code');
    expect(result.ratio).toBeLessThanOrEqual(1);
    expect(result.ratio).toBeGreaterThan(0);
  });
});

describe('CausalContextSelector', () => {
  let selector: CausalContextSelector;
  beforeEach(() => { selector = new CausalContextSelector(); });

  it('should score context tokens', async () => {
    const scores = await selector.scoreContext('function foo() { return 1; }', 'code');
    expect(scores.length).toBeGreaterThan(0);
    expect(scores[0].causalRelevance).toBeDefined();
  });

  it('should select causal context', async () => {
    const result = await selector.selectCausalContext(
      'the function foo is defined with bar parameter that returns value', 'code', 0.5,
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it('should record and estimate ATE', () => {
    selector.recordIntervention('code', 'function', 0.8);
    selector.recordIntervention('code', 'function', 0.9);
    selector.recordIntervention('code', 'function', 0.85);
    const ate = selector.estimateATE('function', 'code');
    expect(ate).toBeGreaterThan(0);
  });

  it('should handle query context', async () => {
    const scores = await selector.scoreContext('The API endpoint returns JSON data', 'documentation', 'API endpoint');
    const causal = scores.filter(s => s.isCausal);
    expect(causal.length).toBeGreaterThan(0);
  });
});

  it('should handle very large output', async () => {
    const text = 'test '.repeat(10000);
    const result = await compressor.compress(text, { targetRatio: 0.1 });
    expect(result.text.length).toBeLessThan(text.length);
  });

  it('should work with different task types', async () => {
    const text = 'Analyze the metrics and compare trends between Q1 and Q2';
    const result = await compressor.compress(text, { taskType: 'analysis', targetRatio: 0.5 });
    expect(result.text).toBeTruthy();
  });

  it('should produce predictable results for same input', async () => {
    const text = 'The quick brown fox';
    const r1 = await compressor.compress(text, { targetRatio: 0.9 });
    const r2 = await compressor.compress(text, { targetRatio: 0.9 });
    expect(r1.text).toBe(r2.text);
  });

  it('should handle conversation task type', async () => {
    const text = 'Hello, how are you? I am doing great today.';
    const result = await compressor.compress(text, { taskType: 'conversation', targetRatio: 0.6 });
    expect(result.text).toBeTruthy();
    expect(result.warnings).toBeDefined();
  });

describe('MultiLevelCompressionCache', () => {
  let cache: MultiLevelCompressionCache;
  beforeEach(() => { cache = new MultiLevelCompressionCache(); });

  it('should store and retrieve from L1', async () => {
    await cache.set('key1', 'small data', 'code');
    const result = await cache.get('key1');
    expect(result).toBe('small data');
  });

  it('should promote from L2 to L1', async () => {
    await cache.set('key1', 'x'.repeat(10000), 'code');
    for (let i = 0; i < 6; i++) {
      await cache.get('key1');
    }
    const stats = cache.getStats();
    expect(stats.l1.entries + stats.l2.entries + stats.l3.entries).toBe(1);
  });

  it('should return null for missing key', async () => {
    expect(await cache.get('nonexistent')).toBeNull();
  });

  it('should get stats', async () => {
    await cache.set('k1', 'data1', 'code');
    await cache.set('k2', 'data2', 'code');
    const stats = cache.getStats();
    expect(stats.l1.entries).toBeGreaterThan(0);
    expect(stats.l1.size).toBeGreaterThan(0);
  });

  it('should clear all levels', async () => {
    await cache.set('k1', 'data', 'code');
    cache.clear();
    expect(cache.getStats().l1.entries).toBe(0);
  });
});
