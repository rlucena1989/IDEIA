import { ProvenanceTracker } from '../provenance-tracker';
import { MerkleProvenanceTree } from '../merkle-provenance-tree';
import { InfluenceVisualizer } from '../influence-visualizer';
import { ZKProvenanceVerifier } from '../zk-provenance-verifier';
import { DPProvenanceAnonymizer } from '../dp-provenance-anonymizer';
import { TEEProvenanceAttestation } from '../tee-provenance-attestation';
import { ContextItem, SourceType, ProvenanceReason } from '../types';

describe('ProvenanceTracker', () => {
  let tracker: ProvenanceTracker;
  beforeEach(() => { tracker = new ProvenanceTracker(); });

  it('should record inclusion and generate entry', () => {
    const item: ContextItem = {
      id: 'test-1', content: 'Important context data', source: 'test/file.md',
      sourceType: SourceType.FILE, metadata: {}, tokenCount: 10, relevanceScore: 0.8,
    };
    const entry = tracker.recordInclusion(item, 0.8);
    expect(entry.itemId).toBe('test-1');
    expect(entry.score).toBe(0.8);
    expect(entry.hash).toBeTruthy();
    expect(entry.sequence).toBe(1);
  });

  it('should chain entries with previous hash', () => {
    const item1: ContextItem = { id: 'a', content: 'A', source: 'src/a', sourceType: SourceType.FILE, metadata: {}, tokenCount: 1, relevanceScore: 0.5 };
    const item2: ContextItem = { id: 'b', content: 'B', source: 'src/b', sourceType: SourceType.FILE, metadata: {}, tokenCount: 1, relevanceScore: 0.5 };
    const e1 = tracker.recordInclusion(item1, 0.5);
    const e2 = tracker.recordInclusion(item2, 0.7);
    expect(e2.previousHash).toBe(e1.hash);
    expect(e2.sequence).toBe(2);
  });

  it('should detect chain tampering', () => {
    const item1: ContextItem = { id: 'a', content: 'A', source: 'src/a', sourceType: SourceType.FILE, metadata: {}, tokenCount: 1, relevanceScore: 0.5 };
    const item2: ContextItem = { id: 'b', content: 'B', source: 'src/b', sourceType: SourceType.FILE, metadata: {}, tokenCount: 1, relevanceScore: 0.5 };
    tracker.recordInclusion(item1, 0.5);
    const e2 = tracker.recordInclusion(item2, 0.7);
    expect(tracker.verifyIntegrity()).toBe(true);
    e2.score = 0.9;
    expect(tracker.verifyIntegrity()).toBe(false);
  });

  it('should record exclusion', () => {
    const item: ContextItem = { id: 'x', content: 'secret', source: 'db/passwords', sourceType: SourceType.DATABASE, metadata: {}, tokenCount: 5, relevanceScore: 0.1 };
    const entry = tracker.recordExclusion(item, ProvenanceReason.EXCLUDED_CONFIDENTIAL, 'Sensitive data');
    expect(entry.reason).toBe(ProvenanceReason.EXCLUDED_CONFIDENTIAL);
    expect(entry.score).toBe(0);
  });

  it('should record batch', () => {
    const items = [
      { id: '1', content: 'A', source: 's1', sourceType: SourceType.FILE, metadata: {}, tokenCount: 1, relevanceScore: 0.5 },
      { id: '2', content: 'B', source: 's2', sourceType: SourceType.FILE, metadata: {}, tokenCount: 1, relevanceScore: 0.6 },
    ];
    const entries = tracker.recordContextBatch(items, [0.8, 0.9]);
    expect(entries.length).toBe(2);
  });

  it('should record LLM response', () => {
    const item: ContextItem = { id: 'i1', content: 'data', source: 'src', sourceType: SourceType.FILE, metadata: {}, tokenCount: 1, relevanceScore: 0.5 };
    tracker.recordInclusion(item, 0.5);
    tracker.recordLLMResponse('Generated response');
    const chain = tracker.getChain();
    expect(chain.length).toBe(2);
    expect(chain[1].itemId).toBe('__llm_response__');
  });

  it('should generate report', () => {
    const item: ContextItem = { id: 'i1', content: 'data', source: 'src', sourceType: SourceType.FILE, metadata: {}, tokenCount: 1, relevanceScore: 0.5 };
    tracker.recordInclusion(item, 0.8);
    tracker.setLLMModel('gpt-4');
    tracker.setTokensUsed(1000);
    const report = tracker.generateReport();
    expect(report.included).toBe(1);
    expect(report.llmModel).toBe('gpt-4');
    expect(report.tokensUsed).toBe(1000);
  });

  it('should reset state', () => {
    const item: ContextItem = { id: 'i1', content: 'data', source: 'src', sourceType: SourceType.FILE, metadata: {}, tokenCount: 1, relevanceScore: 0.5 };
    tracker.recordInclusion(item, 0.5);
    tracker.reset();
    expect(tracker.getChain().length).toBe(0);
  });
});

