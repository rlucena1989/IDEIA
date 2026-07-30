export interface LatencyStats {
  p50: number
  p95: number
  p99: number
  avg: number
  min: number
  max: number
  stddev: number
}

export class LatencyProfiler {
  profile(latencies: number[]): LatencyStats {
    const sorted = [...latencies].sort((a, b) => a - b)
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length
    const variance = sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / sorted.length
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      avg,
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      stddev: Math.sqrt(variance),
    }
  }

  analyzeByPercentile(latencies: number[], percentiles: number[]): Map<number, number> {
    const sorted = [...latencies].sort((a, b) => a - b)
    const result = new Map<number, number>()
    for (const p of percentiles) {
      result.set(p, sorted[Math.floor(sorted.length * (p / 100))] || 0)
    }
    return result
  }
}
