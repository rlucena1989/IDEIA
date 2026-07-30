import { UpdateVerifier } from '../update-verifier';
import { UpdateKeyManager } from '../update-key-manager';
import { StagedRolloutManager } from '../staged-rollout';
import { UpdateServerClient } from '../update-server-client';
import { DeltaUpdateEngine } from '../delta-engine';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('UpdateVerifier', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `verify-test-${Date.now()}.bin`);
    fs.writeFileSync(tmpFile, Buffer.alloc(1024, 0xaa));
  });

  afterEach(() => { try { fs.unlinkSync(tmpFile); } catch {} });

  it('should verify SHA-512 hash', async () => {
    const verifier = new UpdateVerifier();
    const result = await verifier.verifySha512(tmpFile, 'invalid');
    expect(result).toBe(false);
  });

  it('should fail Ed25519 with invalid key', async () => {
    const verifier = new UpdateVerifier();
    const result = await verifier.verifyEd25519(tmpFile, 'bad-sig', 'bad-key');
    expect(result).toBe(false);
  });
});

describe('UpdateKeyManager', () => {
  it('should generate encrypted key pair', () => {
    const mgr = new UpdateKeyManager();
    const pair = mgr.generateKeyPair('test-pass');
    expect(pair.publicKey).toContain('PUBLIC KEY');
    expect(pair.privateKey).toContain('PRIVATE KEY');
    expect(pair.privateKey).toContain('ENCRYPTED');
  });
});

describe('StagedRolloutManager', () => {
  it('should allow 100% rollout for all clients', () => {
    const mgr = new StagedRolloutManager();
    expect(mgr.isEligible('any-client', 100)).toBe(true);
  });

  it('should filter clients by hash', () => {
    const mgr = new StagedRolloutManager();
    const results = Array.from({ length: 100 }, (_, i) => mgr.isEligible(`client-${i}`, 10));
    const eligible = results.filter(Boolean).length;
    expect(eligible).toBeGreaterThan(0);
    expect(eligible).toBeLessThan(30);
  });

  it('should compute next rollout percent based on crash rate', () => {
    const mgr = new StagedRolloutManager();
    expect(mgr.getNextRolloutPercent(5, 0)).toBe(10);
    expect(mgr.getNextRolloutPercent(50, 0)).toBe(100);
    expect(mgr.getNextRolloutPercent(5, 0.01)).toBe(5);
  });
});

describe('UpdateServerClient', () => {
  it('should construct proper request', () => {
    const client = new UpdateServerClient('https://updates.ideia.dev');
    const req = { currentVersion: '1.0.0', channel: 'stable', platform: 'linux' as const, arch: 'x64' as const };
    expect(() => client.checkForUpdates(req)).rejects.toThrow();
  });
});

describe('DeltaUpdateEngine', () => {
  it('should return null for missing delta', async () => {
    const engine = new DeltaUpdateEngine();
    const manifest = await engine.getDeltaManifest('1.0.0', '1.1.0', 'linux-x64', 'https://invalid.url');
    expect(manifest).toBeNull();
  });
});
