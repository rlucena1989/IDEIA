import { randomUUID } from 'crypto';
import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { SafetyCircuit, EmergencyStop } from '@ideia/safety-circuit';
import { Profiles } from '@ideia/profiles';
import { createLogger } from '@ideia/logger';
import {
  AutonomyLevel,
  TowerStatus,
  TimelineEntry,
  DecisionLogEntry,
} from './types';

const _log = createLogger('control-tower');

export class ControlTower {
  private autonomyLevel: AutonomyLevel = 'assisted';
  private healthPercent = 100;
  private lastAction: string | null = null;
  private lastActionTimestamp: string | null = null;
  private pendingDecisions: number = 0;
  private timeline: TimelineEntry[] = [];
  private decisionLog: DecisionLogEntry[] = [];
  private paused = false;

  constructor(
    private eventBus?: EventBus,
    private auditTrail?: AuditTrail,
    private safetyCircuit?: SafetyCircuit,
    private estop?: EmergencyStop,
    private profiles?: Profiles,
  ) {}

  getStatus(): TowerStatus {
    const scStatus = this.safetyCircuit?.getStatus();
    return {
      autonomyLevel: this.autonomyLevel,
      healthPercent: this.computeHealth(),
      lastAction: this.lastAction,
      lastActionTimestamp: this.lastActionTimestamp,
      pendingDecisions: this.pendingDecisions,
      mode: this.paused ? 'paused' : (scStatus?.mode ?? 'normal'),
      activeTriggers: scStatus?.activeTriggers.length ?? 0,
    };
  }

  getTimeline(): TimelineEntry[] {
    return [...this.timeline].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  getDecisionLog(): DecisionLogEntry[] {
    return [...this.decisionLog].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  async emergencyStop(reason: string): Promise<void> {
    this.paused = true;
    this.lastAction = 'emergency-stop';
    this.lastActionTimestamp = new Date().toISOString();

    if (this.estop) {
      await this.estop.engage('cli', reason, 'user');
    }

    if (this.safetyCircuit) {
      await this.safetyCircuit.evaluate({
        type: 'user-override',
        details: reason,
        metadata: { channel: 'cli' },
      });
    }

    this.addTimelineEntry('emergency', `Emergency STOP: ${reason}`, 'user');
    this.addDecisionLog('STOP', reason, true);
    await this.emitEvent('control-tower.emergency-stop', { reason });
  }

  async emergencyPause(reason: string): Promise<void> {
    this.paused = true;
    this.lastAction = 'emergency-pause';
    this.lastActionTimestamp = new Date().toISOString();

    if (this.safetyCircuit) {
      await this.safetyCircuit.evaluate({
        type: 'user-override',
        details: reason,
        metadata: { channel: 'cli' },
      });
    }

    this.addTimelineEntry('emergency', `Emergency PAUSE: ${reason}`, 'user');
    this.addDecisionLog('PAUSE', reason, true);
    await this.emitEvent('control-tower.emergency-pause', { reason });
  }

  async emergencyRollback(id: string): Promise<void> {
    this.lastAction = 'emergency-rollback';
    this.lastActionTimestamp = new Date().toISOString();

    if (this.safetyCircuit) {
      const sc = this.safetyCircuit;
      sc.reset(id);
    }

    this.addTimelineEntry('emergency', `Rollback: ${id}`, 'user');
    this.addDecisionLog('ROLLBACK', `Rollback to checkpoint ${id}`, true);
    await this.emitEvent('control-tower.emergency-rollback', { id });
  }

  async emergencyResume(): Promise<void> {
    this.paused = false;
    this.lastAction = 'emergency-resume';
    this.lastActionTimestamp = new Date().toISOString();

    if (this.estop) {
      await this.estop.recover('resume');
    }

    if (this.safetyCircuit) {
      this.safetyCircuit.reset();
    }

    this.addTimelineEntry('emergency', 'Resumed after emergency', 'user');
    this.addDecisionLog('RESUME', 'System resumed', true);
    await this.emitEvent('control-tower.emergency-resume', {});
  }

  async setAutonomyLevel(level: AutonomyLevel): Promise<void> {
    this.autonomyLevel = level;
    this.lastAction = 'autonomy-change';
    this.lastActionTimestamp = new Date().toISOString();
    this.addTimelineEntry('autonomy-change', `Autonomy level set to ${level}`, 'user');
    this.addDecisionLog('AUTONOMY_SET', `Level changed to ${level}`, true);
    await this.emitEvent('control-tower.autonomy-change', { level });
  }

  updateHealth(percent: number): void {
    this.healthPercent = Math.max(0, Math.min(100, percent));
  }

  setPendingDecisions(count: number): void {
    this.pendingDecisions = count;
  }

  private computeHealth(): number {
    const scTriggerPenalty = (this.safetyCircuit?.getStatus().activeTriggers.length ?? 0) * 10;
    const pausePenalty = this.paused ? 20 : 0;
    return Math.max(0, Math.min(100, this.healthPercent - scTriggerPenalty - pausePenalty));
  }

  private addTimelineEntry(type: TimelineEntry['type'], description: string, actor: 'user' | 'system' | 'ai'): void {
    const entry: TimelineEntry = {
      id: randomUUID(),
      type,
      description,
      timestamp: new Date().toISOString(),
      actor: actor as string,
    };
    this.timeline.push(entry);

    if (this.auditTrail) {
      try {
        this.auditTrail.append({
          actor,
          eventType: `control-tower.timeline.${type}`,
          target: 'control-tower',
          decision: 'approved',
          result: 'success',
          metadata: { entry },
        });
      } catch {
        /* background */
      }
    }
  }

  private addDecisionLog(action: string, description: string, approved: boolean, details?: string): void {
    const entry: DecisionLogEntry = {
      id: randomUUID(),
      action,
      description,
      timestamp: new Date().toISOString(),
      actor: 'user',
      approved,
      details,
    };
    this.decisionLog.push(entry);

    if (this.auditTrail) {
      try {
        this.auditTrail.append({
          actor: 'user',
          eventType: `control-tower.decision.${action.toLowerCase()}`,
          target: 'control-tower',
          decision: approved ? 'approved' : 'rejected',
          result: 'success',
          metadata: { entry },
        });
      } catch {
        /* background */
      }
    }
  }

  private async emitEvent(type: string, payload: Record<string, unknown>): Promise<void> {
    if (this.eventBus) {
      try {
        await this.eventBus.emit({ type, source: 'control-tower', payload });
      } catch {
        /* background */
      }
    }
  }
}

export function createControlTower(
  eventBus?: EventBus,
  auditTrail?: AuditTrail,
  safetyCircuit?: SafetyCircuit,
  emergencyStop?: EmergencyStop,
  profiles?: Profiles,
): ControlTower {
  return new ControlTower(eventBus, auditTrail, safetyCircuit, emergencyStop, profiles);
}
