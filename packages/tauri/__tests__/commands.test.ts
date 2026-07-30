jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { startIdeServer, stopIdeServer, ideServerStatus, getSystemInfo, openExternal, showInFolder } from '../src/commands';

const mockInvoke = invoke as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Tauri commands', () => {
  it('startIdeServer invokes start_ide_server', async () => {
    mockInvoke.mockResolvedValue({ running: true, port: 3001, pid: 12345 });
    const result = await startIdeServer();
    expect(mockInvoke).toHaveBeenCalledWith('start_ide_server');
    expect(result).toEqual({ running: true, port: 3001, pid: 12345 });
  });

  it('stopIdeServer invokes stop_ide_server', async () => {
    mockInvoke.mockResolvedValue({ running: false, port: 3001, pid: null });
    const result = await stopIdeServer();
    expect(mockInvoke).toHaveBeenCalledWith('stop_ide_server');
    expect(result.running).toBe(false);
  });

  it('ideServerStatus invokes ide_server_status', async () => {
    mockInvoke.mockResolvedValue({ running: false, port: 3001, pid: null });
    const result = await ideServerStatus();
    expect(mockInvoke).toHaveBeenCalledWith('ide_server_status');
    expect(result.port).toBe(3001);
  });

  it('getSystemInfo returns system info', async () => {
    mockInvoke.mockResolvedValue({ platform: 'win32', arch: 'x86_64', os_version: '10.0', hostname: 'pc', total_memory_mb: 16384 });
    const info = await getSystemInfo();
    expect(info.platform).toBe('win32');
    expect(mockInvoke).toHaveBeenCalledWith('get_system_info');
  });

  it('openExternal invokes open_external with URL', async () => {
    mockInvoke.mockResolvedValue(undefined);
    await openExternal('https://ideia.ai');
    expect(mockInvoke).toHaveBeenCalledWith('open_external', { url: 'https://ideia.ai' });
  });

  it('showInFolder invokes show_in_folder with path', async () => {
    mockInvoke.mockResolvedValue(undefined);
    await showInFolder('/home/user/project');
    expect(mockInvoke).toHaveBeenCalledWith('show_in_folder', { path: '/home/user/project' });
  });

  it('propagates errors from invoke', async () => {
    mockInvoke.mockRejectedValue(new Error('Server not found'));
    await expect(startIdeServer()).rejects.toThrow('Server not found');
  });
});
