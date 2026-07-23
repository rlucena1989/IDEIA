import { ContextProvenance } from '../src/provenance';

describe('ContextProvenance', () => {
  let provenance: ContextProvenance;

  beforeEach(() => {
    provenance = new ContextProvenance();
  });

  it('records entries', () => {
    provenance.record('item1', 'included', 'Relevante para a tarefa', 'decisions', 9.5);
    const entries = provenance.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].itemId).toBe('item1');
    expect(entries[0].action).toBe('included');
  });

  it('filters by action', () => {
    provenance.record('i1', 'included', 'reason1', 'src1');
    provenance.record('i2', 'excluded', 'reason2', 'src2');
    provenance.record('i3', 'included', 'reason3', 'src1');
    expect(provenance.getEntriesByAction('included').length).toBe(2);
    expect(provenance.getEntriesByAction('excluded').length).toBe(1);
  });

  it('filters by source', () => {
    provenance.record('i1', 'included', 'reason', 'decisions');
    provenance.record('i2', 'included', 'reason', 'logs');
    expect(provenance.getEntriesBySource('decisions').length).toBe(1);
  });

  it('generates summary', () => {
    provenance.record('i1', 'included', 'r1', 's1');
    provenance.record('i2', 'deduplicated', 'r2', 's2');
    const summary = provenance.summary();
    expect(summary).toContain('1 included');
    expect(summary).toContain('deduplicated=1');
  });
});
