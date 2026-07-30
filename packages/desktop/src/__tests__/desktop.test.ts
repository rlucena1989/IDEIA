import { DesktopManager } from '../desktop-manager';
import { ShellComparer } from '../shell-comparer';
import { InstallerBuilder } from '../installer-builder';
import { AutoUpdaterEngine } from '../auto-updater-engine';
import { NativeFeatureManager } from '../native-feature-manager';
import { TrayManager } from '../tray-manager';
import { DeepLinkManager } from '../deep-link-manager';
import { PERFORMANCE_PROFILES, SHELL_FEATURES } from '../types';
import { AppConfig, DesktopShellType, DesktopPlatform, InstallerTarget, TrayMenuItem, DeepLinkConfig, AutoUpdateConfig, NativeFeatures } from '../types';

function createTestConfig(overrides?: Partial<AppConfig>): AppConfig {
  return {
    name: 'IDEIA',
    version: '1.0.0',
    shell: 'electron',
    window: { width: 1280, height: 800 },
    autoUpdate: { enabled: true, provider: 'github' },
    ...overrides,
  };
}

describe('DesktopManager', () => {
  it('initializes with config and returns it', () => {
    const config = createTestConfig({ shell: 'electron', version: '2.0.0' });
    const mgr = new DesktopManager(config);
    const retrieved = mgr.getConfig();
    expect(retrieved.name).toBe('IDEIA');
    expect(retrieved.version).toBe('2.0.0');
    expect(retrieved.shell).toBe('electron');
  });

  it('recommends electron for MVP', () => {
    const mgr = new DesktopManager(createTestConfig());
    expect(mgr.getShellRecommendation()).toBe('electron');
  });

  it('detects platform config', () => {
    const mgr = new DesktopManager(createTestConfig());
    const platform = mgr.getPlatformConfig();
    expect(['win32', 'darwin', 'linux']).toContain(platform);
  });

  it('updates config partially', () => {
    const mgr = new DesktopManager(createTestConfig());
    mgr.updateConfig({ version: '2.0.0', shell: 'tauri' });
    const config = mgr.getConfig();
    expect(config.version).toBe('2.0.0');
    expect(config.shell).toBe('tauri');
    expect(config.name).toBe('IDEIA');
  });

  it('launch and quit do not throw', () => {
    const mgr = new DesktopManager(createTestConfig());
    expect(() => mgr.launch()).not.toThrow();
    expect(() => mgr.quit()).not.toThrow();
  });

  it('restart does not throw', () => {
    const mgr = new DesktopManager(createTestConfig());
    expect(() => mgr.restart()).not.toThrow();
  });
});

describe('ShellComparer', () => {
  const comparer = new ShellComparer();

  it('scores electron highest when comparing all shells', () => {
    const results = comparer.compare();
    expect(results[0].shell).toBe('electron');
    expect(results[0].totalScore).toBeGreaterThan(results[1].totalScore);
  });

  it('returns scores for each dimension', () => {
    const results = comparer.compare(['electron']);
    expect(results).toHaveLength(1);
    expect(results[0].scores.binarySize).toBeGreaterThanOrEqual(0);
    expect(results[0].scores.startupCold).toBeGreaterThanOrEqual(0);
    expect(results[0].scores.maturity).toBeGreaterThanOrEqual(0);
  });

  it('compares specific shells in order', () => {
    const results = comparer.compare(['tauri', 'electron']);
    expect(results).toHaveLength(2);
    expect(results[0].shell).toBe('electron');
    expect(results[1].shell).toBe('tauri');
  });

  it('returns performance profile for each shell', () => {
    const types: DesktopShellType[] = ['electron', 'tauri', 'nwjs', 'neutralino'];
    for (const t of types) {
      const profile = comparer.getPerformanceProfile(t);
      expect(profile.binarySize).toBeGreaterThan(0);
      expect(profile.ramIdle).toBeGreaterThan(0);
      expect(profile.startupCold).toBeGreaterThan(0);
    }
  });

  it('tauri scores better than electron on performance dimensions', () => {
    const results = comparer.compare(['electron', 'tauri']);
    const electronProfile = PERFORMANCE_PROFILES.electron;
    const tauriProfile = PERFORMANCE_PROFILES.tauri;
    expect(tauriProfile.binarySize).toBeLessThan(electronProfile.binarySize);
    expect(tauriProfile.ramIdle).toBeLessThan(electronProfile.ramIdle);
    expect(tauriProfile.startupCold).toBeLessThan(electronProfile.startupCold);
  });

  it('returns dimension list', () => {
    const dims = comparer.getDimensions();
    expect(dims.length).toBeGreaterThan(0);
    expect(dims).toContain('binarySize');
    expect(dims).toContain('maturity');
    expect(dims).toContain('theiaCompat');
  });

  it('returns weights for each dimension', () => {
    const weights = comparer.getWeights();
    expect(weights.maturity).toBe(35);
    expect(weights.ecosystem).toBe(30);
    expect(weights.startupCold).toBe(8);
  });
});

