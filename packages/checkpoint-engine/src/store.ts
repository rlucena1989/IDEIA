import { Checkpoint, CheckpointType, CheckpointStatus, CheckpointSummary } from './types';
import { createLogger } from '@ideia/logger';
import { randomUUID } from 'crypto';

export class CheckpointStore {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private taskIndex: Map<string, string[]> = new Map();

  save(taskId: string, type: CheckpointType, snapshot: Record<string, unknown>, parentId?: string, diff?: Record<string, unknown>): Checkpoint {
    const version = (this.taskIndex.get(taskId)?.length ?? 0) + 1;
    const checkpoint: Checkpoint = {
      id: randomUUID(),
      taskId,
      type,
      version,
      snapshot,
      diff,
      parentId,
      status: 'active',
      createdAt: new Date().toISOString(),
      metadata: { version, parentId: parentId ?? null },
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    const existing = this.taskIndex.get(taskId) ?? [];
    existing.push(checkpoint.id);
    this.taskIndex.set(taskId, existing);

    return { ...checkpoint };
  }

  get(id: string): Checkpoint | undefined {
    const cp = this.checkpoints.get(id);
    return cp ? { ...cp } : undefined;
  }

  getLatest(taskId: string, type?: CheckpointType): Checkpoint | undefined {
    const ids = this.taskIndex.get(taskId) ?? [];
    for (let i = ids.length - 1; i >= 0; i--) {
      const cp = this.checkpoints.get(ids[i]);
      if (cp && (!type || cp.type === type)) return { ...cp };
    }
    return undefined;
  }

  listByTask(taskId: string): CheckpointSummary[] {
    const ids = this.taskIndex.get(taskId) ?? [];
    return ids
      .map(id => this.checkpoints.get(id))
      .filter((cp): cp is Checkpoint => cp !== undefined)
      .map(cp => ({
        id: cp.id,
        type: cp.type,
        version: cp.version,
        createdAt: cp.createdAt,
        description: `[${cp.type}] v${cp.version}`,
      }));
  }

  archive(id: string): void {
    const cp = this.checkpoints.get(id);
    if (cp) {
      cp.status = 'archived';
      this.checkpoints.set(id, cp);
    }
  }

  size(): number {
    return this.checkpoints.size;
  }

  clear(): void {
    this.checkpoints.clear();
    this.taskIndex.clear();
  }
}
