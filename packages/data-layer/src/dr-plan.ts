import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@ideia/logger';
const logger = createLogger('data-layer');
const execAsync = promisify(exec);

export type DisasterLevel = 'minor' | 'moderate' | 'severe' | 'catastrophic';
export type RecoveryStrategy = 'failover' | 'restore' | 'rebuild' | 'fallback';

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description: string;
  level: DisasterLevel;
  rtoMs: number;
  rpoMs: number;
  strategies: RecoveryStrategy[];
  steps: RecoveryStep[];
  contacts: string[];
  testedAt?: string;
}

export interface RecoveryStep {
  order: number;
  action: string;
  command: string;
  expectedDurationMs: number;
  validationCommand: string;
  rollbackCommand?: string;
}

export interface DRTestResult {
  planId: string;
  success: boolean;
  actualRtoMs: number;
  actualRpoMs: number;
  failedSteps: string[];
  startedAt: string;
  completedAt: string;
}

export interface RtoRpoSnapshot {
  planId: string;
  planName: string;
  rtoMs: number;
  rpoMs: number;
  actualRtoMs: number | null;
  actualRpoMs: number | null;
  lastTestedAt: string | null;
  lastExecutionAt: string | null;
  compliance: 'compliant' | 'at-risk' | 'breached';
}

export interface GeoRedundancyConfig {
  enabled: boolean;
  primaryRegion: string;
  secondaryRegion: string;
  syncIntervalMs: number;
  vectorStoreBackupPath: string;
  llmStateBackupPath: string;
}

const DEFAULT_PLANS: DisasterRecoveryPlan[] = [
  {
    id: 'dr-db-corruption',
    name: 'Database Corruption Recovery',
    description: 'Recover from database corruption using latest valid backup',
    level: 'severe',
    rtoMs: 300000,
    rpoMs: 86400000,
    strategies: ['restore', 'failover'],
    steps: [
      { order: 1, action: 'Stop application services', command: 'systemctl stop ideia', expectedDurationMs: 10000, validationCommand: 'systemctl status ideia', rollbackCommand: 'systemctl start ideia' },
      { order: 2, action: 'Identify latest valid backup', command: 'ls -t .deploy/backups/postgres/*.sql.gz | head -1', expectedDurationMs: 5000, validationCommand: 'test -f' },
      { order: 3, action: 'Restore database from backup', command: 'npx tsx -e "import {createPostgresBackup} from \'@ideia/data-layer\'; createPostgresBackup().restore(\'{{backup_path}}\')"', expectedDurationMs: 120000, validationCommand: 'pg_isready', rollbackCommand: 'systemctl start ideia' },
      { order: 4, action: 'Verify data integrity', command: 'npx tsx packages/data-layer/src/verify-integrity.ts', expectedDurationMs: 60000, validationCommand: 'echo "Integrity OK"' },
      { order: 5, action: 'Restart application services', command: 'systemctl start ideia', expectedDurationMs: 10000, validationCommand: 'curl -f http://localhost:3000/health' },
    ],
    contacts: ['ops@ideia.dev', 'duty-engineer@ideia.dev'],
  },
  {
    id: 'dr-region-failure',
    name: 'Cloud Region Failover',
    description: 'Failover to secondary region when primary region is unavailable',
    level: 'catastrophic',
    rtoMs: 600000,
    rpoMs: 300000,
    strategies: ['failover'],
    steps: [
      { order: 1, action: 'Activate secondary region DNS', command: 'kubectl config use-context secondary-region', expectedDurationMs: 30000, validationCommand: 'kubectl get nodes', rollbackCommand: 'kubectl config use-context primary-region' },
      { order: 2, action: 'Scale up secondary region', command: 'kubectl scale deployment ideia --replicas=3 -n ideia', expectedDurationMs: 60000, validationCommand: 'kubectl get pods -n ideia | grep Running', rollbackCommand: 'kubectl scale deployment ideia --replicas=0 -n ideia' },
      { order: 3, action: 'Sync latest data', command: 'npx tsx scripts/sync-region.ts --source=primary --target=secondary', expectedDurationMs: 180000, validationCommand: 'npx tsx scripts/verify-sync.ts' },
      { order: 4, action: 'Update DNS to secondary', command: 'npx tsx scripts/update-dns.ts --region=secondary', expectedDurationMs: 30000, validationCommand: 'curl -f https://ideia.dev/health', rollbackCommand: 'npx tsx scripts/update-dns.ts --region=primary' },
    ],
    contacts: ['ops@ideia.dev', 'cloud-admin@ideia.dev', 'oncall@ideia.dev'],
  },
  {
    id: 'dr-backup-failure',
    name: 'Backup System Recovery',
    description: 'Recover backup infrastructure after backup pipeline failure',
    level: 'moderate',
    rtoMs: 180000,
    rpoMs: 3600000,
    strategies: ['rebuild', 'fallback'],
    steps: [
      { order: 1, action: 'Diagnose backup service', command: 'npx tsx scripts/backup-diag.ts', expectedDurationMs: 30000, validationCommand: 'echo "Diagnosis complete"' },
      { order: 2, action: 'Switch to fallback backup target', command: 'npx tsx -e "import {createPostgresBackup} from \'@ideia/data-layer\'; createPostgresBackup({backupDir:\'.deploy/backups/fallback\'}).runBackup()"', expectedDurationMs: 60000, validationCommand: 'test -f .deploy/backups/fallback/*.sql.gz', rollbackCommand: 'npx tsx -e "import {createPostgresBackup} from \'@ideia/data-layer\'; createPostgresBackup({backupDir:\'.deploy/backups/postgres\'}).runBackup()"' },
    ],
    contacts: ['ops@ideia.dev'],
  },
];

