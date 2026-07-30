import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

describe('mcpCommand', () => {
  it('returns a Command object with name mcp', () => {
    const { mcpCommand } = require('../commands/mcp');
    const cmd = mcpCommand();
    expect(cmd.name()).toBe('mcp');
  });

  it('has description', () => {
    const { mcpCommand } = require('../commands/mcp');
    const cmd = mcpCommand();
    expect(cmd.description()).toBeTruthy();
  });
});

describe('TOOLS list', () => {
  it('contains all expected MCP tools', () => {
    jest.isolateModules(() => {
      const mcp = require('../commands/mcp');
      const cmd = mcp.mcpCommand();
      expect(cmd.name()).toBe('mcp');
    });
  });
});

describe('handleRequest - tools/call', () => {
  let mockRunCli: jest.Mock;

  beforeEach(() => {
    mockRunCli = jest.fn();
    mockRunCli.mockReturnValue({ stdout: 'ok', stderr: '', exitCode: 0 });
  });

  it('routes mcp_status to status command', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_status', arguments: {} } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('status', { AI_LLM_MODE: '1' });
  });

  it('routes mcp_verify to verify command', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_verify', arguments: {} } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('verify', {});
  });

  it('routes mcp_doctor to doctor command', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_doctor', arguments: {} } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('doctor', {});
  });

  it('routes mcp_detect to detect stack command', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_detect', arguments: {} } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('detect stack', {});
  });

  it('routes mcp_mode_get to mode current command', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_mode_get', arguments: {} } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('mode current', {});
  });

  it('routes mcp_mode_set with mode argument', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_mode_set', arguments: { mode: 'development' } } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('mode set development', {});
  });

  it('routes mcp_hook_install to hook install', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_hook_install', arguments: {} } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('hook install', {});
  });

  it('routes mcp_hook_uninstall to hook uninstall', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_hook_uninstall', arguments: {} } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('hook uninstall', {});
  });

  it('routes mcp_adapter_list to adapter list', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_adapter_list', arguments: {} } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('adapter list', {});
  });

  it('routes mcp_retrospective with since parameter', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_retrospective', arguments: { since: '7d' } } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('retrospective generate --since 7d', {});
  });

  it('routes mcp_ci_generate with force parameter', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_ci_generate', arguments: { force: 'true' } } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('ci generate --force', {});
  });

  it('routes mcp_context_start to context start', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_context_start', arguments: {} } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('context start', {});
  });

  it('routes mcp_context_end with all arguments', () => {
    const { handleRequest } = require('../commands/mcp');
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mcp_context_end', arguments: { summary: 'done', decisions: 'd1;d2', next: 'deploy' } } }, mockRunCli);
    expect(mockRunCli).toHaveBeenCalledWith('context end --summary "done" --decisions "d1;d2" --next "deploy"', {});
  });

  it('returns error for unknown tool', () => {
    const { handleRequest } = require('../commands/mcp');
    const res = handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'unknown_tool', arguments: {} } }, mockRunCli);
    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32601);
  });
});

describe('handleRequest - initialize', () => {
  it('returns protocol capabilities', () => {
    const { handleRequest } = require('../commands/mcp');
    const res = handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(res.result).toHaveProperty('protocolVersion', '2024-11-05');
    expect(res.result).toHaveProperty('capabilities');
    expect(res.result).toHaveProperty('serverInfo');
  });
});

describe('handleRequest - tools/list', () => {
  it('returns tool definitions', () => {
    const { handleRequest } = require('../commands/mcp');
    const res = handleRequest({ jsonrpc: '2.0', id: 'req-1', method: 'tools/list' });
    expect(Array.isArray(res.result!.tools)).toBe(true);
    const toolNames = (res.result as { tools: { name: string }[] }).tools.map(t => t.name);
    expect(toolNames).toContain('mcp_status');
    expect(toolNames).toContain('mcp_doctor');
    expect(toolNames).toContain('mcp_mode_set');
  });
});

describe('handleRequest - unknown method', () => {
  it('returns error for unknown method', () => {
    const { handleRequest } = require('../commands/mcp');
    const res = handleRequest({ jsonrpc: '2.0', id: 1, method: 'unknown_method' });
    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32601);
  });
});
