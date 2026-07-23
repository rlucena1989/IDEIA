import { WorkingMemory } from '../src/working-memory';

describe('WorkingMemory', () => {
  const wm = new WorkingMemory();

  it('stores and retrieves entries', () => {
    const entry = wm.store('Erro na autenticação JWT', 'error', 'auth-service', ['jwt', 'error']);
    expect(entry.level).toBe('working');
    expect(entry.id).toBeTruthy();

    const retrieved = wm.get(entry.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.content).toBe('Erro na autenticação JWT');
  });

  it('rejects disallowed categories', () => {
    expect(() => wm.store('policy test', 'policy', 'test')).toThrow();
  });

  it('evicts when full', () => {
    const small = new WorkingMemory();
    for (let i = 0; i < 60; i++) {
      small.store(`entry ${i}`, 'observation', 'test');
    }
    expect(small.size).toBeLessThanOrEqual(50);
  });

  it('searches by content', () => {
    wm.store('Login com Google', 'observation', 'auth');
    const results = wm.search('Google');
    expect(results.length).toBeGreaterThan(0);
  });

  it('clears all entries', () => {
    wm.clear();
    expect(wm.size).toBe(0);
  });
});
