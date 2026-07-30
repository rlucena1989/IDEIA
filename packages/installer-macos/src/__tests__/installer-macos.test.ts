import { DmgBuilder } from '../dmg-builder';
import { PkgBuilder } from '../pkg-builder';
import { CodeSignManager } from '../code-sign-manager';
import { UniversalBinaryBuilder } from '../universal-binary-builder';
import { SparkleAppcastGenerator } from '../sparkle-appcast';
import { NotarizationPipeline } from '../notarization-pipeline';

describe('DmgBuilder', () => {
  it('should fail gracefully for missing app', async () => {
    const builder = new DmgBuilder();
    await expect(builder.build({
      appPath: '/nonexistent/IDEIA.app',
      outputDir: '/tmp',
      appName: 'IDEIA',
      version: '1.0.0',
    })).rejects.toThrow();
  });
});

describe('PkgBuilder', () => {
  it('should fail gracefully for missing app', async () => {
    const builder = new PkgBuilder();
    await expect(builder.build({
      appPath: '/missing.app', outputDir: '/tmp', appName: 'IDEIA',
      version: '1.0.0', identifier: 'com.ideia.app', minOsVersion: '11.0',
    })).rejects.toThrow();
  });
});

describe('CodeSignManager', () => {
  it('should return empty identities when no certs', () => {
    const mgr = new CodeSignManager();
    const identities = mgr.listAvailableIdentities();
    expect(Array.isArray(identities)).toBe(true);
  });

  it('should fail to sign non-existent app', () => {
    const mgr = new CodeSignManager();
    expect(mgr.signApp('/nonexistent.app', 'Test Identity')).toBe(false);
  });

  it('should return null for unsigned app', () => {
    const mgr = new CodeSignManager();
    const info = mgr.verifySignature('/nonexistent.app');
    expect(info).toBeNull();
  });
});

describe('UniversalBinaryBuilder', () => {
  it('should fail for non-existent binaries', () => {
    const builder = new UniversalBinaryBuilder();
    expect(builder.createUniversal('/no-arm', '/no-x64', '/out')).toBe(false);
  });

  it('should return empty for non-existent binary', () => {
    const builder = new UniversalBinaryBuilder();
    expect(builder.verifyArchitectures('/nonexistent')).toEqual([]);
  });
});

describe('SparkleAppcastGenerator', () => {
  it('should generate valid appcast XML', () => {
    const gen = new SparkleAppcastGenerator();
    const xml = gen.generate([{
      version: '1.1.0', shortVersion: '1.1', buildDate: new Date('2026-07-24'),
      fileSize: 84234240, minOSVersion: '11.0', changelog: '<ul><li>Bug fixes</li></ul>',
      downloadUrl: 'https://releases.ideia.dev/IDEIA-1.1.0.dmg',
      signature: 'wBUMq0BYTGnGDI0K7B1tDdqw==',
    }]);
    expect(xml).toContain('sparkle:version="1.1.0"');
    expect(xml).toContain('sparkle:edSignature="wBUMq0BYTGnGDI0K7B1tDdqw=="');
    expect(xml).toContain('IDEIA Changelog');
  });
});

describe('NotarizationPipeline', () => {
  it('should fail gracefully for missing app', async () => {
    const pipeline = new NotarizationPipeline();
    const result = await pipeline.notarize({
      appPath: '/missing.app', appleId: 'test@test.com',
      teamId: 'TEAM123', password: 'pass', bundleId: 'com.test',
    });
    expect(result).toBe(false);
  });

  it('should fail verification for unsigned app', async () => {
    const pipeline = new NotarizationPipeline();
    const result = await pipeline.verifyNotarization('/nonexistent.app');
    expect(result).toBe(false);
  });
});
