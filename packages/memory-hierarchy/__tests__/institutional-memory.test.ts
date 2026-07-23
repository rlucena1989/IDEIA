import { InstitutionalMemory } from '../src/institutional-memory';

describe('InstitutionalMemory', () => {
  const im = new InstitutionalMemory();

  it('stores policies', () => {
    const entry = im.storePolicy('data-retention', 'Data must be retained for 90 days', ['compliance']);
    expect(entry.category).toBe('policy');
  });

  it('retrieves policy by name', () => {
    im.storePolicy('security', 'Use HTTPS only', ['security']);
    const policy = im.getPolicy('security');
    expect(policy).toBeDefined();
    expect(policy!.source).toBe('policy:security');
  });

  it('lists all policies', () => {
    im.storePolicy('p1', 'Policy 1', ['p']);
    im.storePolicy('p2', 'Policy 2', ['p']);
    const policies = im.getAllPolicies();
    expect(policies.every(p => p.category === 'policy')).toBe(true);
  });

  it('stores lessons learned', () => {
    const lesson = im.storeLesson('Avoid using any type', 'retro-2026-07', ['typescript']);
    expect(lesson.category).toBe('lesson');
  });
});
