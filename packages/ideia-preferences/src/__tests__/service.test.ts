import { DefaultPreferenceService } from '../service';
import { DefaultPreferenceSchemaRegistry } from '../schema';
import { DefaultPreferenceProviderChain, DefaultPreferenceProvider } from '../providers';
import { PreferenceScope, PreferenceSchema } from '../types';

describe('DefaultPreferenceService', () => {
  let schemaRegistry: DefaultPreferenceSchemaRegistry;
  let defaultProvider: DefaultPreferenceProvider;
  let userProvider: DefaultPreferenceProvider;
  let chain: DefaultPreferenceProviderChain;
  let service: DefaultPreferenceService;

  const testSchema: PreferenceSchema = {
    id: 'test',
    properties: [
      { key: 'editor.tabSize', type: 'number', default: 4, minimum: 1, maximum: 16 },
      { key: 'editor.insertSpaces', type: 'boolean', default: true },
      { key: 'editor.fontSize', type: 'number', default: 14 },
      { key: 'editor.wordWrap', type: 'string', default: 'off', enum: ['off', 'on', 'wordWrapColumn'] },
      { key: 'editor.minimap', type: 'boolean', default: true },
    ],
  };

  beforeEach(() => {
    schemaRegistry = new DefaultPreferenceSchemaRegistry();
    schemaRegistry.register(testSchema);

    defaultProvider = new DefaultPreferenceProvider(PreferenceScope.Default);
    userProvider = new DefaultPreferenceProvider(PreferenceScope.User);

    chain = new DefaultPreferenceProviderChain([userProvider, defaultProvider]);
    service = new DefaultPreferenceService(schemaRegistry, chain);
  });

  describe('get', () => {
    it('returns default value when no provider has the key', () => {
      expect(service.get('editor.tabSize')).toBe(4);
    });

    it('returns value from user provider when set', async () => {
      await service.set('editor.tabSize', 8);
      expect(service.get('editor.tabSize')).toBe(8);
    });

    it('returns undefined for unknown keys', () => {
      expect(service.get('unknown.key')).toBeUndefined();
    });

    it('returns default value when scope is Default', () => {
      expect(service.get('editor.tabSize', PreferenceScope.Default)).toBe(4);
    });

    it('returns user value when scope is User', async () => {
      await userProvider.set('editor.tabSize', 8);
      expect(service.get('editor.tabSize', PreferenceScope.User)).toBe(8);
    });
  });

  describe('set', () => {
    it('stores value in user scope by default', async () => {
      await service.set('editor.tabSize', 8);
      expect(userProvider.get('editor.tabSize')).toBe(8);
    });

    it('stores value in the specified scope', async () => {
      await service.set('editor.fontSize', 20, PreferenceScope.Default);
      expect(defaultProvider.get('editor.fontSize')).toBe(20);
    });

    it('throws for invalid values', async () => {
      await expect(service.set('editor.tabSize', 100)).rejects.toThrow('Invalid value for preference: editor.tabSize');
    });

    it('throws for invalid enum values', async () => {
      await expect(service.set('editor.wordWrap', 'invalid')).rejects.toThrow('Invalid value for preference: editor.wordWrap');
    });

    it('fires onPreferenceChanged event', async () => {
      const handler = jest.fn();
      service.onPreferenceChanged(handler);
      await service.set('editor.tabSize', 8);
      expect(handler).toHaveBeenCalledWith({ key: 'editor.tabSize', value: 8, scope: PreferenceScope.User });
    });
  });

  describe('inspect', () => {
    it('returns undefined for unknown keys', () => {
      expect(service.inspect('unknown.key')).toBeUndefined();
    });

    it('returns inspect result with default and effective values', async () => {
      const result = service.inspect('editor.tabSize');
      expect(result).toBeDefined();
      expect(result!.default).toBe(4);
      expect(result!.effective).toBe(4);
    });

    it('shows user value when set', async () => {
      await userProvider.set('editor.tabSize', 8);
      const result = service.inspect('editor.tabSize');
      expect(result!.user).toBe(8);
      expect(result!.effective).toBe(8);
    });
  });

  describe('has', () => {
    it('returns true for registered keys', () => {
      expect(service.has('editor.tabSize')).toBe(true);
    });

    it('returns false for unknown keys', () => {
      expect(service.has('unknown.key')).toBe(false);
    });
  });

  describe('onPreferenceChanged', () => {
    it('fires when set is called', async () => {
      const events: { key: string; value: unknown; scope: PreferenceScope }[] = [];
      service.onPreferenceChanged(e => events.push(e));
      await service.set('editor.tabSize', 8);
      await service.set('editor.fontSize', 16);
      expect(events).toHaveLength(2);
      expect(events[0].key).toBe('editor.tabSize');
      expect(events[1].key).toBe('editor.fontSize');
    });
  });
});
