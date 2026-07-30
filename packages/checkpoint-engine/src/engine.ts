import { CheckpointStore } from './store';
import { createLogger } from '@ideia/logger';
import { ResumeManager } from './resume';
import { Checkpoint, CheckpointType, ResumeState } from './types';
const logger = createLogger('engine');

export class CheckpointEngine {
  readonly store: CheckpointStore;
  readonly resumeManager: ResumeManager;

  constructor() {
    this.store = new CheckpointStore();
    this.resumeManager = new ResumeManager(this.store);
  }

  save(taskId: string, type: CheckpointType, snapshot: Record<string, unknown>, parentId?: string, diff?: Record<string, unknown>): Checkpoint {
    return this.store.save(taskId, type, snapshot, parentId, diff);
  }

  getLatest(taskId: string, type?: CheckpointType): Checkpoint | undefined {
    return this.store.getLatest(taskId, type);
  }

  resume(taskId: string, allSteps: string[]): ResumeState {
    return this.resumeManager.buildResumeState(taskId, allSteps);
  }

  listCheckpoints(taskId: string): Array<{ id: string; type: CheckpointType; version: number; createdAt: string; description: string }> {
    return this.store.listByTask(taskId);
  }
}

export function createCheckpointEngine(): CheckpointEngine {
  return new CheckpointEngine();
}
