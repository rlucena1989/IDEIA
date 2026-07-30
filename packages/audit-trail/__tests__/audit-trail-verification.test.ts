import fs from 'fs';
import path from 'path';
import os from 'os';
import { AuditTrail } from '../src/audit-trail';
import type { AuditEvent } from '../src/audit-trail';

type AuditEventInput = Omit<AuditEvent, 'eventId' | 'timestamp'>;

describe('AuditTrail Verification', () => {
  let tmpDir: string;
  let trail: AuditTrail;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-verif-'));
    trail = new AuditTrail(path.join(tmpDir, 'audit.json'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('verifyChain', () => {
    it('should validate empty chain', () => {
      const result = trail.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(0);
      expect(result.currentTipHash).toBeNull();
    });

    it('should validate single event chain', () => {
      trail.append({ actor: 'user', eventType: 'init', target: 'app', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      const result = trail.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(1);
      expect(result.currentTipHash).toBeTruthy();
    });

    it('should validate multi-event chain', () => {
      trail.append({ actor: 'user', eventType: 'create', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      trail.append({ actor: 'ai', eventType: 'modify', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      trail.append({ actor: 'system', eventType: 'deploy', target: 'prod', decision: 'approved', result: 'success' } as unknown as AuditEventInput);
      const result = trail.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(3);
    });

    it('should detect tampered chain via eventCache', () => {
      trail.append({ actor: 'user', eventType: 'create', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      trail.append({ actor: 'ai', eventType: 'modify', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);

      const events = trail.load();
      const tampered = { ...events[0], target: '/hacked.ts' };
      (trail as unknown as Record<string, unknown>).eventCache = [tampered, events[1]];

      const result = trail.verifyChain();
      expect(result.valid).toBe(false);
      expect(result.breakAtIndex).toBe(1);
    });

    it('should return different hashes for different events', () => {
      trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      const hash1 = trail.getChainTipHash();

      const trail2 = new AuditTrail(path.join(tmpDir, 'audit2.json'));
      trail2.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-2', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      const hash2 = trail2.getChainTipHash();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getChainGaps', () => {
    it('should return empty gaps for valid chain', () => {
      trail.append({ actor: 'user', eventType: 'write', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      trail.append({ actor: 'ai', eventType: 'read', target: '/b.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      const gaps = trail.getChainGaps();
      expect(gaps).toHaveLength(0);
    });

    it('should detect gaps via eventCache tampering', () => {
      trail.append({ actor: 'user', eventType: 'write', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      trail.append({ actor: 'ai', eventType: 'read', target: '/b.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);

      const events = trail.load();
      const tampered = { ...events[0], target: '/tampered.ts' };
      (trail as unknown as Record<string, unknown>).eventCache = [tampered, events[1]];

      const gaps = trail.getChainGaps();
      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0].index).toBe(1);
      expect(gaps[0].eventId).toBeTruthy();
    });

    it('should return empty for single event', () => {
      trail.append({ actor: 'user', eventType: 'write', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      const gaps = trail.getChainGaps();
      expect(gaps).toHaveLength(0);
    });

    it('should return empty for no events', () => {
      const gaps = trail.getChainGaps();
      expect(gaps).toHaveLength(0);
    });

    it('should detect multiple gaps via eventCache', () => {
      for (let i = 0; i < 5; i++) {
        trail.append({ actor: 'user', eventType: `event-${i}`, target: `/f-${i}.ts`, decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      }

      const events = trail.load();
      const tamperedEvents = events.map((ev: Partial<AuditEvent>, i: number) => {
        if (i === 1 || i === 3) return Object.assign({}, ev, { target: `/tampered-${i}.ts` });
        return Object.assign({}, ev);
      });
      (trail as unknown as Record<string, unknown>).eventCache = tamperedEvents;

      const gaps = trail.getChainGaps();
      expect(gaps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('scheduleVerification', () => {
    it('should return a stop handle', () => {
      const handle = (trail as unknown as { scheduleVerification: (ms: number) => { stop: () => void } }).scheduleVerification(60000);
      expect(handle).toBeDefined();
      expect(typeof handle.stop).toBe('function');
      handle.stop();
    });

    it('should run and stop without throwing', async () => {
      trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      trail.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-1', decision: 'auto', result: 'success' } as unknown as AuditEventInput);

      const handle = (trail as unknown as { scheduleVerification: (ms: number) => { stop: () => void } }).scheduleVerification(50);
      await new Promise<void>(resolve => {
        setTimeout(() => {
          handle.stop();
          const result = trail.verifyChain();
          expect(result.valid).toBe(true);
          resolve();
        }, 120);
      });
    });

    it('should detect chain break during scheduled verification', async () => {
      trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' } as unknown as AuditEventInput);
      trail.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-1', decision: 'auto', result: 'success' } as unknown as AuditEventInput);

      const events = trail.load();
      const tampered = { ...events[0], eventType: 'tampered' };
      (trail as unknown as Record<string, unknown>).eventCache = [tampered, events[1]];

      const handle = trail.scheduleVerification(50);
      await new Promise<void>(resolve => {
        setTimeout(() => {
          handle.stop();
          const result = trail.verifyChain();
          expect(result.valid).toBe(false);
          resolve();
        }, 120);
      });
    });
  });
});
