import { createLogger } from '@ideia/logger';

const logger = createLogger('data-layer:retention');

export interface RetentionPolicyRule {
  type: string;
  maxAgeDays: number;
  action: 'delete' | 'archive';
}

const DEFAULT_POLICIES: RetentionPolicyRule[] = [
  { type: 'code', maxAgeDays: Infinity, action: 'archive' },
  { type: 'logs', maxAgeDays: 90, action: 'delete' },
  { type: 'cache', maxAgeDays: 7, action: 'delete' },
  { type: 'telemetry', maxAgeDays: 30, action: 'delete' },
  { type: 'backups', maxAgeDays: 365, action: 'archive' },
];

export class RetentionPolicy {
  private policies: Map<string, RetentionPolicyRule>;

  constructor(policies?: RetentionPolicyRule[]) {
    this.policies = new Map();
    const defaults = policies ?? DEFAULT_POLICIES;
    for (const p of defaults) {
      this.policies.set(p.type, p);
    }
  }

  definePolicy(type: string, maxAgeDays: number, action: 'delete' | 'archive'): void {
    this.policies.set(type, { type, maxAgeDays, action });
    logger.info(`Policy defined: ${type} -> ${maxAgeDays}d, action=${action}`);
  }

  getPolicy(type: string): RetentionPolicyRule | undefined {
    return this.policies.get(type);
  }

  applyPolicies(data: Map<string, unknown[]>): Map<string, unknown[]> {
    const result = new Map<string, unknown[]>();
    const now = Date.now();

    for (const [type, records] of data) {
      const policy = this.policies.get(type);
      if (!policy) {
        result.set(type, records);
        continue;
      }

      if (policy.maxAgeDays === Infinity || !Number.isFinite(policy.maxAgeDays)) {
        result.set(type, records);
        continue;
      }

      const cutoffMs = policy.maxAgeDays * 86400000;
      const retained: unknown[] = [];

      for (const record of records) {
        if (typeof record === 'object' && record !== null) {
          const ts = (record as Record<string, unknown>).timestamp ?? (record as Record<string, unknown>).createdAt;
          if (ts) {
            const recordTime = new Date(ts as string).getTime();
            if (Number.isNaN(recordTime) || now - recordTime <= cutoffMs) {
              retained.push(record);
            }
          } else {
            retained.push(record);
          }
        } else {
          retained.push(record);
        }
      }

      logger.info(`Policy applied: ${type} -> ${records.length - retained.length} removed, ${retained.length} retained`);
      result.set(type, retained);
    }

    return result;
  }
}
