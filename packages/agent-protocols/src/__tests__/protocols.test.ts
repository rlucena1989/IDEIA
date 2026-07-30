import { JSONRPCProtocolHandler } from '../jsonrpc-protocol-handler';
import { ProtobufProtocolHandler } from '../protobuf-protocol-handler';
import { MessagePackHandler } from '../messagepack-handler';
import { A2AProtocolHandler } from '../a2a-protocol-handler';
import { MCPServer } from '../mcp-server';
import { ProtocolBenchmark } from '../protocol-benchmark';
import { SerializationFormat, AgentAddress } from '../types';

describe('JSONRPCProtocolHandler', () => {
  let handler: JSONRPCProtocolHandler;

  beforeEach(() => { handler = new JSONRPCProtocolHandler(); });

  it('should parse valid JSON-RPC request', () => {
    const parsed = handler.parseRequest({ jsonrpc: '2.0', id: 1, method: 'test', params: {} });
    expect(parsed).not.toBeNull();
  });

  it('should parse notification', () => {
    const parsed = handler.parseRequest({ jsonrpc: '2.0', method: 'notify', params: {} });
    expect(parsed).not.toBeNull();
  });

  it('should reject invalid JSON-RPC', () => {
    expect(handler.parseRequest({})).toBeNull();
    expect(handler.parseRequest({ jsonrpc: '1.0' })).toBeNull();
  });

  it('should register and handle methods', async () => {
    handler.registerMethod('ping', async () => 'pong');
    const msg = {
      id: '1', type: 'request' as const, from: { id: 'a', type: 'analyst' as const, instance: '1' },
      to: { id: 'b', type: 'programmer' as const, instance: '1' },
      payload: { jsonrpc: '2.0', id: 1, method: 'ping' },
      metadata: { correlationId: 'c1', ttl: 1000, priority: 2 as const, timestamp: Date.now(), traceId: 't1', spanId: 's1' },
    };
    const response = await handler.handleMessage(msg);
    expect(response).not.toBeNull();
    expect((response!.payload as any).result).toBe('pong');
  });

  it('should return method not found error', async () => {
    const msg = {
      id: '1', type: 'request' as const, from: { id: 'a', type: 'analyst' as const, instance: '1' },
      to: { id: 'b', type: 'programmer' as const, instance: '1' },
      payload: { jsonrpc: '2.0', id: 1, method: 'unknown' },
      metadata: { correlationId: 'c1', ttl: 1000, priority: 2 as const, timestamp: Date.now(), traceId: 't1', spanId: 's1' },
    };
    const response = await handler.handleMessage(msg);
    expect((response!.payload as any).error.code).toBe(-32601);
  });

  it('should build proper request objects', () => {
    const req = handler.buildRequest('test', { key: 'val' });
    expect(req.jsonrpc).toBe('2.0');
    expect(req.method).toBe('test');
    expect(req.params).toEqual({ key: 'val' });
  });

  it('should handle method error gracefully', async () => {
    handler.registerMethod('fail', async () => { throw new Error('oops'); });
    const msg = {
      id: '1', type: 'request' as const, from: { id: 'a', type: 'analyst' as const, instance: '1' },
      to: { id: 'b', type: 'programmer' as const, instance: '1' },
      payload: { jsonrpc: '2.0', id: 1, method: 'fail' },
      metadata: { correlationId: 'c1', ttl: 1000, priority: 2 as const, timestamp: Date.now(), traceId: 't1', spanId: 's1' },
    };
    const response = await handler.handleMessage(msg);
    expect((response!.payload as any).error).toBeDefined();
  });
});

describe('ProtobufProtocolHandler', () => {
  let pb: ProtobufProtocolHandler;
  beforeEach(() => { pb = new ProtobufProtocolHandler(); });

  it('should serialize and deserialize', () => {
    const msg = {
      version: 1 as const, messageId: 'm1', correlationId: 'c1',
      from: { id: 'a', type: 'analyst' as const, instance: '1' },
      to: { id: 'b', type: 'programmer' as const, instance: '1' },
      type: 'request' as const, payload: { test: true },
      timestamp: Date.now(), ttl: 1000, priority: 1 as const,
      traceId: 't1', spanId: 's1', format: SerializationFormat.PROTOBUF,
    };
    const serialized = pb.serialize(msg);
    expect(serialized.length).toBeGreaterThan(0);
    const deserialized = pb.deserialize(serialized);
    expect(deserialized).toBeDefined();
  });

  it('should detect format', () => {
    const data = new TextEncoder().encode('prot' + JSON.stringify({}));
    expect(pb.detectFormat(data)).toBe(SerializationFormat.PROTOBUF);
  });

  it('should encode and decode fields', () => {
    const encoded = pb.encodeField({ hello: 'world' });
    const decoded = pb.decodeField(encoded);
    expect(decoded).toEqual({ hello: 'world' });
  });

  it('should report size', () => {
    const msg = {
      version: 1 as const, messageId: 'm1', correlationId: 'c1',
      from: { id: 'a', type: 'analyst' as const, instance: '1' },
      to: { id: 'b', type: 'programmer' as const, instance: '1' },
      type: 'request' as const, payload: {},
      timestamp: 0, ttl: 1000, priority: 1 as const,
      traceId: 't1', spanId: 's1', format: SerializationFormat.JSON,
    };
    expect(pb.getSize(msg)).toBeGreaterThan(0);
  });
});

