import { QueueEntry, RobotTask } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('queue');

export interface QueueConfig {
  maxRetries: number;
  deadLetterEnabled: boolean;
}

const DEFAULT_CONFIG: QueueConfig = {
  maxRetries: 3,
  deadLetterEnabled: true,
};

export class TaskQueue {
  private queues: Map<string, QueueEntry[]> = new Map();
  private deadLetterQueue: QueueEntry[] = [];
  private config: QueueConfig;

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  enqueue(task: RobotTask, robotId: string, priority: number = 0): QueueEntry {
    const entry: QueueEntry = {
      taskId: task.id,
      robotId,
      priority,
      enqueuedAt: new Date().toISOString(),
      status: 'queued',
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    const queue = this.queues.get(robotId) || [];
    queue.push(entry);
    queue.sort((a, b) => b.priority - a.priority);
    this.queues.set(robotId, queue);

    return entry;
  }

  dequeue(robotId: string): QueueEntry | null {
    const queue = this.queues.get(robotId);
    if (!queue || queue.length === 0) return null;

    const entry = queue.shift();
    if (!entry) return null;
    entry.status = 'running';
    entry.startedAt = new Date().toISOString();
    this.queues.set(robotId, queue);
    return entry;
  }

  complete(taskId: string): void {
    this.updateStatus(taskId, 'completed');
  }

  fail(taskId: string): void {
    for (const [, queue] of this.queues) {
      const entry = queue.find(e => e.taskId === taskId);
      if (entry) {
        entry.retryCount++;
        if (entry.retryCount >= this.config.maxRetries) {
          entry.status = 'failed';
          if (this.config.deadLetterEnabled) {
            this.deadLetterQueue.push({ ...entry });
          }
        } else {
          entry.status = 'queued';
        }
        return;
      }
    }
  }

  getQueueLength(robotId: string): number {
    return this.queues.get(robotId)?.length ?? 0;
  }

  getDeadLetterQueue(): QueueEntry[] {
    return [...this.deadLetterQueue];
  }

  retryDeadLetter(taskId: string, newRobotId?: string): boolean {
    const idx = this.deadLetterQueue.findIndex(e => e.taskId === taskId);
    if (idx === -1) return false;

    const entry = this.deadLetterQueue.splice(idx, 1)[0];
    entry.retryCount = 0;
    entry.status = 'queued';
    this.enqueue({ id: entry.taskId } as RobotTask, newRobotId || entry.robotId);
    return true;
  }

  getStats(): { totalEnqueued: number; totalCompleted: number; totalFailed: number; deadLetterCount: number } {
    const stats = { totalEnqueued: 0, totalCompleted: 0, totalFailed: 0, deadLetterCount: this.deadLetterQueue.length };
    for (const [, queue] of this.queues) {
      for (const e of queue) {
        stats.totalEnqueued++;
        if (e.status === 'completed') stats.totalCompleted++;
        if (e.status === 'failed') stats.totalFailed++;
      }
    }
    return stats;
  }

  private updateStatus(taskId: string, status: QueueEntry['status']): void {
    for (const [, queue] of this.queues) {
      const entry = queue.find(e => e.taskId === taskId);
      if (entry) {
        entry.status = status;
        return;
      }
    }
  }
}

export function createTaskQueue(config?: Partial<QueueConfig>): TaskQueue {
  return new TaskQueue(config);
}