describe('InstallerBuilder', () => {
  it('sets default config', () => {
    const builder = new InstallerBuilder();
    const config = builder.getConfig();
    expect(config.silent).toBe(false);
    expect(config.compression).toBe('zip');
    expect(config.createDesktopShortcut).toBe(true);
    expect(config.signing?.enabled).toBe(false);
  });

  it('returns recommended targets per platform', () => {
    const winTargets = InstallerBuilder.getAvailableTargets('win32');
    expect(winTargets).toContain('msi');
    expect(winTargets).toContain('nsis');

    const macTargets = InstallerBuilder.getAvailableTargets('darwin');
    expect(macTargets).toContain('dmg');

    const linuxTargets = InstallerBuilder.getAvailableTargets('linux');
    expect(linuxTargets).toContain('appImage');
    expect(linuxTargets).toContain('deb');
  });

  it('filters targets by platform', () => {
    const builder = new InstallerBuilder({ targets: ['msi', 'nsis', 'dmg', 'deb'] });
    const winFiltered = builder.getTargets('win32');
    expect(winFiltered).toEqual(['msi', 'nsis']);
    const linuxFiltered = builder.getTargets('linux');
    expect(linuxFiltered).toContain('deb');
    expect(linuxFiltered).not.toContain('msi');
  });

  it('configureSigning updates signing config', () => {
    const builder = new InstallerBuilder();
    builder.configureSigning({ enabled: true, certificateFile: 'cert.pfx' });
    expect(builder.getConfig().signing?.enabled).toBe(true);
    expect(builder.getConfig().signing?.certificateFile).toBe('cert.pfx');
  });

  it('configureSilent sets silent mode', () => {
    const builder = new InstallerBuilder();
    builder.configureSilent(true);
    expect(builder.getConfig().silent).toBe(true);
  });

  it('setTargets updates targets', () => {
    const builder = new InstallerBuilder();
    builder.setTargets(['appImage', 'deb']);
    const config = builder.getConfig();
    expect(config.targets).toContain('appImage');
    expect(config.targets).toContain('deb');
  });

  it('getRecommendedTargets returns defaults for platform', () => {
    const builder = new InstallerBuilder();
    const targets = builder.getRecommendedTargets('win32');
    expect(targets).toEqual(['msi', 'nsis']);
  });
});

