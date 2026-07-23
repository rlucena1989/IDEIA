import { SemanticClassifier } from '../src/classifier';
import { ConsensusEngine } from '../src/consensus';
import { ConfidenceScorer } from '../src/scorer';
import { ConsensusProvider } from '../src/types';

describe('SemanticClassifier', () => {
  const classifier = new SemanticClassifier();

  it('should classify web development input', () => {
    const result = classifier.classify('Build a React frontend with REST API integration');
    expect(result.domain).toContain('web-development');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify security input', () => {
    const result = classifier.classify('Fix OWASP XSS vulnerability in JWT auth');
    expect(result.domain).toContain('security');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify complex input', () => {
    const result = classifier.classify('Implement distributed consensus algorithm with realtime CRDT synchronization');
    expect(result.complexity).toBe('complex');
  });

  it('should classify simple input', () => {
    const result = classifier.classify('Create a simple CRUD list form');
    expect(result.complexity).toBe('simple');
  });

  it('should handle empty input', () => {
    const result = classifier.classify('');
    expect(result.domain).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.complexity).toBe('simple');
  });

  it('should deduplicate keywords', () => {
    const result = classifier.classify('api api api endpoint rest');
    const apiCount = result.keywords.filter(k => k === 'api').length;
    expect(apiCount).toBeLessThanOrEqual(1);
  });
});

describe('ConsensusEngine', () => {
  it('should reach consensus with multiple providers', async () => {
    const engine = new ConsensusEngine();
    const providers: ConsensusProvider[] = [
      { name: 'provider-a', async vote() { return { decision: 'implement', confidence: 0.8 }; } },
      { name: 'provider-b', async vote() { return { decision: 'implement', confidence: 0.7 }; } },
    ];

    const result = await engine.reachConsensus('test prompt', providers);
    expect(result.consensus).toBe('implement');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.votes.length).toBe(2);
  });

  it('should handle insufficient votes', async () => {
    const engine = new ConsensusEngine({ minVotes: 3 });
    const providers: ConsensusProvider[] = [
      { name: 'only-one', async vote() { return { decision: 'yes', confidence: 0.5 }; } },
    ];

    const result = await engine.reachConsensus('test', providers);
    expect(result.consensus).toBe('insufficient_votes');
    expect(result.confidence).toBe(0);
  });

  it('should handle provider errors', async () => {
    const engine = new ConsensusEngine();
    const providers: ConsensusProvider[] = [
      { name: 'failing', async vote() { throw new Error('timeout'); } },
    ];

    const result = await engine.reachConsensus('test', providers);
    expect(result.votes.length).toBe(0);
  });
});

describe('ConfidenceScorer', () => {
  const scorer = new ConfidenceScorer();

  it('should score based on classification', async () => {
    const result = await scorer.score({ input: 'Build a REST API' });
    expect(result.overall).toBeGreaterThan(0);
    expect(result.level).toBeDefined();
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('should return unknown with no input', async () => {
    const result = await scorer.score({});
    expect(result.overall).toBe(0);
    expect(result.level).toBe('unknown');
  });

  it('should include classification helper', () => {
    const classification = scorer.classify('Deploy to Kubernetes with Docker');
    expect(classification.domain).toContain('devops');
  });
});
