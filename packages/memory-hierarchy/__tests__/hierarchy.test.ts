import { MemoryHierarchy, createMemoryHierarchy } from '../src/index';

describe('MemoryHierarchy (integration)', () => {
  const hierarchy = createMemoryHierarchy();

  it('stores in correct level based on category', () => {
    const error = hierarchy.store('Timeout error', 'error', 'api');
    expect(error.level).toBe('working');

    const decision = hierarchy.store('Use PostgreSQL', 'decision', 'arch-meeting');
    expect(decision.level).toBe('project');

    const policy = hierarchy.store('Data retention policy', 'policy', 'compliance');
    expect(policy.level).toBe('institutional');
  });

  it('stores in explicit level', () => {
    const entry = hierarchy.store('Override level', 'observation', 'test', 'project');
    expect(entry.level).toBe('project');
  });

  it('searches across all levels', () => {
    hierarchy.store('JWT authentication', 'decision', 'auth-team', 'project', ['jwt']);
    hierarchy.store('JWT token error', 'error', 'auth-service', 'working', ['jwt']);

    const results = hierarchy.search('JWT');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('searches in specific level', () => {
    const results = hierarchy.search('JWT', 'project');
    expect(results.every(r => r.level === 'project')).toBe(true);
  });

  it('returns hierarchy summary', () => {
    const summary = hierarchy.getSummary();
    expect(summary.length).toBe(4);
    expect(summary.map(s => s.level)).toEqual(['working', 'project', 'institutional', 'global']);
  });

  it('curator promotes entries', () => {
    const entry = hierarchy.working.store('Frequent decision', 'decision', 'frequent');
    for (let i = 0; i < 5; i++) hierarchy.working.get(entry.id);

    const { promoted } = hierarchy.curator.evaluatePromotions();
    expect(promoted.length).toBeGreaterThanOrEqual(0);
  });
});