describe('AutoUpdaterEngine', () => {
  const config: AutoUpdateConfig = {
    enabled: true, provider: 'github', channel: 'stable', mandatory: false,
  };

  it('returns current version', () => {
    const engine = new AutoUpdaterEngine(config, '1.0.0');
    expect(engine.getCurrentVersion()).toBe('1.0.0');
  });

  it('returns config', () => {
    const engine = new AutoUpdaterEngine(config);
    const retrieved = engine.getConfig();
    expect(retrieved.enabled).toBe(true);
    expect(retrieved.provider).toBe('github');
  });

  it('checks for updates and returns info', async () => {
    const engine = new AutoUpdaterEngine(config, '0.9.0');
    const update = await engine.checkForUpdates();
    expect(update).not.toBeNull();
    expect(update?.version).toBe('1.0.0');
    expect(update?.releaseNotes).toBe('New version available');
    expect(update?.mandatory).toBe(false);
    expect(update?.checksumType).toBe('sha256');
  });

  it('returns null when disabled', async () => {
    const disabledConfig: AutoUpdateConfig = { enabled: false, provider: 'custom' };
    const engine = new AutoUpdaterEngine(disabledConfig);
    const result = await engine.checkForUpdates();
    expect(result).toBeNull();
  });

  it('downloads and installs update', async () => {
    const engine = new AutoUpdaterEngine(config, '0.9.0');
    const update = await engine.checkForUpdates();
    expect(update).not.toBeNull();
    if (update) {
      await engine.downloadUpdate(update);
      expect(engine.isDownloaded()).toBe(true);
      await engine.installUpdate(update);
      expect(engine.getCurrentVersion()).toBe('1.0.0');
      expect(engine.isDownloaded()).toBe(false);
    }
  });

  it('tracks update history', async () => {
    const engine = new AutoUpdaterEngine(config, '0.9.0');
    const update = await engine.checkForUpdates();
    if (update) {
      await engine.downloadUpdate(update);
      await engine.installUpdate(update);
    }
    const history = engine.getUpdateHistory();
    expect(history).toContain('0.9.0');
    expect(history).toHaveLength(1);
  });

  it('rolls back to previous version', async () => {
    const engine = new AutoUpdaterEngine(config, '0.9.0');
    const update = await engine.checkForUpdates();
    if (update) {
      await engine.downloadUpdate(update);
      await engine.installUpdate(update);
    }
    const result = await engine.rollbackTo('0.9.0');
    expect(result).toBe(true);
    expect(engine.getCurrentVersion()).toBe('0.9.0');
  });

  it('fails rollback to unknown version', async () => {
    const engine = new AutoUpdaterEngine(config, '1.0.0');
    const result = await engine.rollbackTo('0.0.1');
    expect(result).toBe(false);
  });
});

describe('NativeFeatureManager', () => {
  it('electron has all native features', () => {
    const mgr = new NativeFeatureManager('electron');
    expect(mgr.hasFeature('fileDialogs')).toBe(true);
    expect(mgr.hasFeature('notifications')).toBe(true);
    expect(mgr.hasFeature('globalShortcuts')).toBe(true);
    expect(mgr.hasFeature('powerMonitor')).toBe(true);
    expect(mgr.hasFeature('clipboard')).toBe(true);
    expect(mgr.hasFeature('shell')).toBe(true);
    expect(mgr.hasFeature('tray')).toBe(true);
    expect(mgr.hasFeature('webview')).toBe(true);
    expect(mgr.hasFeature('gpuAcceleration')).toBe(true);
    expect(mgr.hasFeature('autoUpdate')).toBe(true);
    expect(mgr.hasFeature('protocolHandler')).toBe(true);
  });

  it('neutralino has limited features', () => {
    const mgr = new NativeFeatureManager('neutralino');
    expect(mgr.hasFeature('fileDialogs')).toBe(true);
    expect(mgr.hasFeature('notifications')).toBe(true);
    expect(mgr.hasFeature('globalShortcuts')).toBe(false);
    expect(mgr.hasFeature('powerMonitor')).toBe(false);
    expect(mgr.hasFeature('shell')).toBe(false);
    expect(mgr.hasFeature('tray')).toBe(false);
    expect(mgr.hasFeature('gpuAcceleration')).toBe(false);
    expect(mgr.hasFeature('autoUpdate')).toBe(false);
    expect(mgr.hasFeature('webview')).toBe(true);
  });

  it('returns available features', () => {
    const mgr = new NativeFeatureManager('tauri');
    const available = mgr.getAvailableFeatures();
    expect(available).toContain('fileDialogs');
    expect(available).toContain('tray');
    expect(available).toContain('autoUpdate');
  });

  it('requestPermission grants access to available features', () => {
    const mgr = new NativeFeatureManager('electron');
    expect(mgr.requestPermission('clipboard')).toBe(true);
    expect(mgr.hasPermission('clipboard')).toBe(true);
  });

  it('requestPermission returns false for unavailable features', () => {
    const mgr = new NativeFeatureManager('neutralino');
    expect(mgr.requestPermission('globalShortcuts')).toBe(false);
    expect(mgr.hasPermission('globalShortcuts')).toBe(false);
  });

  it('revokePermission removes permission', () => {
    const mgr = new NativeFeatureManager('electron');
    mgr.requestPermission('tray');
    expect(mgr.hasPermission('tray')).toBe(true);
    mgr.revokePermission('tray');
    expect(mgr.hasPermission('tray')).toBe(false);
  });

  it('getFeatureProfile returns feature map', () => {
    const mgr = new NativeFeatureManager('nwjs');
    const profile = mgr.getFeatureProfile();
    expect(profile.fileDialogs).toBe(true);
    expect(profile.autoUpdate).toBe(false);
  });
});

