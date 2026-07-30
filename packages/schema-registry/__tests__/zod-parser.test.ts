import { SchemaRegistry, createSchemaRegistry } from '../src/schema-registry';

describe('SchemaRegistry - Zod Parser', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = createSchemaRegistry();
  });

  it('should parse a basic Zod object schema', () => {
    const content = `z.object({ name: z.string(), age: z.number() })`;
    const result = registry.parseZodSchema(content);

    expect(result).not.toBeNull();
    expect(result!.fields).toHaveLength(2);

    const nameField = result!.fields.find(f => f.name === 'name');
    expect(nameField).toBeDefined();
    expect(nameField!.type).toBe('string');

    const ageField = result!.fields.find(f => f.name === 'age');
    expect(ageField).toBeDefined();
    expect(ageField!.type).toBe('number');
  });

  it('should detect optional fields', () => {
    const content = `z.object({ name: z.string(), email: z.string().optional() })`;
    const result = registry.parseZodSchema(content);

    const emailField = result!.fields.find(f => f.name === 'email');
    expect(emailField).toBeDefined();
    expect(emailField!.optional).toBe(true);

    const nameField = result!.fields.find(f => f.name === 'name');
    expect(nameField!.optional).toBe(false);
  });

  it('should detect nullable fields', () => {
    const content = `z.object({ name: z.string().nullable() })`;
    const result = registry.parseZodSchema(content);

    expect(result!.fields[0].nullable).toBe(true);
  });

  it('should parse enum fields', () => {
    const content = `z.object({ role: z.enum(['admin', 'user', 'guest']) })`;
    const result = registry.parseZodSchema(content);

    const roleField = result!.fields.find(f => f.name === 'role');
    expect(roleField).toBeDefined();
    expect(roleField!.type).toBe('enum');
  });

  it('should parse array fields', () => {
    const content = `z.object({ tags: z.array(z.string()), scores: z.array(z.number()) })`;
    const result = registry.parseZodSchema(content);

    const tagsField = result!.fields.find(f => f.name === 'tags');
    expect(tagsField).toBeDefined();
    expect(tagsField!.isArray).toBe(true);
    expect(tagsField!.arrayElementType).toBe('string');

    const scoresField = result!.fields.find(f => f.name === 'scores');
    expect(scoresField!.arrayElementType).toBe('number');
  });

  it('should parse nested object fields', () => {
    const content = `z.object({ user: z.object({ name: z.string(), age: z.number() }) })`;
    const result = registry.parseZodSchema(content);

    const _userField = result!.fields.find(f => f.name === 'user');
    expect(result!.fields.length).toBeGreaterThanOrEqual(1);
  });

  it('should parse union types', () => {
    const content = `z.object({ result: z.union([z.string(), z.number()]) })`;
    const result = registry.parseZodSchema(content);

    const resultField = result!.fields.find(f => f.name === 'result');
    expect(resultField).toBeDefined();
    expect(resultField!.type).toBe('union');
    expect((resultField!.unionTypes as string[]) || []).toContain('string');
  });

  it('should extract descriptions from .describe()', () => {
    const content = `z.object({ name: z.string().describe('The user full name') })`;
    const result = registry.parseZodSchema(content);

    expect(result!.fields[0].description).toBe('The user full name');
  });

  it('should handle boolean and date types', () => {
    const content = `z.object({ active: z.boolean(), createdAt: z.date() })`;
    const result = registry.parseZodSchema(content);

    expect(result!.fields.find(f => f.name === 'active')!.type).toBe('boolean');
    expect(result!.fields.find((f: Record<string, unknown>) => f.name === 'createdAt')!.type).toBe('date');
  });

  it('should return null for non-Zod schema content', () => {
    const result = registry.parseZodSchema('not a zod schema');
    expect(result).toBeNull();
  });
});