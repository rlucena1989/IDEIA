import { HybridSearchEngine, HybridSearchContextComposer } from '../hybrid-search-engine';
import { RRFScorer } from '../rrf-scorer';
import { CrossEncoderReRanker } from '../cross-encoder-reranker';
import { ColBERTSearcher } from '../colbert-searcher';
import { SPLADESearcher } from '../splade-searcher';
import { AdaptiveWeightLearner } from '../adaptive-weight-learner';
import { LearnedSparseRetriever } from '../learned-sparse-retriever';
import { DistilledCrossEncoder } from '../distilled-cross-encoder';
import { AdaptiveFusionRanker } from '../adaptive-fusion-ranker';
import { RankedItem, SearchWeights } from '../types';

describe('RRFScorer', () => {
  const fuser = new RRFScorer();

  it('should fuse three lists with RRF', () => {
    const list1: RankedItem[] = [{ id: 'a', score: 1, rank: 1, source: 'text', metadata: {}, content: 'a' }];
    const list2: RankedItem[] = [{ id: 'b', score: 1, rank: 1, source: 'vector', metadata: {}, content: 'b' }];
    const list3: RankedItem[] = [{ id: 'a', score: 1, rank: 1, source: 'sparse', metadata: {}, content: 'a' }];
    const result = fuser.fuse([list1, list2, list3], ['text', 'vector', 'sparse'], { text: 0.4, vector: 0.4, sparse: 0.2 });
    expect(result.length).toBe(2);
    const itemA = result.find(r => r.id === 'a');
    expect(itemA!.rrfScore).toBeGreaterThan(0);
  });

  it('should support Borda count fusion', () => {
    const list1: RankedItem[] = [
      { id: 'a', score: 1, rank: 1, source: 'text', metadata: {}, content: 'a' },
      { id: 'b', score: 0.5, rank: 2, source: 'text', metadata: {}, content: 'b' },
    ];
    const list2: RankedItem[] = [
      { id: 'b', score: 1, rank: 1, source: 'vector', metadata: {}, content: 'b' },
      { id: 'c', score: 0.5, rank: 2, source: 'vector', metadata: {}, content: 'c' },
    ];
    const result = fuser.fuse([list1, list2], ['text', 'vector'], { text: 0.5, vector: 0.5, sparse: 0 }, 'borda');
    expect(result.length).toBe(3);
  });

  it('should handle empty lists gracefully', () => {
    const result = fuser.fuse([[], [], []], ['text', 'vector', 'sparse'], { text: 0.4, vector: 0.4, sparse: 0.2 });
    expect(result.length).toBe(0);
  });

  it('should support combSUM fusion', () => {
    const list1: RankedItem[] = [
      { id: 'a', score: 0.9, rank: 1, source: 'text', metadata: {}, content: 'a' },
      { id: 'b', score: 0.3, rank: 2, source: 'text', metadata: {}, content: 'b' },
    ];
    const list2: RankedItem[] = [
      { id: 'a', score: 0.8, rank: 1, source: 'vector', metadata: {}, content: 'a' },
      { id: 'b', score: 0.2, rank: 2, source: 'vector', metadata: {}, content: 'b' },
    ];
    const result = fuser.fuse([list1, list2], ['text', 'vector'], { text: 0.5, vector: 0.5, sparse: 0 }, 'combsum');
    expect(result.length).toBe(2);
    expect(result[0].rrfScore).toBeGreaterThan(0);
  });

  it('should support combMNZ fusion', () => {
    const list1: RankedItem[] = [{ id: 'a', score: 1, rank: 1, source: 'text', metadata: {}, content: 'a' }];
    const list2: RankedItem[] = [{ id: 'a', score: 1, rank: 1, source: 'vector', metadata: {}, content: 'a' }];
    const result = fuser.fuse([list1, list2], ['text', 'vector'], { text: 0.5, vector: 0.5, sparse: 0 }, 'combmnz');
    expect(result.length).toBe(1);
  });

  it('should support weighted RRF', () => {
    const list1: RankedItem[] = [{ id: 'a', score: 1, rank: 1, source: 'text', metadata: {}, content: 'a' }];
    const list2: RankedItem[] = [{ id: 'b', score: 1, rank: 1, source: 'vector', metadata: {}, content: 'b' }];
    const result = fuser.fuse([list1, list2], ['text', 'vector'], { text: 0.8, vector: 0.2, sparse: 0 }, 'weighted_rrf');
    expect(result.length).toBe(2);
    expect(result[0].rrfScore).toBeGreaterThan(0);
  });
});

