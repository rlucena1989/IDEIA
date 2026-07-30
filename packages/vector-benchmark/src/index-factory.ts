import { BenchmarkConfig, IndexHandle } from './types'
import { HNSWBenchmark } from './hnsw-benchmark'
import { IVFFlatBenchmark, IVFPQBenchmark, DiskANNBenchmark } from './ivf-benchmarks'

export class IndexFactory {
  async create(config: BenchmarkConfig): Promise<IndexHandle> {
    switch (config.algorithm) {
      case 'hnsw': return new HNSWBenchmark(config)
      case 'ivfflat': return new IVFFlatBenchmark(config)
      case 'ivf_pq': return new IVFPQBenchmark(config)
      case 'diskann': return new DiskANNBenchmark(config)
      default: throw new Error(`Unknown algorithm: ${config.algorithm}`)
    }
  }
}

export { HNSWBenchmark } from './hnsw-benchmark'
export { IVFFlatBenchmark, IVFPQBenchmark, DiskANNBenchmark } from './ivf-benchmarks'
