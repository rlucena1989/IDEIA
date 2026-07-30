const mockSpawnSync = jest.fn();
jest.mock('node:child_process', () => ({ spawnSync: (...args: unknown[]) => mockSpawnSync(...args) }));

import { handleRequest, mcpCommand, runCli, startMcpServer } from '../commands/mcp';

let mockRunCli: jest.Mock<ReturnType<typeof runCli>, [string, Record<string, string> | undefined]>;

beforeEach(() => {
  mockSpawnSync.mockReset();
  mockSpawnSync.mockReturnValue({ status: 0, stdout: '{"ok":true}\n', stderr: '' });
  mockRunCli = jest.fn();
  mockRunCli.mockReturnValue({ stdout: '{"ok":true}', stderr: '', exitCode: 0 });
});

describe('handleRequest', () => {
  it('handles initialize request', () => {
    const response = handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    expect(response.result).toHaveProperty('protocolVersion', '2024-11-05');
    expect(response.result).toHaveProperty('serverInfo');
  });

  it('handles tools/list request', () => {
    const response = handleRequest({ jsonrpc: '2.0', id: 'test-1', method: 'tools/list' });
    expect(response.id).toBe('test-1');
    expect(response.result).toHaveProperty('tools');
    expect(Array.isArray((response.result as { tools: unknown[] }).tools)).toBe(true);
  });

  it('handles tools/call with mcp_status (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'mcp_status', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe(2);
    expect(response.jsonrpc).toBe('2.0');
    expect(mockRunCli).toHaveBeenCalledWith('status', { AI_LLM_MODE: '1' });
  });

  it('handles tools/call with mcp_verify (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'mcp_verify', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe(3);
    expect(response.jsonrpc).toBe('2.0');
    expect(mockRunCli).toHaveBeenCalledWith('verify', {});
  });

  it('handles tools/call with mcp_doctor (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'mcp_doctor', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe(4);
    expect(response.jsonrpc).toBe('2.0');
    expect(mockRunCli).toHaveBeenCalledWith('doctor', {});
  });

  it('handles tools/call with unknown tool', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'unknown_tool', arguments: {} },
    });
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32601);
  });

  it('handles unknown method', () => {
    const response = handleRequest({ jsonrpc: '2.0', id: 6, method: 'unknown' });
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32601);
  });

  it('handles request with null id', () => {
    const response = handleRequest({ jsonrpc: '2.0', id: undefined, method: 'initialize' });
    expect(response.id).toBeNull();
  });

  it('handles tools/call with mcp_detect (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_detect', method: 'tools/call',
      params: { name: 'mcp_detect', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe('mcp_detect');
    expect(response.jsonrpc).toBe('2.0');
    expect(mockRunCli).toHaveBeenCalledWith('detect stack', {});
  });

  it('handles tools/call with mcp_mode_get (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_mode_get', method: 'tools/call',
      params: { name: 'mcp_mode_get', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe('mcp_mode_get');
    expect(mockRunCli).toHaveBeenCalledWith('mode current', {});
  });

  it('handles tools/call with mcp_mode_set (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_mode_set', method: 'tools/call',
      params: { name: 'mcp_mode_set', arguments: { mode: 'auto' } },
    }, mockRunCli);
    expect(response.id).toBe('mcp_mode_set');
    expect(mockRunCli).toHaveBeenCalledWith('mode set auto', {});
  });

  it('handles tools/call with mcp_hook_install (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_hook_install', method: 'tools/call',
      params: { name: 'mcp_hook_install', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe('mcp_hook_install');
    expect(mockRunCli).toHaveBeenCalledWith('hook install', {});
  });

  it('handles tools/call with mcp_hook_uninstall (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_hook_uninstall', method: 'tools/call',
      params: { name: 'mcp_hook_uninstall', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe('mcp_hook_uninstall');
    expect(mockRunCli).toHaveBeenCalledWith('hook uninstall', {});
  });

  it('handles tools/call with mcp_adapter_list (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_adapter_list', method: 'tools/call',
      params: { name: 'mcp_adapter_list', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe('mcp_adapter_list');
    expect(mockRunCli).toHaveBeenCalledWith('adapter list', {});
  });

  it('handles tools/call with mcp_retrospective (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_retrospective', method: 'tools/call',
      params: { name: 'mcp_retrospective', arguments: { since: '7d' } },
    }, mockRunCli);
    expect(response.id).toBe('mcp_retrospective');
    expect(mockRunCli).toHaveBeenCalledWith('retrospective generate --since 7d', {});
  });

  it('handles tools/call with mcp_ci_generate (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_ci_generate', method: 'tools/call',
      params: { name: 'mcp_ci_generate', arguments: { force: 'true' } },
    }, mockRunCli);
    expect(response.id).toBe('mcp_ci_generate');
    expect(mockRunCli).toHaveBeenCalledWith('ci generate --force', {});
  });

  it('handles tools/call with mcp_context_start (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_context_start', method: 'tools/call',
      params: { name: 'mcp_context_start', arguments: {} },
    }, mockRunCli);
    expect(response.id).toBe('mcp_context_start');
    expect(mockRunCli).toHaveBeenCalledWith('context start', {});
  });

  it('handles tools/call with mcp_context_end (via injected runCli)', () => {
    const response = handleRequest({
      jsonrpc: '2.0', id: 'mcp_context_end', method: 'tools/call',
      params: { name: 'mcp_context_end', arguments: { summary: 'test', decisions: 'd1', next: 'n1' } },
    }, mockRunCli);
    expect(response.id).toBe('mcp_context_end');
    expect(mockRunCli).toHaveBeenCalledWith('context end --summary "test" --decisions "d1" --next "n1"', {});
  });

  it('returns error result when runCli returns non-zero exit code', () => {
    mockRunCli.mockReturnValueOnce({ stdout: 'FAIL', stderr: 'error msg', exitCode: 1 });
    const response = handleRequest({
      jsonrpc: '2.0', id: 99, method: 'tools/call',
      params: { name: 'mcp_status', arguments: {} },
    }, mockRunCli);
    expect(response.result).toEqual({
      content: [{ type: 'text', text: 'Error: error msg' }],
      isError: true,
    });
  });

  it('returns error result when runCli has stderr but zero exit code', () => {
    mockRunCli.mockReturnValueOnce({ stdout: 'warn', stderr: 'stderr content', exitCode: 0 });
    const response = handleRequest({
      jsonrpc: '2.0', id: 100, method: 'tools/call',
      params: { name: 'mcp_status', arguments: {} },
    }, mockRunCli);
    expect(response.result).toEqual({
      content: [{ type: 'text', text: 'Error: stderr content' }],
      isError: true,
    });
  });

  it('handles notifications/initialized', () => {
    const response = handleRequest({ jsonrpc: '2.0', id: undefined, method: 'notifications/initialized' });
    expect(response.result).toBeNull();
    expect(response.id).toBeNull();
  });
});

