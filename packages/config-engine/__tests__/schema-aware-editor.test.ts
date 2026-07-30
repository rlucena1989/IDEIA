import { SchemaAwareEditor, SchemaCategory } from '../src/schema-aware-editor';

describe('SchemaAwareEditor', () => {
  let editor: SchemaAwareEditor;

  beforeEach(() => {
    editor = new SchemaAwareEditor();
  });

  it('returns schema categories', () => {
    const schema = editor.getSchema();
    expect(schema.length).toBeGreaterThanOrEqual(3);
    expect(schema.find(c => c.name === 'autonomy')).toBeDefined();
    expect(schema.find(c => c.name === 'safety')).toBeDefined();
  });

  it('gets category by name', () => {
    const cat = editor.getCategory('autonomy');
    expect(cat).toBeDefined();
    expect(cat!.fields.some(f => f.key === 'level')).toBe(true);
  });

  it('gets field by category and key', () => {
    const field = editor.getField('autonomy', 'level');
    expect(field).toBeDefined();
    expect(field!.type).toBe('enum');
    expect(field!.enumValues).toContain('N2');
  });

  it('validates valid config', () => {
    const result = editor.validateConfig({
      autonomy: { level: 'N2', maxActionsPerMinute: 10, requireApproval: true },
      safety: { sandbox: true, auditEnabled: true },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catches invalid enum values', () => {
    const result = editor.validateConfig({
      autonomy: { level: 'N9' },
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.path.includes('level'))).toBe(true);
  });

  it('validates number type', () => {
    const result = editor.validateConfig({
      autonomy: { level: 'N1', maxActionsPerMinute: 'dez' },
    });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('catches invalid boolean type', () => {
    const result = editor.validateConfig({
      autonomy: { level: 'N1', requireApproval: 'yes' },
    });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('suggests defaults', () => {
    const defaults = editor.suggestDefaults();
    expect(defaults.autonomy).toBeDefined();
    expect(defaults.autonomy.level).toBe('N1');
    expect(defaults.safety.sandbox).toBe(true);
  });

  it('coerces types', () => {
    const coerced = editor.coerceTypes({
      autonomy: { level: 'N2', maxActionsPerMinute: '15', requireApproval: 'true' },
    });
    const autonomy = coerced.autonomy as Record<string, unknown>;
    expect(typeof autonomy.maxActionsPerMinute).toBe('number');
    expect(typeof autonomy.requireApproval).toBe('boolean');
  });

  it('accepts custom schema', () => {
    const customSchema: SchemaCategory[] = [
      { name: 'custom', label: 'Custom', order: 1, fields: [
        { key: 'option', type: 'string', label: 'Option', description: 'Test', required: true, defaultValue: 'default' },
      ] },
    ];
    const custom = new SchemaAwareEditor(customSchema);
    const result = custom.validateConfig({ custom: { option: 'value' } });
    expect(result.valid).toBe(true);
    expect(custom.getSchema()).toHaveLength(1);
  });
});