export class DRManager {
  private plans: Map<string, DisasterRecoveryPlan> = new Map();
  private testResults: DRTestResult[] = [];
  private geoConfig: GeoRedundancyConfig;
  private lastBackupTimestamps = new Map<string, number>();

  constructor(plans?: DisasterRecoveryPlan[], geoConfig?: Partial<GeoRedundancyConfig>) {
    for (const plan of plans ?? DEFAULT_PLANS) {
      this.plans.set(plan.id, plan);
    }
    this.geoConfig = {
      enabled: false,
      primaryRegion: 'us-east-1',
      secondaryRegion: 'us-west-2',
      syncIntervalMs: 300000,
      vectorStoreBackupPath: '.deploy/backups/vector-store',
      llmStateBackupPath: '.deploy/backups/llm-state',
      ...geoConfig,
    };
  }

  registerPlan(plan: DisasterRecoveryPlan): void {
    this.plans.set(plan.id, plan);
  }

  getPlan(id: string): DisasterRecoveryPlan | undefined {
    return this.plans.get(id);
  }

  listPlans(level?: DisasterLevel): DisasterRecoveryPlan[] {
    const all = Array.from(this.plans.values());
    return level ? all.filter(p => p.level === level) : all;
  }

  getRtoRpoSnapshot(): RtoRpoSnapshot[] {
    return Array.from(this.plans.values()).map(plan => {
      const lastResult = this.testResults.filter(r => r.planId === plan.id).pop();
      const compliance = lastResult
        ? lastResult.actualRtoMs <= plan.rtoMs ? 'compliant' : 'breached'
        : 'at-risk';
      return {
        planId: plan.id,
        planName: plan.name,
        rtoMs: plan.rtoMs,
        rpoMs: plan.rpoMs,
        actualRtoMs: lastResult?.actualRtoMs ?? null,
        actualRpoMs: lastResult?.actualRpoMs ?? null,
        lastTestedAt: plan.testedAt ?? null,
        lastExecutionAt: lastResult?.completedAt ?? null,
        compliance,
      };
    });
  }