describe('runCli', () => {
  it('executes node with entry point and args', () => {
    const result = runCli('status', undefined, '/fake/entry.js');
    expect(mockSpawnSync).toHaveBeenCalledWith('node', ['/fake/entry.js', 'status'], expect.objectContaining({
      encoding: 'utf8',
      cwd: expect.any(String),
    }));
    expect(result).toEqual({ stdout: '{"ok":true}', stderr: '', exitCode: 0 });
  });

  it('passes env vars to spawn', () => {
    runCli('verify', { AI_LLM_MODE: '1' }, '/fake/entry.js');
    expect(mockSpawnSync).toHaveBeenCalledWith('node', ['/fake/entry.js', 'verify'], expect.objectContaining({
      env: expect.objectContaining({ AI_LLM_MODE: '1' }),
    }));
  });

  it('handles spawn failure', () => {
    mockSpawnSync.mockReturnValueOnce({ status: null, stdout: '', stderr: 'ENOENT' });
    const result = runCli('doctor', undefined, '/fake/entry.js');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('ENOENT');
  });

  it('handles non-string spawn output', () => {
    mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: Buffer.from('binary'), stderr: Buffer.from('') });
    const result = runCli('status', undefined, '/fake/entry.js');
    expect(result.stdout).toBe('');
    expect(result.exitCode).toBe(0);
  });
});

