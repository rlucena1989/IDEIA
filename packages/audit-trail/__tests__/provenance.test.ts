

import { ProvenanceTracker } from '../src/provenance';

describe('ProvenanceTracker', () => {
  let tracker: ProvenanceTracker;

  beforeEach(() => {
    tracker = new ProvenanceTracker();
  });

  it('should record provenance', () => {
    const entry = tracker.record('file-a.ts', 'file-b.ts', 'transformed_to');
    expect(entry.id).toBeTruthy();
    expect(entry.source).toBe('file-a.ts');
    expect(entry.target).toBe('file-b.ts');
    expect(entry.relation).toBe('transformed_to');
    expect(entry.hash).toBeTruthy();
  });

  it('should link entries via hash chain', () => {
    const e1 = tracker.record('src/data.ts', 'src/processed.json', 'derived_from');
    const e2 = tracker.record('src/processed.json', 'src/output.ts', 'used_by');
    expect(e2.previousHash).toBe(e1.hash);
  });

  it('should get provenance chain by id', () => {
    const e1 = tracker.record('service-a', 'service-b', 'calls');
    const e2 = tracker.record('service-b', 'service-c', 'calls');
    const chain = tracker.getProvenance(e2.id);
    expect(chain).toHaveLength(2);
    expect(chain[0]!.id).toBe(e1.id);
    expect(chain[1]!.id).toBe(e2.id);
  });

  it('should get lineage by walking backwards from target', () => {
    tracker.record('db-query', 'api-response', 'generated_from');
    tracker.record('api-response', 'ui-component', 'rendered_by');
    tracker.record('user-input', 'api-response', 'triggered_by');

    const lineage = tracker.getLineage('ui-component');
    const targets = lineage.map(e => e.target);
    expect(targets).toContain('ui-component');
    const sources = lineage.map(e => e.source);
    expect(sources).toContain('db-query');
  });

  it('should query by source', () => {
    tracker.record('module-a', 'module-b', 'depends_on');
    tracker.record('module-a', 'module-c', 'depends_on');
    const results = tracker.queryBySource('module-a');
    expect(results).toHaveLength(2);
  });

  it('should query by type (relation)', () => {
    tracker.record('a', 'b', 'transformed_to');
    tracker.record('c', 'd', 'transformed_to');
    tracker.record('e', 'f', 'used_by');
    const results = tracker.queryByType('transformed_to');
    expect(results).toHaveLength(2);
  });

  it('should export provenance graph', () => {
    tracker.record('service-a', 'service-b', 'calls', { endpoint: '/api/v1' });
    tracker.record('service-b', 'service-c', 'calls', { endpoint: '/api/v2' });

    const graph = tracker.exportProvenanceGraph();
    expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges[0]!.relation).toBe('calls');
  });

  it('should verify hash chain', () => {
    tracker.record('a', 'b', 'derived_from');
    tracker.record('b', 'c', 'derived_from');
    tracker.record('c', 'd', 'derived_from');
    const result = tracker.verifyChain();
    expect(result.valid).toBe(true);
  });

  it('should detect tampered hash chain', () => {
    tracker.record('a', 'b', 'derived_from');
    tracker.record('b', 'c', 'derived_from');
    const entries = JSON.parse(tracker.toJSON());
    entries.entries[1].source = 'tampered';
    const corrupted = new ProvenanceTracker();
    corrupted.fromJSON(JSON.stringify(entries));
    const result = corrupted.verifyChain();
    expect(result.valid).toBe(false);
  });

  it('should handle serialization round-trip', () => {
    tracker.record('x', 'y', 'transformed_to');
    tracker.record('y', 'z', 'used_by');
    const json = tracker.toJSON();
    const restored = new ProvenanceTracker();
    restored.fromJSON(json);
    expect(restored.exportProvenanceGraph().edges).toHaveLength(2);
  });

  it('should respect max entries limit', () => {
    const limited = new ProvenanceTracker(3);
    limited.record('a', 'b', 'link');
    limited.record('c', 'd', 'link');
    limited.record('e', 'f', 'link');
    limited.record('g', 'h', 'link');
    expect(limited['entries'].length).toBe(3);
  });
});

describe('AuditTrail with Provenance', () => {
  let tracker: ProvenanceTracker;

  beforeEach(() => {
    tracker = new ProvenanceTracker();
  });

  it('should record provenance', () => {
    const entry = tracker.record('config.json', 'settings.yaml', 'migrated_from');
    expect(entry).not.toBeNull();
    expect(entry.source).toBe('config.json');
    expect(entry.target).toBe('settings.yaml');
    expect(entry.relation).toBe('migrated_from');
  });

  it('should get provenance chain', () => {
    const e1 = tracker.record('step-1', 'step-2', 'feeds');
    const e2 = tracker.record('step-2', 'step-3', 'triggers');
    const chain = tracker.getProvenance(e2.id);
    expect(chain).toHaveLength(2);
    expect(chain[0]!.id).toBe(e1.id);
  });

  it('should get lineage', () => {
    tracker.record('db', 'api', 'feeds');
    tracker.record('api', 'ui', 'renders');
    const lineage = tracker.getLineage('ui');
    expect(lineage.length).toBeGreaterThanOrEqual(2);
  });

  it('should export provenance graph', () => {
    tracker.record('src/main.ts', 'dist/main.js', 'compiled_to');
    const graph = tracker.exportProvenanceGraph();
    expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
    expect(graph.edges).toHaveLength(1);
  });

  it('should query by event type (relation)', () => {
    tracker.record('a', 'b', 'transformed_to');
    tracker.record('c', 'd', 'used_by');
    const results = tracker.queryByType('transformed_to');
    expect(results).toHaveLength(1);
  });

  it('should query by source', () => {
    tracker.record('module-a', 'module-b', 'depends_on');
    tracker.record('module-a', 'module-c', 'depends_on');
    const results = tracker.queryBySource('module-a');
    expect(results).toHaveLength(2);
  });

  it('should handle empty provenance graph when no entries', () => {
    const graph = tracker.exportProvenanceGraph();
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});
