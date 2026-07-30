import { randomUUID } from 'crypto';
import type { IEventBus } from '@ideia/event-bus';
import type { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';
import {
  DecisionRecord,
  DecisionPriority,
  DecisionRegistration,
  DecisionResolution,
  DecisionStatus,
  EscalationLevel,
  TimelinePhase,
  ContinuityStatus,
  ContinuityEventPayload,
  TIMELINE_THRESHOLDS,
  ESCALATION_ORDER,
  PROFILE_AUTO_EXECUTE,
  PROFILE_ASK_PREPARE,
} from './types';

const log = createLogger('continuity-engine');

function determinePhase(elapsed: number): TimelinePhase {
  if (elapsed < TIMELINE_THRESHOLDS.waiting) return 'waiting';
  if (elapsed < TIMELINE_THRESHOLDS.suggesting) return 'suggesting';
  if (elapsed < TIMELINE_THRESHOLDS.escalating) return 'escalating';
  if (elapsed < TIMELINE_THRESHOLDS['auto-continue']) return 'auto-continue';
  return 'forced';
}

function nextEscalationLevel(current: EscalationLevel): EscalationLevel | null {
  const idx = ESCALATION_ORDER.indexOf(current);
  if (idx < ESCALATION_ORDER.length - 1) return ESCALATION_ORDER[idx + 1];
  return null;
}

export class ContinuityEngine {
  private decisions: Map<string, DecisionRecord> = new Map();
  private eventBus?: IEventBus;
  private auditTrail?: AuditTrail;

  constructor(eventBus?: IEventBus, auditTrail?: AuditTrail) {
    this.eventBus = eventBus;
    this.auditTrail = auditTrail;
  }

  registerDecision(registration: DecisionRegistration): string {
    const id = registration.id ?? randomUUID();
    const now = Date.now();
    const priority: DecisionPriority = registration.priority ?? 'medium';
    const timeoutMs = registration.timeoutMs ?? 5 * 60 * 1000;

    let status: DecisionStatus = 'pending';
    let action: string | undefined;

    if (registration.profileMatch >= PROFILE_AUTO_EXECUTE) {
      status = 'auto-decided';
      action = registration.preparedAction ?? `auto-continue:${registration.description}`;
    }

    const record: DecisionRecord = {
      id,
      description: registration.description,
      context: registration.context ?? {},
      priority,
      profileMatch: registration.profileMatch,
      status,
      phase: determinePhase(0),
      createdAt: now,
      updatedAt: now,
      timeoutMs,
      alternatives: [],
      escalationLevel: 'dev',
      preparedAction: registration.preparedAction,
      resolvedAction: action,
      resolvedBy: status === 'auto-decided' ? 'continuity-engine' : undefined,
    };

    this.decisions.set(id, record);
    log.info(`Decision registered: ${id} (match=${registration.profileMatch}%, status=${status}, priority=${priority})`);

    this.emitContinuityEvent(record, 'registered');

    return id;
  }

  getPendingDecisions(): DecisionRecord[] {
    return Array.from(this.decisions.values()).filter(d => d.status === 'pending');
  }

  getDecision(id: string): DecisionRecord | undefined {
    return this.decisions.get(id);
  }

  resolveDecision(id: string, resolution: DecisionResolution): boolean {
    const record = this.decisions.get(id);
    if (!record || record.status !== 'pending') return false;

    record.status = 'resolved';
    record.resolvedAction = resolution.action;
    record.resolvedBy = resolution.resolvedBy ?? 'user';
    record.updatedAt = Date.now();

    this.emitContinuityEvent(record, 'resolved');

    return true;
  }

  escalateDecision(id: string, level?: EscalationLevel): boolean {
    const record = this.decisions.get(id);
    if (!record || record.status !== 'pending') return false;

    const targetLevel = level ?? nextEscalationLevel(record.escalationLevel);
    if (!targetLevel) {
      record.status = 'timeout';
      record.updatedAt = Date.now();
      this.emitContinuityEvent(record, 'escalation-exhausted');
      return true;
    }

    record.escalationLevel = targetLevel;
    record.updatedAt = Date.now();
    this.emitContinuityEvent(record, 'escalated');
    return true;
  }

  suggestAlternatives(id: string, alternatives: string[]): boolean {
    const record = this.decisions.get(id);
    if (!record) return false;

    record.alternatives.push(...alternatives);
    record.updatedAt = Date.now();
    return true;
  }

  processTimeout(): ContinuityEventPayload[] {
    const events: ContinuityEventPayload[] = [];
    const now = Date.now();

    for (const record of this.decisions.values()) {
      if (record.status !== 'pending') continue;

      const elapsed = now - record.createdAt;
      const oldPhase = record.phase;
      const newPhase = determinePhase(elapsed);

      if (newPhase !== oldPhase) {
        record.phase = newPhase;
        record.updatedAt = now;
      }

      switch (record.phase) {
        case 'suggesting': {
          const defaultAlts = this.buildDefaultAlternatives(record);
          record.alternatives.push(...defaultAlts);
          this.emitContinuityEvent(record, 'suggesting');
          events.push(this.buildPayload(record, 'suggesting'));
          break;
        }
        case 'escalating': {
          const nextLevel = nextEscalationLevel(record.escalationLevel);
          if (nextLevel) {
            record.escalationLevel = nextLevel;
            record.updatedAt = now;
            this.emitContinuityEvent(record, 'escalated');
            events.push(this.buildPayload(record, 'escalated'));
          }
          break;
        }
        case 'auto-continue': {
          if (record.profileMatch >= PROFILE_ASK_PREPARE) {
            const action = record.preparedAction ?? `auto-continue:${record.description}`;
            record.status = 'auto-decided';
            record.resolvedAction = action;
            record.resolvedBy = 'continuity-engine';
            record.updatedAt = now;
            this.emitContinuityEvent(record, 'auto-continue');
            events.push(this.buildPayload(record, 'auto-continue'));
          } else {
            this.emitContinuityEvent(record, 'pending-auto');
            events.push(this.buildPayload(record, 'pending-auto'));
          }
          break;
        }
        case 'forced': {
          const action = record.preparedAction ?? `forced-continue:${record.description}`;
          record.status = 'timeout';
          record.resolvedAction = action;
          record.resolvedBy = 'continuity-engine';
          record.updatedAt = now;
          this.emitContinuityEvent(record, 'forced');
          events.push(this.buildPayload(record, 'forced'));
          break;
        }
        default:
          break;
      }
    }

    return events;
  }

  getContinuityStatus(): ContinuityStatus {
    const pending = this.getPendingDecisions();
    const all = Array.from(this.decisions.values());
    let oldestAge = 0;
    const now = Date.now();

    const activePhases: Record<TimelinePhase, number> = {
      waiting: 0,
      suggesting: 0,
      escalating: 0,
      escalated: 0,
      'escalation-exhausted': 0,
      'auto-continue': 0,
      forced: 0,
    };

    const escalationDistribution: Record<EscalationLevel, number> = {
      dev: 0,
      'tech-lead': 0,
      manager: 0,
    };

    for (const d of pending) {
      activePhases[d.phase] = (activePhases[d.phase] ?? 0) + 1;
      escalationDistribution[d.escalationLevel] = (escalationDistribution[d.escalationLevel] ?? 0) + 1;
      const age = now - d.createdAt;
      if (age > oldestAge) oldestAge = age;
    }

    return {
      pendingDecisions: pending.length,
      resolvedDecisions: all.filter(d => d.status === 'resolved').length,
      escalatedDecisions: all.filter(d => d.status === 'escalated').length,
      autoDecided: all.filter(d => d.status === 'auto-decided').length,
      timeoutCount: all.filter(d => d.status === 'timeout').length,
      oldestPendingAge: oldestAge,
      activePhases,
      escalationDistribution,
    };
  }

  private buildDefaultAlternatives(record: DecisionRecord): string[] {
    return [
      `break down:${record.description}`,
      `skip:${record.description}`,
      `defer:${record.description}`,
      `parallel:${record.description}`,
    ];
  }

  private buildPayload(record: DecisionRecord, _phase: string): ContinuityEventPayload {
    return {
      decisionId: record.id,
      description: record.description,
      phase: record.phase,
      status: record.status,
      escalationLevel: record.escalationLevel,
      profileMatch: record.profileMatch,
      timestamp: Date.now(),
    };
  }

  private emitContinuityEvent(record: DecisionRecord, eventType: string): void {
    if (!this.eventBus) return;

    const payload: ContinuityEventPayload = {
      decisionId: record.id,
      description: record.description,
      phase: record.phase,
      status: record.status,
      escalationLevel: record.escalationLevel,
      profileMatch: record.profileMatch,
      timestamp: Date.now(),
    };

    this.eventBus.emit({
      type: `continuity.${eventType}`,
      source: 'continuity-engine',
      payload: payload as unknown as Record<string, unknown>,
    }).catch((err: unknown) => {
      log.warn('Failed to emit continuity event', { error: String(err) });
    });
  }
}
