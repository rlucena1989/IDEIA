import { ConfigValidator } from '../src/validator';
import type { FullConfig, SchemaField } from '../src/types';

describe('ConfigValidator', () => {
  const defaultSchema: SchemaField[] = [
    { path: 'server.port', type: 'number', minValue: 1, maxValue: 65535, required: true },
    { path: 'server.host', type: 'string', required: true },
    { path: 'log.level', type: 'string', allowedValues: ['error', 'warn', 'info', 'debug'] },
    { path: 'app.name', type: 'string', minLength: 1, maxLength: 100 },
    { path: 'app.version', type: 'string', pattern: /^\d+\.\d+\.\d+$/ },
  ];

  describe('validate', () => {
    it('returns valid for a config matching all schema rules', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        server: { port: 8080, host: 'localhost' },
        log: { level: 'info' },
        app: { name: 'MyApp', version: '1.0.0' },
      };
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('reports missing required fields as errors', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        log: { level: 'info' },
      };
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const serverPortError = result.errors.find((e: { field: string }) => e.field === 'server.port');
      expect(serverPortError).toBeDefined();
      expect(serverPortError!.code).toBe('REQUIRED_FIELD_MISSING');
    });

    it('reports type mismatches', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        server: { port: 'eight thousand', host: 'localhost' },
      };
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      const typeError = result.errors.find((e: { field: string }) => e.field === 'server.port');
      expect(typeError).toBeDefined();
      expect(typeError!.code).toBe('TYPE_MISMATCH');
    });

    it('reports values outside min/max range', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        server: { port: 99999, host: 'localhost' },
      };
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      const rangeError = result.errors.find((e: { field: string }) => e.field === 'server.port');
      expect(rangeError).toBeDefined();
      expect(rangeError!.code).toBe('VALUE_TOO_HIGH');
    });

    it('reports values not in allowed values list', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        server: { port: 8080, host: 'localhost' },
        log: { level: 'verbose' },
      };
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      const allowedError = result.errors.find((e: { field: string }) => e.field === 'log.level');
      expect(allowedError).toBeDefined();
      expect(allowedError!.code).toBe('VALUE_NOT_ALLOWED');
    });

    it('reports values not matching regex pattern', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        server: { port: 8080, host: 'localhost' },
        app: { name: 'MyApp', version: 'latest' },
      };
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      const patternError = result.errors.find((e: { field: string }) => e.field === 'app.version');
      expect(patternError).toBeDefined();
      expect(patternError!.code).toBe('PATTERN_MISMATCH');
    });

    it('reports string length violations', () => {
      const schema: SchemaField[] = [
        { path: 'name', type: 'string', minLength: 3, maxLength: 10 },
      ];
      const validator = new ConfigValidator(schema);
      const config: FullConfig = { name: 'AB' };
      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.code).toBe('STRING_TOO_SHORT');
    });

    it('returns valid for empty schema', () => {
      const validator = new ConfigValidator();
      const result = validator.validate({ anything: 'goes' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('skips optional missing fields', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        server: { port: 3000, host: '0.0.0.0' },
      };
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
    });

    it('handles deeply nested paths', () => {
      const schema: SchemaField[] = [
        { path: 'a.b.c.d', type: 'number', required: true },
      ];
      const validator = new ConfigValidator(schema);
      const config: FullConfig = { a: { b: { c: { d: 42 } } } };
      expect(validator.validate(config).valid).toBe(true);
    });
  });

  describe('validateSection', () => {
    it('validates only fields matching the given section prefix', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        server: { port: 8080, host: 'localhost' },
        log: { level: 'info' },
      };
      const sectionResult = validator.validateSection('server', config);
      expect(sectionResult.valid).toBe(true);
      const serverErrors = sectionResult.errors.filter((e: { field: string }) => e.field.startsWith('server.'));
      expect(serverErrors).toHaveLength(0);
    });

    it('returns errors only for the specified section', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        server: { port: 99999, host: 'localhost' },
      };
      const sectionResult = validator.validateSection('server', config);
      expect(sectionResult.valid).toBe(false);
      expect(sectionResult.errors[0]!.field).toMatch(/^server\./);
    });

    it('returns empty valid result for non-existent section', () => {
      const validator = new ConfigValidator(defaultSchema);
      const config: FullConfig = {
        server: { port: 8080, host: 'localhost' },
      };
      const sectionResult = validator.validateSection('database', config);
      expect(sectionResult.valid).toBe(true);
      expect(sectionResult.errors).toHaveLength(0);
    });
  });
});