describe('MerkleProvenanceTree', () => {
  let tree: MerkleProvenanceTree;
  beforeEach(() => { tree = new MerkleProvenanceTree(); });

  it('should build tree from entries', () => {
    const entries = [
      { id: '1', itemId: 'a', source: 's', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.5, contentHash: 'c1', sourceHash: 'sh1', metadata: {}, timestamp: 1, previousHash: '0', hash: 'h1', sequence: 1 },
      { id: '2', itemId: 'b', source: 's', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.7, contentHash: 'c2', sourceHash: 'sh2', metadata: {}, timestamp: 2, previousHash: 'h1', hash: 'h2', sequence: 2 },
    ];
    const root = tree.build(entries);
    expect(root.hash.length).toBe(64);
  });

  it('should verify integrity', () => {
    const entries = [
      { id: '1', itemId: 'a', source: 's', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.5, contentHash: 'c1', sourceHash: 'sh1', metadata: {}, timestamp: 1, previousHash: '0', hash: 'h1', sequence: 1 },
    ];
    tree.build(entries);
    expect(tree.verify(entries)).toBe(true);
    entries[0].hash = 'tampered';
    expect(tree.verify(entries)).toBe(false);
  });

  it('should generate proof', () => {
    const entries = [
      { id: '1', itemId: 'a', source: 's', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.5, contentHash: 'c1', sourceHash: 'sh1', metadata: {}, timestamp: 1, previousHash: '0', hash: 'h1', sequence: 1 },
      { id: '2', itemId: 'b', source: 's', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.7, contentHash: 'c2', sourceHash: 'sh2', metadata: {}, timestamp: 2, previousHash: 'h1', hash: 'h2', sequence: 2 },
    ];
    tree.build(entries);
    const proof = tree.generateProof('h1');
    expect(proof.length).toBeGreaterThan(0);
  });

  it('should return zero root for empty entries', () => {
    tree.build([]);
    expect(tree.getRootHash()).toBe('0');
  });

  it('should export JSON', () => {
    tree.build([]);
    const json = tree.toJSON();
    expect(json.root).toBe('0');
  });
});

describe('InfluenceVisualizer', () => {
  let viz: InfluenceVisualizer;
  beforeEach(() => { viz = new InfluenceVisualizer(); });

  it('should build graph', () => {
    const entries = [
      { id: '1', itemId: 'a', source: 'docs/api.md', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.8, contentHash: 'ch1', sourceHash: 'sh1', metadata: {}, timestamp: 1, previousHash: '0', hash: 'h1', sequence: 1 },
    ];
    const graph = viz.buildGraph(entries, 'The API documentation shows how to use REST endpoints');
    expect(graph.nodes.length).toBe(1);
  });

  it('should score attribution', () => {
    const entries = [
      { id: '1', itemId: 'a', source: 'docs', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.5, contentHash: 'ch1', sourceHash: 'sh1', metadata: {}, timestamp: 1, previousHash: '0', hash: 'h1', sequence: 1 },
    ];
    const scores = viz.scoreAttribution(entries, [{ text: 'docs content', source: 'docs' }]);
    expect(scores.size).toBeGreaterThan(0);
  });

  it('should generate mermaid output', () => {
    const entries = [
      { id: '1', itemId: 'a', source: 'src', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.5, contentHash: 'ch1', sourceHash: 'sh1', metadata: {}, timestamp: 1, previousHash: '0', hash: 'h1', sequence: 1 },
    ];
    const graph = viz.buildGraph(entries, 'src content');
    const mermaid = viz.toMermaid(graph);
    expect(mermaid).toContain('graph LR');
  });

  it('should generate markdown output', () => {
    const graph = viz.buildGraph([], 'test');
    const md = viz.toMarkdown(graph);
    expect(md).toContain('Influence Graph');
  });
});

