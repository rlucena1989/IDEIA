export interface SparseResult {
  id: string;
  score: number;
  termContributions: TermContribution[];
}

export interface TermContribution {
  termId: number;
  weight: number;
  contribution: number;
}

export class SPLADERetriever {
  private invertedIndex = new Map<number, Array<{ docId: string; docWeight: number }>>();

  async search(query: string, topK = 20): Promise<SparseResult[]> {
    const sparseVec = this.encode(query);
    const matches = new Map<string, number>();

    for (const [termId, weight] of sparseVec) {
      const docs = this.invertedIndex.get(termId) ?? [];
      for (const { docId, docWeight } of docs) {
        matches.set(docId, (matches.get(docId) ?? 0) + weight * docWeight);
      }
    }

    return Array.from(matches.entries())
      .map(([id, score]) => ({
        id,
        score,
        termContributions: Array.from(sparseVec.entries())
          .map(([tid, w]) => ({
            termId: tid,
            weight: w,
            contribution: w * this.getDocWeight(id, tid),
          }))
          .sort((a, b) => b.contribution - a.contribution)
          .slice(0, 5),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  indexDocument(docId: string, text: string): void {
    const tokens = this.encode(text);
    for (const [termId, weight] of tokens) {
      const existing = this.invertedIndex.get(termId) ?? [];
      existing.push({ docId, docWeight: weight });
      this.invertedIndex.set(termId, existing);
    }
  }

  private encode(_text: string): Map<number, number> {
    const tokens = _text.toLowerCase().split(/\W+/).filter(Boolean);
    const freq = new Map<number, number>();
    for (const token of tokens) {
      const id = this.hashToken(token);
      freq.set(id, (freq.get(id) ?? 0) + 1 / tokens.length);
    }
    return freq;
  }

  private hashToken(token: string): number {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 50000;
  }

  private getDocWeight(docId: string, termId: number): number {
    const docs = this.invertedIndex.get(termId) ?? [];
    const match = docs.find(d => d.docId === docId);
    return match?.docWeight ?? 0;
  }

  getIndexSize(): number {
    let total = 0;
    for (const docs of this.invertedIndex.values()) {
      total += docs.length;
    }
    return total;
  }
}
