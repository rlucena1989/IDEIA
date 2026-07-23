import { createToolRegistry, ToolRegistry } from '../src/tool-registry';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => { registry = createToolRegistry(); });

  it('starts empty', () => {
    expect(registry.count()).toBe(0);
    expect(registry.list()).toHaveLength(0);
  });

  it('registers a tool with source', () => {
    registry.register({ name: 'tool1', description: 'Test tool', inputSchema: {}, handler: async () => 'ok' }, 'test-source');
    expect(registry.count()).toBe(1);
  });

  it('get returns tool by name', () => {
    registry.register({ name: 'tool1', description: 'Test tool', inputSchema: {}, handler: async () => 'ok' }, 'test');
    const tool = registry.get('tool1');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('tool1');
  });

  it('get returns undefined for unknown tool', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('unregister removes a tool', () => {
    registry.register({ name: 'tool1', description: '', inputSchema: {}, handler: async () => 'ok' }, 'test');
    expect(registry.unregister('tool1')).toBe(true);
    expect(registry.count()).toBe(0);
  });

  it('unregister returns false for unknown tool', () => {
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  it('search finds tools by name', () => {
    registry.register({ name: 'file-reader', description: 'Reads files', inputSchema: {}, handler: async () => 'ok' }, 'src');
    registry.register({ name: 'api-caller', description: 'Calls APIs', inputSchema: {}, handler: async () => 'ok' }, 'src');
    const results = registry.search('file');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('file-reader');
  });

  it('search finds tools by description', () => {
    registry.register({ name: 'reader', description: 'File reading tool', inputSchema: {}, handler: async () => 'ok' }, 'src');
    const results = registry.search('reading');
    expect(results).toHaveLength(1);
  });

  it('getBySource filters by source', () => {
    registry.register({ name: 'a', description: '', inputSchema: {}, handler: async () => 'ok' }, 'source1');
    registry.register({ name: 'b', description: '', inputSchema: {}, handler: async () => 'ok' }, 'source2');
    expect(registry.getBySource('source1')).toHaveLength(1);
    expect(registry.getBySource('source3')).toHaveLength(0);
  });

  it('getRegistrationInfo returns full metadata', () => {
    registry.register({ name: 'tool1', description: 'Test', inputSchema: {}, handler: async () => 'ok' }, 'my-source');
    const info = registry.getRegistrationInfo('tool1');
    expect(info).toBeDefined();
    expect(info!.source).toBe('my-source');
    expect(info!.registeredAt).toBeDefined();
    expect(info!.tool.name).toBe('tool1');
  });

  it('clear removes all tools', () => {
    registry.register({ name: 'a', description: '', inputSchema: {}, handler: async () => 'ok' }, 's1');
    registry.register({ name: 'b', description: '', inputSchema: {}, handler: async () => 'ok' }, 's2');
    registry.clear();
    expect(registry.count()).toBe(0);
  });
});
