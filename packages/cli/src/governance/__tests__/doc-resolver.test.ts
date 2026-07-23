import { resolveDocument, resolveByTags } from '../doc-resolver';

describe('doc-resolver', () => {
  describe('resolveDocument', () => {
    it('resolves by exact id', () => {
      const result = resolveDocument('master-plan');
      expect(result.primary).toBeDefined();
      expect(result.primary!.id).toBe('master-plan');
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('master-plan');
    });

    it('resolves by tag when no id match', () => {
      const result = resolveDocument('execution');
      expect(result.primary).toBeDefined();
      expect(result.blocked).toBe(false);
      expect(result.primary!.tags).toContain('execution');
    });

    it('prioritizes id over tag when both match', () => {
      const result = resolveDocument('backlog');
      expect(result.primary).toBeDefined();
      expect(result.primary!.id).toBe('backlog');
    });

    it('returns blocked with fallbacks for unknown type', () => {
      const result = resolveDocument('unknown-task-type-xyz');
      expect(result.primary).toBeNull();
      expect(result.blocked).toBe(true);
      expect(result.fallbacks.length).toBeGreaterThan(0);
    });

    it('limits fallbacks to 3', () => {
      const result = resolveDocument('unknown-task-type-xyz');
      expect(result.fallbacks.length).toBeLessThanOrEqual(3);
    });

    it('sorts fallbacks by priority', () => {
      const result = resolveDocument('unknown-task-type-xyz');
      for (let i = 0; i < result.fallbacks.length - 1; i++) {
        expect(result.fallbacks[i].priority).toBeGreaterThanOrEqual(result.fallbacks[i + 1].priority);
      }
    });

    it('excludes primary from fallbacks', () => {
      const result = resolveDocument('master-plan');
      expect(result.fallbacks.every(f => f.id !== 'master-plan')).toBe(true);
    });
  });

  describe('resolveByTags', () => {
    it('resolves by single matching tag', () => {
      const result = resolveByTags(['tests']);
      expect(result.primary).toBeDefined();
      expect(result.blocked).toBe(false);
      expect(result.primary!.tags).toContain('tests');
    });

    it('resolves by multiple tags, picks highest priority match', () => {
      const result = resolveByTags(['tests', 'execution']);
      expect(result.primary).toBeDefined();
      expect(result.blocked).toBe(false);
    });

    it('returns blocked with empty fallbacks for no match', () => {
      const result = resolveByTags(['nonexistent-tag-99']);
      expect(result.primary).toBeNull();
      expect(result.blocked).toBe(true);
      expect(result.fallbacks).toEqual([]);
    });

    it('limits fallbacks to 3', () => {
      const result = resolveByTags(['planning']);
      expect(result.fallbacks.length).toBeLessThanOrEqual(3);
    });
  });
});
