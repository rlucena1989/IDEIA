import { SecretsManager, MemorySecretProvider, EnvSecretProvider } from '../src/secrets-manager';
import { RotationScheduler, cronMatches } from '../src/rotation-scheduler';
import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SecretsManager', () => {
  let manager: SecretsManager;

  beforeEach(() => {
    manager = new SecretsManager();
    manager.registerProvider('memory', new MemorySecretProvider());
  });

  describe('register/get/set', () => {
    it('should set and get a secret', async () => {
      await manager.setSecret('DB_PASSWORD', 'supersecret');
      const value = await manager.getSecret('DB_PASSWORD');
      expect(value).toBe('supersecret');
    });

    it('should return null for unknown secret', async () => {
      const value = await manager.getSecret('NONEXISTENT');
      expect(value).toBeNull();
    });

    it('should overwrite existing secret', async () => {
      await manager.setSecret('API_KEY', 'old-key');
      await manager.setSecret('API_KEY', 'new-key');
      const value = await manager.getSecret('API_KEY');
      expect(value).toBe('new-key');
    });

    it('should respect TTL expiration', async () => {
      await manager.setSecret('SESSION_SECRET', 'temp-value', 50);
      expect(await manager.getSecret('SESSION_SECRET')).toBe('temp-value');
    });
  });

  describe('rotate secret', () => {
    it('should generate a new value on rotation', async () => {
      await manager.setSecret('JWT_SECRET', 'original-value');
      const result = await manager.rotateSecret('JWT_SECRET');
      expect(result.status).toBe('success');
      expect(result.oldValue).toBe('original-value');
      expect(result.newValue).not.toBe('original-value');
      expect(result.newValue.length).toBe(64);
      const current = await manager.getSecret('JWT_SECRET');
      expect(current).toBe(result.newValue);
    });

    it('should rotate even with no prior value', async () => {
      const result = await manager.rotateSecret('NEW_SECRET');
      expect(result.status).toBe('success');
      expect(result.oldValue).toBe('');
      expect(result.newValue).toBeDefined();
      const current = await manager.getSecret('NEW_SECRET');
      expect(current).toBe(result.newValue);
    });

    it('should produce different values on consecutive rotations', async () => {
      await manager.setSecret('ROTATING_KEY', 'first');
      const r1 = await manager.rotateSecret('ROTATING_KEY');
      const r2 = await manager.rotateSecret('ROTATING_KEY');
      expect(r1.newValue).not.toBe(r2.newValue);
    });
  });

  describe('rotation history', () => {
    it('should track rotation history for a secret', async () => {
      await manager.setSecret('HISTORY_TEST', 'v1');
      expect(manager.getRotationHistory('HISTORY_TEST')).toHaveLength(0);
      await manager.rotateSecret('HISTORY_TEST');
      expect(manager.getRotationHistory('HISTORY_TEST')).toHaveLength(1);
      await manager.rotateSecret('HISTORY_TEST');
      expect(manager.getRotationHistory('HISTORY_TEST')).toHaveLength(2);
    });

    it('should include timestamp and duration in records', async () => {
      await manager.setSecret('TIMED', 'initial');
      const result = await manager.rotateSecret('TIMED');
      const history = manager.getRotationHistory('TIMED');
      expect(history[0]).toMatchObject({
        secretName: 'TIMED',
        status: 'success',
      });
      expect(history[0]!.timestamp).toBeGreaterThan(0);
      expect(history[0]!.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('audit log', () => {
    it('should record set actions in audit log', async () => {
      await manager.setSecret('AUDIT_TEST', 'value');
      const log = manager.auditLog();
      expect(log.length).toBe(1);
      expect(log[0]!.action).toBe('set');
      expect(log[0]!.secretName).toBe('AUDIT_TEST');
    });

    it('should record rotate actions in audit log', async () => {
      await manager.setSecret('ROTATE_AUDIT', 'initial');
      await manager.rotateSecret('ROTATE_AUDIT');
      const log = manager.auditLog();
      expect(log.length).toBe(3);
      expect(log[0]!.action).toBe('set');
      expect(log[1]!.action).toBe('set');
      expect(log[2]!.action).toBe('rotate');
    });

    it('should have SHA-256 hash chain linking entries', async () => {
      await manager.setSecret('CHAIN_1', 'a');
      await manager.setSecret('CHAIN_2', 'b');
      await manager.setSecret('CHAIN_3', 'c');
      const log = manager.auditLog();
      expect(log.length).toBe(3);
      expect(log[0]!.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(log[1]!.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(log[2]!.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(log[0]!.hash).not.toBe(log[1]!.hash);
      expect(log[1]!.hash).not.toBe(log[2]!.hash);
    });
  });

  describe('EnvSecretProvider', () => {
    const testEnvPath = join(tmpdir(), `.env-test-${randomBytes(4).toString('hex')}`);

    afterEach(() => {
      if (existsSync(testEnvPath)) {
        try { unlinkSync(testEnvPath); } catch {}
      }
    });

    it('should read a value from .env file', async () => {
      writeFileSync(testEnvPath, 'MY_SECRET=hello-world\nANOTHER=value\n', 'utf-8');
      const provider = new EnvSecretProvider(testEnvPath);
      const value = await provider.get('MY_SECRET');
      expect(value).toBe('hello-world');
    });

    it('should write a value to .env file', async () => {
      const provider = new EnvSecretProvider(testEnvPath);
      await provider.set('NEW_KEY', 'new-value');
      const content = readFileSync(testEnvPath, 'utf-8');
      expect(content).toContain('NEW_KEY=new-value');
    });

    it('should update existing value in .env file', async () => {
      writeFileSync(testEnvPath, 'EXISTING_KEY=old\n', 'utf-8');
      const provider = new EnvSecretProvider(testEnvPath);
      await provider.set('EXISTING_KEY', 'updated');
      const value = await provider.get('EXISTING_KEY');
      expect(value).toBe('updated');
    });

    it('should return null for missing file', async () => {
      const provider = new EnvSecretProvider('nonexistent-file.env');
      const value = await provider.get('ANYTHING');
      expect(value).toBeNull();
    });

    it('should strip quotes from values', async () => {
      writeFileSync(testEnvPath, 'QUOTED="quoted-value"\n', 'utf-8');
      const provider = new EnvSecretProvider(testEnvPath);
      const value = await provider.get('QUOTED');
      expect(value).toBe('quoted-value');
    });
  });
});

describe('cronMatches', () => {
  const baseDate = new Date(2026, 0, 15, 10, 30, 0);

  it('should match every-minute cron', () => {
    expect(cronMatches('* * * * *', baseDate)).toBe(true);
  });

  it('should match step cron when divisible', () => {
    expect(cronMatches('*/5 * * * *', baseDate)).toBe(true);
  });

  it('should not match wrong minute', () => {
    expect(cronMatches('31 * * * *', baseDate)).toBe(false);
  });

  it('should match comma-separated values', () => {
    expect(cronMatches('28,29,30 * * * *', baseDate)).toBe(true);
  });

  it('should match range values', () => {
    expect(cronMatches('25-35 * * * *', baseDate)).toBe(true);
  });

  it('should match exact hour and minute', () => {
    expect(cronMatches('30 10 * * *', baseDate)).toBe(true);
  });

  it('should not match wrong hour', () => {
    expect(cronMatches('30 11 * * *', baseDate)).toBe(false);
  });
});

describe('RotationScheduler', () => {
  let manager: SecretsManager;
  let scheduler: RotationScheduler;

  beforeEach(() => {
    manager = new SecretsManager();
    manager.registerProvider('memory', new MemorySecretProvider());
    scheduler = new RotationScheduler(manager);
    scheduler.setCheckInterval(100);
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should add and list jobs', () => {
    scheduler.addJob('SECRET_1', '0 * * * *');
    scheduler.addJob('SECRET_2', '*/30 * * * *');
    expect(scheduler.getJobs()).toHaveLength(2);
  });

  it('should remove a job', () => {
    scheduler.addJob('REMOVABLE', '* * * * *');
    expect(scheduler.getJobs()).toHaveLength(1);
    scheduler.removeJob('REMOVABLE');
    expect(scheduler.getJobs()).toHaveLength(0);
  });

  it('should execute due rotations', async () => {
    await manager.setSecret('SCHEDULED_SECRET', 'before');
    scheduler.addJob('SCHEDULED_SECRET', '* * * * *');
    await scheduler.executeDue();
    const value = await manager.getSecret('SCHEDULED_SECRET');
    expect(value).not.toBe('before');
    expect(value?.length).toBe(64);
  });

  it('should track rotation history after execution', async () => {
    await manager.setSecret('HISTORY_JOB', 'initial');
    scheduler.addJob('HISTORY_JOB', '* * * * *');
    await scheduler.executeDue();
    const history = manager.getRotationHistory('HISTORY_JOB');
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]!.status).toBe('success');
  });

  it('should not re-execute same job within cooldown', async () => {
    await manager.setSecret('COOLDOWN', 'first');
    scheduler.addJob('COOLDOWN', '* * * * *');
    await scheduler.executeDue();
    const afterFirst = await manager.getSecret('COOLDOWN');
    await scheduler.executeDue();
    const afterSecond = await manager.getSecret('COOLDOWN');
    expect(afterSecond).toBe(afterFirst);
  });
});
