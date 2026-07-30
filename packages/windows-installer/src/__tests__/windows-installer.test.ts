import { InstallerConfig } from '../installer-config';
import { InstallerBuilder } from '../installer-builder';
import { UpgradeManager } from '../upgrade-manager';
import { ShortcutManager } from '../shortcut-manager';

describe('InstallerConfig', () => {
  it('should generate MSI XML', () => {
    const cfg = new InstallerConfig();
    const xml = cfg.createMsi({
      guid: '{GUID}', upgradeCode: '{UPGRADE}', manufacturer: 'IDEIA',
      productName: 'IDEIA', version: '1.0.0', installDir: 'C:\\IDEIA',
      features: ['core'], registryEntries: [],
      shortcuts: [], requiresAdmin: true,
    });
    expect(xml).toContain('<Wix');
    expect(xml).toContain('{GUID}');
    expect(xml).toContain('IDEIA');
  });

  it('should generate NSIS script', () => {
    const cfg = new InstallerConfig();
    const script = cfg.createNsisScript({
      name: 'IDEIA', version: '1.0.0', installDir: 'C:\\IDEIA',
      compress: 'lzma', uninstaller: true, createStartMenuShortcut: true,
      createDesktopShortcut: false, allowCustomDir: true,
    });
    expect(script).toContain('SetCompressor lzma');
    expect(script).toContain('IDEIA-Setup.exe');
  });

  it('should generate Inno Setup script', () => {
    const cfg = new InstallerConfig();
    const script = cfg.createInnoScript({
      appName: 'IDEIA', appVersion: '1.0.0', publisher: 'IDEIA Inc',
      defaultDir: '{pf}\\IDEIA', outputDir: 'dist', setupIcon: 'icon.ico',
      compression: 'lzma', createUninstall: true, privileges: 'admin',
      languages: ['en'],
    });
    expect(script).toContain('[Setup]');
    expect(script).toContain('IDEIA');
  });
});

describe('InstallerBuilder', () => {
  it('should fail gracefully for missing tools', async () => {
    const builder = new InstallerBuilder();
    const result = await builder.buildMsi('nonexistent.wxs', '/tmp');
    expect(result.success).toBe(false);
  });
});

describe('UpgradeManager', () => {
  it('should manage upgrade paths', () => {
    const mgr = new UpgradeManager();
    mgr.addPath({ fromVersion: '1.0.0', toVersion: '1.1.0', type: 'minor', breaking: false, migrationSteps: [] });
    mgr.addPath({ fromVersion: '1.1.0', toVersion: '2.0.0', type: 'major', breaking: true, migrationSteps: ['Database migration'] });
    expect(mgr.getPath('1.0.0', '1.1.0')).toBeDefined();
    expect(mgr.hasBreakingChanges('1.0.0', '2.0.0')).toBe(true);
  });

  it('should resolve upgrade chains', () => {
    const mgr = new UpgradeManager();
    mgr.addPath({ fromVersion: '1.0.0', toVersion: '1.1.0', type: 'minor', breaking: false, migrationSteps: [] });
    mgr.addPath({ fromVersion: '1.1.0', toVersion: '1.2.0', type: 'minor', breaking: false, migrationSteps: [] });
    mgr.addPath({ fromVersion: '1.2.0', toVersion: '2.0.0', type: 'major', breaking: true, migrationSteps: [] });
    const chain = mgr.getUpgradeChain('1.0.0', '2.0.0');
    expect(chain.length).toBe(3);
  });

  it('should report latest version', () => {
    const mgr = new UpgradeManager();
    mgr.addPath({ fromVersion: '1.0.0', toVersion: '1.1.0', type: 'minor', breaking: false, migrationSteps: [] });
    mgr.addPath({ fromVersion: '1.1.0', toVersion: '2.0.0', type: 'major', breaking: true, migrationSteps: [] });
    expect(mgr.getLatestVersion()).toBe('2.0.0');
  });
});

describe('ShortcutManager', () => {
  it('should add and list shortcuts', () => {
    const mgr = new ShortcutManager();
    mgr.add({ name: 'IDEIA', target: 'C:\\IDEIA\\ideia.exe', args: '', icon: '', folder: 'start-menu', workingDir: '', description: 'IDEIA Platform' });
    mgr.add({ name: 'IDEIA Dev', target: 'C:\\IDEIA\\ideia-dev.exe', args: '--dev', icon: '', folder: 'desktop', workingDir: '', description: 'IDEIA Dev' });
    expect(mgr.list().length).toBe(2);
    expect(mgr.list('desktop').length).toBe(1);
  });

  it('should remove shortcuts', () => {
    const mgr = new ShortcutManager();
    mgr.add({ name: 'IDEIA', target: 'test.exe', args: '', icon: '', folder: 'start-menu', workingDir: '', description: '' });
    mgr.remove('IDEIA');
    expect(mgr.list().length).toBe(0);
  });

  it('should generate PowerShell script', () => {
    const mgr = new ShortcutManager();
    mgr.add({ name: 'IDEIA', target: 'C:\\IDEIA\\ideia.exe', args: '', icon: '', folder: 'desktop', workingDir: 'C:\\IDEIA', description: 'IDEIA Platform' });
    const ps = mgr.generatePowerShell('desktop');
    expect(ps).toContain('WScript.Shell');
    expect(ps).toContain('Desktop');
  });
});
