import { SchemaRegistry, createSchemaRegistry } from '../src/schema-registry';

describe('SchemaRegistry - Expanded Validation', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = createSchemaRegistry();
  });

  describe('validateAgainstZodSchema', () => {
    it('should validate data with correct types', () => {
      const content = `z.object({ name: z.string(), age: z.number() })`;
      const result = registry.validateAgainstZodSchema(content, { name: 'Alice', age: 30 });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const content = `z.object({ name: z.string(), age: z.number() })`;
      const result = registry.validateAgainstZodSchema(content, { name: 'Alice' });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing required field: age'))).toBe(true);
    });

    it('should accept missing optional fields', () => {
      const content = `z.object({ name: z.string(), email: z.string().optional() })`;
      const result = registry.validateAgainstZodSchema(content, { name: 'Alice' });

      expect(result.valid).toBe(true);
    });

    it('should accept null values for nullable fields', () => {
      const content = `z.object({ name: z.string().nullable() })`;
      const result = registry.validateAgainstZodSchema(content, { name: null });

      expect(result.valid).toBe(true);
    });

    it('should reject null values for non-nullable fields', () => {
      const content = `z.object({ name: z.string() })`;
      const result = registry.validateAgainstZodSchema(content, { name: null });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('null'))).toBe(true);
    });

    it('should validate enum values', () => {
      const content = `z.object({ role: z.enum(['admin', 'user', 'guest']) })`;
      const validResult = registry.validateAgainstZodSchema(content, { role: 'admin' });
      expect(validResult).toBeDefined();
    });

    it('should validate array fields', () => {
      const content = `z.object({ tags: z.array(z.string()) })`;
      const validResult = registry.validateAgainstZodSchema(content, { tags: ['a', 'b', 'c'] });
      expect(validResult.valid).toBe(true);

      const invalidResult = registry.validateAgainstZodSchema(content, { tags: 'not-array' });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.some(e => e.includes('expected array'))).toBe(true);
    });

    it('should validate union types', () => {
      const content = `z.object({ value: z.union([z.string(), z.number()]) })`;
      const stringResult = registry.validateAgainstZodSchema(content, { value: 'hello' });
      expect(stringResult.valid).toBe(true);

      const numberResult = registry.validateAgainstZodSchema(content, { value: 42 });
      expect(numberResult.valid).toBe(true);

      const invalidResult = registry.validateAgainstZodSchema(content, { value: true });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.some(e => e.includes('union'))).toBe(true);
    });

    it('should validate nested object structures', () => {
      const content = `z.object({ user: z.object({ name: z.string(), age: z.number() }) })`;
      const validResult = registry.validateAgainstZodSchema(content, { user: { name: 'Alice', age: 30 } });
      expect(validResult).toBeDefined();
    });

    it('should return error for non-parsable schema', () => {
      const result = registry.validateAgainstZodSchema('invalid content', { name: 'test' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Could not parse');
    });
  });
});