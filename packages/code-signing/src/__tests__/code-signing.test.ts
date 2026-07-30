import { KeyManager, type KeyEntry } from '../key-manager';
import { CertHealthMonitor } from '../cert-health-monitor';
import { CertificateRenewer } from '../cert-renewer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('KeyManager', () => {
  let tmpDir: string;
  let km: KeyManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keyman-'));
    km = new KeyManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should add and retrieve keys', () => {
    const entry: KeyEntry = {
      name: 'test-ev',
      type: 'windows-ev',
      provider: 'azure-kv',
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      issuedAt: new Date().toISOString(),
      serialNumber: 'SN001',
      backupLocation: '/backup',
      sha256Thumbprint: 'a'.repeat(64),
    };
    km.addKey(entry);
    const retrieved = km.getKey('test-ev');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('test-ev');
    expect(retrieved!.type).toBe('windows-ev');
  });

  it('should detect expiring keys', () => {
    const entry: KeyEntry = {
      name: 'expiring-soon',
      type: 'gpg',
      provider: 'local',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      issuedAt: new Date().toISOString(),
      serialNumber: 'SN002',
      backupLocation: '',
      sha256Thumbprint: 'b'.repeat(64),
    };
    km.addKey(entry);
    const expiring = km.getExpiringKeys(30);
    expect(expiring.length).toBeGreaterThanOrEqual(1);
    expect(expiring[0].name).toBe('expiring-soon');
  });

  it('should detect expired keys', () => {
    const entry: KeyEntry = {
      name: 'already-expired',
      type: 'cosign',
      provider: 'software',
      expiresAt: new Date(Date.now() - 86400000).toISOString(),
      issuedAt: new Date(Date.now() - 366 * 86400000).toISOString(),
      serialNumber: 'SN003',
      backupLocation: '',
      sha256Thumbprint: 'c'.repeat(64),
    };
    km.addKey(entry);
    const expired = km.getExpiredKeys();
    expect(expired.length).toBeGreaterThanOrEqual(1);
    expect(expired[0].name).toBe('already-expired');
  });

  it('should rotate keys', () => {
    const oldKey: KeyEntry = {
      name: 'old-key',
      type: 'windows-ev',
      provider: 'yubikey',
      expiresAt: new Date(Date.now() + 1 * 86400000).toISOString(),
      issuedAt: new Date().toISOString(),
      serialNumber: 'SN004',
      backupLocation: '',
      sha256Thumbprint: 'd'.repeat(64),
    };
    km.addKey(oldKey);
    const newKey: KeyEntry = {
      name: 'new-key',
      type: 'windows-ev',
      provider: 'azure-kv',
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      issuedAt: new Date().toISOString(),
      serialNumber: 'SN005',
      backupLocation: '',
      sha256Thumbprint: 'e'.repeat(64),
    };
    km.rotateKey('old-key', newKey, 'expiry');
    expect(km.getKey('old-key')).toBeUndefined();
    expect(km.getKey('new-key')).toBeDefined();
  });

  it('should generate health report', () => {
    const report = km.generateKeyHealthReport();
    expect(report).toContain('# Key Health Report');
    expect(report).toContain('| Key | Type |');
  });

  it('should export report as JSON', () => {
    const json = km.exportReport('json');
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('keys');
    expect(parsed).toHaveProperty('rotationLog');
  });
});

describe('CertHealthMonitor', () => {
  it('should create monitor with webhook', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'certmon-'));
    const km = new KeyManager(tmpDir);
    const monitor = new CertHealthMonitor(km, 'https://hooks.example.com/alert');
    expect(monitor).toBeDefined();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('CertificateRenewer', () => {
  it('should detect certificates needing renewal', async () => {
    const renewer = new CertificateRenewer(90);
    const needsRenewal = await renewer.checkAndRenew();
    expect(needsRenewal).toBe(true);
  });
});
