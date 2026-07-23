import { randomUUID } from 'crypto';
import { ScopeViolationEvent, Scope } from './types';
import { ScopeViolationError } from './scope-isolation';

export class ViolationAudit {
  private events: ScopeViolationEvent[] = [];
  private maxEvents = 10000;

  record(event: Omit<ScopeViolationEvent, 'id' | 'timestamp'>): ScopeViolationEvent {
    const full: ScopeViolationEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.events.push(full);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    return full;
  }

  recordFromError(error: ScopeViolationError): ScopeViolationEvent {
    return this.record({
      fromScope: error.fromScope,
      targetPath: error.targetPath,
      resolvedPath: error.resolvedPath,
      policyAction: 'blocked',
      reason: error.message,
    });
  }

  list(scope?: Scope): ScopeViolationEvent[] {
    if (!scope) return [...this.events];
    return this.events.filter(e => e.fromScope === scope);
  }

  count(scope?: Scope): number {
    if (!scope) return this.events.length;
    return this.events.filter(e => e.fromScope === scope).length;
  }

  recent(n: number): ScopeViolationEvent[] {
    return this.events.slice(-n).reverse();
  }

  clear(): void {
    this.events = [];
  }
}

export function createViolationAudit(): ViolationAudit {
  return new ViolationAudit();
}
