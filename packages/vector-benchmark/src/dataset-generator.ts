import { BenchmarkConfig, DatasetType } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('dataset-generator');

export class DatasetGenerator {
  async generate(config: BenchmarkConfig): Promise<{ vectors: number[][]; ids: number[] }> {
    switch (config.datasetType) {
      case 'random': return this._generateRandom(config)
      case 'real_wiki': return this._generateWikiLike(config)
      case 'real_arxiv': return this._generateArxivLike(config)
      case 'adversarial': return this._generateAdversarial(config)
      default: return this._generateRandom(config)
    }
  }

  private async _generateRandom(config: BenchmarkConfig): Promise<{ vectors: number[][]; ids: number[] }> {
    const vectors: number[][] = []
    const ids: number[] = []
    for (let i = 0; i < config.datasetSize; i++) {
      const vec: number[] = []
      for (let d = 0; d < config.dimension; d++) {
        vec.push(Math.random() * 2 - 1)
      }
      this._l2Normalize(vec)
      vectors.push(vec)
      ids.push(i)
    }
    return { vectors, ids }
  }

  private async _generateWikiLike(config: BenchmarkConfig): Promise<{ vectors: number[][]; ids: number[] }> {
    const vectors: number[][] = []
    const ids: number[] = []
    const nClusters = Math.min(100, Math.floor(config.datasetSize / 100))
    for (let i = 0; i < config.datasetSize; i++) {
      const clusterIdx = Math.floor(Math.random() * nClusters)
      const vec: number[] = []
      const center = (clusterIdx / nClusters) * 2 - 1
      for (let d = 0; d < config.dimension; d++) {
        vec.push(center + (Math.random() - 0.5) * 0.3)
      }
      this._l2Normalize(vec)
      vectors.push(vec)
      ids.push(i)
    }
    return { vectors, ids }
  }

  private async _generateArxivLike(config: BenchmarkConfig): Promise<{ vectors: number[][]; ids: number[] }> {
    const vectors: number[][] = []
    const ids: number[] = []
    const topics = 50
    for (let i = 0; i < config.datasetSize; i++) {
      const topic = Math.floor(Math.random() * topics)
      const vec: number[] = []
      for (let d = 0; d < config.dimension; d++) {
        const topicComponent = Math.sin((d / config.dimension) * topic * Math.PI) * 0.5
        vec.push(topicComponent + (Math.random() - 0.5) * 0.2)
      }
      this._l2Normalize(vec)
      vectors.push(vec)
      ids.push(i)
    }
    return { vectors, ids }
  }

  private async _generateAdversarial(config: BenchmarkConfig): Promise<{ vectors: number[][]; ids: number[] }> {
    const vectors: number[][] = []
    const ids: number[] = []
    const nClusters = 5
    const clusterSize = Math.floor(config.datasetSize / nClusters)
    for (let c = 0; c < nClusters; c++) {
      for (let i = 0; i < clusterSize; i++) {
        const vec: number[] = []
        for (let d = 0; d < config.dimension; d++) {
          vec.push((c / nClusters) + (Math.random() - 0.5) * 0.01)
        }
        this._l2Normalize(vec)
        vectors.push(vec)
        ids.push(c * clusterSize + i)
      }
    }
    return { vectors, ids }
  }

  generateQuery(config: BenchmarkConfig): number[] {
    const query: number[] = []
    for (let d = 0; d < config.dimension; d++) {
      query.push(Math.random() * 2 - 1)
    }
    this._l2Normalize(query)
    return query
  }

  private _l2Normalize(vec: number[]): void {
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) {
        vec[i] /= norm
      }
    }
  }
}
