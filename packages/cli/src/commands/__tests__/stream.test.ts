import { streamCommand } from '../stream';

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
  finish: jest.fn(),
}));

describe('stream', () => {
  const cmd = streamCommand();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('streamCommand should be defined', () => {
    expect(streamCommand).toBeDefined();
  });

  it('streamCommand should execute without throwing', () => {
    expect(typeof streamCommand).toBe('function');
  });

  it('should have sse, websocket, emit, status subcommands', () => {
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain('sse');
    expect(subcommands).toContain('websocket');
    expect(subcommands).toContain('emit');
    expect(subcommands).toContain('status');
  });

  it('sse should start SSE server config', async () => {
    const { printHeader, finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'sse']);
    expect(printHeader).toHaveBeenCalledWith('SSE Stream Server');
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('sse with custom port should use it', async () => {
    const { finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'sse', '--port', '4000']);
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ port: 4000 }),
    }));
  });

  it('sse with invalid port should parse anyway', async () => {
    const { finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'sse', '--port', 'not-a-number']);
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ port: NaN }),
    }));
  });

  it('websocket should start WebSocket server config', async () => {
    const { printHeader, finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'websocket']);
    expect(printHeader).toHaveBeenCalledWith('WebSocket Stream Server');
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('websocket with custom port should use it', async () => {
    const { finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'websocket', '--port', '5000']);
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ port: 5000 }),
    }));
  });

  it('emit should emit a simulated event', async () => {
    const { printHeader, finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'emit', '--event', 'ai:response', '--data', '{"text":"hello"}']);
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('ai:response'));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('emit with invalid JSON should error', async () => {
    const { printResult, finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'emit', '--event', 'ai:error', '--data', 'not-json']);
    expect(printResult).toHaveBeenCalledWith('emit', false, 'Dados JSON invalidos');
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('emit with websocket protocol should use it', async () => {
    const { finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'emit', '--event', 'ai:test', '--data', '{"x":1}', '--protocol', 'websocket']);
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ protocol: 'websocket' }),
    }));
  });

  it('status should show server status', async () => {
    const { printHeader, finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'status']);
    expect(printHeader).toHaveBeenCalledWith('Streaming Status');
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
