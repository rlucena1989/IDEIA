import { createLogger, Logger } from '@ideia/logger';
import { Breakpoint, BreakpointCondition, BreakpointResult, TraceRecord } from './types-debugger';

function generateId(): string {
  return 'bp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function getFieldValue(step: TraceRecord, field: string): unknown {
  if (field === 'stepNumber') return step.stepNumber;
  if (field === 'type') return step.type;
  if (field === 'status') return step.status;
  if (field === 'action') return step.action;
  if (field === 'duration') return step.duration;
  if (field === 'thought') return step.thought;
  if (field === 'timestamp') return step.timestamp;
  if (field.startsWith('toolCalls.')) {
    const toolField = field.slice('toolCalls.'.length);
    return step.toolCalls.map(tc => {
      if (toolField === 'tool') return tc.tool;
      if (toolField === 'success') return tc.success;
      if (toolField === 'duration') return tc.duration;
      if (toolField === 'error') return tc.error;
      return undefined;
    }).filter(v => v !== undefined);
  }
  if (field.startsWith('state.')) {
    const key = field.slice('state.'.length);
    return step.state?.[key];
  }
  return undefined;
}

function compareValues(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case 'eq': return actual === expected;
    case 'neq': return actual !== expected;
    case 'gt': return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'gte': return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case 'lt': return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'lte': return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'contains':
      if (typeof actual === 'string' && typeof expected === 'string') return actual.includes(expected);
      if (Array.isArray(actual)) return actual.some(v => String(v).includes(String(expected)));
      return false;
    case 'matches':
      if (typeof actual === 'string' && typeof expected === 'string') {
        try { return new RegExp(expected).test(actual); } catch { return false; }
      }
      return false;
    default:
      return false;
  }
}

function evaluateCondition(condition: BreakpointCondition, step: TraceRecord): boolean {
  const actual = getFieldValue(step, condition.field);
  if (actual === undefined) return false;
  if (Array.isArray(actual)) {
    return actual.some(v => compareValues(v, condition.operator, condition.value));
  }
  return compareValues(actual, condition.operator, condition.value);
}

export class BreakpointManager {
  private breakpoints = new Map<string, Breakpoint>();
  private logger: Logger;

  constructor() {
    this.logger = createLogger('BreakpointManager');
  }

  addBreakpoint(sessionId: string, condition: BreakpointCondition): Breakpoint {
    const id = generateId();
    const bp: Breakpoint = {
      id,
      sessionId,
      condition,
      enabled: true,
      hitCount: 0,
    };
    this.breakpoints.set(id, bp);
    this.logger.info('Breakpoint added', { breakpointId: id, sessionId, field: condition.field, operator: condition.operator });
    return bp;
  }

  removeBreakpoint(breakpointId: string): boolean {
    const bp = this.breakpoints.get(breakpointId);
    if (bp) {
      this.breakpoints.delete(breakpointId);
      this.logger.info('Breakpoint removed', { breakpointId });
      return true;
    }
    return false;
  }

  evaluate(step: TraceRecord, sessionId: string): BreakpointResult {
    const sessionBps = this.listBreakpoints(sessionId);
    for (const bp of sessionBps) {
      if (!bp.enabled) continue;
      if (bp.maxHits !== undefined && bp.hitCount >= bp.maxHits) continue;
      const matched = evaluateCondition(bp.condition, step);
      if (matched) {
        bp.hitCount++;
        if (bp.maxHits !== undefined && bp.hitCount >= bp.maxHits) {
          bp.enabled = false;
        }
        this.logger.info('Breakpoint hit', { breakpointId: bp.id, hitCount: bp.hitCount });
        return {
          matched: true,
          breakpoint: bp,
          step,
          state: step.state,
        };
      }
    }
    return { matched: false };
  }

  listBreakpoints(sessionId: string): Breakpoint[] {
    return Array.from(this.breakpoints.values()).filter(bp => bp.sessionId === sessionId);
  }

  clearBreakpoints(sessionId: string): void {
    for (const [id, bp] of this.breakpoints) {
      if (bp.sessionId === sessionId) {
        this.breakpoints.delete(id);
      }
    }
  }
}
