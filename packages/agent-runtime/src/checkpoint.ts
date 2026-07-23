import { LangGraphStateAnnotation } from './langgraph-graph';

export interface CheckpointData {
  threadId: string;
  state: LangGraphStateAnnotation;
  timestamp: number;
  version: number;
}

export interface CheckpointStorage {
  save(checkpoint: CheckpointData): Promise<void>;
  load(threadId: string): Promise<CheckpointData | null>;
  delete(threadId: string): Promise<void>;
  list(): Promise<CheckpointData[]>;
}

export class InMemoryCheckpointStorage implements CheckpointStorage {
  private checkpoints: Map<string, CheckpointData> = new Map();

  async save(checkpoint: CheckpointData): Promise<void> {
    this.checkpoints.set(checkpoint.threadId, checkpoint);
  }

  async load(threadId: string): Promise<CheckpointData | null> {
    return this.checkpoints.get(threadId) || null;
  }

  async delete(threadId: string): Promise<void> {
    this.checkpoints.delete(threadId);
  }

  async list(): Promise<CheckpointData[]> {
    return Array.from(this.checkpoints.values());
  }
}

export class CheckpointManager {
  private storage: CheckpointStorage;
  private autoSave: boolean;
  private autoSaveInterval: number;
  private intervalId?: NodeJS.Timeout;

  constructor(
    storage?: CheckpointStorage,
    autoSave = true,
    autoSaveInterval = 30000 // 30 seconds
  ) {
    this.storage = storage || new InMemoryCheckpointStorage();
    this.autoSave = autoSave;
    this.autoSaveInterval = autoSaveInterval;
  }

  async saveCheckpoint(threadId: string, state: LangGraphStateAnnotation): Promise<void> {
    const checkpoint: CheckpointData = {
      threadId,
      state,
      timestamp: Date.now(),
      version: 1,
    };

    await this.storage.save(checkpoint);
  }

  async loadCheckpoint(threadId: string): Promise<LangGraphStateAnnotation | null> {
    const checkpoint = await this.storage.load(threadId);
    return checkpoint ? checkpoint.state : null;
  }

  async deleteCheckpoint(threadId: string): Promise<void> {
    await this.storage.delete(threadId);
  }

  async listCheckpoints(): Promise<CheckpointData[]> {
    return await this.storage.list();
  }

  startAutoSave(threadId: string, getState: () => LangGraphStateAnnotation): void {
    if (this.autoSave && !this.intervalId) {
      this.intervalId = setInterval(async () => {
        const state = getState();
        await this.saveCheckpoint(threadId, state);
      }, this.autoSaveInterval);
    }
  }

  stopAutoSave(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

export function createCheckpointManager(
  storage?: CheckpointStorage,
  autoSave?: boolean,
  autoSaveInterval?: number
): CheckpointManager {
  return new CheckpointManager(storage, autoSave, autoSaveInterval);
}