describe('MessagePackHandler', () => {
  let mp: MessagePackHandler;
  beforeEach(() => { mp = new MessagePackHandler(); });

  it('should serialize and deserialize', () => {
    const data = mp.serialize({
      version: 1 as const, messageId: 'm1', correlationId: 'c1',
      from: { id: 'a', type: 'analyst' as const, instance: '1' },
      to: { id: 'b', type: 'programmer' as const, instance: '1' },
      type: 'request' as const, payload: { num: 42 },
      timestamp: 0, ttl: 1000, priority: 1 as const,
      traceId: 't1', spanId: 's1', format: SerializationFormat.MESSAGEPACK,
    });
    const deserialized = mp.deserialize(data);
    expect((deserialized as any).payload.num).toBe(42);
  });

  it('should detect format', () => {
    const data = new TextEncoder().encode('mpac' + JSON.stringify({}));
    expect(mp.detectFormat(data)).toBe(SerializationFormat.MESSAGEPACK);
  });

  it('should round-trip pack/unpack', () => {
    const packed = mp.pack([1, 2, 3]);
    const unpacked = mp.unpack(packed);
    expect(unpacked).toEqual([1, 2, 3]);
  });
});

describe('A2AProtocolHandler', () => {
  let a2a: A2AProtocolHandler;
  beforeEach(() => {
    a2a = new A2AProtocolHandler({ baseUrl: 'http://localhost:3000', name: 'test-agent' });
  });

  it('should return agent card', () => {
    const card = a2a.getAgentCard();
    expect(card.name).toBe('test-agent');
    expect(card.capabilities.protocols).toContain('a2a');
  });

  it('should register skills', () => {
    a2a.registerSkill({ id: 's1', name: 'codegen', description: 'Code generation', inputSchema: {}, outputSchema: {} });
    const card = a2a.getAgentCard();
    expect(card.capabilities.skills.length).toBe(1);
  });

  it('should bridge from ACP message', () => {
    const msg = {
      id: 'msg-1', type: 'request' as const, from: { id: 'agent-a', type: 'analyst' as const, instance: '1' },
      to: { id: 'agent-b', type: 'programmer' as const, instance: '1' },
      payload: 'test payload',
      metadata: { correlationId: 'corr-1', ttl: 1000, priority: 2 as const, timestamp: Date.now(), traceId: 't1', spanId: 's1' },
    };
    const task = a2a.bridgeFromACP(msg);
    expect(task.sessionId).toBe('corr-1');
    expect(task.input.text).toBe('test payload');
  });

  it('should verify VC credentials', () => {
    const result = a2a.verifyVCCredential('header.' + Buffer.from(JSON.stringify({ iss: 'issuer', sub: 'subject' })).toString('base64url') + '.sig');
    expect(result.valid).toBe(true);
    expect(result.issuer).toBe('issuer');
  });

  it('should reject invalid VC credentials', () => {
    expect(a2a.verifyVCCredential('invalid').valid).toBe(false);
  });
});

describe('MCPServer', () => {
  let mcp: MCPServer;
  beforeEach(() => { mcp = new MCPServer({ serverUrl: 'http://localhost:3001' }); });

  it('should register and list tools', () => {
    mcp.registerTool({ name: 'echo', description: 'Echoes input', inputSchema: {} }, async (args) => args);
    const context = mcp.getContext();
    expect(context.tools.length).toBe(1);
    expect(context.tools[0].name).toBe('echo');
  });

  it('should handle initialize request', async () => {
    const result = await mcp.handleRequest('initialize', {});
    expect(result).toBeDefined();
    expect((result as any).protocolVersion).toBe('2024-11-05');
  });

  it('should handle tools/list request', async () => {
    mcp.registerTool({ name: 't1', description: 'Tool 1', inputSchema: {} }, async () => ({}));
    const result = await mcp.handleRequest('tools/list', {});
    expect((result as any).tools.length).toBe(1);
  });

  it('should handle tools/call', async () => {
    mcp.registerTool({ name: 'greet', description: 'Greets', inputSchema: {} }, async (args) => 'Hello ' + (args.name ?? 'world'));
    const result = await mcp.handleRequest('tools/call', { name: 'greet', arguments: { name: 'Test' } });
    expect(result).toBe('Hello Test');
  });

  it('should throw on unknown method', async () => {
    await expect(mcp.handleRequest('unknown', {}))
      .rejects.toThrow('Unknown method');
  });

  it('should register resources and prompts', () => {
    mcp.registerResource({ uri: 'file:///doc.md', name: 'doc', description: 'A doc', mimeType: 'text/markdown' });
    mcp.registerPrompt({ name: 'greet', description: 'Greeting', arguments: [{ name: 'name', description: 'Name', required: true }] });
    const ctx = mcp.getContext();
    expect(ctx.resources.length).toBe(1);
    expect(ctx.prompts.length).toBe(1);
  });
});

describe('ProtocolBenchmark', () => {
  let benchmark: ProtocolBenchmark;
  beforeEach(() => { benchmark = new ProtocolBenchmark(); });

  it('should run benchmark suite', async () => {
    const results = await benchmark.runSuite({ operations: 100, payloadSize: 256, parallel: 1 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].throughput).toBeGreaterThan(0);
  });

  it('should generate report', async () => {
    await benchmark.runSuite({ operations: 50, payloadSize: 128, parallel: 1 });
    const report = benchmark.generateReport();
    expect(report).toContain('Benchmark');
  });

  it('should export JSON', async () => {
    await benchmark.runSuite({ operations: 50, payloadSize: 128, parallel: 1 });
    const json = benchmark.exportJSON();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('should return results', async () => {
    await benchmark.runSuite({ operations: 50, payloadSize: 128, parallel: 1 });
    expect(benchmark.getResults().length).toBeGreaterThan(0);
  });

  it('should measure serialize and deserialize', async () => {
    const results = await benchmark.runSuite({ operations: 100, payloadSize: 256, parallel: 1 });
    const ops = results.map(r => r.operation);
    expect(ops).toContain('serialize');
    expect(ops).toContain('deserialize');
  });
});