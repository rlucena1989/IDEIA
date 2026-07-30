import {
  eventCommandStarted,
  eventCommandCompleted,
  eventGenerationCompleted,
  eventSyncFailed,
  eventPolicyBlocked,
} from '../telemetry-event';

describe('telemetry event factories', () => {
  it('eventCommandStarted creates a started event', () => {
    const event = eventCommandStarted('generate', 'req-001');
    expect(event.name).toBe('command.generate.started');
    expect(event.severity).toBe('info');
    expect(event.source).toBe('cli');
    expect(event.payload!.command).toBe('generate');
  });

  it('eventCommandCompleted creates a completed event with duration', () => {
    const event = eventCommandCompleted('generate', 'req-001', 1500);
    expect(event.name).toBe('command.generate.completed');
    expect(event.payload!.durationMs).toBe(1500);
  });

  it('eventGenerationCompleted creates a generation event', () => {
    const event = eventGenerationCompleted('product-x', 'req-001', 5);
    expect(event.name).toBe('generation.completed');
    expect(event.source).toBe('generation');
    expect(event.payload!.artifactCount).toBe(5);
  });

  it('eventSyncFailed creates an error event', () => {
    const event = eventSyncFailed('github', 'req-001', 'Connection timeout');
    expect(event.name).toBe('sync.failed');
    expect(event.severity).toBe('error');
    expect(event.payload!.reason).toBe('Connection timeout');
  });

  it('eventPolicyBlocked creates a warning event', () => {
    const event = eventPolicyBlocked('max-contexts', 'req-001');
    expect(event.name).toBe('policy.blocked');
    expect(event.severity).toBe('warning');
    expect(event.payload!.policy).toBe('max-contexts');
  });

  it('all events have requestId and tags', () => {
    const event = eventCommandStarted('test', 'req-x');
    expect(event.requestId).toBe('req-x');
    expect(event.tags).toContain('command');
  });
});