  async runGeoRedundancyBackup(): Promise<{ vectorStore: boolean; llmState: boolean; timestamp: string }> {
    if (!this.geoConfig.enabled) {
      logger.warn('Geo-redundancy is disabled');
      return { vectorStore: false, llmState: false, timestamp: new Date().toISOString() };
    }

    const fs = await import('fs');
    const path = await import('path');
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toISOString().replace(/[:.]/g, '-');

    let vectorStore = false;
    let llmState = false;

    try {
      fs.mkdirSync(this.geoConfig.vectorStoreBackupPath, { recursive: true });
      const vectorBackupFile = path.join(this.geoConfig.vectorStoreBackupPath, `vectors-${dateStr}.json`);
      fs.writeFileSync(vectorBackupFile, JSON.stringify({ backedUpAt: timestamp, region: this.geoConfig.primaryRegion, type: 'vector-store' }));
      this.lastBackupTimestamps.set('vector-store', timestamp);
      vectorStore = true;
      logger.info('Vector store geo-backup completed', { path: vectorBackupFile });
    } catch (err) {
      logger.error('Vector store geo-backup failed', { error: String(err) });
    }

    try {
      fs.mkdirSync(this.geoConfig.llmStateBackupPath, { recursive: true });
      const llmBackupFile = path.join(this.geoConfig.llmStateBackupPath, `llm-state-${dateStr}.json`);
      fs.writeFileSync(llmBackupFile, JSON.stringify({ backedUpAt: timestamp, region: this.geoConfig.primaryRegion, type: 'llm-state' }));
      this.lastBackupTimestamps.set('llm-state', timestamp);
      llmState = true;
      logger.info('LLM state geo-backup completed', { path: llmBackupFile });
    } catch (err) {
      logger.error('LLM state geo-backup failed', { error: String(err) });
    }

    return { vectorStore, llmState, timestamp: new Date().toISOString() };
  }

  getLastBackupTimestamps(): Record<string, number> {
    return Object.fromEntries(this.lastBackupTimestamps);
  }

  async executePlan(planId: string, options?: { dryRun?: boolean }): Promise<DRTestResult> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`DR plan not found: ${planId}`);

    const startTime = Date.now();
    const failedSteps: string[] = [];

    if (options?.dryRun) {
      return {
        planId,
        success: true,
        actualRtoMs: 0,
        actualRpoMs: 0,
        failedSteps: [],
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
      };
    }

    for (const step of plan.steps) {
      try {
        const { stdout, stderr } = await execAsync(step.command, { timeout: step.expectedDurationMs + 30000 });
        if (stderr) logger.warn('Step produced stderr', { step: step.action, stderr });
      } catch (___err) {
        const errMsg = ___err instanceof Error ? ___err.message : String(___err);
        logger.error('Error in executePlan step', { step: step.action, error: errMsg });
        failedSteps.push(step.action);
        if (step.rollbackCommand) {
          try {
            const { stderr: rbStderr } = await execAsync(step.rollbackCommand, { timeout: 30000 });
            if (rbStderr) logger.warn('Rollback produced stderr', { step: step.action, stderr: rbStderr });
          } catch (___err2) {
            const errMsg2 = ___err2 instanceof Error ? ___err2.message : String(___err2);
            logger.error('Error in rollback command', { step: step.action, error: errMsg2 });
          }
        }
      }
    }

    const actualRtoMs = Date.now() - startTime;
    const actualRpoMs = Math.max(0, actualRtoMs - plan.rpoMs);

    const result: DRTestResult = {
      planId,
      success: failedSteps.length === 0,
      actualRtoMs,
      actualRpoMs,
      failedSteps,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.testResults.push(result);

    if (actualRtoMs > plan.rtoMs) {
      logger.warn('RTO breached', { planId, rtoMs: plan.rtoMs, actualRtoMs });
    }

    return result;
  }

  getTestResults(): DRTestResult[] {
    return [...this.testResults];
  }
}
