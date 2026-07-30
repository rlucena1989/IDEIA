export class ThroughputMeter {
  measure(queries: number, totalTimeMs: number): number {
    if (totalTimeMs <= 0) return 0
    return Math.round((queries / totalTimeMs) * 1000)
  }

  measureBatch(latencies: number[]): number {
    if (latencies.length === 0) return 0
    const total = latencies.reduce((a, b) => a + b, 0)
    return Math.round((latencies.length / total) * 1000)
  }

  estimateMaxThroughput(avgLatencyMs: number, concurrency: number): number {
    if (avgLatencyMs <= 0) return 0
    return Math.round((concurrency / avgLatencyMs) * 1000)
  }
}
