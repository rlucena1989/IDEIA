import {
  InitRequestSchema,
  DeployConfigSchema,
  GenerateRequestSchema,
  ConfigEntrySchema,
  ConfigQuerySchema,
  AuditQuerySchema,
  QualityGateQuerySchema,
} from '../domain-schemas';

describe('domain-schemas', () => {
  describe('InitRequestSchema', () => {
    test('validates minimal input', () => {
      const result = InitRequestSchema.parse({ projectName: 'test' });
      expect(result.projectName).toBe('test');
      expect(result.template).toBe('default');
      expect(result.language).toBe('typescript');
    });

    test('rejects empty project name', () => {
      expect(() => InitRequestSchema.parse({ projectName: '' })).toThrow();
    });

    test('rejects long project name', () => {
      expect(() => InitRequestSchema.parse({ projectName: 'a'.repeat(101) })).toThrow();
    });

    test('accepts valid template values', () => {
      const valid = InitRequestSchema.parse({ projectName: 'p', template: 'full' });
      expect(valid.template).toBe('full');
    });

    test('rejects invalid template', () => {
      expect(() => InitRequestSchema.parse({ projectName: 'p', template: 'invalid' })).toThrow();
    });

    test('accepts autonomy level 0-4', () => {
      const r1 = InitRequestSchema.parse({ projectName: 'p', autonomyLevel: 0 });
      const r2 = InitRequestSchema.parse({ projectName: 'p', autonomyLevel: 4 });
      expect(r1.autonomyLevel).toBe(0);
      expect(r2.autonomyLevel).toBe(4);
    });

    test('rejects autonomy level out of range', () => {
      expect(() => InitRequestSchema.parse({ projectName: 'p', autonomyLevel: -1 })).toThrow();
      expect(() => InitRequestSchema.parse({ projectName: 'p', autonomyLevel: 5 })).toThrow();
    });
  });

  describe('DeployConfigSchema', () => {
    test('validates minimal deploy config', () => {
      const result = DeployConfigSchema.parse({
        version: '1.0.0',
        environment: 'production',
      });
      expect(result.version).toBe('1.0.0');
      expect(result.canaryPercent).toBe(0);
      expect(result.autoRollback).toBe(true);
    });

    test('rejects non-semver version', () => {
      expect(() => DeployConfigSchema.parse({ version: 'abc', environment: 'production' })).toThrow();
    });

    test('rejects invalid environment', () => {
      expect(() => DeployConfigSchema.parse({ version: '1.0.0', environment: 'invalid' })).toThrow();
    });

    test('accepts canary percent 0-100', () => {
      const r = DeployConfigSchema.parse({ version: '1.0.0', environment: 'canary', canaryPercent: 50 });
      expect(r.canaryPercent).toBe(50);
    });

    test('rejects canary percent > 100', () => {
      expect(() => DeployConfigSchema.parse({ version: '1.0.0', environment: 'canary', canaryPercent: 101 })).toThrow();
    });

    test('accepts all environments', () => {
      for (const env of ['development', 'staging', 'production', 'canary'] as const) {
        const r = DeployConfigSchema.parse({ version: '1.0.0', environment: env });
        expect(r.environment).toBe(env);
      }
    });
  });

  describe('GenerateRequestSchema', () => {
    test('validates minimal generate request', () => {
      const r = GenerateRequestSchema.parse({ template: 'api', name: 'my-api' });
      expect(r.template).toBe('api');
      expect(r.name).toBe('my-api');
      expect(r.dryRun).toBe(false);
    });

    test('rejects empty template', () => {
      expect(() => GenerateRequestSchema.parse({ template: '', name: 'n' })).toThrow();
    });
  });

  describe('ConfigEntrySchema', () => {
    test('validates config entry', () => {
      const r = ConfigEntrySchema.parse({ key: 'debug', value: true });
      expect(r.key).toBe('debug');
      expect(r.scope).toBe('project');
    });

    test('rejects empty key', () => {
      expect(() => ConfigEntrySchema.parse({ key: '', value: 1 })).toThrow();
    });
  });

  describe('ConfigQuerySchema', () => {
    test('validates empty config query', () => {
      const r = ConfigQuerySchema.parse({});
      expect(r).toBeDefined();
    });
  });

  describe('AuditQuerySchema', () => {
    test('validates minimal audit query with defaults', () => {
      const r = AuditQuerySchema.parse({});
      expect(r.limit).toBe(50);
      expect(r.includeChain).toBe(false);
    });

    test('rejects actor other than user/system/ai', () => {
      expect(() => AuditQuerySchema.parse({ actor: 'admin' })).toThrow();
    });
  });

  describe('QualityGateQuerySchema', () => {
    test('validates quality gate query', () => {
      const r = QualityGateQuerySchema.parse({ gate: 'pr', dimension: 'security' });
      expect(r.gate).toBe('pr');
    });

    test('rejects invalid gate', () => {
      expect(() => QualityGateQuerySchema.parse({ gate: 'invalid' })).toThrow();
    });
  });
});