describe('TrayManager', () => {
  it('creates tray with default config', () => {
    const items: TrayMenuItem[] = [{ label: 'Show', action: 'show' }];
    const tray = new TrayManager({ items, tooltip: 'IDEIA' });
    expect(tray.isActive()).toBe(false);
    tray.createTray();
    expect(tray.isActive()).toBe(true);
  });

  it('updates menu items', () => {
    const tray = new TrayManager({ items: [{ label: 'Show', action: 'show' }] });
    const newItems: TrayMenuItem[] = [
      { label: 'Show', action: 'show' },
      { label: 'Quit', action: 'quit', separator: true },
    ];
    tray.updateMenu(newItems);
    const config = tray.getConfig();
    expect(config.items).toHaveLength(2);
    expect(config.items[1].label).toBe('Quit');
  });

  it('shows notification', () => {
    const tray = new TrayManager({ items: [] });
    expect(() => tray.showNotification('Title', 'Body')).not.toThrow();
  });

  it('destroy disables tray', () => {
    const tray = new TrayManager({ items: [] });
    tray.createTray();
    expect(tray.isActive()).toBe(true);
    tray.destroy();
    expect(tray.isActive()).toBe(false);
  });

  it('getConfig returns a copy of config', () => {
    const items: TrayMenuItem[] = [{ label: 'Show', action: 'show' }];
    const tray = new TrayManager({ items, tooltip: 'IDEIA', icon: 'icon.png' });
    const config = tray.getConfig();
    expect(config.tooltip).toBe('IDEIA');
    expect(config.icon).toBe('icon.png');
    expect(config.items).toHaveLength(1);
  });
});

describe('DeepLinkManager', () => {
  const configs: DeepLinkConfig[] = [
    { protocol: 'ideia', handler: 'open', description: 'Open IDEIA' },
    { protocol: 'ideia-dev', handler: 'debug', description: 'Dev mode' },
  ];

  it('registers deep links', () => {
    const mgr = new DeepLinkManager(configs);
    expect(mgr.isRegistered()).toBe(false);
    mgr.register();
    expect(mgr.isRegistered()).toBe(true);
  });

  it('handles matching deep link URL', () => {
    const mgr = new DeepLinkManager(configs);
    expect(mgr.handle('ideia://open/project?path=/workspace')).toBe(true);
    expect(mgr.handle('ideia-dev://debug')).toBe(true);
  });

  it('returns false for unmatched URL', () => {
    const mgr = new DeepLinkManager(configs);
    expect(mgr.handle('unknown://test')).toBe(false);
    expect(mgr.handle('https://example.com')).toBe(false);
  });

  it('returns registered protocols', () => {
    const mgr = new DeepLinkManager(configs);
    const protocols = mgr.getProtocols();
    expect(protocols).toContain('ideia');
    expect(protocols).toContain('ideia-dev');
    expect(protocols).toHaveLength(2);
  });

  it('adds and removes configs', () => {
    const mgr = new DeepLinkManager(configs);
    mgr.addConfig({ protocol: 'ideia-insider', handler: 'nightly' });
    expect(mgr.getProtocols()).toHaveLength(3);
    const removed = mgr.removeConfig('ideia-insider');
    expect(removed).toBe(true);
    expect(mgr.getProtocols()).toHaveLength(2);
  });

  it('returns false when removing non-existent protocol', () => {
    const mgr = new DeepLinkManager(configs);
    const result = mgr.removeConfig('nonexistent');
    expect(result).toBe(false);
  });

  it('unregisters deep links', () => {
    const mgr = new DeepLinkManager(configs);
    mgr.register();
    expect(mgr.isRegistered()).toBe(true);
    mgr.unregister();
    expect(mgr.isRegistered()).toBe(false);
  });

  it('handles empty config', () => {
    const mgr = new DeepLinkManager();
    expect(() => mgr.register()).not.toThrow();
    expect(mgr.isRegistered()).toBe(false);
  });

  it('getConfigs returns a copy', () => {
    const mgr = new DeepLinkManager(configs);
    const retrieved = mgr.getConfigs();
    expect(retrieved).toHaveLength(2);
    retrieved[0].protocol = 'modified';
    expect(mgr.getConfigs()[0].protocol).toBe('ideia');
  });
});

