import { createLogger } from '@ideia/logger';

const log = createLogger('initiative-feedback:collector');

export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface FeedbackEntry {
  initiativeId: string;
  rating: FeedbackRating;
  comment?: string;
  category: 'auto-fix' | 'suggestion' | 'scan' | 'other';
  timestamp: string;
}

export class FeedbackCollector {
  private feedbacks: FeedbackEntry[] = [];

  collect(initiativeId: string, rating: FeedbackRating, options?: { comment?: string; category?: FeedbackEntry['category'] }): FeedbackEntry {
    const entry: FeedbackEntry = {
      initiativeId,
      rating,
      comment: options?.comment,
      category: options?.category ?? 'auto-fix',
      timestamp: new Date().toISOString(),
    };
    this.feedbacks.push(entry);
    log.info(`Feedback collected for ${initiativeId}: rating=${rating}`);
    return entry;
  }

  getByInitiative(initiativeId: string): FeedbackEntry[] {
    return this.feedbacks.filter(f => f.initiativeId === initiativeId);
  }

  getAll(): FeedbackEntry[] {
    return [...this.feedbacks];
  }

  getAverageRating(): number {
    if (this.feedbacks.length === 0) return 0;
    const sum = this.feedbacks.reduce((acc, f) => acc + f.rating, 0);
    return sum / this.feedbacks.length;
  }

  getAverageRatingByCategory(category: FeedbackEntry['category']): number {
    const filtered = this.feedbacks.filter(f => f.category === category);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, f) => acc + f.rating, 0);
    return sum / filtered.length;
  }
}

export function createFeedbackCollector(): FeedbackCollector {
  return new FeedbackCollector();
}
