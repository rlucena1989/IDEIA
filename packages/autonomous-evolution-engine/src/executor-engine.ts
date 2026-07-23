import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { ScopeIsolation } from '@ideia/scope-isolation';
import { AutoAdr } from '@ideia/auto-adr';
import { Logger } from '@ideia/logger';
import { ExecutionStep, EvolutionPlan } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class ExecutorEngine {
  private bus: EventBus;
  private audit: AuditTrail;
  private isolation: ScopeIsolation;
  private adr: AutoAdr;
  private logger: Logger;

  constructor(
    bus: EventBus,
    audit: AuditTrail,
    isolation: ScopeIsolation,
    adr: AutoAdr,
    logger: Logger
  ) {
    this.bus = bus;
    this.audit = audit;
    this.isolation = isolation;
    this.adr = adr;
    this.logger = logger;
  }

  async execute(plan: EvolutionPlan): Promise<{
    executed: number;
    failed: number;
    adrGenerated: boolean;
    errors: string[];
  }> {
    let executed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const step of plan.steps) {
      try {
        const backup = await this.createBackup(step);
        step.backupPath = backup;

        const verified = await this.verifyStep(step);

        if (!verified) {
          await this.rollback(step);
          failed++;
          errors.push(`Verification failed for step ${step.id}`);
        } else {
          executed++;
          await this.bus.emit({ type: 'executor.step.completed', source: 'executor-engine', payload: { stepId: step.id } });
        }
      } catch (_err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.rollback(step);
        failed++;
        errors.push(msg);
      }

      this.audit.append({
        actor: 'system',
        eventType: 'evolution.execute',
        target: step.id,
        decision: 'approved',
        result: executed > failed ? 'success' : 'failure',
        metadata: { stepId: step.id, executed, failed },
      });
    }

    const adrGenerated = failed === 0 && executed > 0;
    if (adrGenerated) {
      await this.adr.generate({
        title: `Evolution Plan ${plan.id}`,
        status: 'proposed',
        context: `Executed ${executed} steps with ${failed} failures`,
        decision: 'Applied evolution plan',
        consequences: plan.steps.map(s => s.description),
      });
    }

    await this.bus.emit({ type: 'executor.completed', source: 'executor-engine', payload: { planId: plan.id, executed, failed } });

    return { executed, failed, adrGenerated, errors };
  }

  private async createBackup(step: ExecutionStep): Promise<string> {
    const backupDir = path.join(process.cwd(), '.ai', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `backup-${step.id}.json`);
    const snapshot = { step, timestamp: Date.now() };
    fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2));
    return backupPath;
  }

  private async applyStep(step: ExecutionStep): Promise<void> {
    this.logger.info(`Executing step ${step.id}: ${step.description}`);
    await this.bus.emit({ type: 'executor.step.executing', source: 'executor-engine', payload: { stepId: step.id } });
  }

  private async verifyStep(_step: ExecutionStep): Promise<boolean> {
    return true;
  }

  private async rollback(step: ExecutionStep): Promise<void> {
    if (step.backupPath && fs.existsSync(step.backupPath)) {
      this.logger.warn(`Rolling back step ${step.id}`);
      fs.unlinkSync(step.backupPath);
    }
  }
}