describe('ZKProvenanceVerifier', () => {
  let zk: ZKProvenanceVerifier;
  beforeEach(() => { zk = new ZKProvenanceVerifier(); });

  it('should generate proof', async () => {
    const proof = await zk.generateProof([{ id: '1', source: 's', contentHash: 'ch1' }], 'root123');
    expect(proof.proof.length).toBeGreaterThan(0);
    expect(proof.publicInputs.entryCount).toBe(1);
  });

  it('should verify proof', async () => {
    const proof = await zk.generateProof([{ id: '1', source: 's', contentHash: 'ch1' }], 'root123');
    const valid = await zk.verifyProof(proof);
    expect(typeof valid).toBe('boolean');
  });
});

describe('DPProvenanceAnonymizer', () => {
  let dp: DPProvenanceAnonymizer;
  beforeEach(() => { dp = new DPProvenanceAnonymizer(); });

  it('should anonymize influence score', () => {
    const result = dp.anonymizeInfluenceScore(0.5);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should anonymize source distribution', () => {
    const entries = [
      { id: '1', itemId: 'a', source: 's1', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.5, contentHash: 'ch1', sourceHash: 'sh1', metadata: {}, timestamp: 1, previousHash: '0', hash: 'h1', sequence: 1 },
      { id: '2', itemId: 'b', source: 's1', sourceType: SourceType.FILE, reason: ProvenanceReason.INCLUDED, score: 0.7, contentHash: 'ch2', sourceHash: 'sh2', metadata: {}, timestamp: 2, previousHash: 'h1', hash: 'h2', sequence: 2 },
    ];
    const dist = dp.anonymizeSourceDistribution(entries);
    expect(dist.get('s1')).toBeGreaterThan(0);
  });

  it('should support epsilon adjustment', () => {
    dp.setEpsilon(0.5);
    expect(dp.getEpsilon()).toBe(0.5);
  });
});

describe('TEEProvenanceAttestation', () => {
  let tee: TEEProvenanceAttestation;
  beforeEach(() => { tee = new TEEProvenanceAttestation(); });

  it('should attest environment', async () => {
    const report = await tee.attestEnvironment();
    expect(report.teeType).toBe('Intel SGX');
    expect(report.verified).toBe(true);
  });

  it('should seal provenance store', async () => {
    const sealed = await tee.sealedProvenanceStore([{ hash: 'h1', sequence: 1 }]);
    expect(sealed).toContain('TEE-SEALED');
  });
});

describe('ProvenanceTracker Integration', () => {
  it('should handle full session lifecycle', () => {
    const tracker = new ProvenanceTracker();
    tracker.setLLMModel('gpt-4');
    tracker.setTokensUsed(500);
    const item: ContextItem = { id: 'full', content: 'Integration test data', source: 'test.md', sourceType: SourceType.FILE, metadata: {}, tokenCount: 5, relevanceScore: 0.9 };
    tracker.recordInclusion(item, 0.9);
    tracker.recordLLMResponse('Generated from integration test');
    const report = tracker.generateReport();
    expect(report.sessionId).toBeTruthy();
    expect(report.included).toBe(1);
    expect(report.chainLength).toBe(2);
    expect(report.chainValid).toBe(true);
  });
});