describe('CrossEncoderReRanker', () => {
  it('should rerank candidates', async () => {
    const reranker = new CrossEncoderReRanker();
    const candidates = [
      { id: 'a', rrfScore: 1.0, individualScores: {}, metadata: {}, content: 'doc a' },
      { id: 'b', rrfScore: 0.5, individualScores: {}, metadata: {}, content: 'doc b' },
    ];
    const result = await reranker.rerank('query', candidates, 2);
    expect(result.length).toBe(2);
  });

  it('should return empty for no candidates', async () => {
    const reranker = new CrossEncoderReRanker();
    const result = await reranker.rerank('query', [], 10);
    expect(result.length).toBe(0);
  });

  it('should handle single candidate', async () => {
    const reranker = new CrossEncoderReRanker();
    const result = await reranker.rerank('query', [{ id: 'a', rrfScore: 1, individualScores: {}, metadata: {}, content: 'x' }], 10);
    expect(result.length).toBe(1);
  });

  it('should batch rerank', async () => {
    const reranker = new CrossEncoderReRanker();
    const queries = ['q1', 'q2'];
    const candidates = [
      [{ id: 'a', rrfScore: 1, individualScores: {}, metadata: {}, content: 'doc a' }],
      [{ id: 'b', rrfScore: 1, individualScores: {}, metadata: {}, content: 'doc b' }],
    ];
    const results = await reranker.batchRerank(queries, candidates, 1);
    expect(results.length).toBe(2);
    expect(results[0].length).toBe(1);
  });
});

