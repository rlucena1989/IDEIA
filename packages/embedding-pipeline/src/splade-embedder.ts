export class SPLADEEmbedder {
  private _vocabSize = 50000;
  private _maxTerms = 100;

  encode(text: string): Map<number, number> {
    const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
    const freq = new Map<number, number>();
    for (const token of tokens) {
      const id = this._hash(token);
      const existing = freq.get(id) || 0;
      freq.set(id, existing + this._computeLogMLM(token));
    }
    const entries = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
    return new Map(entries.slice(0, this._maxTerms));
  }

  dotProduct(a: Map<number, number>, b: Map<number, number>): number {
    let dot = 0;
    for (const [key, val] of a) {
      if (b.has(key)) dot += val * b.get(key)!;
    }
    return dot;
  }

  private _computeLogMLM(token: string): number {
    return 1 + Math.log1p(token.length / 4);
  }

  private _hash(token: string): number {
    let h = 0;
    for (let i = 0; i < token.length; i++) {
      h = ((h << 5) - h) + token.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h) % this._vocabSize;
  }
}