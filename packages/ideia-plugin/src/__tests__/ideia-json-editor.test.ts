import { JSONEditor } from '../browser/ideia-json-editor';
import { JSONSchemaProvider } from '../browser/ideia-json-schema-provider';

const mockEl = { style: new Proxy({} as Record<string, string>, { get(t, p) { return p === 'cssText' ? '' : t[p as string]; }, set(t, p, v) { if (typeof p === 'string') t[p] = v; return true; } }), appendChild: () => {}, querySelector: () => null, remove: () => {} };
if (typeof document === 'undefined') (globalThis as Record<string, unknown>).document = { createElement: () => mockEl };

describe('JSONEditor', () => {
  let container: HTMLElement;
  let schemaProvider: JSONSchemaProvider;

  beforeEach(() => {
    container = document.createElement('div');
    schemaProvider = new JSONSchemaProvider();
    schemaProvider.registerSchema('test', {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'number' } },
      required: ['name'],
    });
  });

  it('constructs with required props', () => {
    const editor = new JSONEditor({
      container,
      schemaProvider,
      contractId: 'test',
      initialValue: '{"name": "John"}',
    });
    expect(editor).toBeDefined();
  });

  it('mounts and unmounts without error', () => {
    const editor = new JSONEditor({ container, schemaProvider });
    expect(() => editor.mount()).not.toThrow();
    expect(() => editor.unmount()).not.toThrow();
  });

  it('setValue updates current value', () => {
    const editor = new JSONEditor({ container, schemaProvider });
    editor.setValue('{"test": true}');
    expect(editor.getValue()).toBe('{"test": true}');
  });

  it('setContractId updates schema reference', () => {
    const editor = new JSONEditor({ container, schemaProvider, contractId: 'test' });
    expect(() => editor.setContractId('other')).not.toThrow();
  });

  it('getValue returns current JSON string', () => {
    const editor = new JSONEditor({
      container,
      schemaProvider,
      initialValue: '{"key": "value"}',
    });
    expect(editor.getValue()).toBe('{"key": "value"}');
  });
});
