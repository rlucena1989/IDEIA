import { describe, it, expect } from '@jest/globals';
import { SessionObserver, createSessionObserver } from '../src/session-observer';
import { ObservabilityEngine } from '../src/observability-engine';

describe('SessionObserver', () => {
  it('should create via factory', () => {
    const engine = new ObservabilityEngine();
    const observer = createSessionObserver(engine);
    expect(observer).toBeInstanceOf(SessionObserver);
  });

  it('should track session lifecycle', () => {
    const engine = new ObservabilityEngine();
    const observer = new SessionObserver(engine);

    observer.onSessionCreated('sess-1', { source: 'cli' });
    let summary = observer.getSessionSummary();
    expect(summary.active).toBe(1);
    expect(summary.total).toBe(1);

    observer.onSessionCommand('sess-1', 'generate scaffold');
    observer.onSessionCommand('sess-1', 'run tests');
    observer.onSessionError('sess-1', 'test failure');

    const info = observer.getSession('sess-1')!;
    expect(info.commandCount).toBe(2);
    expect(info.errorCount).toBe(1);
    expect(info.commands).toContain('run tests');
    expect(info.errors).toContain('test failure');

    const ended = observer.onSessionEnd('sess-1')!;
    expect(ended.durationMs).toBeGreaterThanOrEqual(0);
    expect(ended.endedAt).toBeDefined();

    summary = observer.getSessionSummary();
    expect(summary.active).toBe(0);
    expect(summary.completed).toBe(1);
  });

  it('should return undefined for unknown session', () => {
    const engine = new ObservabilityEngine();
    const observer = new SessionObserver(engine);
    expect(observer.getSession('nonexistent')).toBeUndefined();
    expect(observer.onSessionEnd('nonexistent')).toBeUndefined();
  });

  it('should handle session end with metrics recording', () => {
    const engine = new ObservabilityEngine();
    const observer = new SessionObserver(engine);

    observer.onSessionCreated('sess-2');
    observer.onSessionCommand('sess-2', 'cmd1');
    observer.onSessionCommand('sess-2', 'cmd2');
    observer.onSessionError('sess-2', 'err1');
    observer.onSessionEnd('sess-2');

    const metrics = engine.getMetrics();
    const endedMetrics = metrics.filter(m => m.name === 'session.ended');
    expect(endedMetrics.length).toBe(1);

    const durationMetrics = metrics.filter(m => m.name === 'session.duration_ms');
    expect(durationMetrics.length).toBe(1);

    const commandsMetrics = metrics.filter(m => m.name === 'session.commands_total');
    expect(commandsMetrics.length).toBe(1);
    expect(commandsMetrics[0].value).toBe(2);
  });

  it('should clear all sessions', () => {
    const engine = new ObservabilityEngine();
    const observer = new SessionObserver(engine);

    observer.onSessionCreated('sess-1');
    observer.onSessionCreated('sess-2');
    expect(observer.getSessionSummary().total).toBe(2);

    observer.clear();
    expect(observer.getSessionSummary().total).toBe(0);
  });
});
