export class ColBERTRanker {
  async rank(query: string, documents: string[]): Promise<number[]> {
    const queryEmb = this.embedTokens(query);
    const docEmbs = await Promise.all(documents.map(d => this.embedTokens(d)));

    return docEmbs.map(docEmb => {
      let totalScore = 0;
      for (let i = 0; i < queryEmb.length; i++) {
        let maxSim = -Infinity;
        for (let j = 0; j < docEmb.length; j++) {
          const sim = this.cosineSim(queryEmb[i], docEmb[j]);
          if (sim > maxSim) maxSim = sim;
        }
        totalScore += maxSim;
      }
      return totalScore / queryEmb.length;
    });
  }

  async rankWithPruning(query: string, documents: string[], topK = 20): Promise<number[]> {
    const queryEmb = this.embedTokens(query);
    const docEmbs = await Promise.all(documents.map(d => this.embedTokens(d)));

    const approxScores = docEmbs.map((de, idx) => ({ idx, score: this.approxScore(queryEmb, de) }));
    approxScores.sort((a, b) => b.score - a.score);
    const pruned = approxScores.slice(0, topK);

    return this.rank(query, pruned.map(p => documents[p.idx]));
  }

  private embedTokens(text: string): number[][] {
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    return words.slice(0, 128).map(w => {
      const vec = new Array(128).fill(0);
      for (let i = 0; i < w.length && i < 128; i++) {
        vec[i] = w.charCodeAt(i) / 255;
      }
      return vec;
    });
  }

  private cosineSim(a: number[], b: number[]): number {
    let dot = 0, nA = 0, nB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      nA += a[i] * a[i];
      nB += b[i] * b[i];
    }
    const denom = Math.sqrt(nA) * Math.sqrt(nB);
    return denom === 0 ? 0 : dot / denom;
  }

  private approxScore(queryEmb: number[][], docEmb: number[][]): number {
    const qAvg = queryEmb.reduce((s, v) => s + v.reduce((a, b) => a + b, 0) / v.length, 0) / queryEmb.length;
    const dAvg = docEmb.reduce((s, v) => s + v.reduce((a, b) => a + b, 0) / v.length, 0) / docEmb.length;
    return qAvg * dAvg;
  }
}
