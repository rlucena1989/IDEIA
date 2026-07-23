import { ArchitectureADR } from '../src/architecture-adr';
describe('ArchitectureADR', () => {
  it('should propose an ADR', () => {
    const adr = new ArchitectureADR();
    const d = adr.propose('Use NestJS', 'Need a framework', 'Use NestJS', ['Learning curve'], [{ name: 'NestJS', pros: ['DI'], cons: ['Complex'] }, { name: 'Express', pros: ['Simple'], cons: ['No structure'] }]);
    expect(d.status).toBe('proposed'); expect(d.options).toHaveLength(2);
  });
  it('should accept an ADR', () => {
    const adr = new ArchitectureADR();
    const d = adr.propose('Test', 'Context', 'Decision', [], [{ name: 'A', pros: ['x'], cons: ['y'] }, { name: 'B', pros: ['y'], cons: ['x'] }]);
    expect(adr.accept(d.id)).toBe(true); expect(adr.get(d.id)!.status).toBe('accepted');
  });
  it('should deprecate an ADR', () => {
    const adr = new ArchitectureADR();
    const d1 = adr.propose('Old', 'Ctx', 'Dec', [], [{ name: 'A', pros: [], cons: [] }, { name: 'B', pros: [], cons: [] }]);
    const d2 = adr.propose('New', 'Ctx', 'Dec', [], [{ name: 'A', pros: [], cons: [] }, { name: 'B', pros: [], cons: [] }]);
    adr.deprecate(d1.id, d2.id);
    expect(adr.get(d1.id)!.status).toBe('deprecated'); expect(adr.get(d1.id)!.supersededBy).toBe(d2.id);
  });
  it('should analyze trade-offs', () => {
    const adr = new ArchitectureADR();
    const d = adr.propose('DB', 'Choose DB', 'PostgreSQL', ['Some risk'], [{ name: 'PostgreSQL', pros: ['ACID', 'Mature', 'Extensions'], cons: ['Heavy'] }, { name: 'SQLite', pros: ['Lightweight'], cons: ['No concurrency'] }]);
    const analysis = adr.analyzeTradeOffs(d.id);
    expect(analysis).not.toBeNull(); expect(analysis!.chosen).toBe('PostgreSQL');
  });
  it('should list with status filter', () => {
    const adr = new ArchitectureADR();
    adr.propose('ADR-1', 'ctx', 'dec', [], [{ name: 'A', pros: [], cons: [] }, { name: 'B', pros: [], cons: [] }]);
    const d2 = adr.propose('ADR-2', 'ctx', 'dec', [], [{ name: 'A', pros: [], cons: [] }, { name: 'B', pros: [], cons: [] }]);
    adr.accept(d2.id);
    expect(adr.list('accepted')).toHaveLength(1); expect(adr.list('proposed')).toHaveLength(1);
  });
  it('should generate summary', () => {
    const adr = new ArchitectureADR();
    adr.propose('ADR-1', 'ctx', 'dec', [], [{ name: 'A', pros: [], cons: [] }, { name: 'B', pros: [], cons: [] }]);
    expect(adr.getSummary().total).toBe(1);
  });
});
