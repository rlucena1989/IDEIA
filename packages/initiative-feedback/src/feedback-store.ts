import * as path from 'node:path';
import * as fs from 'node:fs';
import { createLogger } from '@ideia/logger'; const log = createLogger('unknown');
export interface InitiativeCycleResult {
  cycleId: string;
  initiativeId: string;
  success: boolean;
  durationMs: number;
  startTime: string;
  endTime: string;
}

export interface FeedbackEntry {
  id: string;
  cycleId: string;
  rating: number;
  comment?: string;
  timestamp: string;
}

export interface AggregatedMetric {
  totalCycles: number;
  successRate: number;
  averageDurationMs: number;
  averageRating: number;
  lastUpdated: string;
}

export interface FeedbackStoreData {
  cycles: InitiativeCycleResult[];
  feedbacks: FeedbackEntry[];
  lastAggregated?: AggregatedMetric;
}

export class FeedbackStore {
  private data: FeedbackStoreData;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.join(process.cwd(), '.ai', 'feedback-store.json');
    this.data = this.load();
  }

  saveCycle(cycle: InitiativeCycleResult): void {
    this.data.cycles.push(cycle);
    if (this.data.cycles.length > 100) this.data.cycles.shift();
    this.persist();
  }

  saveFeedback(feedback: FeedbackEntry): void {
    this.data.feedbacks.push(feedback);
    if (this.data.feedbacks.length > 1000) this.data.feedbacks.shift();
    this.persist();
  }

  saveAggregated(metric: AggregatedMetric): void {
    this.data.lastAggregated = metric;
    this.persist();
  }

  getCycles(): InitiativeCycleResult[] {
    return [...this.data.cycles];
  }

  getFeedbacks(): FeedbackEntry[] {
    return [...this.data.feedbacks];
  }

  getLastAggregated(): AggregatedMetric | undefined {
    return this.data.lastAggregated;
  }

  clear(): void {
    this.data = { cycles: [], feedbacks: [] };
    this.persist();
  }

  private load(): FeedbackStoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch (err) {
      log.warn('Failed to load feedback store', { error: String(err) });
    }
    return { cycles: [], feedbacks: [] };
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      log.error('Failed to persist feedback store', { error: String(err) });
    }
  }
}

export function createFeedbackStore(filePath?: string): FeedbackStore {
  return new FeedbackStore(filePath);
}
