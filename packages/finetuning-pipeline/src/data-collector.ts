import { DatasetEntry } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('data-collector');

export interface InteractionData {
  agentId: string;
  userPrompt: string;
  agentResponse: string;
  timestamp: string;
}

export interface CodeChangePair {
  filePath: string;
  before: string;
  after: string;
  language: string;
  timestamp: string;
}

export interface FeedbackData {
  userId: string;
  agentOutput: string;
  rating: number;
  comment?: string;
  timestamp: string;
}

export interface CollectorStats {
  interactions: number;
  codeChanges: number;
  feedbacks: number;
}

export class DataCollector {
  private interactions: InteractionData[] = [];
  private codeChanges: CodeChangePair[] = [];
  private feedbacks: FeedbackData[] = [];

  collectInteraction(data: InteractionData): void {
    this.interactions.push(data);
  }

  collectCodeChange(data: CodeChangePair): void {
    this.codeChanges.push(data);
  }

  collectFeedback(data: FeedbackData): void {
    this.feedbacks.push(data);
  }

  collect(data: InteractionData | CodeChangePair | FeedbackData): void {
    if ('userPrompt' in data && 'agentResponse' in data) {
      this.collectInteraction(data as InteractionData);
    } else if ('before' in data && 'after' in data) {
      this.collectCodeChange(data as CodeChangePair);
    } else if ('rating' in data) {
      this.collectFeedback(data as FeedbackData);
    }
  }

  exportDataset(_format: 'jsonl' = 'jsonl'): string {
    const entries: DatasetEntry[] = [
      ...this.interactions.map(i => ({
        input: i.userPrompt,
        output: i.agentResponse,
        metadata: { source: 'interaction', timestamp: i.timestamp, taskType: 'general' },
      })),
      ...this.codeChanges.map(c => ({
        input: c.before,
        output: c.after,
        metadata: { source: 'code_change', timestamp: c.timestamp, taskType: c.language },
      })),
      ...this.feedbacks.map(f => ({
        input: f.agentOutput,
        output: f.comment ?? '',
        metadata: { source: 'feedback', timestamp: f.timestamp, taskType: 'rating_' + f.rating },
      })),
    ];
    return entries.map(e => JSON.stringify(e)).join('\n');
  }

  getStats(): CollectorStats {
    return {
      interactions: this.interactions.length,
      codeChanges: this.codeChanges.length,
      feedbacks: this.feedbacks.length,
    };
  }

  clear(): void {
    this.interactions = [];
    this.codeChanges = [];
    this.feedbacks = [];
  }
}
