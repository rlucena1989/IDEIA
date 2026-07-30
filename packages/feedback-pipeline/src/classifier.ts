import type { FeedbackEntry } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('classifier');

export type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'question';

export interface ClassificationResult {
  category: FeedbackCategory;
  confidence: number;
  matchedKeywords: string[];
  metadata?: Record<string, unknown>;
}

const CATEGORY_KEYWORDS: Record<FeedbackCategory, string[][]> = {
  bug: [
    ['bug', 'crash', 'error', 'fail', 'broken', 'wrong', 'incorrect', 'exception', 'stack', 'trace'],
    ['not working', 'doesn\'t work', 'unexpected', 'defect', 'glitch', 'corrupt'],
    ['null', 'undefined', 'timeout', 'hang', 'freeze', 'regression'],
  ],
  feature: [
    ['feature', 'request', 'wishlist', 'would like', 'could you add'],
    ['new', 'add', 'implement', 'support', 'create', 'need ability'],
    ['would be great', 'nice to have', 'missing capability'],
  ],
  improvement: [
    ['improve', 'enhance', 'optimize', 'refactor', 'cleanup', 'better'],
    ['performance', 'slow', 'speed up', 'faster', 'usability', 'ux'],
    ['suggestion', 'proposal', 'recommend', 'should', 'could improve'],
  ],
  question: [
    ['how', 'what', 'why', 'where', 'when', 'which', 'who'],
    ['question', 'doubt', 'clarify', 'unclear', 'confused'],
    ['help', 'tutorial', 'example', 'documentation', 'explain'],
  ],
};

function keywordScore(content: string, groups: string[][]): { score: number; matches: string[] } {
  const lower = content.toLowerCase();
  let score = 0;
  const matches: string[] = [];
  for (const group of groups) {
    let groupScore = 0;
    for (const kw of group) {
      if (lower.includes(kw)) {
        groupScore += 1;
        matches.push(kw);
      }
    }
    if (groupScore > 0) {
      score += groupScore / group.length;
    }
  }
  return { score, matches };
}

function normalizeScore(raw: number): number {
  return Math.min(1, raw / 3);
}

export class FeedbackClassifier {
  classify(entry: FeedbackEntry): ClassificationResult {
    const results = (Object.keys(CATEGORY_KEYWORDS) as FeedbackCategory[]).map(cat => {
      const { score, matches } = keywordScore(entry.content, CATEGORY_KEYWORDS[cat]);
      return { category: cat, score, matches };
    });

    results.sort((a, b) => b.score - a.score);
    const best = results[0];

    let category: FeedbackCategory;
    let confidence: number;

    if (best.score > 0) {
      category = best.category;
      confidence = normalizeScore(best.score);
      if (results.length > 1 && results[1].score === best.score) {
        confidence *= 0.85;
      }
    } else {
      category = 'question';
      confidence = 0.3;
    }

    confidence = Math.round(confidence * 100) / 100;

    return { category, confidence, matchedKeywords: best.matches, metadata: { scores: results.map(r => ({ category: r.category, score: r.score })) } };
  }

  classifyBatch(entries: FeedbackEntry[]): Map<string, ClassificationResult> {
    const map = new Map<string, ClassificationResult>();
    for (const e of entries) {
      map.set(e.id, this.classify(e));
    }
    return map;
  }
}
