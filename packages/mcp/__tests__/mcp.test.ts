import { MCPRegistry, createMCPServer, createMCPRegistry, MCPServer } from '../src/index';

describe('MCPRegistry', () => {
  let registry: MCPRegistry;

  beforeEach(() => { registry = createMCPRegistry(); });

  it('starts empty', () => {
    expect(registry.listServers()).toHaveLength(0);
    expect(registry.getTools()).toHaveLength(0);
  });

  it('registers server', () => {
    const server: MCPServer = { name: 'test', version: '1.0', tools: [], resources: [], prompts: [] };
    registry.register(server);
    expect(registry.listServers()).toHaveLength(1);
  });

  it('unregisters server', () => {
    registry.register({ name: 'test', version: '1.0', tools: [], resources: [], prompts: [] });
    expect(registry.unregister('test')).toBe(true);
    expect(registry.listServers()).toHaveLength(0);
  });

  it('gets tools from all servers', () => {
    registry.register({
      name: 'server1', version: '1.0',
      tools: [{ name: 'tool1', description: '', inputSchema: {}, handler: async () => 'ok1' }],
      resources: [], prompts: [],
    });
    registry.register({
      name: 'server2', version: '1.0',
      tools: [{ name: 'tool2', description: '', inputSchema: {}, handler: async () => 'ok2' }],
      resources: [], prompts: [],
    });
    expect(registry.getTools()).toHaveLength(2);
  });

  it('calls tool by name', async () => {
    registry.register({
      name: 'svc', version: '1.0', tools: [
        { name: 'greet', description: '', inputSchema: {}, handler: async (args) => `Hello ${args.name}` },
      ], resources: [], prompts: [],
    });
    const result = await registry.callTool('greet', { name: 'World' });
    expect(result.ok).toBe(true);
    expect(result.result).toBe('Hello World');
  });

  it('returns error for unknown tool', async () => {
    const result = await registry.callTool('nonexistent', {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error on tool failure', async () => {
    registry.register({
      name: 'fail', version: '1.0', tools: [
        { name: 'crash', description: '', inputSchema: {}, handler: async () => { throw new Error('boom'); } },
      ], resources: [], prompts: [],
    });
    const result = await registry.callTool('crash', {});
    expect(result.ok).toBe(false);
  });

  it('reads resource by URI', async () => {
    registry.register({
      name: 'res', version: '1.0', tools: [], resources: [
        { uri: 'file:///readme', name: 'README', handler: async () => '# Readme Content' },
      ], prompts: [],
    });
    const result = await registry.readResource('file:///readme');
    expect(result.ok).toBe(true);
    expect(result.content).toContain('Readme');
  });

  it('gets prompt by name', async () => {
    registry.register({
      name: 'prompts', version: '1.0', tools: [], resources: [], prompts: [
        { name: 'review', description: '', handler: async (args) => `Review: ${args.code}` },
      ],
    });
    const result = await registry.getPrompt('review', { code: 'console.log("ok")' });
    expect(result.ok).toBe(true);
    expect(result.prompt).toContain('console.log');
  });

  it('createMCPServer factory', () => {
    const server = createMCPServer({ name: 'my-server' });
    expect(server.name).toBe('my-server');
    expect(server.version).toBe('1.0.0');
  });

  it('createMCPRegistry factory', () => {
    expect(createMCPRegistry()).toBeInstanceOf(MCPRegistry);
  });
});
