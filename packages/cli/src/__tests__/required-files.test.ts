import { REQUIRED_FILE_GROUPS, RequiredFileGroup } from '../core/health/required-files';

describe('required-files', () => {
  describe('REQUIRED_FILE_GROUPS', () => {
    it('deve ter grupos definidos', () => {
      expect(REQUIRED_FILE_GROUPS.length).toBeGreaterThan(0);
      for (const group of REQUIRED_FILE_GROUPS) {
        expect(group.id).toBeTruthy();
        expect(group.label).toBeTruthy();
        expect(group.required.length).toBeGreaterThan(0);
      }
    });

    it('cada grupo deve ter id, label, required', () => {
      for (const g of REQUIRED_FILE_GROUPS) {
        expect(g.id).toMatch(/^[a-z]+$/);
        expect(typeof g.label).toBe('string');
        expect(Array.isArray(g.required)).toBe(true);
      }
    });

    it('deve ter grupo context com ai-handoff.md', () => {
      const ctx = REQUIRED_FILE_GROUPS.find(g => g.id === 'context');
      expect(ctx).toBeDefined();
      expect(ctx!.required).toContain('.ai/context/ai-handoff.md');
    });

    it('deve ter grupo architecture com project-manifest e laws', () => {
      const arch = REQUIRED_FILE_GROUPS.find(g => g.id === 'architecture');
      expect(arch).toBeDefined();
      expect(arch!.required).toContain('.ai/project-manifest.yaml');
      expect(arch!.required).toContain('.ai/laws.yaml');
    });

    it('deve ter grupo quality com verify e quality-agent', () => {
      const q = REQUIRED_FILE_GROUPS.find(g => g.id === 'quality');
      expect(q).toBeDefined();
      expect(q!.required).toContain('.ai/bin/verify.js');
      expect(q!.required).toContain('.ai/bin/quality-agent.js');
    });

    it('deve ter grupo security com policies', () => {
      const s = REQUIRED_FILE_GROUPS.find(g => g.id === 'security');
      expect(s).toBeDefined();
      expect(s!.required).toContain('.ai/policies/command-policy.md');
      expect(s!.required).toContain('.ai/policies/ai-generated-code-policy.md');
    });

    it('grupos podem ter optional', () => {
      for (const g of REQUIRED_FILE_GROUPS) {
        if (g.optional) {
          expect(Array.isArray(g.optional)).toBe(true);
        }
      }
    });
  });
});