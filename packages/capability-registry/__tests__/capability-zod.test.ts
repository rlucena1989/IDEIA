import { CapabilitySchema, validateCapability } from '../src/types/capability.zod';

describe('CapabilitySchema (Zod validation)', () => {
  const validCap = {
    id: 'test.validator',
    name: 'Test Validator',
    description: 'A capability for testing Zod validation',
    category: 'tool',
    subcategory: 'testing',
    version: '1.0.0',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dependsOn: [],
    inputs: [],
    outputs: [],
    examples: [],
    tags: ['test'],
    metadata: { tags: ['test'], keywords: [], links: {} },
  };

  it('validates a correct capability', () => {
    const result = CapabilitySchema.safeParse(validCap);
    expect(result.success).toBe(true);
  });

  it('rejects capability with empty id', () => {
    const result = CapabilitySchema.safeParse({ ...validCap, id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects capability with invalid id characters', () => {
    const result = CapabilitySchema.safeParse({ ...validCap, id: 'Invalid ID!' });
    expect(result.success).toBe(false);
  });

  it('rejects capability with empty name', () => {
    const result = CapabilitySchema.safeParse({ ...validCap, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects capability with invalid category', () => {
    const result = CapabilitySchema.safeParse({ ...validCap, category: 'invalid_category' });
    expect(result.success).toBe(false);
  });

  it('rejects capability with invalid status', () => {
    const result = CapabilitySchema.safeParse({ ...validCap, status: 'invalid_status' });
    expect(result.success).toBe(false);
  });

  it('rejects capability with description over 2000 chars', () => {
    const result = CapabilitySchema.safeParse({ ...validCap, description: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('rejects capability with invalid category', () => {
    const result = CapabilitySchema.safeParse({ ...validCap, category: 'not-a-valid-category' });
    expect(result.success).toBe(false);
  });

  it('validates capability with dependsOn', () => {
    const cap = { ...validCap, dependsOn: [{ id: 'dep.other', version: '>=1.0.0' }] };
    const result = CapabilitySchema.safeParse(cap);
    expect(result.success).toBe(true);
  });

  it('validateCapability function works and returns parsed data', () => {
    const result = validateCapability(validCap);
    expect(result.id).toBe('test.validator');
    expect(result.tags).toEqual(['test']);
  });

  it('validateCapability throws on invalid data', () => {
    expect(() => validateCapability({ ...validCap, id: '' })).toThrow();
  });
});
