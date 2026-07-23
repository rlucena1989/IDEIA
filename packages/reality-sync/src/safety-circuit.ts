import { EventEmitter } from 'node:events';

export interface TriggerStatus {
  loopDetection: { active: boolean; count: number; lastTriggered: number | null };
  regressionSpike: { active: boolean; coverageDrop: number; lastTriggered: number | null };
  breakageChain: { active: boolean; brokenContracts: number; lastTriggered: number | null };
  resourceLimit: { active: boolean; memoryPercent: number; cpuPercent: number; lastTriggered: number | null };
  userOverride: { active: boolean; reason: string | null; lastTriggered: number | null };
}

export interface RollbackPoint {
  id: string;
  timestamp: number;
  description: string;
  snapshot: Record<string, unknown>;
}

type TriggerName = 'loopDetection' | 'regressionSpike' | 'breakageChain' | 'resourceLimit' | 'userOverride';

export class SafetyCircuit extends EventEmitter {
  private loopFixCounts: Map<string, { count: number; firstSeen: number }> = new Map();
  private triggerStatus: TriggerStatus = {
    loopDetection: { active: false, count: 0, lastTriggered: null },
    regressionSpike: { active: false, coverageDrop: 0, lastTriggered: null },
    breakageChain: { active: false, brokenContracts: 0, lastTriggered: null },
    resourceLimit: { active: false, memoryPercent: 0, cpuPercent: 0, lastTriggered: null },
    userOverride: { active: false, reason: null, lastTriggered: null },
  };
  private rollbackPoints: RollbackPoint[] = [];
  private paused = false;
  private stopped = false;

  private log(msg: string): void {
    console.log(`[SafetyCircuit] ${msg}`);
  }

  check(): { tripped: boolean; activeTriggers: TriggerName[] } {
    this.checkLoopDetection();
    this.checkRegressionSpike();
    this.checkBreakageChain();
    this.checkResourceLimit();

    const activeTriggers = (Object.entries(this.triggerStatus) as [TriggerName, { active: boolean }][])
      .filter(([, v]) => v.active)
      .map(([k]) => k);

    return { tripped: activeTriggers.length > 0, activeTriggers };
  }

  private checkLoopDetection(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    let totalFixes = 0;
    for (const [, entry] of this.loopFixCounts) {
      if (now - entry.firstSeen < oneHour) totalFixes += entry.count;
    }
    if (totalFixes > 5) {
      this.trip('loopDetection');
    }
  }

  private checkRegressionSpike(): void {
    if (this.triggerStatus.regressionSpike.coverageDrop > 5) {
      this.trip('regressionSpike');
    }
  }

  private checkBreakageChain(): void {
    if (this.triggerStatus.breakageChain.brokenContracts >= 3) {
      this.trip('breakageChain');
    }
  }

  private checkResourceLimit(): void {
    if (this.triggerStatus.resourceLimit.memoryPercent > 80 || this.triggerStatus.resourceLimit.cpuPercent > 90) {
      this.trip('resourceLimit');
    }
  }

  trip(trigger: TriggerName): void {
    const prev = this.triggerStatus[trigger];
    if (prev.active) return;

    (prev as Record<string, unknown>).active = true;
    (prev as Record<string, unknown>).lastTriggered = Date.now();
    this.log(`Circuit tripped: ${trigger}`);
    this.emit('tripped', { trigger, timestamp: Date.now() });
  }

  reset(trigger?: TriggerName): void {
    if (trigger) {
      const t = this.triggerStatus[trigger];
      if ('active' in t) (t as Record<string, unknown>).active = false;
      this.log(`Reset trigger: ${trigger}`);
    } else {
      for (const key of Object.keys(this.triggerStatus) as TriggerName[]) {
        const t = this.triggerStatus[key];
        if ('active' in t) (t as Record<string, unknown>).active = false;
      }
      this.loopFixCounts.clear();
      this.paused = false;
      this.stopped = false;
      this.log('All triggers reset');
    }
    this.emit('reset', { trigger: trigger ?? 'all', timestamp: Date.now() });
  }

  getStatus(): TriggerStatus {
    return { ...this.triggerStatus };
  }

  recordFix(filePath: string): void {
    const now = Date.now();
    const existing = this.loopFixCounts.get(filePath);
    if (existing && now - existing.firstSeen < 60 * 60 * 1000) {
      existing.count++;
    } else {
      this.loopFixCounts.set(filePath, { count: 1, firstSeen: now });
    }
    this.checkLoopDetection();
  }

  setCoverageDrop(dropPercent: number): void {
    this.triggerStatus.regressionSpike.coverageDrop = dropPercent;
    this.checkRegressionSpike();
  }

  recordBrokenContract(): void {
    this.triggerStatus.breakageChain.brokenContracts++;
    this.checkBreakageChain();
  }

  setResourceUsage(memoryPercent: number, cpuPercent: number): void {
    this.triggerStatus.resourceLimit.memoryPercent = memoryPercent;
    this.triggerStatus.resourceLimit.cpuPercent = cpuPercent;
    this.checkResourceLimit();
  }

  userOverride(reason: string): void {
    this.triggerStatus.userOverride = {
      active: true,
      reason,
      lastTriggered: Date.now(),
    };
    this.emit('warning', { message: `User override: ${reason}`, timestamp: Date.now() });
  }

  emergencyStop(): void {
    this.stopped = true;
    this.paused = false;
    this.log('EMERGENCY STOP activated');
    this.emit('tripped', { trigger: 'userOverride', type: 'emergencyStop', timestamp: Date.now() });
  }

  emergencyPause(): void {
    this.paused = true;
    this.stopped = false;
    this.log('EMERGENCY PAUSE activated');
    this.emit('warning', { type: 'emergencyPause', timestamp: Date.now() });
  }

  emergencyRollback(pointId: string): RollbackPoint | null {
    const point = this.rollbackPoints.find(p => p.id === pointId);
    if (!point) {
      this.log(`Rollback point not found: ${pointId}`);
      return null;
    }
    this.log(`Rolling back to point: ${pointId} — ${point.description}`);
    this.emit('warning', { type: 'emergencyRollback', pointId, timestamp: Date.now() });
    return point;
  }

  saveRollbackPoint(description: string, snapshot: Record<string, unknown>): RollbackPoint {
    const point: RollbackPoint = {
      id: `rp_${Date.now()}`,
      timestamp: Date.now(),
      description,
      snapshot,
    };
    this.rollbackPoints.push(point);
    if (this.rollbackPoints.length > 50) this.rollbackPoints.shift();
    return point;
  }

  getRollbackPoints(): RollbackPoint[] {
    return [...this.rollbackPoints];
  }

  isPaused(): boolean { return this.paused; }
  isStopped(): boolean { return this.stopped; }
}
