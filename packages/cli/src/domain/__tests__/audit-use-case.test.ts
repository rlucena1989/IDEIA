import * as crypto from 'node:crypto';
import { AuditUseCase, type AuditEvent, type AuditVerifyOutput } from '../audit-use-case';

const mockFs = {
  exists: jest.fn(),
  read: jest.fn(),
  write: jest.fn(),
  append: jest.fn(),
  mkDir: jest.fn(),
  readDir: jest.fn(),
  readDirEntries: jest.fn(),
  readBuffer: jest.fn(),
  stat: jest.fn(),
  cwd: jest.fn().mockReturnValue('/test/project'),
  remove: jest.fn(),
  ensureDir: jest.fn(),
  copy: jest.fn(),
};

const mockShell = {
  exec: jest.fn(),
  execString: jest.fn(),
};

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: mockFs,
    shell: mockShell,
    http: { post: jest.fn(), get: jest.fn() },
  })),
  resetIO: jest.fn(),
}));

function makeHash(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function buildEvent(
  id: string,
  eventType: string,
  actor: 'user' | 'system' | 'ai',
  target: string,
  timestamp: string,
  previousHash: string,
): AuditEvent {
  const payload = `${id}|${eventType}|${actor}|${target}|${timestamp}|${previousHash}`;
  return {
    id,
    eventType,
    actor,
    target,
    result: 'success',
    timestamp,
    previousHash,
    hash: makeHash(payload),
  };
}

describe('AuditUseCase', () => {
  let useCase: AuditUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AuditUseCase();
  });

  describe('execute', () => {
    it('should record an audit event with new file', () => {
      mockFs.exists.mockReturnValue(false);

      const result = useCase.execute('code-deploy', 'system', 'deploy-pipeline', { version: '1.0' });

      expect(result.ok).toBe(true);
      expect(result.code).toBe(0);
      expect(result.data?.eventType).toBe('code-deploy');
      expect(result.data?.actor).toBe('system');
      expect(result.data?.target).toBe('deploy-pipeline');
      expect(result.data?.previousHash).toBe('0'.repeat(64));
      expect(result.data?.hash).toBeTruthy();
      expect(result.data?.hash).toHaveLength(64);
      expect(mockFs.ensureDir).toHaveBeenCalledWith('.ai/audit');
      expect(mockFs.append).toHaveBeenCalledWith(
        '.ai/audit/audit-trail.jsonl',
        expect.stringContaining('code-deploy'),
      );
    });

    it('should chain to previous event hash', () => {
      const timestamp = new Date().toISOString();
      const existingEvent = buildEvent(
        crypto.randomUUID(), 'first-event', 'system', 'init', timestamp, '0'.repeat(64),
      );
      mockFs.exists.mockReturnValue(true);
      mockFs.read.mockReturnValue(JSON.stringify(existingEvent) + '\n');

      const result = useCase.execute('second-event', 'user', 'update');

      expect(result.ok).toBe(true);
      expect(result.data?.previousHash).toBe(existingEvent.hash);
    });

    it('should accept custom auditDir', () => {
      mockFs.exists.mockReturnValue(false);
      useCase = new AuditUseCase('/custom/audit');

      const result = useCase.execute('test', 'user', 'test-target');

      expect(result.ok).toBe(true);
      expect(mockFs.ensureDir).toHaveBeenCalledWith('/custom/audit');
      expect(mockFs.append).toHaveBeenCalledWith(
        '/custom/audit/audit-trail.jsonl',
        expect.any(String),
      );
    });
  });

  describe('verifyChain', () => {
    it('should return valid for empty chain', () => {
      mockFs.exists.mockReturnValue(false);

      const result = useCase.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(0);
      expect(result.currentTipHash).toBe('0'.repeat(64));
    });

    it('should verify a valid event chain', () => {
      const ts = new Date().toISOString();
      const events = [
        buildEvent('id-1', 'event-1', 'system', 'target-1', ts, '0'.repeat(64)),
        buildEvent('id-2', 'event-2', 'user', 'target-2', ts, makeHash(`id-1|event-1|system|target-1|${ts}|${'0'.repeat(64)}`)),
      ];

      mockFs.exists.mockReturnValue(true);
      mockFs.read.mockReturnValue(events.map(e => JSON.stringify(e)).join('\n') + '\n');

      const result = useCase.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(2);
      expect(result.currentTipHash).toBe(events[1].hash);
    });

    it('should detect broken previousHash link', () => {
      const ts = new Date().toISOString();
      const events = [
        buildEvent('id-1', 'event-1', 'system', 'target-1', ts, '0'.repeat(64)),
        buildEvent('id-2', 'event-2', 'user', 'target-2', ts, 'tampered-hash'),
      ];

      mockFs.exists.mockReturnValue(true);
      mockFs.read.mockReturnValue(events.map(e => JSON.stringify(e)).join('\n') + '\n');

      const result = useCase.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.breakAtIndex).toBe(1);
      expect(result.breakReason).toContain('Hash mismatch');
    });

    it('should detect tampered event hash', () => {
      const ts = new Date().toISOString();
      const event = buildEvent('id-1', 'event-1', 'system', 'target-1', ts, '0'.repeat(64));
      event.hash = 'tampered';

      mockFs.exists.mockReturnValue(true);
      mockFs.read.mockReturnValue(JSON.stringify(event) + '\n');

      const result = useCase.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.breakAtIndex).toBe(0);
      expect(result.breakReason).toContain('hash mismatch');
    });
  });

  describe('show', () => {
    it('should return recent events', () => {
      const ts = new Date().toISOString();
      const events = Array.from({ length: 5 }, (_, i) =>
        buildEvent(`id-${i}`, `event-${i}`, 'system', `target-${i}`, ts, i === 0 ? '0'.repeat(64) : `hash-${i - 1}`),
      );

      mockFs.exists.mockReturnValue(true);
      mockFs.read.mockReturnValue(events.map(e => JSON.stringify(e)).join('\n') + '\n');

      const result = useCase.show(3);

      expect(result.ok).toBe(true);
      expect(result.data?.total).toBe(5);
      expect(result.data?.events).toHaveLength(3);
    });

    it('should return empty trail when no events exist', () => {
      mockFs.exists.mockReturnValue(false);

      const result = useCase.show(10);

      expect(result.ok).toBe(true);
      expect(result.data?.total).toBe(0);
      expect(result.data?.events).toHaveLength(0);
    });
  });

  describe('prove', () => {
    it('should find an event by id', () => {
      const ts = new Date().toISOString();
      const events = [buildEvent('target-id', 'test-event', 'user', 'target', ts, '0'.repeat(64))];

      mockFs.exists.mockReturnValue(true);
      mockFs.read.mockReturnValue(events.map(e => JSON.stringify(e)).join('\n') + '\n');

      const result = useCase.prove('target-id');

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe('target-id');
    });

    it('should fail when event id is not found', () => {
      mockFs.exists.mockReturnValue(false);

      const result = useCase.prove('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.code).toBe(1);
    });
  });
});
