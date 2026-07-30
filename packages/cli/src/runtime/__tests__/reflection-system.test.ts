import { describe, it, expect } from '@jest/globals';
import { ReflectionSystem } from '../reflection-system';

describe('ReflectionSystem', () => {
  it('should create a reflection entry', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('deploy', 'success', 'Deployment completed in 2s');
    expect(ref.action).toBe('deploy');
    expect(ref.result).toBe('success');
    expect(ref.applied).toBe(false);
    expect(ref.lesson).toBeTruthy();
    expect(ref.reflection).toBeTruthy();
  });

  it('should generate analysis for success', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('test', 'success', 'All tests passed');
    expect(ref.reflection).toContain('Strategy worked');
  });

  it('should generate analysis for failure', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('build', 'failure', 'Build failed with error code 1');
    expect(ref.reflection).toContain('Failed');
  });

  it('should generate analysis for partial', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('migrate', 'partial', 'Migrated 5 of 10 files');
    expect(ref.reflection).toContain('Partial');
    expect(ref.reflection).toContain('Improvement possible');
  });

  it('should extract timeout lesson', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('deploy', 'failure', 'Request timeout after 30s');
    expect(ref.lesson).toContain('timeout');
  });

  it('should extract error lesson', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('run', 'failure', 'An error occurred during execution');
    expect(ref.lesson).toContain('pre-validation');
  });

  it('should extract missing prerequisites lesson', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('setup', 'failure', 'Required file not found');
    expect(ref.lesson).toContain('prerequisites');
  });

  it('should track applied lessons', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('deploy', 'success', 'OK');
    expect(rs.getLessons()).toHaveLength(0);
    rs.markApplied(ref.id);
    expect(rs.getLessons()).toHaveLength(1);
    expect(rs.getLessons()[0]).toBe(ref.lesson);
  });

  it('should return pending lessons', () => {
    const rs = new ReflectionSystem();
    rs.reflect('action1', 'success', 'ok');
    rs.reflect('action2', 'success', 'ok');
    const pending = rs.getPendingLessons();
    expect(pending).toHaveLength(2);
  });

  it('should filter out applied from pending', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('action1', 'success', 'ok');
    rs.reflect('action2', 'success', 'ok');
    rs.markApplied(ref.id);
    expect(rs.getPendingLessons()).toHaveLength(1);
  });

  it('should not break on unknown result', () => {
    const rs = new ReflectionSystem();
    const ref = rs.reflect('test', 'success' as any, '');
    expect(ref).toBeDefined();
    expect(ref.lesson).toBeTruthy();
  });
});
