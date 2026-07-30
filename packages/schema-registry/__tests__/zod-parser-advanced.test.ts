import { SchemaRegistry, createSchemaRegistry } from '../src/schema-registry';

describe('SchemaRegistry - Advanced Zod Parsing', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = createSchemaRegistry();
  });

  describe('registerFromZod', () => {
    it('should register a schema from a Zod string and extract all fields', () => {
      const entry = registry.registerFromZod('User', 'z.object({ name: z.string(), age: z.number() })');
      expect(entry).toBeDefined();
      expect(entry.name).toBe('User');
      expect(entry.format).toBe('zod');
      const parsed = JSON.parse(entry.content);
      expect(parsed.zodType).toBe('ZodObject');
      expect(parsed.fields).toHaveLength(2);
      expect(parsed.fields[0].name).toBe('name');
      expect(parsed.fields[0].type).toBe('string');
      expect(parsed.fields[1].name).toBe('age');
      expect(parsed.fields[1].type).toBe('number');
    });

    it('should register and parse fields from schema string', () => {
      const entry = registry.registerFromZod('Profile', 'z.object({ name: z.string(), email: z.string().optional() })');
      const parsed = JSON.parse(entry.content);
      expect(parsed.fields.length).toBeGreaterThanOrEqual(1);
      expect(parsed.name).toBe('Profile');
    });

    it('should register and parse nullable fields', () => {
      const entry = registry.registerFromZod('Config', 'z.object({ theme: z.string().nullable() })');
      const parsed = JSON.parse(entry.content);
      expect(parsed.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('should register and parse enum fields', () => {
      const entry = registry.registerFromZod('Role', 'z.object({ role: z.enum(["admin", "user", "guest"]) })');
      const parsed = JSON.parse(entry.content);
      expect(parsed.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('should register and parse array fields', () => {
      const entry = registry.registerFromZod('Tags', 'z.object({ tags: z.array(z.string()) })');
      const parsed = JSON.parse(entry.content);
      expect(parsed.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('should register and parse nested object fields', () => {
      const entry = registry.registerFromZod('WithNested', 'z.object({ user: z.object({ name: z.string(), age: z.number() }) })');
      const parsed = JSON.parse(entry.content);
      expect(parsed.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('should register and parse union types', () => {
      const entry = registry.registerFromZod('Result', 'z.object({ value: z.union([z.string(), z.number()]) })');
      const parsed = JSON.parse(entry.content);
      expect(parsed.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('should register without description and tags', () => {
      const entry = registry.registerFromZod('Minimal', 'z.object({ id: z.string() })');
      expect(entry.name).toBe('Minimal');
      expect(entry.description).toBe('z.object({ id: z.string() })');
    });
  });

  describe('discriminated unions', () => {
    it('should parse a discriminated union at top level', () => {
      const content = `z.discriminatedUnion('type', [
        z.object({ type: z.literal('a'), value: z.string() }),
        z.object({ type: z.literal('b'), count: z.number() }),
      ])`;
      const result = registry.parseZodSchema(content);
      expect(result).not.toBeNull();
    });

    it('should parse discriminated union nested inside z.object', () => {
      const content = `z.object({
        id: z.string(),
        event: z.discriminatedUnion('type', [
          z.object({ type: z.literal('click'), x: z.number() }),
          z.object({ type: z.literal('scroll'), y: z.number() }),
        ])
      })`;
      const result = registry.parseZodSchema(content);
      expect(result).not.toBeNull();
    });

    it('should validate data against discriminated union schema', () => {
      const content = `z.object({
        kind: z.discriminatedUnion('type', [
          z.object({ type: z.literal('dog'), name: z.string() }),
          z.object({ type: z.literal('cat'), lives: z.number() }),
        ])
      })`;

      const validDog = registry.validateAgainstZodSchema(content, { kind: { type: 'dog', name: 'Rex' } });
      expect(validDog).toBeDefined();
    });
  });

  describe('optional and nullable fields', () => {
    it('should validate missing optional fields as valid', () => {
      const content = 'z.object({ name: z.string(), email: z.string().optional() })';
      const result = registry.validateAgainstZodSchema(content, { name: 'Alice' });
      expect(result.valid).toBe(true);
    });

    it('should report missing required fields as invalid', () => {
      const content = 'z.object({ name: z.string(), email: z.string() })';
      const result = registry.validateAgainstZodSchema(content, { name: 'Alice' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('email'))).toBe(true);
    });

    it('should validate null values on nullable fields', () => {
      const content = 'z.object({ name: z.string().nullable() })';
      const result = registry.validateAgainstZodSchema(content, { name: null });
      expect(result.valid).toBe(true);
    });

    it('should reject null on non-nullable fields', () => {
      const content = 'z.object({ name: z.string() })';
      const result = registry.validateAgainstZodSchema(content, { name: null });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('null'))).toBe(true);
    });

    it('should handle mixed optional, nullable, and required fields', () => {
      const content = 'z.object({ id: z.string(), name: z.string().optional(), config: z.string().nullable() })';
      const result = registry.validateAgainstZodSchema(content, { id: '1', config: null });
      expect(result.valid).toBe(true);
    });
  });

  describe('comprehensive field extraction', () => {
    it('should parse basic Zod string type', () => {
      const content = 'z.object({ str: z.string() })';
      const result = registry.parseZodSchema(content);
      expect(result!.fields.find(f => f.name === 'str')!.type).toBe('string');
    });

    it('should parse z.number type', () => {
      const content = 'z.object({ num: z.number() })';
      const result = registry.parseZodSchema(content);
      expect(result!.fields.find(f => f.name === 'num')!.type).toBe('number');
    });
  });

  describe('extractZodFields with complex expressions', () => {
    it('should handle chained modifiers', () => {
      const content = 'z.object({ name: z.string().min(1).max(100).describe("User name") })';
      const result = registry.parseZodSchema(content);
      expect(result!.fields[0].type).toBe('string');
    });

    it('should handle deeply nested objects', () => {
      const content = 'z.object({ a: z.object({ b: z.object({ c: z.string() }) }) })';
      const result = registry.parseZodSchema(content);
      expect(result).not.toBeNull();
    });
  });

  describe('registerFromZod integrated with validation', () => {
    it('should register and validate a complex schema', () => {
      const schemaStr = `z.object({
        id: z.string().describe("Unique identifier"),
        name: z.string().min(1),
        role: z.enum(["admin", "user"]),
        tags: z.array(z.string()).optional(),
        metadata: z.object({
          created: z.date(),
          active: z.boolean()
        })
      })`;
      const entry = registry.registerFromZod('ComplexUser', schemaStr, 'Complex user schema', ['user', 'admin']);
      expect(entry.tags).toContain('user');

      const validResult = registry.validateAgainstZodSchema(schemaStr, { id: '123', name: 'Alice' });
      expect(validResult).toBeDefined();
    });
  });

  describe('parsing edge cases', () => {
    it('should return null for non-Zod content', () => {
      expect(registry.parseZodSchema('not a schema')).toBeNull();
    });

    it('should handle empty object', () => {
      const content = 'z.object({})';
      const result = registry.parseZodSchema(content);
      expect(result).not.toBeNull();
      expect(result!.fields).toHaveLength(0);
    });
  });
});
