import { createPreferenceProxy } from '../proxy';
import { DefaultPreferenceService } from '../service';
import { DefaultPreferenceSchemaRegistry } from '../schema';
import { DefaultPreferenceProviderChain, DefaultPreferenceProvider } from '../providers';
import { PreferenceProxy, PreferenceScope, PreferenceSchema } from '../types';

describe('createPreferenceProxy', () => {
  let service: DefaultPreferenceService;
  let proxy: PreferenceProxy;

  const testSchema: PreferenceSchema = {
    id: 'test',
    properties: [
      { key: 'editor.tabSize', type: 'number', default: 4 },
      { key: 'editor.insertSpaces', type: 'boolean', default: true },
      { key: 'editor.fontSize', type: 'number', default: 14 },
      { key: 'editor.wordWrap', type: 'string', default: 'off' },
      { key: 'editor.minimap.enabled', type: 'boolean', default: true },
    ],
  };

  beforeEach(() => {
    const schemaRegistry = new DefaultPreferenceSchemaRegistry();
    schemaRegistry.register(testSchema);
    const userProvider = new DefaultPreferenceProvider(PreferenceScope.User);
    const chain = new DefaultPreferenceProviderChain([userProvider, new DefaultPreferenceProvider(PreferenceScope.Default)]);
    service = new DefaultPreferenceService(schemaRegistry, chain);
    proxy = createPreferenceProxy(service);
  });

  describe('get', () => {
    it('returns default values through direct key access', () => {
      expect(proxy['editor.tabSize']).toBe(4);
      expect(proxy['editor.insertSpaces']).toBe(true);
      expect(proxy['editor.fontSize']).toBe(14);
    });

    it('returns the same value on repeated access (cached)', () => {
      const val1 = proxy['editor.tabSize'];
      const val2 = proxy['editor.tabSize'];
      expect(val1).toBe(val2);
    });

    it('returns undefined for unknown keys', () => {
      expect(proxy['unknown.key']).toBeUndefined();
    });

    it('returns values through .get() method', () => {
      expect(proxy.get('editor.tabSize')).toBe(4);
    });
  });

  describe('set', () => {
    it('delegates set operations to the service', async () => {
      const setSpy = jest.spyOn(service, 'set');
      proxy['editor.tabSize'] = 8;
      expect(setSpy).toHaveBeenCalledWith('editor.tabSize', 8);
    });

    it('updates cached value after set', () => {
      proxy['editor.tabSize'] = 8;
      expect(proxy['editor.tabSize']).toBe(8);
    });

    it('works with .set() method', () => {
      const setSpy = jest.spyOn(service, 'set');
      proxy.set('editor.fontSize', 20);
      expect(setSpy).toHaveBeenCalledWith('editor.fontSize', 20);
    });
  });

  describe('nested preferences', () => {
    it('handles dotted preference keys', () => {
      expect(proxy['editor.minimap.enabled']).toBe(true);
    });

    it('supports get/set for dotted keys', () => {
      proxy['editor.minimap.enabled'] = false;
      expect(proxy['editor.minimap.enabled']).toBe(false);
    });
  });
});
