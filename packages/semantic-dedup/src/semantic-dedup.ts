import { cosineSimilarity } from '@ideia/vector-store';
import { createLogger } from '@ideia/logger';
const logger = createLogger('semantic-dedup');

export interface DedupConfig {
  similarityThreshold: number;
  maxResults: number;
  enableCrossSession: boolean;
  ttlDays: number;
}

export interface ContentItem {
  id: string;
  content: string;
  embedding?: number[];
  session: string;
  timestamp: number;
  source: string;
}

export interface DedupResult {
  original: ContentItem;
  duplicates: ContentItem[];
  similarityScores: number[];
  action: 'skip' | 'merge' | 'replace' | 'keep';
}

export class SemanticDedupEngine {
  private _items: Map<string, ContentItem>;
  private _similarityMatrix: Map<string, Map<string, number>>;
  private _config: DedupConfig;

  constructor(config?: Partial<DedupConfig>) {
    this._items = new Map();
    this._similarityMatrix = new Map();
    this._config = {
      similarityThreshold: 0.85,
      maxResults: 10,
      enableCrossSession: true,
      ttlDays: 30,
      ...config,
    };
  }

  addItem(item: ContentItem): DedupResult | null {
    const duplicates: ContentItem[] = [];
    const similarityScores: number[] = [];

    for (const existing of this._items.values()) {
      if (existing.id === item.id) continue;

      let score = 0;
      if (item.embedding && existing.embedding) {
        score = this._cosineSimilarity(item.embedding, existing.embedding);
      } else {
        score = this._jaccardSimilarity(item.content, existing.content);
      }

      if (score >= this._config.similarityThreshold) {
        duplicates.push(existing);
        similarityScores.push(score);
      }
    }

    this._items.set(item.id, item);

    if (duplicates.length > 0) {
      const maxScore = Math.max(...similarityScores);
      return {
        original: item,
        duplicates,
        similarityScores,
        action: this._determineAction(maxScore),
      };
    }

    return null;
  }

  findDuplicates(content: string, threshold?: number): DedupResult[] {
    const results: DedupResult[] = [];
    const usedThreshold = threshold ?? this._config.similarityThreshold;

    for (const item of this._items.values()) {
      const score = this._jaccardSimilarity(content, item.content);

      if (score >= usedThreshold) {
        results.push({
          original: {
            id: '',
            content,
            session: '',
            timestamp: Date.now(),
            source: 'query',
          },
          duplicates: [item],
          similarityScores: [score],
          action: this._determineAction(score),
        });
      }
    }

    return results.slice(0, this._config.maxResults);
  }

  getSimilarity(a: string, b: string): number {
    const itemA = this._items.get(a);
    const itemB = this._items.get(b);

    if (!itemA || !itemB) return 0;

    if (itemA.embedding && itemB.embedding) {
      return this._cosineSimilarity(itemA.embedding, itemB.embedding);
    }

    return this._jaccardSimilarity(itemA.content, itemB.content);
  }

  crossSessionDedup(sessions: string[]): Map<string, DedupResult[]> {
    const results = new Map<string, DedupResult[]>();

    if (!this._config.enableCrossSession) return results;

    const sessionItems = new Map<string, ContentItem[]>();
    for (const session of sessions) {
      const items: ContentItem[] = [];
      for (const item of this._items.values()) {
        if (item.session === session) {
          items.push(item);
        }
      }
      sessionItems.set(session, items);
    }

    const sessionKeys = [...sessionItems.keys()];
    for (let i = 0; i < sessionKeys.length; i++) {
      for (let j = i + 1; j < sessionKeys.length; j++) {
        const sessionA = sessionKeys[i];
        const sessionB = sessionKeys[j];
        const itemsA = sessionItems.get(sessionA) ?? [];
        const itemsB = sessionItems.get(sessionB) ?? [];

        const dedupResults: DedupResult[] = [];

        for (const itemA of itemsA) {
          const duplicates: ContentItem[] = [];
          const scores: number[] = [];

          for (const itemB of itemsB) {
            let score = 0;
            if (itemA.embedding && itemB.embedding) {
              score = this._cosineSimilarity(itemA.embedding, itemB.embedding);
            } else {
              score = this._jaccardSimilarity(itemA.content, itemB.content);
            }

            if (score >= this._config.similarityThreshold) {
              duplicates.push(itemB);
              scores.push(score);
            }
          }

          if (duplicates.length > 0) {
            dedupResults.push({
              original: itemA,
              duplicates,
              similarityScores: scores,
              action: this._determineAction(Math.max(...scores)),
            });
          }
        }

        const key = `${sessionA}::${sessionB}`;
        results.set(key, dedupResults);
      }
    }

    return results;
  }

  purgeExpired(): number {
    const now = Date.now();
    const ttlMs = this._config.ttlDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const [id, item] of this._items) {
      if (now - item.timestamp > ttlMs) {
        this._items.delete(id);
        this._similarityMatrix.delete(id);
        for (const matrix of this._similarityMatrix.values()) {
          matrix.delete(id);
        }
        removed++;
      }
    }

    return removed;
  }

  getStats(): { totalItems: number; totalDuplicates: number; sessionsCount: number } {
    const sessions = new Set<string>();
    let totalDuplicates = 0;

    for (const item of this._items.values()) {
      sessions.add(item.session);
    }

    const itemsArray = [...this._items.values()];
    for (let i = 0; i < itemsArray.length; i++) {
      for (let j = i + 1; j < itemsArray.length; j++) {
        const a = itemsArray[i];
        const b = itemsArray[j];
        let score = 0;
        if (a.embedding && b.embedding) {
          score = this._cosineSimilarity(a.embedding, b.embedding);
        } else {
          score = this._jaccardSimilarity(a.content, b.content);
        }
        if (score >= this._config.similarityThreshold) {
          totalDuplicates++;
        }
      }
    }

    return {
      totalItems: this._items.size,
      totalDuplicates,
      sessionsCount: sessions.size,
    };
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    return cosineSimilarity(a, b);
  }

  private _jaccardSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.toLowerCase().split(/\W+/).filter(t => t.length > 0));
    const tokensB = new Set(b.toLowerCase().split(/\W+/).filter(t => t.length > 0));

    if (tokensA.size === 0 && tokensB.size === 0) return 1;
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) intersection++;
    }

    const union = tokensA.size + tokensB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private _determineAction(score: number): 'skip' | 'merge' | 'replace' | 'keep' {
    if (score >= 0.95) return 'skip';
    if (score >= 0.85) return 'merge';
    if (score >= 0.7) return 'replace';
    return 'keep';
  }
}
