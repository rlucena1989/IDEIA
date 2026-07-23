import { createMcpHttpServer, McpHttpServer } from '../src/server-http';
import { MCPRegistry } from '../src/index';
import { request } from 'node:http';

let portCounter = 19000;

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(url, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpPost(url: string, body: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
    }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

describe('McpHttpServer', () => {
  let registry: MCPRegistry;
  let server: McpHttpServer;
  let port: number;

  beforeEach(async () => {
    port = portCounter++;
    registry = new MCPRegistry();
    registry.register({
      name: 'test-server', version: '1.0',
      tools: [{ name: 'greet', description: 'Greets a user', inputSchema: {}, handler: async (args) => `Hello, ${args.name}!` }],
      resources: [{ uri: 'file:///welcome', name: 'Welcome', handler: async () => 'Welcome to MCP' }],
      prompts: [{ name: 'review', description: 'Code review prompt', handler: async (args) => `Review: ${args.code}` }],
    });
    server = createMcpHttpServer({ port, registry });
    await server.start();
  });

  afterEach(async () => {
    try { await server.stop(); } catch {}
  }, 10000);

  it('GET /mcp/tools returns tools', async () => {
    const res = await httpGet(`http://localhost:${port}/mcp/tools`);
    const data = JSON.parse(res);
    expect(data.ok).toBe(true);
    expect(data.tools).toHaveLength(1);
    expect(data.tools[0].name).toBe('greet');
  });

  it('GET /mcp/resources returns resources', async () => {
    const res = await httpGet(`http://localhost:${port}/mcp/resources`);
    const data = JSON.parse(res);
    expect(data.ok).toBe(true);
    expect(data.resources).toHaveLength(1);
  });

  it('GET /mcp/prompts returns prompts', async () => {
    const res = await httpGet(`http://localhost:${port}/mcp/prompts`);
    const data = JSON.parse(res);
    expect(data.ok).toBe(true);
    expect(data.prompts).toHaveLength(1);
  });

  it('GET /mcp/manifest returns server manifest', async () => {
    const res = await httpGet(`http://localhost:${port}/mcp/manifest`);
    const data = JSON.parse(res);
    expect(data.ok).toBe(true);
    expect(data.manifest.servers).toHaveLength(1);
  });

  it('POST /mcp/call calls a tool', async () => {
    const res = await httpPost(`http://localhost:${port}/mcp/call`, { name: 'greet', args: { name: 'World' } });
    const data = JSON.parse(res);
    expect(data.ok).toBe(true);
    expect(data.result).toBe('Hello, World!');
  });

  it('POST /mcp/call returns 404 for unknown tool', async () => {
    const res = await httpPost(`http://localhost:${port}/mcp/call`, { name: 'unknown', args: {} });
    const data = JSON.parse(res);
    expect(data.ok).toBe(false);
  });

  it('POST /mcp/read reads a resource', async () => {
    const res = await httpPost(`http://localhost:${port}/mcp/read`, { uri: 'file:///welcome' });
    const data = JSON.parse(res);
    expect(data.ok).toBe(true);
    expect(data.content).toContain('Welcome');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await httpGet(`http://localhost:${port}/unknown`);
    const data = JSON.parse(res);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Not found');
  });
});
