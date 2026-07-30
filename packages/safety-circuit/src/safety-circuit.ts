import { randomUUID as _randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import {
  TriggerType,
  SafetyAction,
  SafetyDecision,
  SafetyMode,
  SafetyStatus,
  TriggerEvent,
} from './types';

interface TriggerRecord {
  type: TriggerType;
  reason: string;
  activatedAt: string;
}

export class SafetyCircuit {
  private mode: SafetyMode = 'normal';
  private activeTriggers: TriggerRecord[] = [];
  private lastDecision: SafetyDecision | null = null;

  private loopFixCount: Map<string, { count: number; firstFix: number }> = new Map();
  private coverageHistory: number[] = [];
  private breakageChain = 0;
  private memoryPercent = 0;
  private cpuPercent = 0;

  private readonly LOOP_WINDOW_MS = 3600000;
  private readonly LOOP_THRESHOLD = 5;
  private readonly REGRESSION_THRESHOLD = 5;
  private readonly BREAKAGE_CHAIN_THRESHOLD = 3;
  private readonly MEMORY_THRESHOLD = 80;
  private readonly CPU_THRESHOLD = 90;

  constructor(
    private eventBus?: EventBus,
    private auditTrail?: AuditTrail,
  ) {}

  async evaluate(trigger: TriggerEvent): Promise<SafetyDecision> {
    const decision = this.evaluateSync(trigger);

    if (this.auditTrail) {
      try {
        this.auditTrail.append({
          actor: 'system',
          eventType: `safety.${trigger.type}`,
          target: trigger.file ?? 'unknown',
          decision: decision.action === 'allow' ? 'approved' : 'rejected',
          result: 'success',
          metadata: { trigger, decision },
        });
      } catch {
        /* background audit failure */
      }
    }

    if (this.eventBus) {
      try {
        await this.eventBus.emit({
          type: `safety.${decision.action}`,
          source: 'safety-circuit',
          payload: { trigger, decision },
        });
      } catch {
        /* background event emission failure */
      }
    }

    return decision;
  }

  private evaluateSync(trigger: TriggerEvent): SafetyDecision {
    switch (trigger.type) {
      case 'loop-detection':
        return this.evaluateLoopDetection(trigger);
      case 'regression-spike':
        return this.evaluateRegressionSpike(trigger);
      case 'breakage-chain':
        return this.evaluateBreakageChain(trigger);
      case 'resource-exhaustion':
        return this.evaluateResourceExhaustion(trigger);
      case 'user-override':
        return this.evaluateUserOverride(trigger);
      default:
        return this.makeDecision('allow', 'Unknown trigger type', 'info', trigger.type);
    }
  }

  private evaluateLoopDetection(trigger: TriggerEvent): SafetyDecision {
    const file = trigger.file;
    if (!file) {
      return this.makeDecision('allow', 'No file specified for loop detection', 'info', trigger.type);
    }

    const now = Date.now();
    const existing = this.loopFixCount.get(file);

    if (!existing) {
      this.loopFixCount.set(file, { count: 1, firstFix: now });
      return this.makeDecision('allow', `First auto-fix on ${file}`, 'info', trigger.type);
    }

    const elapsed = now - existing.firstFix;
    if (elapsed > this.LOOP_WINDOW_MS) {
      this.loopFixCount.set(file, { count: 1, firstFix: now });
      return this.makeDecision('allow', `Window reset for ${file}`, 'info', trigger.type);
    }

    existing.count++;
    if (existing.count > this.LOOP_THRESHOLD) {
      const decision = this.makeDecision(
        'pause',
        `Loop detected: ${existing.count} auto-fixes on ${file} in under 1h`,
        'warning',
        trigger.type,
      );
      this.activateTrigger('loop-detection', decision.reason);
      return decision;
    }

    return this.makeDecision(
      'allow',
      `Auto-fix #${existing.count} on ${file}`,
      'info',
      trigger.type,
    );
  }

  private evaluateRegressionSpike(trigger: TriggerEvent): SafetyDecision {
    const coverageStr = trigger.metadata?.coverage;
    const coverage = typeof coverageStr === 'number' ? coverageStr : NaN;

    if (isNaN(coverage)) {
      return this.makeDecision('allow', 'No coverage data available', 'info', trigger.type);
    }

    this.coverageHistory.push(coverage);
    if (this.coverageHistory.length < 2) {
      return this.makeDecision('allow', `Initial coverage: ${coverage}%`, 'info', trigger.type);
    }

    const prev = this.coverageHistory[this.coverageHistory.length - 2] ?? 0;
    const drop = prev - coverage;

    if (drop > this.REGRESSION_THRESHOLD) {
      const decision = this.makeDecision(
        'rollback',
        `Regression spike: coverage dropped ${drop.toFixed(1)}% (${prev}% → ${coverage}%)`,
        'critical',
        trigger.type,
      );
      this.activateTrigger('regression-spike', decision.reason);
      return decision;
    }

    return this.makeDecision(
      'allow',
      `Coverage ${coverage}% (${drop >= 0 ? 'drop' : 'gain'} of ${Math.abs(drop).toFixed(1)}%)`,
      drop > 0 ? 'warning' : 'info',
      trigger.type,
    );
  }

  private evaluateBreakageChain(trigger: TriggerEvent): SafetyDecision {
    this.breakageChain++;

    if (this.breakageChain >= this.BREAKAGE_CHAIN_THRESHOLD) {
      const decision = this.makeDecision(
        'pause',
        `Breakage chain: ${this.breakageChain} consecutive contract breaks`,
        'critical',
        trigger.type,
      );
      this.activateTrigger('breakage-chain', decision.reason);
      return decision;
    }

    return this.makeDecision(
      'allow',
      `Contract break #${this.breakageChain} (threshold: ${this.BREAKAGE_CHAIN_THRESHOLD})`,
      'warning',
      trigger.type,
    );
  }

  private evaluateResourceExhaustion(trigger: TriggerEvent): SafetyDecision {
    const mem = trigger.metadata?.memoryPercent;
    const cpu = trigger.metadata?.cpuPercent;
    const memoryPercent = typeof mem === 'number' ? mem : this.memoryPercent;
    const cpuPercent = typeof cpu === 'number' ? cpu : this.cpuPercent;

    this.memoryPercent = memoryPercent;
    this.cpuPercent = cpuPercent;

    if (memoryPercent > this.MEMORY_THRESHOLD || cpuPercent > this.CPU_THRESHOLD) {
      const reason = `Resource exhaustion: memory ${memoryPercent}% (threshold ${this.MEMORY_THRESHOLD}%), CPU ${cpuPercent}% (threshold ${this.CPU_THRESHOLD}%)`;
      const decision = this.makeDecision('degraded', reason, 'critical', trigger.type);
      this.activateTrigger('resource-exhaustion', decision.reason);

      if (this.eventBus) {
        try {
          this.eventBus.emit({
            type: 'safety.degraded',
            source: 'safety-circuit',
            payload: { memoryPercent, cpuPercent },
          }).catch(() => {});
        } catch {
          /* background */
        }
      }

      return decision;
    }

    return this.makeDecision(
      'allow',
      `Resources normal: memory ${memoryPercent}%, CPU ${cpuPercent}%`,
      'info',
      trigger.type,
    );
  }

  private evaluateUserOverride(trigger: TriggerEvent): SafetyDecision {
    const decision = this.makeDecision(
      'stop',
      trigger.details ?? 'User requested stop',
      'critical',
      trigger.type,
    );
    this.activateTrigger('user-override', decision.reason);
    return decision;
  }

  private makeDecision(
    action: SafetyAction,
    reason: string,
    severity: 'info' | 'warning' | 'critical',
    trigger?: TriggerType,
  ): SafetyDecision {
    const decision: SafetyDecision = {
      action,
      reason,
      severity,
      trigger,
      timestamp: new Date().toISOString(),
    };

    if (action !== 'allow') {
      this.mode = action as SafetyMode;
    }

    this.lastDecision = decision;
    return decision;
  }

  private activateTrigger(type: TriggerType, reason: string): void {
    const existing = this.activeTriggers.find(t => t.type === type);
    if (existing) {
      existing.reason = reason;
      existing.activatedAt = new Date().toISOString();
    } else {
      this.activeTriggers.push({
        type,
        reason,
        activatedAt: new Date().toISOString(),
      });
    }
  }

  getStatus(): SafetyStatus {
    const loopFixEntries: Record<string, { count: number; firstFix: string }> = {};
    for (const [file, data] of this.loopFixCount) {
      loopFixEntries[file] = {
        count: data.count,
        firstFix: new Date(data.firstFix).toISOString(),
      };
    }

    return {
      mode: this.mode,
      activeTriggers: this.activeTriggers.map(t => ({
        type: t.type,
        reason: t.reason,
        activatedAt: t.activatedAt,
      })),
      lastDecision: this.lastDecision,
      loopFixCount: loopFixEntries,
      coverageDrops: [...this.coverageHistory],
      breakageChainCount: this.breakageChain,
      resourceUsage: {
        memoryPercent: this.memoryPercent,
        cpuPercent: this.cpuPercent,
      },
    };
  }

  reset(triggerId?: string): void {
    if (triggerId) {
      const idx = this.activeTriggers.findIndex(t => t.type === triggerId);
      if (idx !== -1) {
        this.activeTriggers.splice(idx, 1);
      }
      if (triggerId === 'loop-detection') {
        this.loopFixCount.clear();
      }
      if (triggerId === 'regression-spike') {
        this.coverageHistory = [];
      }
      if (triggerId === 'breakage-chain') {
        this.breakageChain = 0;
      }
    } else {
      this.mode = 'normal';
      this.activeTriggers = [];
      this.loopFixCount.clear();
      this.coverageHistory = [];
      this.breakageChain = 0;
      this.lastDecision = null;
    }

    if (this.activeTriggers.length === 0 && !triggerId) {
      this.mode = 'normal';
    }
  }
}

export function createSafetyCircuit(eventBus?: EventBus, auditTrail?: AuditTrail): SafetyCircuit {
  return new SafetyCircuit(eventBus, auditTrail);
}
