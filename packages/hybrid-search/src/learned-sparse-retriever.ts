export class LearnedSparseRetriever {
  private _docReps = new Map<string, Map<number, number>>();

  encode(text: string): Map<number, number> {
    const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
    const reps = new Map<number, number>();
    for (const token of tokens) {
      const id = this._hashToken(token);
      const weight = this._learnedWeight(token);
      reps.set(id, Math.max(0, weight));
    }
    this._applyTopKPruning(reps, 128);
    return reps;
  }

  indexDocument(docId: string, text: string): void {
    const reps = this.encode(text);
    this._docReps.set(docId, reps);
  }

  search(query: string, topK: number): Array<{ docId: string; score: number }> {
    const qRep = this.encode(query);
    const scored: Array<{ docId: string; score: number }> = [];
    for (const [docId, dRep] of this._docReps) {
      const score = this._maxDotProduct(qRep, dRep);
      scored.push({ docId, score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  getDocumentCount(): number {
    return this._docReps.size;
  }

  clear(): void {
    this._docReps.clear();
  }

  private _maxDotProduct(a: Map<number, number>, b: Map<number, number>): number {
    let dot = 0;
    for (const [key, val] of a) {
      if (b.has(key)) dot += val * b.get(key)!;
    }
    return dot;
  }

  private _learnedWeight(token: string): number {
    return 1 + Math.log1p(token.length / 3);
  }

  private _applyTopKPruning(reps: Map<number, number>, k: number): void {
    const sorted = Array.from(reps.entries()).sort((a, b) => b[1] - a[1]);
    reps.clear();
    for (let i = 0; i < Math.min(k, sorted.length); i++) {
      reps.set(sorted[i][0], sorted[i][1]);
    }
  }

  private _hashToken(token: string): number {
    let h = 0;
    for (let i = 0; i < token.length; i++) {
      h = ((h << 5) - h) + token.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h) % 50000;
  }
}
