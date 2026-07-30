import type { IdeServerState, SystemInfo, DeepLinkAction, ChatMessage, FileNode } from '../src/types';

describe('Type exports', () => {
  it('IdeServerState has expected structure', () => {
    const state: IdeServerState = { running: true, port: 3001, pid: 12345 };
    expect(state.running).toBe(true);
    expect(state.port).toBe(3001);
  });

  it('SystemInfo has expected structure', () => {
    const info: SystemInfo = { platform: 'win32', arch: 'x86_64', os_version: '10.0', hostname: 'pc', total_memory_mb: 16384 };
    expect(info.platform).toBeDefined();
  });

  it('DeepLinkAction has action and params', () => {
    const action: DeepLinkAction = { action: 'open', params: { path: '/project' } };
    expect(action.action).toBe('open');
    expect(action.params.path).toBe('/project');
  });

  it('ChatMessage requires role and content', () => {
    const msg: ChatMessage = { id: '1', role: 'user', content: 'hello', timestamp: new Date().toISOString() };
    expect(msg.role).toBe('user');
  });

  it('FileNode supports nested children', () => {
    const node: FileNode = { name: 'src', path: '/src', type: 'directory', children: [] };
    expect(node.children).toEqual([]);
  });
});
