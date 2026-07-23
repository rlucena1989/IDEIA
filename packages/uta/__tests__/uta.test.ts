import { UTApi } from '../src/api';
import { Tool } from '../src/types';

describe('UTApi', () => {
  let api: UTApi;

  beforeEach(() => {
    api = new UTApi();
  });

  it('should register and discover tools', () => {
    const tool: Tool = {
      id: 'code.generate', name: 'generateCode', description: 'Generate code',
      category: 'code', params: [], returns: 'string',
    };
    api.registry.register(tool, async () => 'generated');
    expect(api.discover().length).toBe(1);
    expect(api.discover('code').length).toBe(1);
    expect(api.discover('other').length).toBe(0);
  });

  it('should execute tool and return result', async () => {
    const tool: Tool = {
      id: 'hello', name: 'hello', description: 'Say hello',
      category: 'test', params: [],
    };
    api.registry.register(tool, async (params) => `Hello ${params.name || 'world'}`);
    const result = await api.execute({ toolId: 'hello', params: { name: 'IDEIA' } });
    expect(result.success).toBe(true);
    expect(result.data).toBe('Hello IDEIA');
  });

  it('should search tools by name', () => {
    api.registry.register(
      { id: 'code.fmt', name: 'formatCode', description: 'Format code', category: 'code', params: [] },
      async () => 'formatted'
    );
    api.registry.register(
      { id: 'git.commit', name: 'commitChanges', description: 'Commit git changes', category: 'git', params: [] },
      async () => 'committed'
    );
    expect(api.search('format').length).toBe(1);
    expect(api.search('git').length).toBe(1);
    expect(api.search('code').length).toBe(1);
  });

  it('should handle unknown tool', async () => {
    const result = await api.execute({ toolId: 'nonexistent', params: {} });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should maintain audit log', async () => {
    api.registry.register(
      { id: 'test', name: 'test', description: 'test', category: 'test', params: [] },
      async () => 'done'
    );
    await api.execute({ toolId: 'test', params: {} });
    expect(api.getAuditLog().length).toBe(1);
    expect(api.getAuditLog()[0].toolId).toBe('test');
  });

  it('should track execution duration', async () => {
    api.registry.register(
      { id: 'slow', name: 'slow', description: 'slow', category: 'test', params: [] },
      async () => { await new Promise(r => setTimeout(r, 10)); return 'slow'; }
    );
    const result = await api.execute({ toolId: 'slow', params: {} });
    expect(result.duration).toBeGreaterThanOrEqual(10);
  });
});

describe('DiscoveryRegistry', () => {
  it('should filter tools by category', () => {
    const registry = apiRegistry();
    registry.register({ id: 'a', name: 'a', description: '', category: 'cat1', params: [] }, async () => {});
    registry.register({ id: 'b', name: 'b', description: '', category: 'cat2', params: [] }, async () => {});
    expect(registry.listTools('cat1').length).toBe(1);
    expect(registry.listTools().length).toBe(2);
  });

  it('should unregister tools', () => {
    const registry = apiRegistry();
    registry.register({ id: 'tmp', name: 'tmp', description: '', category: 'test', params: [] }, async () => {});
    expect(registry.count()).toBe(1);
    registry.unregister('tmp');
    expect(registry.count()).toBe(0);
  });
});

function apiRegistry() {
  return new (require('../src/registry').DiscoveryRegistry)();
}
