import { ElectronShell } from '../electron-shell';
import { CliShell } from '../cli-shell';
import { CrossShellStateSync } from '../cross-shell-state-sync';
import { type IShell, type IWindow, type IShellInfo, type MemoryInfo, type CPUInfo, type WindowOptions } from '../ishell';

describe('ElectronShell', () => {
  let shell: ElectronShell;

  beforeEach(() => {
    shell = new ElectronShell();
  });

  it('should implement IShell interface', () => {
    const check: IShell = shell;
    expect(check).toBeDefined();
  });

  it('should return correct IShellInfo', () => {
    const info: IShellInfo = shell.info;
    expect(info.type).toBe('electron');
    expect(info.features).toContain('window-management');
    expect(info.features).toContain('tray');
    expect(info.features).toContain('global-shortcuts');
    expect(info.features).toContain('deep-links');
    expect(info.features).toContain('native-dialogs');
    expect(info.features).toContain('notifications');
    expect(info.features).toContain('auto-update');
    expect(info.features).toContain('gpu-acceleration');
    expect(info.features).toContain('file-system');
    expect(info.features).toContain('clipboard');
  });

  it('hasFeature should return true for all features', () => {
    const features: string[] = [
      'window-management', 'tray', 'global-shortcuts', 'deep-links',
      'native-dialogs', 'notifications', 'auto-update', 'gpu-acceleration',
      'file-system', 'clipboard'
    ];
    for (const f of features) {
      expect(shell.hasFeature(f as any)).toBe(true);
    }
  });

  it('createWindow should return a window with id', async () => {
    const opts: WindowOptions = { title: 'Test', width: 800, height: 600 };
    const win: IWindow = await shell.createWindow(opts);
    expect(win.id).toBeDefined();
    expect(win.title).toBe('Test');
  });

  it('getWindows should return created windows', async () => {
    await shell.createWindow({ title: 'W1', width: 800, height: 600 });
    await shell.createWindow({ title: 'W2', width: 1024, height: 768 });
    const windows = shell.getWindows();
    expect(windows.length).toBe(2);
  });

  it('shutdown should clear windows', async () => {
    await shell.createWindow({ title: 'W1', width: 800, height: 600 });
    await shell.shutdown();
    expect(shell.getWindows().length).toBe(0);
  });

  it('getCurrentWindow should return first window', async () => {
    await shell.createWindow({ title: 'W1', width: 800, height: 600 });
    const win = shell.getCurrentWindow();
    expect(win.title).toBe('W1');
  });

  it('getCurrentWindow should throw when no windows', () => {
    expect(() => shell.getCurrentWindow()).toThrow('No windows available');
  });

  it('showOpenDialog should return empty array', async () => {
    const result = await shell.showOpenDialog({});
    expect(result).toEqual([]);
  });

  it('showSaveDialog should return null', async () => {
    const result = await shell.showSaveDialog({});
    expect(result).toBeNull();
  });

  it('initialize should set ready', async () => {
    await shell.initialize();
    const info = shell.info;
    expect(info.type).toBe('electron');
  });

  it('getMemoryUsage should return expected shape', async () => {
    const mem: MemoryInfo = await shell.getMemoryUsage();
    expect(mem).toHaveProperty('total');
    expect(mem).toHaveProperty('free');
    expect(mem).toHaveProperty('usage');
    expect(mem).toHaveProperty('process');
    expect(typeof mem.total).toBe('number');
    expect(typeof mem.free).toBe('number');
    expect(typeof mem.usage).toBe('number');
    expect(typeof mem.process).toBe('number');
  });

  it('getCPUUsage should return expected shape', async () => {
    const cpu: CPUInfo = await shell.getCPUUsage();
    expect(cpu).toHaveProperty('usage');
    expect(cpu).toHaveProperty('cores');
    expect(cpu).toHaveProperty('model');
    expect(typeof cpu.usage).toBe('number');
    expect(typeof cpu.cores).toBe('number');
    expect(typeof cpu.model).toBe('string');
  });

  it('should register and unregister global shortcuts', () => {
    const cb = jest.fn();
    shell.registerGlobalShortcut('Ctrl+A', cb);
    shell.unregisterGlobalShortcut('Ctrl+A');
    const cb2 = jest.fn();
    shell.registerGlobalShortcut('Ctrl+B', cb2);
  });

  it('onDeepLink should store callback', () => {
    const cb = jest.fn();
    shell.onDeepLink(cb);
    expect(shell.info.type).toBe('electron');
  });

  it('checkForUpdates should return null', async () => {
    const result = await shell.checkForUpdates();
    expect(result).toBeNull();
  });

  it('downloadUpdate and installUpdate should not throw', async () => {
    await expect(shell.downloadUpdate()).resolves.toBeUndefined();
    await expect(shell.installUpdate()).resolves.toBeUndefined();
  });

  it('createTray should not throw', () => {
    expect(() => shell.createTray({ icon: 'icon.png', tooltip: 'test' })).not.toThrow();
  });

  it('showNotification should not throw', () => {
    expect(() => shell.showNotification({ title: 'Test', body: 'Body' })).not.toThrow();
  });
});

