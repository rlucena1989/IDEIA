export class WassersteinLoss {
  computeDiscriminatorLoss(realScores: number[], fakeScores: number[]): number {
    const realMean = realScores.reduce((a, b) => a + b, 0) / realScores.length;
    const fakeMean = fakeScores.reduce((a, b) => a + b, 0) / fakeScores.length;
    return fakeMean - realMean;
  }

  computeGeneratorLoss(fakeScores: number[]): number {
    return -fakeScores.reduce((a, b) => a + b, 0) / fakeScores.length;
  }

  gradientPenalty(
    realEmbeddings: number[][],
    fakeEmbeddings: number[][],
    interpolateFn: (embeddings: number[][], condition?: number[]) => number[]
  ): number {
    const batchSize = realEmbeddings.length;
    const epsilon = Array.from({ length: batchSize }, () => Math.random());
    const interpolated = realEmbeddings.map((real, i) =>
      real.map((v, j) => epsilon[i] * v + (1 - epsilon[i]) * (fakeEmbeddings[i]?.[j] ?? 0))
    );
    const scores = interpolateFn(interpolated);
    const gradientNorm = scores.reduce((sum, score) => sum + Math.abs(score), 0) / scores.length;
    return Math.pow(gradientNorm - 1, 2);
  }
}
