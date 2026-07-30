jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: { readdir: jest.fn().mockResolvedValue([]) },
}));

describe('AdapterBase', () => {
  let AdapterRegistry: new () => { register: Function; get: Function; getByLanguage: Function; detect: Function; getAll: Function; getLanguages: Function };
  let adapterRegistry: { register: Function; get: Function; getByLanguage: Function; detect: Function; getAll: Function; getLanguages: Function };

  beforeAll(() => {
    const mod = require('../src/registry');
    AdapterRegistry = mod.AdapterRegistry;
    adapterRegistry = mod.adapterRegistry;
  });

  it('should register and retrieve adapters', () => {
    const registry = new AdapterRegistry();
    const mockAdapter = { name: 'test', language: 'test', capabilities: ['generate'] };
    registry.register(mockAdapter);
    expect(registry.get('test')).toBeDefined();
    expect(registry.getByLanguage('test')).toBeDefined();
  });

  it('should list all registered adapters', () => {
    const registry = new AdapterRegistry();
    expect(Array.isArray(registry.getAll())).toBe(true);
  });

  it('should list languages', () => {
    const registry = new AdapterRegistry();
    registry.register({ name: 'l1', language: 'lang1', capabilities: [] });
    registry.register({ name: 'l2', language: 'lang2', capabilities: [] });
    const languages = registry.getLanguages();
    expect(languages).toContain('lang1');
    expect(languages).toContain('lang2');
  });

  it('should have singleton adapterRegistry', () => {
    expect(adapterRegistry).toBeInstanceOf(AdapterRegistry);
  });
});

describe('execCommand', () => {
  it('should execute a command and return result', async () => {
    const { execCommand } = require('../src/utils');
    const result = await execCommand('node -e "console.log(42)"');
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('42');
  });

  it('should handle command failure', async () => {
    const { execCommand } = require('../src/utils');
    const result = await execCommand('node -e "process.exit(1)"');
    expect(result.code).toBe(1);
  });
});