describe('ColBERTSearcher', () => {
  it('should encode text', async () => {
    const colbert = new ColBERTSearcher();
    const emb = await colbert.encode('hello world');
    expect(emb.length).toBe(128);
  });

  it('should cache embeddings', async () => {
    const colbert = new ColBERTSearcher();
    await colbert.encode('test');
    expect(colbert.cacheSize).toBe(1);
  });

  it('should rank documents', async () => {
    const colbert = new ColBERTSearcher();
    const scores = await colbert.rank('query', ['doc1', 'doc2']);
    expect(scores.length).toBe(2);
  });

  it('should search', async () => {
    const colbert = new ColBERTSearcher();
    const results = await colbert.search('test query', 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should clear cache', async () => {
    const colbert = new ColBERTSearcher();
    await colbert.encode('test');
    colbert.clearCache();
    expect(colbert.cacheSize).toBe(0);
  });
});

describe('SPLADESearcher', () => {
  it('should index and search documents', async () => {
    const searcher = new SPLADESearcher();
    searcher.indexDocument('1', 'dependency injection container for Node.js');
    searcher.indexDocument('2', 'inversion of control pattern');
    const results = await searcher.search('dependency injection', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(searcher.getDocumentCount()).toBe(2);
    expect(searcher.getIndexSize()).toBeGreaterThan(0);
  });

  it('should return term count', () => {
    const searcher = new SPLADESearcher();
    searcher.indexDocument('1', 'test document');
    expect(searcher.getTermCount()).toBeGreaterThan(0);
  });

  it('should return empty for unmatched query', async () => {
    const searcher = new SPLADESearcher();
    const results = await searcher.search('nonexistentxxxxx', 10);
    expect(results.length).toBe(0);
  });
});

describe('AdaptiveWeightLearner', () => {
  it('should return code_search weights for code queries', async () => {
    const tuner = new AdaptiveWeightLearner();
    const weights = await tuner.tune('`validateToken` function');
    expect(weights.text).toBe(0.7);
  });

  it('should return semantic weights for pt-br queries', async () => {
    const tuner = new AdaptiveWeightLearner();
    const weights = await tuner.tune('o que e um agregado no DDD');
    expect(weights.vector).toBeGreaterThan(0.6);
  });

  it('should learn from user feedback', async () => {
    const tuner = new AdaptiveWeightLearner();
    await tuner.learnFromFeedback('test query', ['doc1', 'doc2'], ['doc3']);
    expect(tuner.getFeedbackCount()).toBe(1);
  });

  it('should return default weights for short queries', async () => {
    const tuner = new AdaptiveWeightLearner();
    const weights = await tuner.tune('test');
    expect(weights.text).toBe(0.4);
    expect(weights.vector).toBe(0.4);
  });

  it('should boost text for exact terms', async () => {
    const tuner = new AdaptiveWeightLearner();
    const weights = await tuner.tune('"exact phrase" query');
    expect(weights.text).toBe(0.8);
  });

  it('should boost text for backtick code', async () => {
    const tuner = new AdaptiveWeightLearner();
    const weights = await tuner.tune('use `jwt` for tokens');
    expect(weights.text).toBe(0.7);
  });

  it('should boost vector for questions', async () => {
    const tuner = new AdaptiveWeightLearner();
    const weights = await tuner.tune('how does this work?');
    expect(weights.vector).toBe(0.6);
  });
});

describe('LearnedSparseRetriever', () => {
  it('should index and search documents', () => {
    const retriever = new LearnedSparseRetriever();
    retriever.indexDocument('1', 'machine learning algorithms');
    retriever.indexDocument('2', 'deep neural networks');
    const results = retriever.search('machine learning', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(retriever.getDocumentCount()).toBe(2);
  });

  it('should clear index', () => {
    const retriever = new LearnedSparseRetriever();
    retriever.indexDocument('1', 'test');
    retriever.clear();
    expect(retriever.getDocumentCount()).toBe(0);
  });

  it('should encode with top-k pruning', () => {
    const retriever = new LearnedSparseRetriever();
    const encoding = retriever.encode('a b c d e f g h i j k l m n o p q r s t u v w x y z');
    expect(encoding.size).toBeLessThanOrEqual(128);
  });
});

describe('DistilledCrossEncoder', () => {
  it('should distill from teacher scores', async () => {
    const encoder = new DistilledCrossEncoder();
    const report = await encoder.distill(['query1', 'query2'], ['doc1', 'doc2'], [0.9, 0.8]);
    expect(report.mse).toBeGreaterThanOrEqual(0);
    expect(report.accuracy).toBeGreaterThanOrEqual(0);
    expect(report.compressionRatio).toBe(10);
  });

  it('should predict student score', async () => {
    const encoder = new DistilledCrossEncoder();
    const score = await encoder.predictStudent('test query', 'this is a test document');
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should return student weights', () => {
    const encoder = new DistilledCrossEncoder();
    expect(encoder.getStudentWeights().length).toBe(3);
  });
});

describe('AdaptiveFusionRanker', () => {
  it('should update weights based on feedback', async () => {
    const ranker = new AdaptiveFusionRanker();
    const list: RankedItem[] = [{ id: 'a', score: 1, rank: 1, source: 'text', metadata: {}, content: 'a' }];
    await ranker.update(list, list, list, 0);
    const weights = ranker.getWeights();
    expect(weights.length).toBe(3);
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 1);
  });

  it('should compute convergence score', () => {
    const ranker = new AdaptiveFusionRanker();
    expect(ranker.getConvergenceScore()).toBe(0);
  });

  it('should compute fused score', () => {
    const ranker = new AdaptiveFusionRanker();
    const textRanks = new Map([['a', 1]]);
    const vectorRanks = new Map([['a', 2]]);
    const sparseRanks = new Map([['a', 3]]);
    const score = ranker.fusedScore('a', textRanks, vectorRanks, sparseRanks);
    expect(score).toBeGreaterThan(0);
  });
});

describe('HybridSearchEngine', () => {
  let engine: HybridSearchEngine;

  beforeEach(() => {
    engine = new HybridSearchEngine(
      new RRFScorer(),
      new CrossEncoderReRanker(),
      new ColBERTSearcher(),
      new SPLADESearcher(),
      new AdaptiveWeightLearner()
    );
  });

  it('should return results for a text query', async () => {
    const results = await engine.search({ text: 'authentication JWT' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should use rrf by default', async () => {
    const results = await engine.search({ text: 'cache strategy' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return searchWithDebug', async () => {
    const debug = await engine.searchWithDebug({ text: 'test' });
    expect(debug.results.length).toBeGreaterThan(0);
    expect(debug.debug.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should accept embedding query', async () => {
    const results = await engine.search({ text: 'test', embedding: Array.from({ length: 768 }, () => Math.random()) });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should respect topK', async () => {
    const results = await engine.search({ text: 'test', topK: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe('HybridSearchContextComposer', () => {
  it('should compose context from search results', async () => {
    const engine = new HybridSearchEngine(
      new RRFScorer(),
      new CrossEncoderReRanker(),
      new ColBERTSearcher(),
      new SPLADESearcher(),
      new AdaptiveWeightLearner()
    );
    const composer = new HybridSearchContextComposer(engine, new CrossEncoderReRanker(), new ColBERTSearcher());
    const ctx = await composer.compose('how to configure NATS', { maxTokens: 2000 });
    expect(ctx.documents.length).toBeGreaterThan(0);
    expect(ctx.totalTokens).toBeLessThanOrEqual(2000);
    expect(ctx.searchMetadata.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
