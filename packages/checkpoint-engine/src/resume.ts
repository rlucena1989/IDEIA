import { Checkpoint, ResumeState } from './types';
import { CheckpointStore } from './store';

export class ResumeManager {
  constructor(private store: CheckpointStore) {}

  buildResumeState(taskId: string, allSteps: string[]): ResumeState {
    const lastCp = this.store.getLatest(taskId);
    const completedSteps: string[] = [];
    const pendingSteps: string[] = [...allSteps];

    if (lastCp) {
      const savedCompleted = lastCp.snapshot.completedSteps as string[] | undefined;
      if (savedCompleted) {
        completedSteps.push(...savedCompleted);
        for (const step of savedCompleted) {
          const idx = pendingSteps.indexOf(step);
          if (idx >= 0) pendingSteps.splice(idx, 1);
        }
      }
    }

    return {
      lastCheckpoint: lastCp ?? null,
      resumedFrom: lastCp ? `checkpoint_${lastCp.version}` : 'start',
      pendingSteps,
      completedSteps,
      context: lastCp?.snapshot as Record<string, unknown> ?? {},
    };
  }

  canResume(taskId: string): boolean {
    return this.store.getLatest(taskId) !== undefined;
  }

  getResumePoint(taskId: string): { version: number; createdAt: string } | null {
    const cp = this.store.getLatest(taskId);
    return cp ? { version: cp.version, createdAt: cp.createdAt } : null;
  }
}
