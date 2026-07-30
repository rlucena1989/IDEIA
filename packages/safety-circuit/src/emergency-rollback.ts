import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@ideia/logger';
import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { RollbackCheckpoint, RollbackResult } from './types';

const logger = createLogger('emergency-rollback');

export class EmergencyRollback {
  private checkpointDir: string;
  private bus?: EventBus;
  private audit?: AuditTrail;
  private runningTasks = new Set<string>();

  constructor(bus?: EventBus, audit?: AuditTrail, checkpointDir?: string) {
    this.bus = bus;
    this.audit = audit;
    this.checkpointDir = checkpointDir ?? path.join(process.cwd(), '.ideia', 'checkpoints');
    fs.mkdirSync(this.checkpointDir, { recursive: true });
  }

  async rollbackToLastStable(): Promise<RollbackResult> {
    const checkpoints = this.listCheckpoints();
    if (checkpoints.length === 0) {
      return { success: false, checkpointId: '', restoredAt: new Date().toISOString(), errors: ['No checkpoints available'] };
    }
    const latest = checkpoints.sort((a, b) => b.timestamp - a.timestamp)[0];
    return this.rollbackToCheckpoint(latest.id);
  }

  async rollbackToCheckpoint(checkpointId: string): Promise<RollbackResult> {
    const errors: string[] = [];
    try {
      logger.info(`Starting rollback to checkpoint ${checkpointId}`);
      await this.cancelRunningTasks();
      const snapshot = this.loadCheckpoint(checkpointId);
      if (!snapshot) {
        return { success: false, checkpointId, restoredAt: new Date().toISOString(), errors: [`Checkpoint ${checkpointId} not found`] };
      }
      const revertErrors = await this.revertChanges(snapshot);
      errors.push(...revertErrors);
      this.audit?.append({
        actor: 'system', eventType: 'emergency.rollback', target: `checkpoint/${checkpointId}`,
        decision: 'rejected', result: errors.length === 0 ? 'success' : 'failure',
        metadata: { checkpointId, errors },
      });
      await this.bus?.emit({
        type: 'safety.rollback.completed', source: 'emergency-rollback',
        payload: { checkpointId, success: errors.length === 0, errors },
      });
      logger.info(`Rollback ${errors.length === 0 ? 'succeeded' : 'completed with errors'} for ${checkpointId}`);
      return { success: errors.length === 0, checkpointId, restoredAt: new Date().toISOString(), errors };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      return { success: false, checkpointId, restoredAt: new Date().toISOString(), errors };
    }
  }

  async createCheckpoint(label: string): Promise<RollbackCheckpoint> {
    const id = `ckpt-${Date.now()}`;
    const checkpoint: RollbackCheckpoint = { id, timestamp: Date.now(), label, snapshot: this.captureSnapshot() };
    fs.writeFileSync(path.join(this.checkpointDir, `${id}.json`), JSON.stringify(checkpoint, null, 2));
    logger.info(`Checkpoint ${id} created: ${label}`);
    return checkpoint;
  }

  registerTask(taskId: string): void { this.runningTasks.add(taskId); }
  unregisterTask(taskId: string): void { this.runningTasks.delete(taskId); }

  private listCheckpoints(): RollbackCheckpoint[] {
    if (!fs.existsSync(this.checkpointDir)) return [];
    return fs.readdirSync(this.checkpointDir).filter(f => f.endsWith('.json')).map(file => {
      try { return JSON.parse(fs.readFileSync(path.join(this.checkpointDir, file), 'utf-8')) as RollbackCheckpoint; }
      catch { return null; }
    }).filter((c): c is RollbackCheckpoint => c !== null);
  }

  private loadCheckpoint(checkpointId: string): RollbackCheckpoint | null {
    const filePath = path.join(this.checkpointDir, `${checkpointId}.json`);
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RollbackCheckpoint; }
    catch { return null; }
  }

  private async cancelRunningTasks(): Promise<void> {
    for (const taskId of this.runningTasks) {
      logger.info(`Cancelling task ${taskId}`);
      await this.bus?.emit({ type: 'task.cancel', source: 'emergency-rollback', payload: { taskId } });
    }
    this.runningTasks.clear();
  }

  private async revertChanges(snapshot: RollbackCheckpoint): Promise<string[]> {
    const errors: string[] = [];
    for (const [key, value] of Object.entries(snapshot.snapshot)) {
      try {
        logger.debug(`Reverting ${key} to previous state`);
        if (typeof value === 'string' && value.startsWith('{')) {
          const parsed = JSON.parse(value) as Record<string, unknown>;
          if (parsed.path && parsed.content) {
            fs.writeFileSync(parsed.path as string, parsed.content as string, 'utf-8');
          }
        }
      } catch (err) {
        errors.push(`Failed to revert ${key}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return errors;
  }

  private captureSnapshot(): Record<string, unknown> {
    return {
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
    };
  }
}