describe('CliShell', () => {
  let shell: CliShell;

  beforeEach(() => {
    shell = new CliShell();
  });

  it('should implement IShell interface', () => {
    const check: IShell = shell;
    expect(check).toBeDefined();
  });

  it('should return correct IShellInfo', () => {
    const info: IShellInfo = shell.info;
    expect(info.type).toBe('cli');
    expect(info.features).toContain('file-system');
    expect(info.features).toContain('clipboard');
  });

  it('hasFeature should return true only for file-system and clipboard', () => {
    expect(shell.hasFeature('file-system')).toBe(true);
    expect(shell.hasFeature('clipboard')).toBe(true);
    expect(shell.hasFeature('window-management')).toBe(false);
    expect(shell.hasFeature('tray')).toBe(false);
    expect(shell.hasFeature('global-shortcuts')).toBe(false);
    expect(shell.hasFeature('deep-links')).toBe(false);
    expect(shell.hasFeature('native-dialogs')).toBe(false);
    expect(shell.hasFeature('notifications')).toBe(false);
    expect(shell.hasFeature('auto-update')).toBe(false);
    expect(shell.hasFeature('gpu-acceleration')).toBe(false);
  });

  it('createWindow should throw error', async () => {
    await expect(shell.createWindow({ title: 'Test', width: 800, height: 600 })).rejects.toThrow('CLI shell does not support window management');
  });

  it('getWindows should return empty array', () => {
    expect(shell.getWindows()).toEqual([]);
  });

  it('getCurrentWindow should throw error', () => {
    expect(() => shell.getCurrentWindow()).toThrow('CLI shell does not support window management');
  });

  it('showOpenDialog should return CLI args', async () => {
    const result = await shell.showOpenDialog({});
    expect(Array.isArray(result)).toBe(true);
  });

  it('showSaveDialog should return null', async () => {
    const result = await shell.showSaveDialog({});
    expect(result).toBeNull();
  });

  it('getMemoryUsage should return expected shape', async () => {
    const mem: MemoryInfo = await shell.getMemoryUsage();
    expect(mem).toHaveProperty('total');
    expect(mem).toHaveProperty('free');
    expect(mem).toHaveProperty('usage');
    expect(mem).toHaveProperty('process');
  });

  it('getCPUUsage should return expected shape', async () => {
    const cpu: CPUInfo = await shell.getCPUUsage();
    expect(cpu).toHaveProperty('usage');
    expect(cpu).toHaveProperty('cores');
    expect(cpu).toHaveProperty('model');
  });

  it('should register and unregister global shortcuts without triggering', () => {
    const cb = jest.fn();
    shell.registerGlobalShortcut('Ctrl+A', cb);
    shell.unregisterGlobalShortcut('Ctrl+A');
  });

  it('onDeepLink should store callback', () => {
    const cb = jest.fn();
    shell.onDeepLink(cb);
    expect(shell.info.type).toBe('cli');
  });

  it('checkForUpdates should return null', async () => {
    const result = await shell.checkForUpdates();
    expect(result).toBeNull();
  });

  it('downloadUpdate and installUpdate should not throw', async () => {
    await expect(shell.downloadUpdate()).resolves.toBeUndefined();
    await expect(shell.installUpdate()).resolves.toBeUndefined();
  });
});

describe('CrossShellStateSync', () => {
  let sync: CrossShellStateSync;

  beforeEach(() => {
    sync = new CrossShellStateSync('test-channel');
  });

  it('should publish and get state', () => {
    sync.publishState('key1', 'value1');
    expect(sync.getState('key1')).toBe('value1');
  });

  it('should get undefined for non-existent key', () => {
    expect(sync.getState('nonexistent')).toBeUndefined();
  });

  it('should fire state change event on publish', () => {
    const cb = jest.fn();
    sync.onStateChange(cb);
    sync.publishState('key1', 'value1');
    expect(cb).toHaveBeenCalledTimes(1);
    const event = cb.mock.calls[0]![0];
    expect(event.key).toBe('key1');
    expect(event.newValue).toBe('value1');
    expect(event.oldValue).toBeUndefined();
    expect(event.source).toBe('test-channel');
  });

  it('should fire state change event with old value on update', () => {
    sync.publishState('key1', 'oldValue');
    const cb = jest.fn();
    sync.onStateChange(cb);
    sync.publishState('key1', 'newValue');
    expect(cb).toHaveBeenCalledTimes(1);
    const event = cb.mock.calls[0]![0];
    expect(event.key).toBe('key1');
    expect(event.oldValue).toBe('oldValue');
    expect(event.newValue).toBe('newValue');
  });

  it('should increment version on each publish', () => {
    sync.publishState('key1', 'v1');
    const v1 = sync.getAllStates().get('key1')!.version;
    sync.publishState('key1', 'v2');
    const v2 = sync.getAllStates().get('key1')!.version;
    expect(v2).toBe(v1 + 1);
  });

  it('clear should remove all states', () => {
    sync.publishState('key1', 'value1');
    sync.publishState('key2', 'value2');
    sync.clear();
    expect(sync.getAllStates().size).toBe(0);
  });

  it('should remove listener', () => {
    const cb = jest.fn();
    sync.onStateChange(cb);
    sync.removeListener(cb);
    sync.publishState('key1', 'value1');
    expect(cb).not.toHaveBeenCalled();
  });

  it('getChannelName should return channel name', () => {
    expect(sync.getChannelName()).toBe('test-channel');
  });

  it('getAllStates should return all states', () => {
    sync.publishState('key1', 'value1');
    sync.publishState('key2', 'value2');
    const all = sync.getAllStates();
    expect(all.size).toBe(2);
    expect(all.get('key1')!.state['key1']).toBe('value1');
    expect(all.get('key2')!.state['key2']).toBe('value2');
  });

  it('publishState should set timestamp', () => {
    const before = Date.now();
    sync.publishState('key1', 'value1');
    const after = Date.now();
    const state = sync.getAllStates().get('key1')!;
    expect(state.timestamp).toBeGreaterThanOrEqual(before);
    expect(state.timestamp).toBeLessThanOrEqual(after);
  });
});
