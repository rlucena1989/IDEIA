import { GlobalMemory } from '../src/global-memory';

describe('GlobalMemory', () => {
  const gm = new GlobalMemory();

  it('stores best practices', () => {
    const entry = gm.storeBestPractice('error-handling', 'Always use try-catch in async functions', ['error-handling']);
    expect(entry.level).toBe('global');
  });

  it('stores patterns', () => {
    const entry = gm.storePattern('repository', 'Repository pattern decouples data access', ['ddd']);
    expect(entry.source).toBe('pattern:repository');
    expect(entry.tags).toContain('ddd');
  });

  it('searches globally', () => {
    gm.storeBestPractice('testing', 'Write unit tests first', ['tdd']);
    const results = gm.search('unit tests');
    expect(results.length).toBeGreaterThan(0);
  });
});
