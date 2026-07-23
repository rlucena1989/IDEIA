import { TelemetryEvent, createTelemetryEvent } from './telemetry-types';
import * as _crypto from 'node:crypto';

export function eventCommandStarted(command: string, requestId: string): TelemetryEvent {
  return createTelemetryEvent({
    name: `command.${command}.started`,
    severity: 'info',
    source: 'cli',
    requestId,
    tags: ['command'],
    payload: { command },
  });
}

export function eventCommandCompleted(command: string, requestId: string, durationMs: number): TelemetryEvent {
  return createTelemetryEvent({
    name: `command.${command}.completed`,
    severity: 'info',
    source: 'cli',
    requestId,
    tags: ['command'],
    payload: { command, durationMs },
  });
}

export function eventGenerationCompleted(product: string, requestId: string, artifactCount: number): TelemetryEvent {
  return createTelemetryEvent({
    name: 'generation.completed',
    severity: 'info',
    source: 'generation',
    requestId,
    tags: ['generation'],
    payload: { product, artifactCount },
  });
}

export function eventSyncFailed(target: string, requestId: string, reason: string): TelemetryEvent {
  return createTelemetryEvent({
    name: 'sync.failed',
    severity: 'error',
    source: 'sync',
    requestId,
    tags: ['sync'],
    payload: { target, reason },
  });
}

export function eventPolicyBlocked(policy: string, requestId: string): TelemetryEvent {
  return createTelemetryEvent({
    name: 'policy.blocked',
    severity: 'warning',
    source: 'policy',
    requestId,
    tags: ['policy'],
    payload: { policy },
  });
}
