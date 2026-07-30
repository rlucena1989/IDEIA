import { AppImageBuilder } from '../appimage-builder';
import { DebPackageBuilder } from '../deb-builder';
import { RpmPackageBuilder } from '../rpm-builder';
import { FlatpakManifestBuilder } from '../flatpak-builder';
import { AppStreamMetadataGenerator } from '../appstream-metadata';
import { LinuxDistroDetector } from '../distro-detector';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('AppImageBuilder', () => {
  it('should throw for missing AppDir', async () => {
    const builder = new AppImageBuilder();
    await expect(builder.build('/nonexistent', '/tmp/test.AppImage', 'test')).rejects.toThrow();
  });
});

describe('DebPackageBuilder', () => {
  it('should fail for missing app binary', async () => {
    const builder = new DebPackageBuilder();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deb-'));
    await expect(builder.build({
      packageName: 'test', version: '1.0.0', maintainer: 'test',
      description: 'test', homepage: 'https://test.com', arch: 'amd64',
      depends: ['libc6'], appPath: '/nonexistent/test', iconPath: '',
    }, tmpDir)).rejects.toThrow();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('RpmPackageBuilder', () => {
  it('should throw for missing app binary', async () => {
    const builder = new RpmPackageBuilder();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpm-'));
    await expect(builder.build({
      name: 'test', version: '1.0.0', release: '1', summary: 'test',
      license: 'MIT', url: 'https://test.com', arch: 'x86_64',
      requires: [], appPath: '/nonexistent',
    }, tmpDir)).rejects.toThrow();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('FlatpakManifestBuilder', () => {
  it('should generate valid flatpak manifest', () => {
    const builder = new FlatpakManifestBuilder();
    const yaml = builder.generate({
      appId: 'dev.ideia.app', appName: 'IDEIA', version: '1.0.0',
      runtime: 'org.gnome.Platform', runtimeVersion: '47', sdk: 'org.gnome.Sdk',
      command: 'ideia',
      finishArgs: ['--socket=wayland', '--socket=x11', '--share=network', '--device=dri'],
      modules: [{ name: 'ideia', sources: [{ type: 'extra-data', url: 'https://releases.ideia.dev/ideia.tar.xz' }] }],
    });
    expect(yaml).toContain('app-id: dev.ideia.app');
    expect(yaml).toContain('org.gnome.Platform');
    expect(yaml).toContain('--socket=wayland');
  });
});

describe('AppStreamMetadataGenerator', () => {
  it('should generate valid AppStream XML', () => {
    const gen = new AppStreamMetadataGenerator();
    const xml = gen.generate({
      appId: 'dev.ideia.app', name: 'IDEIA', summary: 'AI IDE',
      description: 'Next generation IDE', license: 'MIT',
      homepage: 'https://ideia.dev', bugtracker: 'https://github.com/ideia/ideia/issues',
      categories: ['Development', 'IDE'],
      screenshots: [{ caption: 'Main UI', image: 'https://ideia.dev/screenshot.png' }],
      releases: [{ version: '1.0.0', date: '2026-07-24' }],
    });
    expect(xml).toContain('dev.ideia.app');
    expect(xml).toContain('Development');
    expect(xml).toContain('<release version="1.0.0"');
  });
});

describe('LinuxDistroDetector', () => {
  it('should detect current platform', () => {
    const detector = new LinuxDistroDetector();
    const info = detector.detect();
    expect(info).toBeDefined();
    expect(info).toHaveProperty('id');
    expect(info).toHaveProperty('arch');
    expect(info).toHaveProperty('packageFormat');
  });

  it('should return a valid install format', () => {
    const detector = new LinuxDistroDetector();
    const format = detector.getBestInstallFormat();
    expect(['deb', 'rpm', 'AppImage', 'snap', 'flatpak']).toContain(format);
  });
});