describe('startMcpServer', () => {
  let stdinOn: jest.Mock;
  let stdoutWrite: jest.Mock;
  let stderrWrite: jest.Mock;
  let processExit: jest.Mock;
  let stdinSetEncoding: jest.Mock;
  let dataHandler: ((chunk: string) => void) | null;
  let endHandler: (() => void) | null;

  beforeEach(() => {
    dataHandler = null;
    endHandler = null;
    stdinOn = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'data') dataHandler = handler as (chunk: string) => void;
      if (event === 'end') endHandler = handler as () => void;
    });
    stdinSetEncoding = jest.fn();
    stdoutWrite = jest.fn();
    stderrWrite = jest.fn();
    processExit = jest.fn();

    jest.spyOn(process, 'stdin', 'get').mockReturnValue({
      setEncoding: stdinSetEncoding,
      on: stdinOn,
      fd: 0,
    } as any);
    jest.spyOn(process.stdout, 'write').mockImplementation(stdoutWrite as any);
    jest.spyOn(process.stderr, 'write').mockImplementation(stderrWrite as any);
    jest.spyOn(process, 'exit').mockImplementation(processExit as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets stdin encoding and attaches listeners', () => {
    startMcpServer();
    expect(stdinSetEncoding).toHaveBeenCalledWith('utf8');
    expect(stdinOn).toHaveBeenCalledWith('data', expect.any(Function));
    expect(stdinOn).toHaveBeenCalledWith('end', expect.any(Function));
  });

  it('processes a valid JSON-RPC request from stdin', () => {
    startMcpServer();
    expect(dataHandler).not.toBeNull();
    dataHandler!('{"jsonrpc":"2.0","id":1,"method":"initialize"}\n');
    expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('"jsonrpc":"2.0"'));
    expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('"protocolVersion":"2024-11-05"'));
  });

  it('ignores empty lines', () => {
    startMcpServer();
    dataHandler!('\n\n');
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('handles parse errors', () => {
    startMcpServer();
    dataHandler!('invalid json\n');
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining('Parse error'));
  });

  it('handles end event by exiting', () => {
    startMcpServer();
    expect(endHandler).not.toBeNull();
    endHandler!();
    expect(processExit).toHaveBeenCalledWith(0);
  });

  it('processes multiple lines in one chunk', () => {
    startMcpServer();
    dataHandler!('{"jsonrpc":"2.0","id":1,"method":"initialize"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n');
    expect(stdoutWrite).toHaveBeenCalledTimes(2);
  });

  it('handles partial line buffering', () => {
    startMcpServer();
    dataHandler!('{"jsonrpc":"2.0","i');
    expect(stdoutWrite).not.toHaveBeenCalled();
    dataHandler!('d":1,"method":"initialize"}\n');
    expect(stdoutWrite).toHaveBeenCalledTimes(1);
  });

  it('does not write response for notifications/initialized', () => {
    startMcpServer();
    dataHandler!('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    expect(stdoutWrite).not.toHaveBeenCalled();
  });
});

describe('mcpCommand', () => {
  it('creates a command', () => {
    const cmd = mcpCommand();
    expect(cmd).toBeDefined();
  });

  it('action calls startMcpServer', () => {
    jest.spyOn(process, 'stdin', 'get').mockReturnValue({
      setEncoding: jest.fn(),
      on: jest.fn(),
      fd: 0,
    } as any);
    jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    jest.spyOn(process.stderr, 'write').mockReturnValue(true);
    jest.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const cmd = mcpCommand();
    cmd.parse(['node', 'test', 'mcp'], { from: 'user' });
    expect(process.stdin.on).toHaveBeenCalledWith('data', expect.any(Function));
    jest.restoreAllMocks();
  });
});
