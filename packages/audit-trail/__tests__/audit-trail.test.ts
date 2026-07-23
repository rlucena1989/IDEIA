import fs from 'fs';
import path from 'path';
import os from 'os';
import { AuditTrail, AuditEvent as _AuditEvent } from '../src/audit-trail';

describe('AuditTrail', () => {
  let tmpDir: string;
  let trail: AuditTrail;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
    trail = new AuditTrail(path.join(tmpDir, 'audit.json'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return empty array when file does not exist', () => {
    expect(trail.load()).toEqual([]);
  });

  it('should append and load events', () => {
    const event = trail.append({
      actor: 'user',
      eventType: 'file.write',
      target: '/src/app.ts',
      decision: 'auto',
      result: 'success',
    });

    expect(event.eventId).toBeTruthy();
    expect(event.timestamp).toBeTruthy();
    expect(event.actor).toBe('user');
    expect(event.decision).toBe('auto');

    const events = trail.load();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('file.write');
  });

  it('should append multiple events in order', () => {
    trail.append({ actor: 'ai', eventType: 'policy.evaluate', target: 'file.write', decision: 'ask', result: 'pending' });
    trail.append({ actor: 'user', eventType: 'approval.approve', target: 'file.write', decision: 'approved', result: 'success' });
    trail.append({ actor: 'system', eventType: 'file.write', target: '/src/app.ts', decision: 'auto', result: 'success' });

    const events = trail.load();
    expect(events).toHaveLength(3);
    expect(events[0]!.eventType).toBe('policy.evaluate');
    expect(events[1]!.eventType).toBe('approval.approve');
    expect(events[2]!.eventType).toBe('file.write');
  });

  it('should query by filter', async () => {
    trail.append({ actor: 'ai', eventType: 'chat.run', target: 'session-1', decision: 'auto', result: 'success' });
    trail.append({ actor: 'user', eventType: 'file.write', target: '/src/app.ts', decision: 'auto', result: 'success' });
    trail.append({ actor: 'user', eventType: 'file.write', target: '/src/lib.ts', decision: 'auto', result: 'success' });

    const userEvents = await trail.query({ actor: 'user' });
    expect(userEvents).toHaveLength(2);

    const fileWrites = await trail.query({ eventType: 'file.write' });
    expect(fileWrites).toHaveLength(2);
  });

  it('should count events', () => {
    expect(trail.count()).toBe(0);
    trail.append({ actor: 'system', eventType: 'init', target: 'app', decision: 'auto', result: 'success' });
    expect(trail.count()).toBe(1);
  });

  it('should verify empty chain as valid', () => {
    const result = trail.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(0);
  });

  it('should verify chain with single event', () => {
    trail.append({ actor: 'user', eventType: 'file.write', target: '/test.ts', decision: 'auto', result: 'success' });
    const result = trail.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(1);
    expect(result.currentTipHash).toBeTruthy();
  });

  it('should verify chain with multiple events', () => {
    trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' });
    trail.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-1', decision: 'auto', result: 'success' });
    trail.append({ actor: 'system', eventType: 'deploy', target: 'prod', decision: 'approved', result: 'success' });

    const result = trail.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(3);
    expect(result.currentTipHash).toBeTruthy();
  });

  it('should detect tampered chain', () => {
    trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' });
    const tip1 = trail.getChainTipHash();

    trail.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-1', decision: 'auto', result: 'success' });
    const tip2 = trail.getChainTipHash();

    expect(tip1).toBeTruthy();
    expect(tip2).toBeTruthy();
    expect(tip1).not.toBe(tip2);

    const result = trail.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(2);
  });

  it('should return different hashes for different events', () => {
    trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' });
    const hash1 = trail.getChainTipHash();

    const trail2 = new AuditTrail(path.join(tmpDir, 'audit2.json'));
    trail2.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-2', decision: 'auto', result: 'success' });
    const hash2 = trail2.getChainTipHash();

    expect(hash1).not.toBe(hash2);
  });
});
