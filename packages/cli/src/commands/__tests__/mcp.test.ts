import { handleRequest, runCli, mcpCommand, startMcpServer } from '../mcp';
import { Command } from 'commander';

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(() => ({
    stdout: '',
    stderr: '',
    status: 0,
    pid: 123,
    output: [],
    signal: null,
  })),
}));

describe('handleRequest', () => {
  it('should respond to initialize with protocol version and capabilities', () => {
    const response = handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    });
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    expect(response.result).toMatchObject({
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'ai-devkit-mcp' },
    });
  });

  it('should respond to tools/list with the tools array', () => {
    const response = handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(2);
    expect(response.result).toHaveProperty('tools');
    const result = response.result as { tools: unknown[] };
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBeGreaterThan(10);
  });

  it('should respond to tools/call with result when tool exists', () => {
    const mockRunCli = jest.fn(() => ({ stdout: 'Status: OK', stderr: '', exitCode: 0 }));
    const response = handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'mcp_status', arguments: {} },
    }, mockRunCli);
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(3);
    expect(response.result).toMatchObject({
      content: [{ type: 'text', text: 'Status: OK' }],
      isError: false,
    });
    expect(mockRunCli).toHaveBeenCalledWith('status', { AI_LLM_MODE: '1' });
  });

  it('should respond to tools/call with error when tool not found', () => {
    const response = handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'nonexistent_tool', arguments: {} },
    });
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(4);
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32601);
    expect(response.error!.message).toContain('Tool not found');
  });

  it('should respond to tools/call with error text when exit code is non-zero', () => {
    const mockRunCli = jest.fn(() => ({ stdout: 'error occurred', stderr: 'failure details', exitCode: 1 }));
    const response = handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'mcp_verify', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe(5);
    expect(response.result).toBeDefined();
    expect((response.result as { isError: boolean }).isError).toBe(true);
    expect((response.result as { content: { text: string }[] }).content[0].text).toContain('failure details');
  });

  it('should handle mcp_verify tool', () => {
    const mockRunCli = jest.fn(() => ({ stdout: 'verified', stderr: '', exitCode: 0 }));
    handleRequest({
      jsonrpc: '2.0', id: 6, method: 'tools/call',
      params: { name: 'mcp_verify', arguments: {} },
    }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('verify', {});
  });

  it('should handle mcp_doctor tool', () => {
    const mockRunCli = jest.fn(() => ({ stdout: 'ok', stderr: '', exitCode: 0 }));
    handleRequest({
      jsonrpc: '2.0', id: 7, method: 'tools/call',
      params: { name: 'mcp_doctor', arguments: {} },
    }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('doctor', {});
  });

  it('should handle mcp_detect tool', () => {
    const mockRunCli = jest.fn(() => ({ stdout: 'detected', stderr: '', exitCode: 0 }));
    handleRequest({
      jsonrpc: '2.0', id: 8, method: 'tools/call',
      params: { name: 'mcp_detect', arguments: {} },
    }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('detect stack', {});
  });

  it('should handle mcp_mode_set tool with mode argument', () => {
    const mockRunCli = jest.fn(() => ({ stdout: 'set', stderr: '', exitCode: 0 }));
    handleRequest({
      jsonrpc: '2.0', id: 9, method: 'tools/call',
      params: { name: 'mcp_mode_set', arguments: { mode: 'security' } },
    }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('mode set security', {});
  });

  it('should handle mcp_context_end with optional arguments', () => {
    const mockRunCli = jest.fn(() => ({ stdout: 'ended', stderr: '', exitCode: 0 }));
    handleRequest({
      jsonrpc: '2.0', id: 10, method: 'tools/call',
      params: { name: 'mcp_context_end', arguments: { summary: 'fixed bug', next: 'test it' } },
    }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('context end --summary "fixed bug" --next "test it"', {});
  });

  it('should handle notifications/initialized and return null id', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 11, method: 'notifications/initialized',
    });
    expect(response.id).toBeNull();
    expect(response.result).toBeNull();
  });

  it('should return error for unknown method', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 12, method: 'unknown_method',
    });
    expect(response.error).toBeDefined();
    expect(response.error!.message).toContain('Method not found');
  });

  it('should handle mcp_retrospective with since argument', () => {
    const mockRunCli = jest.fn(() => ({ stdout: 'done', stderr: '', exitCode: 0 }));
    handleRequest({
      jsonrpc: '2.0', id: 13, method: 'tools/call',
      params: { name: 'mcp_retrospective', arguments: { since: 'v1.0' } },
    }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('retrospective generate --since v1.0', {});
  });

  it('should handle mcp_ci_generate with force argument', () => {
    const mockRunCli = jest.fn(() => ({ stdout: 'done', stderr: '', exitCode: 0 }));
    handleRequest({
      jsonrpc: '2.0', id: 14, method: 'tools/call',
      params: { name: 'mcp_ci_generate', arguments: { force: true } },
    }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('ci generate --force', {});
  });

  it('should handle null id gracefully', () => {
    const response = handleRequest({
      jsonrpc: '2.0', method: 'initialize',
    });
    expect(response.id).toBeNull();
  });
});

describe('runCli', () => {
  it('should return CliResult with stdout, stderr, exitCode', () => {
    const result = runCli('status');
    expect(result).toHaveProperty('stdout');
    expect(result).toHaveProperty('stderr');
    expect(result).toHaveProperty('exitCode');
  });

  it('should call spawnSync with correct arguments', () => {
    const { spawnSync } = require('node:child_process');
    spawnSync.mockClear();
    runCli('status --json');
    expect(spawnSync).toHaveBeenCalled();
    const call = spawnSync.mock.calls[0];
    expect(call[0]).toBe('node');
    expect(call[1]).toContain('status');
    expect(call[1]).toContain('--json');
  });
});

describe('mcpCommand', () => {
  it('should create a command with name "mcp"', () => {
    const cmd = mcpCommand();
    expect(cmd.name()).toBe('mcp');
    expect(cmd.description()).toContain('MCP');
  });
});
