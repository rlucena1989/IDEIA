import { getPolicy, listPolicies } from '../document-policy';

describe('document-policy', () => {
  describe('getPolicy', () => {
    it('returns policy for known task type', () => {
      const policy = getPolicy('tests');
      expect(policy).toBeDefined();
      expect(policy!.taskType).toBe('tests');
      expect(policy!.primaryDocument).toBe('coverage-autonomy');
    });

    it('returns undefined for unknown task type', () => {
      expect(getPolicy('nonexistent-type')).toBeUndefined();
    });

    it('each known policy has all required fields', () => {
      for (const type of ['execution', 'tests', 'coverage', 'strategy']) {
        const p = getPolicy(type);
        expect(p).toBeDefined();
        expect(p!.taskType).toBe(type);
        expect(p!.primaryDocument).toBeTruthy();
        expect(p!.fallbackDocuments.length).toBeGreaterThan(0);
        expect(['specificity', 'priority', 'block']).toContain(p!.conflictRule);
        expect(['read-only', 'plan-only', 'execute']).toContain(p!.executionMode);
        expect(typeof p!.requiresApproval).toBe('boolean');
        expect(p!.description).toBeTruthy();
      }
    });
  });

  describe('listPolicies', () => {
    it('returns all policies', () => {
      const policies = listPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(8);
    });

    it('does not share reference with internal array', () => {
      const policies = listPolicies();
      const originalLength = policies.length;
      policies.push({} as any);
      expect(listPolicies().length).toBe(originalLength);
    });
  });
});
