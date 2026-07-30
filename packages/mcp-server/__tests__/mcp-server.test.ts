import { McpServer } from '../src/server';
import { InMemoryTransport } from '../src/transport';

describe('McpServer', () => {
  let server: McpServer;
  let transport: InMemoryTransport;

  beforeEach(() => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    transport = new InMemoryTransport();
    server.connect(transport);
  });

  afterEach(() => {
    server.disconnect();
  });

  it('should respond to initialize', async () => {
    await transport.receive({
      jsonrpc: '2.0',
      id: '1',
      method: 'initialize',
      params: {},
    });
    const sent = transport.getSent();
    expect(sent.length).toBe(1);
    expect(sent[0].id).toBe('1');
    expect(sent[0].result).toBeDefined();
    expect((sent[0].result as Record<string, unknown>).protocolVersion).toBe('mcp-v1');
  });

  it('should register and list tools', async () => {
    server.registerTool('hello', {
      description: 'Say hello',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    }, async (params) => `Hello ${params.name}`);

    await transport.receive({
      jsonrpc: '2.0',
      id: '2',
      method: 'tools/list',
    });
    const sent = transport.getSent();
    const result = sent.find(s => s.id === '2')?.result as Record<string, unknown>;
    expect(result).toBeDefined();
    const tools = result.tools as Array<Record<string, unknown>>;
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('hello');
  });

  it('should call a registered tool', async () => {
    server.registerTool('echo', {
      description: 'Echo input',
      inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
    }, async (params) => params.message || '');

    transport.clearSent();
    await transport.receive({
      jsonrpc: '2.0', id: '3', method: 'tools/call',
      params: { name: 'echo', arguments: { message: 'test' } },
    });
    const sent = transport.getSent();
    const result = sent.find(s => s.id === '3');
    expect(result).toBeDefined();
    expect(result!.result).toBe('test');
  });

  it('should return error for unknown tool', async () => {
    await transport.receive({
      jsonrpc: '2.0', id: '4', method: 'tools/call',
      params: { name: 'nonexistent' },
    });
    const sent = transport.getSent();
    const response = sent.find(s => s.id === '4');
    expect(response!.error).toBeDefined();
    expect(response!.error!.code).toBe(-32603);
  });

  it('should return error for unknown method', async () => {
    await transport.receive({
      jsonrpc: '2.0', id: '5', method: 'unknown/method',
    });
    const sent = transport.getSent();
    const response = sent.find(s => s.id === '5');
    expect(response!.error).toBeDefined();
    expect(response!.error!.code).toBe(-32601);
  });

  it('should register and list resources', async () => {
    server.registerResource({
      uri: 'memory://recent',
      name: 'Recent Memory',
      description: 'Recent memory entries',
      mimeType: 'application/json',
    });

    await transport.receive({
      jsonrpc: '2.0', id: '6', method: 'resources/list',
    });
    const sent = transport.getSent();
    const result = sent.find(s => s.id === '6')?.result as Record<string, unknown>;
    expect(result).toBeDefined();
    const resources = result.resources as Array<Record<string, unknown>>;
    expect(resources.length).toBe(1);
    expect(resources[0].uri).toBe('memory://recent');
  });

  it('should unregister tools', () => {
    server.registerTool('tmp', { description: 'temp', inputSchema: { type: 'object' } }, async () => {});
    server.unregisterTool('tmp');
    expect(server.getTools().length).toBe(0);
  });

  it('should unregister resources', () => {
    server.registerResource({ uri: 'tmp://x', name: 'tmp', description: 'temporary' });
    server.unregisterResource('tmp://x');
    expect(server.getResources().length).toBe(0);
  });

  it('should report capabilities', () => {
    server.registerTool('t1', { description: 'd', inputSchema: { type: 'object' } }, async () => {});
    const caps = server.getCapabilities();
    expect(caps.tools).toBeDefined();
  });

  it('should disconnect transport', async () => {
    server.disconnect();
    await transport.receive({
      jsonrpc: '2.0', id: '99', method: 'initialize',
    });
    expect(transport.getSent().length).toBe(0);
  });

  it('should handle handler errors gracefully', async () => {
    server.registerTool('failing', { description: 'fails', inputSchema: { type: 'object' } }, async () => {
      throw new Error('intentional failure');
    });

    transport.clearSent();
    await transport.receive({
      jsonrpc: '2.0', id: '7', method: 'tools/call',
      params: { name: 'failing' },
    });
    const sent = transport.getSent();
    const response = sent.find(s => s.id === '7');
    expect(response!.error).toBeDefined();
    expect(response!.error!.message).toContain('intentional failure');
  });

  it('should support custom server info', async () => {
    const custom = new McpServer({ name: 'custom', version: '2.0.0' });
    const t = new InMemoryTransport();
    custom.connect(t);
    await t.receive({ jsonrpc: '2.0', id: '1', method: 'initialize' });
    const sent = t.getSent();
    const result = sent[0].result as Record<string, unknown>;
    const info = result.serverInfo as Record<string, unknown>;
    expect(info.name).toBe('custom');
    expect(info.version).toBe('2.0.0');
    custom.disconnect();
  });
});

describe('InMemoryTransport', () => {
  it('should queue sent messages', () => {
    const t = new InMemoryTransport();
    t.send({ jsonrpc: '2.0', id: 1, result: 'ok' });
    expect(t.getSent().length).toBe(1);
  });

  it('should stop receiving after close', async () => {
    const t = new InMemoryTransport();
    let called = false;
    t.onMessage(() => { called = true; });
    t.close();
    await t.receive({ jsonrpc: '2.0', id: 1, method: 'test' });
    expect(called).toBe(false);
  });

  it('should clear sent messages', () => {
    const t = new InMemoryTransport();
    t.send({ jsonrpc: '2.0', id: 1, result: 'ok' });
    t.clearSent();
    expect(t.getSent().length).toBe(0);
  });
});
