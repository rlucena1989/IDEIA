import { createLogger } from '@ideia/logger';
import type { DatabaseAdapter } from './types';

const logger = createLogger('data-layer:tiered-retention');

export type DataTier = 'hot' | 'warm' | 'cold' | 'frozen';
export type TierAction = 'delete' | 'archive' | 'compress' | 'anonymize' | 'summarize';

export interface TierPolicy {
  tier: DataTier;
  maxAgeDays: number;
  action: TierAction;
  storageClass?: string;
  compressThresholdMb?: number;
}

export interface DataCategoryPolicy {
  category: string;
  tiers: TierPolicy[];
  table: string;
  dateColumn: string;
  description?: string;
}

export interface TierTransitionEvent {
  category: string;
  recordDate: Date;
  fromTier: DataTier;
  toTier: DataTier;
  count: number;
  timestamp: string;
}

export const DEFAULT_TIER_POLICIES: TierPolicy[] = [
  { tier: 'hot', maxAgeDays: 7, action: 'archive', compressThresholdMb: 100 },
  { tier: 'warm', maxAgeDays: 30, action: 'archive', storageClass: 'standard', compressThresholdMb: 200 },
  { tier: 'cold', maxAgeDays: 365, action: 'compress', storageClass: 'nearline' },
  { tier: 'frozen', maxAgeDays: 730, action: 'anonymize', storageClass: 'coldline' },
];

export const CATEGORY_CONFIGS: DataCategoryPolicy[] = [
  { category: 'audit_logs', tiers: [
    { tier: 'hot', maxAgeDays: 7, action: 'archive' },
    { tier: 'warm', maxAgeDays: 90, action: 'archive' },
    { tier: 'cold', maxAgeDays: 365, action: 'compress' },
    { tier: 'frozen', maxAgeDays: 730, action: 'anonymize' },
  ], table: 'ideia_audit_log', dateColumn: 'created_at' },
  { category: 'chat_history', tiers: [
    { tier: 'hot', maxAgeDays: 30, action: 'archive' },
    { tier: 'warm', maxAgeDays: 90, action: 'summarize' },
    { tier: 'cold', maxAgeDays: 365, action: 'anonymize' },
    { tier: 'frozen', maxAgeDays: 730, action: 'delete' },
  ], table: 'ideia_memory', dateColumn: 'created_at' },
  { category: 'telemetry', tiers: [
    { tier: 'hot', maxAgeDays: 1, action: 'archive' },
    { tier: 'warm', maxAgeDays: 14, action: 'compress' },
    { tier: 'cold', maxAgeDays: 90, action: 'delete' },
    { tier: 'frozen', maxAgeDays: 365, action: 'delete' },
  ], table: 'ideia_metrics', dateColumn: 'created_at' },
  { category: 'code_artifacts', tiers: [
    { tier: 'hot', maxAgeDays: 90, action: 'archive' },
    { tier: 'warm', maxAgeDays: 365, action: 'archive' },
    { tier: 'cold', maxAgeDays: 1095, action: 'compress' },
    { tier: 'frozen', maxAgeDays: 3650, action: 'anonymize' },
  ], table: 'ideia_decisions', dateColumn: 'created_at' },
];

const VALID_TIER_TABLES = new Set([
  'ideia_audit_log', 'ideia_memory', 'ideia_metrics', 'ideia_decisions',
]);

const VALID_TIER_COLUMNS = new Set([
  'created_at', 'content', 'metadata', 'summary', 'context',
]);

function validateTierIdentifier(name: string, validSet: Set<string>, context: string): string {
  if (!validSet.has(name)) {
    throw new Error(`SQL injection prevention: invalid tier ${context} "${name}". Must be one of: [${[...validSet].join(', ')}]`);
  }
  return name;
}

export class TieredRetentionEngine {
  private categoryPolicies: DataCategoryPolicy[];
  private transitionLog: TierTransitionEvent[] = [];
  private adapter: DatabaseAdapter | null;

  constructor(
    categoryPolicies?: DataCategoryPolicy[],
    adapter?: DatabaseAdapter,
  ) {
    this.categoryPolicies = categoryPolicies ?? CATEGORY_CONFIGS;
    this.adapter = adapter ?? null;
  }

  setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;
  }

  getPolicy(category: string): DataCategoryPolicy | undefined {
    return this.categoryPolicies.find(p => p.category === category);
  }

  addOrUpdatePolicy(policy: DataCategoryPolicy): void {
    if (policy.table) validateTierIdentifier(policy.table, VALID_TIER_TABLES, 'table');
    if (policy.dateColumn) validateTierIdentifier(policy.dateColumn, VALID_TIER_COLUMNS, 'column');
    const idx = this.categoryPolicies.findIndex(p => p.category === policy.category);
    if (idx >= 0) this.categoryPolicies[idx] = policy;
    else this.categoryPolicies.push(policy);
  }

  getCurrentTier(category: string, recordDate: Date): DataTier {
    const policy = this.getPolicy(category);
    if (!policy) return 'hot';
    const ageDays = (Date.now() - recordDate.getTime()) / 86400000;
    for (const tier of [...policy.tiers].reverse()) {
      if (ageDays >= tier.maxAgeDays) return tier.tier;
    }
    return 'hot';
  }

  getTargetTier(category: string, recordDate: Date): { current: DataTier; target: DataTier; action?: TierAction } {
    const current = this.getCurrentTier(category, recordDate);
    const policy = this.getPolicy(category);
    if (!policy) return { current, target: current };

    const ageDays = (Date.now() - recordDate.getTime()) / 86400000;
    let target: DataTier = 'hot';
    let action: TierAction = 'archive';

    for (const tier of policy.tiers) {
      if (ageDays >= tier.maxAgeDays) {
        target = tier.tier;
        action = tier.action;
      } else {
        break;
      }
    }

    return { current, target, action: current !== target ? action : undefined };
  }

  async enforceTransitions(category: string): Promise<TierTransitionEvent[]> {
    const policy = this.getPolicy(category);
    if (!policy || !this.adapter) return [];

    const events: TierTransitionEvent[] = [];

    for (let i = 0; i < policy.tiers.length; i++) {
      const tier = policy.tiers[i];
      const nextTier = policy.tiers[i + 1];
      if (!nextTier) continue;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - tier.maxAgeDays);

      const table = validateTierIdentifier(policy.table, VALID_TIER_TABLES, 'table');
      const dateColumn = validateTierIdentifier(policy.dateColumn, VALID_TIER_COLUMNS, 'column');
      const contentCol = validateTierIdentifier('content', VALID_TIER_COLUMNS, 'column');
      const metadataCol = validateTierIdentifier('metadata', VALID_TIER_COLUMNS, 'column');

      try {
        const countResult = await this.adapter.query(
          `SELECT COUNT(*) as cnt FROM ${table} WHERE ${dateColumn} < ?`,
          [cutoff.toISOString()],
        );
        const count = Number((countResult.rows[0] as Record<string, unknown>)?.cnt ?? 0);

        if (count > 0) {
          const event: TierTransitionEvent = {
            category,
            recordDate: cutoff,
            fromTier: tier.tier,
            toTier: nextTier.tier,
            count,
            timestamp: new Date().toISOString(),
          };
          events.push(event);
          this.transitionLog.push(event);

          switch (nextTier.action) {
            case 'delete':
              await this.adapter.query(
                `DELETE FROM ${table} WHERE ${dateColumn} < ?`,
                [cutoff.toISOString()],
              );
              break;
            case 'anonymize':
              await this.adapter.query(
                `UPDATE ${table} SET ${contentCol} = '[anonymized]', ${metadataCol} = '{"anonymized":true}' WHERE ${dateColumn} < ?`,
                [cutoff.toISOString()],
              );
              break;
            case 'compress':
              break;
            default:
              break;
          }

          logger.info('Tier transition enforced', {
            category,
            from: tier.tier,
            to: nextTier.tier,
            count,
          });
        }
      } catch (err) {
        logger.error('Tier transition failed', { category, from: tier.tier, error: String(err) });
      }
    }

    return events;
  }

  async enforceAll(): Promise<TierTransitionEvent[]> {
    const all: TierTransitionEvent[] = [];
    for (const policy of this.categoryPolicies) {
      const events = await this.enforceTransitions(policy.category);
      all.push(...events);
    }
    return all;
  }

  getTransitionLog(category?: string): TierTransitionEvent[] {
    if (category) return this.transitionLog.filter(e => e.category === category);
    return [...this.transitionLog];
  }
}
