import { JSONSchemaProvider, JSONSchema } from '../browser/ideia-json-schema-provider';

describe('JSONSchemaProvider', () => {
  let provider: JSONSchemaProvider;

  beforeEach(() => {
    provider = new JSONSchemaProvider();
  });

  describe('registerSchema / getSchema', () => {
    it('registers and retrieves a schema', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      provider.registerSchema('test-contract', schema);
      const retrieved = provider.getSchema('test-contract');
      expect(retrieved).toEqual(schema);
    });

    it('returns undefined for unknown contract', () => {
      expect(provider.getSchema('unknown')).toBeUndefined();
    });
  });

  describe('getAllSchemas', () => {
    it('returns all registered schemas', () => {
      provider.registerSchema('a', { type: 'object' });
      provider.registerSchema('b', { type: 'object' });
      const all = provider.getAllSchemas();
      expect(all).toHaveLength(2);
    });
  });

  describe('validate', () => {
    it('returns no errors for valid data', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'number' } },
        required: ['name'],
      };
      const errors = provider.validate({ name: 'John', age: 30 }, schema);
      expect(errors).toHaveLength(0);
    });

    it('detects missing required fields', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const errors = provider.validate({}, schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('REQUIRED');
    });

    it('detects type mismatches', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
      };
      const errors = provider.validate({ name: 42 }, schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('TYPE_MISMATCH');
    });

    it('validates nested objects', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: { city: { type: 'string' } },
            required: ['city'],
          },
        },
        required: ['address'],
      };
      const errors = provider.validate({ address: {} }, schema);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('validates arrays', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      };
      const errors = provider.validate({ items: [1, 2] }, schema);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('validates enum values', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: { role: { enum: ['admin', 'user'] } },
      };
      const errors = provider.validate({ role: 'superadmin' }, schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('ENUM_MISMATCH');
    });
  });

  describe('generateSchemaFromZod', () => {
    it('generates a JSON schema from a Zod-like object', () => {
      const zodObj = { name: 'John', age: 30, active: true };
      const schema = provider.generateSchemaFromZod(zodObj);
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties!['name']).toEqual({ type: 'string' });
      expect(schema.properties!['age']).toEqual({ type: 'number' });
      expect(schema.properties!['active']).toEqual({ type: 'boolean' });
    });

    it('handles nested objects', () => {
      const zodObj = { address: { city: 'NYC', zip: 10001 } };
      const schema = provider.generateSchemaFromZod(zodObj);
      expect(schema.properties!['address'].type).toBe('object');
    });

    it('handles arrays', () => {
      const zodObj = { tags: ['a', 'b'] };
      const schema = provider.generateSchemaFromZod(zodObj);
      expect(schema.properties!['tags'].type).toBe('array');
    });

    it('handles null values', () => {
      const zodObj = { value: null };
      const schema = provider.generateSchemaFromZod(zodObj);
      expect(schema.properties!['value'].type).toBe('null');
    });
  });

  describe('clear', () => {
    it('removes all schemas', () => {
      provider.registerSchema('test', { type: 'object' });
      provider.clear();
      expect(provider.getAllSchemas()).toHaveLength(0);
    });
  });
});
