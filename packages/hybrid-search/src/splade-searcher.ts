import { RankedItem } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('splade-searcher');

export class SPLADESearcher {
  private _invertedIndex = new Map<number, Array<{ docId: string; docWeight: number }>>();
  private _docStore = new Map<string, { content: string; metadata: Record<string, unknown> }>();

  async search(query: string, topK = 20): Promise<RankedItem[]> {
    const sparseVec = this._encode(query);
    const matches = new Map<string, number>();

    for (const [termId, weight] of sparseVec) {
      const docs = this._invertedIndex.get(termId) ?? [];
      for (const { docId, docWeight } of docs) {
        matches.set(docId, (matches.get(docId) ?? 0) + weight * docWeight);
      }
    }

    return Array.from(matches.entries())
      .map(([id, score]) => ({
        id,
        score,
        rank: 0,
        source: 'sparse' as const,
        metadata: this._docStore.get(id)?.metadata ?? {},
        content: this._docStore.get(id)?.content ?? '',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  indexDocument(docId: string, text: string, metadata?: Record<string, unknown>): void {
    const tokens = this._encode(text);
    for (const [termId, weight] of tokens) {
      const existing = this._invertedIndex.get(termId) ?? [];
      existing.push({ docId, docWeight: weight });
      this._invertedIndex.set(termId, existing);
    }
    this._docStore.set(docId, { content: text, metadata: metadata ?? {} });
  }

  getIndexSize(): number {
    let total = 0;
    for (const docs of this._invertedIndex.values()) {
      total += docs.length;
    }
    return total;
  }

  getTermCount(): number {
    return this._invertedIndex.size;
  }

  getDocumentCount(): number {
    return this._docStore.size;
  }

  private _encode(text: string): Map<number, number> {
    const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
    const freq = new Map<number, number>();
    for (const token of tokens) {
      const id = this._hashToken(token);
      freq.set(id, (freq.get(id) ?? 0) + 1 / tokens.length);
    }
    return freq;
  }

  private _hashToken(token: string): number {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 50000;
  }
}