describe('Performance profiles', () => {
  it('tauri is more efficient than electron in all metrics', () => {
    const electron = PERFORMANCE_PROFILES.electron;
    const tauri = PERFORMANCE_PROFILES.tauri;
    expect(tauri.binarySize).toBeLessThan(electron.binarySize);
    expect(tauri.ramIdle).toBeLessThan(electron.ramIdle);
    expect(tauri.ramWorkspace).toBeLessThan(electron.ramWorkspace);
    expect(tauri.startupCold).toBeLessThan(electron.startupCold);
    expect(tauri.startupWarm).toBeLessThan(electron.startupWarm);
  });

  it('neutralino is the lightest shell', () => {
    const neutralino = PERFORMANCE_PROFILES.neutralino;
    for (const key of ['binarySize', 'ramIdle', 'ramWorkspace', 'startupCold', 'startupWarm'] as const) {
      expect(neutralino[key]).toBeLessThanOrEqual(PERFORMANCE_PROFILES.tauri[key]);
    }
  });

  it('electron has the largest binary and ram footprint', () => {
    const electron = PERFORMANCE_PROFILES.electron;
    for (const shell of ['tauri', 'nwjs', 'neutralino'] as DesktopShellType[]) {
      expect(electron.binarySize).toBeGreaterThan(PERFORMANCE_PROFILES[shell].binarySize);
      expect(electron.ramIdle).toBeGreaterThan(PERFORMANCE_PROFILES[shell].ramIdle);
    }
  });
});

describe('Shell features', () => {
  it('all shells support fileDialogs and notifications', () => {
    for (const shell of ['electron', 'tauri', 'nwjs', 'neutralino'] as DesktopShellType[]) {
      expect(SHELL_FEATURES[shell].fileDialogs).toBe(true);
      expect(SHELL_FEATURES[shell].notifications).toBe(true);
    }
  });

  it('only electron and tauri support globalShortcuts and powerMonitor', () => {
    expect(SHELL_FEATURES.electron.globalShortcuts).toBe(true);
    expect(SHELL_FEATURES.tauri.globalShortcuts).toBe(true);
    expect(SHELL_FEATURES.nwjs.globalShortcuts).toBe(false);
    expect(SHELL_FEATURES.neutralino.globalShortcuts).toBe(false);

    expect(SHELL_FEATURES.electron.powerMonitor).toBe(true);
    expect(SHELL_FEATURES.tauri.powerMonitor).toBe(true);
    expect(SHELL_FEATURES.nwjs.powerMonitor).toBe(false);
    expect(SHELL_FEATURES.neutralino.powerMonitor).toBe(false);
  });

  it('only electron and tauri support autoUpdate', () => {
    expect(SHELL_FEATURES.electron.autoUpdate).toBe(true);
    expect(SHELL_FEATURES.tauri.autoUpdate).toBe(true);
    expect(SHELL_FEATURES.nwjs.autoUpdate).toBe(false);
    expect(SHELL_FEATURES.neutralino.autoUpdate).toBe(false);
  });
});
