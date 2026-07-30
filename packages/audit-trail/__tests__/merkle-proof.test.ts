import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { AuditTrail } from '../src/audit-trail';
import { verifyChain, proveEntry, getChainRoot } from '../src/verify-chain';

describe('MerkleProof', () => {
  let tmpDir: string;
  let trail: AuditTrail;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merkle-test-'));
    filePath = path.join(tmpDir, 'audit.json');
    trail = new AuditTrail(filePath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate a proof for an existing entry', () => {
    const e1 = trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' });
    trail.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-1', decision: 'auto', result: 'success' });
    trail.append({ actor: 'system', eventType: 'deploy', target: 'prod', decision: 'approved', result: 'success' });

    const proof = trail.proveEntry(e1.eventId);
    expect(proof).not.toBeNull();
    expect(proof!.entryIndex).toBe(0);
    expect(proof!.entryHash).toBeTruthy();
    expect(proof!.siblings.length).toBeGreaterThanOrEqual(1);
    expect(proof!.rootHash).toBeTruthy();
  });

  it('should return null for non-existent entry id', () => {
    const proof = trail.proveEntry('non-existent-id');
    expect(proof).toBeNull();
  });

  it('should verify a valid proof', () => {
    const events = [
      trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' }),
      trail.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-1', decision: 'auto', result: 'success' }),
    ];

    const proof = trail.proveEntry(events[0]!.eventId);
    expect(proof).not.toBeNull();

    const valid = trail.verifyEntryInclusion(proof!);
    expect(valid).toBe(true);
  });

  it('should reject proof for tampered entry', () => {
    const e1 = trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' });
    trail.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-1', decision: 'auto', result: 'success' });

    const proof = trail.proveEntry(e1.eventId);
    expect(proof).not.toBeNull();

    const tamperedProof = { ...proof!, entryHash: 'tampered-hash' };
    const valid = trail.verifyEntryInclusion(tamperedProof);
    expect(valid).toBe(false);
  });

  it('should compute consistent merkle root', () => {
    trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' });
    trail.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-1', decision: 'auto', result: 'success' });

    const root1 = trail.getMerkleRoot();
    const root2 = trail.getMerkleRoot();
    expect(root1).toBe(root2);

    trail.append({ actor: 'system', eventType: 'deploy', target: 'prod', decision: 'approved', result: 'success' });
    const root3 = trail.getMerkleRoot();
    expect(root3).not.toBe(root1);
  });
});

describe('verify-chain standalone', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-chain-'));
    filePath = path.join(tmpDir, 'audit.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should verify an empty chain', () => {
    const result = verifyChain(filePath);
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(0);
  });

  it('should prove an entry exists via AuditTrail', () => {
    const trail = new AuditTrail(filePath);
    const event = trail.append({ actor: 'user', eventType: 'file.write', target: '/test.ts', decision: 'auto', result: 'success' });

    const proof = trail.proveEntry(event.eventId);
    expect(proof).not.toBeNull();
    expect(proof!.entryIndex).toBe(0);
    expect(proof!.siblings).toBeDefined();
  });

  it('should prove an entry via standalone function with direct file write', () => {
    const eventData = { actor: 'user', eventType: 'file.write', target: '/test.ts', decision: 'auto', result: 'success' };
    const fullEvent = { eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), ...eventData };
    fs.writeFileSync(filePath, JSON.stringify(fullEvent) + '\n', 'utf-8');

    const proof = proveEntry(filePath, fullEvent.eventId);
    expect(proof.valid).toBe(true);
    expect(proof.entryIndex).toBe(0);
  });

  it('should return invalid proof for non-existent entry', () => {
    const proof = proveEntry(filePath, 'non-existent');
    expect(proof.valid).toBe(false);
    expect(proof.entryIndex).toBe(-1);
  });

  it('should compute chain root', () => {
    const trail = new AuditTrail(filePath);
    trail.append({ actor: 'user', eventType: 'file.write', target: '/test.ts', decision: 'auto', result: 'success' });
    trail.append({ actor: 'system', eventType: 'init', target: 'app', decision: 'auto', result: 'success' });

    const root = getChainRoot(filePath);
    expect(root).toBeTruthy();
    expect(root.length).toBe(64);
  });

  it('should return empty root for empty chain', () => {
    const root = getChainRoot(filePath);
    expect(root).toBeTruthy();
    expect(root.length).toBe(64);
  });
});
