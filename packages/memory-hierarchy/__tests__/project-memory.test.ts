import { ProjectMemory } from '../src/project-memory';

describe('ProjectMemory', () => {
  const pm = new ProjectMemory();

  it('stores decisions', () => {
    const entry = pm.store('Usar Clean Architecture', 'decision', 'architect-meeting', ['architecture']);
    expect(entry.level).toBe('project');
  });

  it('searches by category', () => {
    pm.store('NestJS modules', 'pattern', 'code-review', ['nestjs']);
    const results = pm.search('NestJS', 'pattern');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.category === 'pattern')).toBe(true);
  });

  it('finds by tag', () => {
    pm.store('Repository pattern', 'pattern', 'review', ['ddd', 'repository']);
    const results = pm.findByTag('ddd');
    expect(results.length).toBeGreaterThan(0);
  });

  it('archives after access threshold', () => {
    const entry = pm.store('Test entry', 'decision', 'test');
    for (let i = 0; i < 5; i++) pm.get(entry.id);
    const archived = pm.get(entry.id);
    expect(archived!.status).toBe('archived');
  });
});
