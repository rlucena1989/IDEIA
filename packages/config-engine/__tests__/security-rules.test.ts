import { SecurityRules } from '../src/security-rules';
import type { FullConfig } from '../src/types';

describe('SecurityRules', () => {
  const rules = new SecurityRules();

  const safeConfig: FullConfig = {
    autonomy: { level: 'N1' },
    sandbox: { enabled: true },
    audit: { enabled: true },
    policyEngine: { enabled: true },
    outputValidation: { enabled: true },
    checkpoint: { interval: 60 },
    isolationPolicy: 'namespace default\nnetwork restricted\n',
  };

  describe('R1 — No autonomy > N2 without safety-circuit', () => {
    it('passes when autonomy is N1', () => {
      const config: FullConfig = { ...safeConfig, autonomy: { level: 'N1' } };
      const result = rules.check(config);
      const r1 = result.rules.find((r: { rule: string }) => r.rule === 'R1');
      expect(r1!.passed).toBe(true);
    });

    it('passes when autonomy N3 has safety-circuit enabled', () => {
      const config: FullConfig = { ...safeConfig, autonomy: { level: 'N3' }, safetyCircuit: { enabled: true } };
      const result = rules.check(config);
      const r1 = result.rules.find((r: { rule: string }) => r.rule === 'R1');
      expect(r1!.passed).toBe(true);
    });

    it('fails when autonomy N3 has no safety-circuit', () => {
      const config: FullConfig = { ...safeConfig, autonomy: { level: 'N3' } };
      const result = rules.check(config);
      const r1 = result.rules.find((r: { rule: string }) => r.rule === 'R1');
      expect(r1!.passed).toBe(false);
      expect(r1!.message).toContain('safety-circuit');
    });

    it('passes with numeric autonomy level 1', () => {
      const cfg: Record<string, unknown> = { ...safeConfig };
      delete cfg.autonomy;
      cfg.security = { autonomyLevel: 1 };
      const config = cfg as FullConfig;
      const result = rules.check(config);
      const r1 = result.rules.find((r: { rule: string }) => r.rule === 'R1');
      expect(r1!.passed).toBe(true);
    });

    it('fails with numeric autonomy level 3 without safety-circuit', () => {
      const cfg: Record<string, unknown> = { ...safeConfig };
      delete cfg.autonomy;
      cfg.security = { autonomyLevel: 3 };
      const config = cfg as FullConfig;
      const result = rules.check(config);
      const r1 = result.rules.find((r: { rule: string }) => r.rule === 'R1');
      expect(r1!.passed).toBe(false);
    });
  });

  describe('R2 — No sandbox: false allowed', () => {
    it('passes when sandbox is enabled', () => {
      const config: FullConfig = { ...safeConfig };
      const result = rules.check(config);
      const r2 = result.rules.find((r: { rule: string }) => r.rule === 'R2');
      expect(r2!.passed).toBe(true);
    });

    it('fails when sandbox is disabled', () => {
      const config: FullConfig = { ...safeConfig, sandbox: { enabled: false } };
      const result = rules.check(config);
      const r2 = result.rules.find((r: { rule: string }) => r.rule === 'R2');
      expect(r2!.passed).toBe(false);
      expect(r2!.message).toContain('Sandbox');
    });

    it('fails via security.sandbox.enabled path', () => {
      const cfg: Record<string, unknown> = { ...safeConfig };
      delete cfg.sandbox;
      cfg.security = { sandbox: { enabled: false } };
      const config = cfg as FullConfig;
      const result = rules.check(config);
      const r2 = result.rules.find((r: { rule: string }) => r.rule === 'R2');
      expect(r2!.passed).toBe(false);
    });
  });

  describe('R3 — No audit: disabled', () => {
    it('passes when audit is enabled', () => {
      const config: FullConfig = { ...safeConfig };
      const result = rules.check(config);
      const r3 = result.rules.find((r: { rule: string }) => r.rule === 'R3');
      expect(r3!.passed).toBe(true);
    });

    it('fails when audit is disabled', () => {
      const config: FullConfig = { ...safeConfig, audit: { enabled: false } };
      const result = rules.check(config);
      const r3 = result.rules.find((r: { rule: string }) => r.rule === 'R3');
      expect(r3!.passed).toBe(false);
      expect(r3!.message).toContain('Audit');
    });
  });

  describe('R4 — Alert if policy-engine disabled', () => {
    it('passes when policy engine is enabled', () => {
      const config: FullConfig = { ...safeConfig };
      const result = rules.check(config);
      const r4 = result.rules.find((r: { rule: string }) => r.rule === 'R4');
      expect(r4!.passed).toBe(true);
    });

    it('fails when policy engine is disabled', () => {
      const config: FullConfig = { ...safeConfig, policyEngine: { enabled: false } };
      const result = rules.check(config);
      const r4 = result.rules.find((r: { rule: string }) => r.rule === 'R4');
      expect(r4!.passed).toBe(false);
      expect(r4!.message).toContain('Policy engine');
    });
  });

  describe('R5 — Require output-validation active', () => {
    it('passes when output validation is enabled', () => {
      const config: FullConfig = { ...safeConfig };
      const result = rules.check(config);
      const r5 = result.rules.find((r: { rule: string }) => r.rule === 'R5');
      expect(r5!.passed).toBe(true);
    });

    it('fails when output validation is disabled', () => {
      const config: FullConfig = { ...safeConfig, outputValidation: { enabled: false } };
      const result = rules.check(config);
      const r5 = result.rules.find((r: { rule: string }) => r.rule === 'R5');
      expect(r5!.passed).toBe(false);
      expect(r5!.message).toContain('Output validation');
    });

    it('fails when output validation is not configured', () => {
      const config: FullConfig = { ...safeConfig };
      delete (config as Record<string, unknown>).outputValidation;
      const result = rules.check(config);
      const r5 = result.rules.find((r: { rule: string }) => r.rule === 'R5');
      expect(r5!.passed).toBe(false);
    });
  });

  describe('R6 — Verify checkpoint-interval minimum', () => {
    it('passes when interval is >= 10s', () => {
      const config: FullConfig = { ...safeConfig };
      const result = rules.check(config);
      const r6 = result.rules.find((r: { rule: string }) => r.rule === 'R6');
      expect(r6!.passed).toBe(true);
    });

    it('fails when interval is below 10s', () => {
      const config: FullConfig = { ...safeConfig, checkpoint: { interval: 5 } };
      const result = rules.check(config);
      const r6 = result.rules.find((r: { rule: string }) => r.rule === 'R6');
      expect(r6!.passed).toBe(false);
      expect(r6!.message).toContain('interval');
    });

    it('fails when interval is not configured', () => {
      const config: FullConfig = { ...safeConfig };
      delete (config as Record<string, unknown>).checkpoint;
      const result = rules.check(config);
      const r6 = result.rules.find((r: { rule: string }) => r.rule === 'R6');
      expect(r6!.passed).toBe(false);
    });
  });

  describe('R7 — Validate isolation-policy syntax', () => {
    it('passes with valid isolation policy', () => {
      const config: FullConfig = { ...safeConfig };
      const result = rules.check(config);
      const r7 = result.rules.find((r: { rule: string }) => r.rule === 'R7');
      expect(r7!.passed).toBe(true);
    });

    it('passes when isolation policy is not set', () => {
      const config: FullConfig = { ...safeConfig };
      delete (config as Record<string, unknown>).isolationPolicy;
      const result = rules.check(config);
      const r7 = result.rules.find((r: { rule: string }) => r.rule === 'R7');
      expect(r7!.passed).toBe(true);
    });

    it('fails when isolation policy is not a string', () => {
      const cfg: Record<string, unknown> = { ...safeConfig };
      delete cfg.isolationPolicy;
      cfg.security = { isolationPolicy: 123 };
      const config = cfg as FullConfig;
      const result = rules.check(config);
      const r7 = result.rules.find((r: { rule: string }) => r.rule === 'R7');
      expect(r7!.passed).toBe(false);
      expect(r7!.message).toContain('string');
    });

    it('fails with empty isolation policy string', () => {
      const config: FullConfig = { ...safeConfig, isolationPolicy: '   ' };
      const result = rules.check(config);
      const r7 = result.rules.find((r: { rule: string }) => r.rule === 'R7');
      expect(r7!.passed).toBe(false);
      expect(r7!.message).toContain('empty');
    });

    it('fails with unknown directive', () => {
      const config: FullConfig = { ...safeConfig, isolationPolicy: 'unknown_directive value' };
      const result = rules.check(config);
      const r7 = result.rules.find((r: { rule: string }) => r.rule === 'R7');
      expect(r7!.passed).toBe(false);
      expect(r7!.message).toContain('directive');
    });

    it('ignores comment lines in isolation policy', () => {
      const config: FullConfig = { ...safeConfig, isolationPolicy: '# this is a comment\nnamespace default' };
      const result = rules.check(config);
      const r7 = result.rules.find((r: { rule: string }) => r.rule === 'R7');
      expect(r7!.passed).toBe(true);
    });
  });

  describe('overall check', () => {
    it('passes all rules with safe configuration', () => {
      const result = rules.check(safeConfig);
      expect(result.passed).toBe(true);
      expect(result.rules).toHaveLength(10);
      result.rules.forEach((r: { passed: boolean }) => expect(r.passed).toBe(true));
    });

    it('fails overall when any rule fails', () => {
      const config: FullConfig = { ...safeConfig, sandbox: { enabled: false } };
      const result = rules.check(config);
      expect(result.passed).toBe(false);
      const failed = result.rules.filter((r: { passed: boolean }) => !r.passed);
      expect(failed.length).toBeGreaterThan(0);
    });

    it('includes rule descriptions for CLI output', () => {
      const result = rules.check(safeConfig);
      expect(result.rules[0]!.description).toBeDefined();
      expect(result.rules[0]!.description.length).toBeGreaterThan(0);
    });
  });
});
