// ==========================================================================
// confidence-interval.ts
// ==========================================================================

export interface ConfidenceInterval { lower: number; upper: number; pValue: number }

export class ConfidenceIntervalCalculator {
  constructor(private iterations: number = 100, private confidenceLevel: number = 0.95) {}

  compute(
    predictions: boolean[], groundTruth: boolean[], sensitive: boolean[],
    metricFn: (p: boolean[], a: boolean[], s: boolean[]) => number
  ): ConfidenceInterval {
    const n = predictions.length;
    const originalValue = metricFn(predictions, groundTruth, sensitive);
    const bootstrappedValues: number[] = [];
    for (let i = 0; i < this.iterations; i++) {
      const sample = this.bootstrapSample(predictions, groundTruth, sensitive);
      bootstrappedValues.push(metricFn(sample.pred, sample.actual, sample.sens));
    }
    bootstrappedValues.sort((a, b) => a - b);
    const alpha = 1 - this.confidenceLevel;
    const lowerIdx = Math.floor((alpha / 2) * this.iterations);
    const upperIdx = Math.floor((1 - alpha / 2) * this.iterations);
    const extremeCount = bootstrappedValues.filter(v => v >= originalValue).length;
    return {
      lower: bootstrappedValues[lowerIdx] ?? 0,
      upper: bootstrappedValues[upperIdx] ?? 1,
      pValue: extremeCount / this.iterations,
    };
  }

  private bootstrapSample(pred: boolean[], actual: boolean[], sens: boolean[]): { pred: boolean[]; actual: boolean[]; sens: boolean[] } {
    const n = pred.length;
    const p: boolean[] = []; const a: boolean[] = []; const s: boolean[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      p.push(pred[idx]); a.push(actual[idx]); s.push(sens[idx]);
    }
    return { pred: p, actual: a, sens: s };
  }
}
