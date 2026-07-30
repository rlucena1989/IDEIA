import { DefaultPreferenceSchemaRegistry } from '../schema';
import { PreferenceSchema } from '../types';

describe('DefaultPreferenceSchemaRegistry', () => {
  let registry: DefaultPreferenceSchemaRegistry;

  const testSchema: PreferenceSchema = {
    id: 'test.editor',
    title: 'Editor',
    properties: [
      { key: 'editor.tabSize', type: 'number', default: 4, minimum: 1, maximum: 16 },
      { key: 'editor.insertSpaces', type: 'boolean', default: true },
      { key: 'editor.wordWrap', type: 'string', default: 'off', enum: ['off', 'on', 'wordWrapColumn'] },
      { key: 'editor.fontSize', type: 'number', default: 14, minimum: 8, maximum: 48 },
    ],
  };

  beforeEach(() => {
    registry = new DefaultPreferenceSchemaRegistry();
  });

  describe('register', () => {
    it('registers a schema and its properties', () => {
      registry.register(testSchema);
      expect(registry.getSchema('test.editor')).toBe(testSchema);
      expect(registry.getProperty('editor.tabSize')).toBeDefined();
      expect(registry.getProperty('editor.tabSize')!.type).toBe('number');
    });

    it('returns a disposable that unregisters the schema', () => {
      const disposable = registry.register(testSchema);
      expect(registry.getSchema('test.editor')).toBeDefined();
      disposable.dispose();
      expect(registry.getSchema('test.editor')).toBeUndefined();
      expect(registry.getProperty('editor.tabSize')).toBeUndefined();
    });

    it('overwrites properties when registering schemas with same keys', () => {
      const schemaA: PreferenceSchema = { id: 'a', properties: [{ key: 'shared.key', type: 'string', default: 'a' }] };
      const schemaB: PreferenceSchema = { id: 'b', properties: [{ key: 'shared.key', type: 'number', default: 1 }] };
      registry.register(schemaA);
      registry.register(schemaB);
      expect(registry.getProperty('shared.key')!.type).toBe('number');
    });
  });

  describe('getSchema', () => {
    it('returns undefined for unknown schema id', () => {
      expect(registry.getSchema('nonexistent')).toBeUndefined();
    });

    it('returns the registered schema by id', () => {
      registry.register(testSchema);
      expect(registry.getSchema('test.editor')).toBe(testSchema);
    });
  });

  describe('getProperty', () => {
    it('returns undefined for unknown property key', () => {
      expect(registry.getProperty('unknown.key')).toBeUndefined();
    });

    it('returns the property definition for a known key', () => {
      registry.register(testSchema);
      const prop = registry.getProperty('editor.tabSize');
      expect(prop).toBeDefined();
      expect(prop!.key).toBe('editor.tabSize');
      expect(prop!.type).toBe('number');
      expect(prop!.default).toBe(4);
    });
  });

  describe('getAllProperties', () => {
    it('returns an empty array when no schemas are registered', () => {
      expect(registry.getAllProperties()).toEqual([]);
    });

    it('returns all properties from all registered schemas', () => {
      registry.register(testSchema);
      const anotherSchema: PreferenceSchema = { id: 'test.other', properties: [{ key: 'other.key', type: 'boolean', default: false }] };
      registry.register(anotherSchema);
      const all = registry.getAllProperties();
      expect(all).toHaveLength(5);
      expect(all.map(p => p.key)).toContain('editor.tabSize');
      expect(all.map(p => p.key)).toContain('other.key');
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      registry.register(testSchema);
    });

    it('returns true for unknown keys (no validation rules)', () => {
      expect(registry.validate('unknown.key', 'anything')).toBe(true);
    });

    it('validates number type correctly', () => {
      expect(registry.validate('editor.tabSize', 4)).toBe(true);
      expect(registry.validate('editor.tabSize', '4')).toBe(false);
    });

    it('validates boolean type correctly', () => {
      expect(registry.validate('editor.insertSpaces', true)).toBe(true);
      expect(registry.validate('editor.insertSpaces', 1)).toBe(false);
    });

    it('validates enum values', () => {
      expect(registry.validate('editor.wordWrap', 'on')).toBe(true);
      expect(registry.validate('editor.wordWrap', 'invalid')).toBe(false);
    });

    it('validates number minimum', () => {
      expect(registry.validate('editor.tabSize', 1)).toBe(true);
      expect(registry.validate('editor.tabSize', 0)).toBe(false);
    });

    it('validates number maximum', () => {
      expect(registry.validate('editor.tabSize', 16)).toBe(true);
      expect(registry.validate('editor.tabSize', 17)).toBe(false);
    });

    it('validates type mismatch for string property', () => {
      expect(registry.validate('editor.wordWrap', 'off')).toBe(true);
      expect(registry.validate('editor.wordWrap', 123)).toBe(false);
    });
  });
});
