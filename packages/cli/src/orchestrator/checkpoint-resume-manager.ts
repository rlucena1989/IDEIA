import { CheckpointEngine} from '@ideia/checkpoint-engine';
import { createLogger } from '@ideia/logger';
import type { ResumeState, Checkpoint, CheckpointType } from '@ideia/checkpoint-engine';
const logger = createLogger('checkpoint-resume-manager');

export class CheckpointResumeManager {
  private engine: CheckpointEngine;

  constructor() {
    this.engine = new CheckpointEngine();
  }

  async saveBeforeDestructive(taskId: string, action: string, snapshot: Record<string, unknown>): Promise<Checkpoint> {
    return this.engine.save(taskId, 'snapshot', {
      ...snapshot,
      action,
      savedAt: new Date().toISOString(),
    });
  }

  async saveMilestone(taskId: string, description: string, state: Record<string, unknown>): Promise<Checkpoint> {
    return this.engine.save(taskId, 'milestone', {
      ...state,
      description,
      savedAt: new Date().toISOString(),
    });
  }

  async savePlan(taskId: string, plan: Record<string, unknown>): Promise<Checkpoint> {
    return this.engine.save(taskId, 'plan', {
      ...plan,
      savedAt: new Date().toISOString(),
    }, undefined, {});
  }

  canResume(taskId: string): boolean {
    return this.engine.resumeManager.canResume(taskId);
  }

  resume(taskId: string, allSteps: string[]): ResumeState {
    return this.engine.resume(taskId, allSteps);
  }

  getLatest(taskId: string, type?: CheckpointType): Checkpoint | undefined {
    return this.engine.getLatest(taskId, type);
  }

  listCheckpoints(taskId: string): Array<{ id: string; type: CheckpointType; version: number; createdAt: string; description: string }> {
    return this.engine.listCheckpoints(taskId);
  }

  getResumePoint(taskId: string): { version: number; createdAt: string } | null {
    return this.engine.resumeManager.getResumePoint(taskId);
  }

  getEngine(): CheckpointEngine {
    return this.engine;
  }
}

export function createCheckpointResumeManager(): CheckpointResumeManager {
  return new CheckpointResumeManager();
}
