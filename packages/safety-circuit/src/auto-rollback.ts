import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { AuditTrail } from '@ideia/audit-trail';
const logger = createLogger('auto-rollback');

export interface RollbackTriggerEvent {
  type: 'throughput-drop' | 'error-rise' | 'latency-double';
  currentValue: number;
  previousValue: number;
  threshold: number;
}

export interface RollbackActionResult {
  id: string;
  timestamp: string;
  trigger: RollbackTriggerEvent | null;
  action: 'reverted' | 'notified' | 'ignored';
  reason: string;
}

export class AutoRollbackCircuit {
  private auditTrail?: AuditTrail;
  private previousMetrics: { throughput: number; errorRate: number; latency: number } | null = null;
  private history: RollbackActionResult[] = [];

  constructor(auditTrail?: AuditTrail) {
    this.auditTrail = auditTrail;
  }

  evaluate(throughput: number, errorRate: number, latency: number): RollbackActionResult {
    const prev = this.previousMetrics;
    this.previousMetrics = { throughput, errorRate, latency };

    if (!prev) {
      const result: RollbackActionResult = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        trigger: null,
        action: 'ignored',
        reason: 'Baseline measurement',
      };
      this.history.push(result);
      return result;
    }

    const throughputDrop = prev.throughput > 0 ? ((prev.throughput - throughput) / prev.throughput) * 100 : 0;
    const errorRise = errorRate - prev.errorRate;
    const latencyRatio = prev.latency > 0 ? latency / prev.latency : 0;

    let trigger: RollbackTriggerEvent | null = null;
    let action: 'reverted' | 'notified' | 'ignored' = 'ignored';
    let reason = 'No anomaly detected';

    if (throughputDrop > 20) {
      trigger = { type: 'throughput-drop', currentValue: throughput, previousValue: prev.throughput, threshold: 20 };
      action = 'reverted';
      reason = `Throughput dropped ${throughputDrop.toFixed(1)}% (>20%) — auto-reverting`;
    } else if (errorRise > 5) {
      trigger = { type: 'error-rise', currentValue: errorRate, previousValue: prev.errorRate, threshold: 5 };
      action = 'notified';
      reason = `Error rate rose ${errorRise.toFixed(1)}% (>5%) — notifying`;
    } else if (latencyRatio > 2) {
      trigger = { type: 'latency-double', currentValue: latency, previousValue: prev.latency, threshold: 2 };
      action = 'notified';
      reason = `Latency ${latencyRatio.toFixed(1)}x (>2x) — notifying`;
    }

    const result: RollbackActionResult = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      trigger,
      action,
      reason,
    };
    this.history.push(result);

    if (this.auditTrail) {
      this.auditTrail.append({
        actor: 'system',
        eventType: `auto-rollback.${trigger?.type ?? 'none'}`,
        target: 'auto-rollback-circuit',
        decision: action === 'reverted' ? 'rejected' : 'approved',
        result: 'success',
        metadata: { trigger, action, reason },
      });
    }

    return result;
  }

  getHistory(): RollbackActionResult[] {
    return [...this.history];
  }
}

export function createAutoRollbackCircuit(auditTrail?: AuditTrail): AutoRollbackCircuit {
  return new AutoRollbackCircuit(auditTrail);
}
