import { SystemTrayManager } from '../system-tray';
import { GlobalShortcutManager } from '../global-shortcuts';
import { ProtocolHandler } from '../protocol-handler';
import { NotificationManager } from '../notification-manager';
import { DockIntegration } from '../dock-integration';

describe('SystemTrayManager', () => {
  it('should create and manage tray visibility', () => {
    const tray = new SystemTrayManager({ iconPath: 'icon.png', tooltip: 'IDEIA', menu: [] });
    expect(tray.isVisible()).toBe(false);
    tray.create();
    expect(tray.isVisible()).toBe(true);
    tray.destroy();
    expect(tray.isVisible()).toBe(false);
  });

  it('should provide default menu', () => {
    const tray = new SystemTrayManager({ iconPath: 'icon.png', tooltip: 'IDEIA', menu: [] });
    const menu = tray.getDefaultMenu();
    expect(menu.length).toBeGreaterThanOrEqual(4);
    expect(menu[0].id).toBe('open');
    expect(menu[menu.length - 1].id).toBe('quit');
  });

  it('should update tooltip and icon', () => {
    const tray = new SystemTrayManager({ iconPath: 'old.png', tooltip: 'old', menu: [] });
    tray.setTooltip('new tooltip');
    tray.setIcon('new.png');
    expect(tray.isVisible()).toBe(false);
  });

  it('should update menu', () => {
    const tray = new SystemTrayManager({ iconPath: 'icon.png', tooltip: 'IDEIA', menu: [] });
    tray.updateMenu([{ id: 'custom', label: 'Custom', enabled: true, click: () => {} }]);
    expect(tray.getMenu().length).toBe(1);
  });
});

describe('GlobalShortcutManager', () => {
  it('should register shortcuts', () => {
    const mgr = new GlobalShortcutManager();
    expect(mgr.register({ id: 'test', keys: 'CmdOrCtrl+T', description: 'Test', action: () => {} })).toBe(true);
    expect(mgr.isRegistered('test')).toBe(true);
  });

  it('should not register duplicate shortcuts', () => {
    const mgr = new GlobalShortcutManager();
    mgr.register({ id: 'dup', keys: 'CmdOrCtrl+D', description: '', action: () => {} });
    expect(mgr.register({ id: 'dup', keys: 'CmdOrCtrl+D', description: '', action: () => {} })).toBe(false);
  });

  it('should unregister shortcuts', () => {
    const mgr = new GlobalShortcutManager();
    mgr.register({ id: 'rm', keys: 'CmdOrCtrl+R', description: '', action: () => {} });
    expect(mgr.unregister('rm')).toBe(true);
    expect(mgr.isRegistered('rm')).toBe(false);
  });

  it('should provide default shortcuts', () => {
    const mgr = new GlobalShortcutManager();
    const defaults = mgr.getDefaults();
    expect(defaults.length).toBeGreaterThanOrEqual(8);
    expect(defaults.some(d => d.id === 'quick-open')).toBe(true);
  });

  it('should unregister all', () => {
    const mgr = new GlobalShortcutManager();
    mgr.register({ id: 'a', keys: 'A', description: '', action: () => {} });
    mgr.register({ id: 'b', keys: 'B', description: '', action: () => {} });
    mgr.unregisterAll();
    expect(mgr.getRegistered().length).toBe(0);
  });
});

describe('ProtocolHandler', () => {
  it('should register and handle protocols', () => {
    const handler = new ProtocolHandler();
    handler.register({ scheme: 'ideia', description: 'IDEIA deep link', handler: () => {} });
    expect(handler.hasHandler('ideia')).toBe(true);
  });

  it('should throw for unregistered protocols', async () => {
    const handler = new ProtocolHandler();
    await expect(handler.handle('unknown://test')).rejects.toThrow();
  });

  it('should provide default protocols', () => {
    const handler = new ProtocolHandler();
    const defaults = handler.getDefaults();
    expect(defaults.length).toBeGreaterThanOrEqual(5);
    expect(defaults.some(d => d.scheme === 'ideia')).toBe(true);
  });

  it('should generate registration commands', () => {
    const handler = new ProtocolHandler();
    const cmds = handler.getRegistrationCommands(
      { scheme: 'ideia', description: 'Test', handler: () => {}, platforms: ['win32'] },
      'C:\\IDEIA\\ideia.exe',
    );
    expect(cmds.length).toBeGreaterThanOrEqual(3);
    expect(cmds[0]).toContain('HKEY_CLASSES_ROOT');
  });
});

describe('NotificationManager', () => {
  it('should request permission gracefully', async () => {
    const mgr = new NotificationManager();
    const result = await mgr.requestPermission();
    expect(typeof result).toBe('boolean');
  });

  it('should return permission status', () => {
    const mgr = new NotificationManager();
    const status = mgr.getPermissionStatus();
    expect(['granted', 'denied', 'default']).toContain(status);
  });
});

describe('DockIntegration', () => {
  it('should handle dock ops gracefully', () => {
    const dock = new DockIntegration();
    expect(() => dock.setBadge(5)).not.toThrow();
    expect(() => dock.setProgress(0.5)).not.toThrow();
    expect(() => dock.bounce()).not.toThrow();
    expect(() => dock.clearBadge()).not.toThrow();
  });
});
