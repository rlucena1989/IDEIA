export class RecallCalculator {
  calculateAtK(groundTruth: number[], actual: number[], k: number): number {
    const gt = groundTruth.slice(0, k)
    const correct = actual.filter(id => gt.includes(id)).length
    return correct / Math.min(k, gt.length)
  }

  calculatePrecisionAtK(groundTruth: number[], actual: number[], k: number): number {
    const correct = actual.slice(0, k).filter(id => groundTruth.includes(id)).length
    return correct / k
  }

  calculateMeanAveragePrecision(queries: Array<{ groundTruth: number[]; actual: number[] }>): number {
    const aps = queries.map(q => {
      let relevant = 0
      let sumPrecision = 0
      for (let i = 0; i < q.actual.length; i++) {
        if (q.groundTruth.includes(q.actual[i])) {
          relevant++
          sumPrecision += relevant / (i + 1)
        }
      }
      return relevant > 0 ? sumPrecision / Math.min(relevant, q.groundTruth.length) : 0
    })
    return aps.reduce((s, v) => s + v, 0) / aps.length
  }
}
