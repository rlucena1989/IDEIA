import { DetectionResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ml-detector');

export interface MLDetectorConfig {
  contamination: number;
  nEstimators: number;
  randomState: number;
}

const _defaultConfig: MLDetectorConfig = {
  contamination: 0.1,
  nEstimators: 100,
  randomState: 42,
};

export class IsolationForestDetector {
  private _trees: Array<Array<{ threshold: number; featureIdx: number; depth: number }>> = [];
  private _config: MLDetectorConfig;
  private _trained = false;

  constructor(config?: Partial<MLDetectorConfig>) {
    this._config = { ..._defaultConfig, ...config };
  }

  train(samples: number[][]): void {
    const n = samples.length;
    const m = samples[0]?.length ?? 0;
    if (n < 4 || m === 0) return;

    this._trees = [];
    for (let t = 0; t < this._config.nEstimators; t++) {
      const tree: Array<{ threshold: number; featureIdx: number; depth: number }> = [];
      const subset = this._sampleSubset(samples, Math.min(n, 256));
      this._buildTree(subset, tree, 0, Math.log2(n));
      this._trees.push(tree);
    }
    this._trained = true;
  }

  private _buildTree(
    samples: number[][],
    tree: Array<{ threshold: number; featureIdx: number; depth: number }>,
    depth: number,
    maxDepth: number,
  ): void {
    if (samples.length <= 1 || depth >= maxDepth) return;
    const m = samples[0].length;
    const featureIdx = Math.floor(Math.random() * m);
    const values = samples.map((s) => s[featureIdx]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return;
    const threshold = min + Math.random() * (max - min);
    tree.push({ threshold, featureIdx, depth });
    const left = samples.filter((s) => s[featureIdx] < threshold);
    const right = samples.filter((s) => s[featureIdx] >= threshold);
    this._buildTree(left, tree, depth + 1, maxDepth);
    this._buildTree(right, tree, depth + 1, maxDepth);
  }

  anomalyScore(sample: number[]): number {
    if (!this._trained || this._trees.length === 0) return 0.5;
    let avgPathLength = 0;
    for (const tree of this._trees) {
      let depth = 0;
      for (const node of tree) {
        if (sample[node.featureIdx] < node.threshold) {
          depth = depth * 2 + 1;
        } else {
          depth = depth * 2 + 2;
        }
      }
      avgPathLength += Math.log2(depth + 2);
    }
    avgPathLength /= this._trees.length;
    const expectedPath = Math.log2(sample.length || 1);
    const score = 1 - Math.pow(2, -avgPathLength / Math.max(expectedPath, 1));
    return Math.min(1, Math.max(0, score));
  }

  private _sampleSubset(samples: number[][], size: number): number[][] {
    const subset: number[][] = [];
    const used = new Set<number>();
    while (subset.length < size && subset.length < samples.length) {
      const idx = Math.floor(Math.random() * samples.length);
      if (!used.has(idx)) {
        used.add(idx);
        subset.push(samples[idx]);
      }
    }
    return subset;
  }

  get trained(): boolean {
    return this._trained;
  }
}

export class LOFDetector {
  private _data: number[][] = [];
  private _k = 20;
  private _lrdCache: Map<number, number> = new Map();
  private _trained = false;

  train(samples: number[][], k = 20): void {
    this._data = samples;
    this._k = Math.min(k, samples.length - 1);
    this._lrdCache.clear();
    this._trained = samples.length > 0;
  }

  private _distance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  }

  private _kDistance(point: number[], idx: number): number {
    const distances = this._data
      .map((d, i) => ({ d: this._distance(point, d), i }))
      .filter((x) => x.i !== idx)
      .sort((a, b) => a.d - b.d);
    const kth = distances[this._k - 1];
    return kth?.d ?? distances[distances.length - 1]?.d ?? 0;
  }

  private _reachabilityDistance(p: number[], pIdx: number, oIdx: number): number {
    const d = this._distance(p, this._data[oIdx]);
    const kdO = this._kDistance(this._data[oIdx], oIdx);
    return Math.max(d, kdO);
  }

  private _localReachabilityDensity(idx: number): number {
    const cached = this._lrdCache.get(idx);
    if (cached !== undefined) return cached;
    const point = this._data[idx];
    const kd = this._kDistance(point, idx);
    const neighbors = this._data
      .map((d, i) => ({ d: this._distance(point, d), i }))
      .filter((x) => x.i !== idx && x.d <= kd)
      .sort((a, b) => a.d - b.d)
      .slice(0, this._k);

    if (neighbors.length === 0) {
      this._lrdCache.set(idx, 1);
      return 1;
    }

    const sumReach = neighbors.reduce(
      (s, n) => s + this._reachabilityDistance(point, idx, n.i),
      0,
    );
    const lrd = neighbors.length / sumReach;
    this._lrdCache.set(idx, lrd);
    return lrd;
  }

  anomalyScore(sample: number[]): number {
    if (!this._trained || this._data.length < this._k + 1) return 0.5;

    const distances = this._data
      .map((d, i) => ({ d: this._distance(sample, d), i }))
      .sort((a, b) => a.d - b.d);
    const kNeighbors = distances.slice(0, this._k);
    const kd = kNeighbors[kNeighbors.length - 1]?.d ?? 0;

    const sumLrd = kNeighbors.reduce(
      (s, n) => s + this._localReachabilityDensity(n.i),
      0,
    );
    const avgLrdNeighbors = sumLrd / this._k;

    const sumReach = kNeighbors.reduce(
      (s, n) => s + Math.max(kd, this._kDistance(this._data[n.i], n.i)),
      0,
    );
    const lrdSample = this._k / sumReach;

    if (avgLrdNeighbors === 0 || lrdSample === 0 || !isFinite(avgLrdNeighbors) || !isFinite(lrdSample)) return 0.5;
    const lof = avgLrdNeighbors / lrdSample;
    const finalScore = Math.min(1, lof / 3);
    return isNaN(finalScore) ? 0.5 : finalScore;
  }
}

export class OneClassSVMDetector {
  private _supportVectors: number[][] = [];
  private _nu = 0.1;
  private _gamma = 0.5;
  private _rho = 0;
  private _trained = false;

  constructor(nu = 0.1, gamma = 0.5) {
    this._nu = nu;
    this._gamma = gamma;
  }

  private _rbfKernel(a: number[], b: number[]): number {
    const dist = Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
    return Math.exp(-this._gamma * dist * dist);
  }

  train(samples: number[][]): void {
    if (samples.length < 3) return;
    this._supportVectors = samples.slice(
      0,
      Math.max(3, Math.floor(samples.length * (1 - this._nu))),
    );
    const kernelSum = this._supportVectors.reduce((s, sv) => {
      return s + this._supportVectors.reduce((ss, sv2) => ss + this._rbfKernel(sv, sv2), 0);
    }, 0);
    const n = this._supportVectors.length;
    this._rho = (kernelSum / (n * n)) * 0.9;
    this._trained = true;
  }

  anomalyScore(sample: number[]): number {
    if (!this._trained || this._supportVectors.length === 0) return 0.5;
    const decision = this._supportVectors.reduce(
      (s, sv) => s + this._rbfKernel(sample, sv),
      0,
    );
    const normalized = decision / this._supportVectors.length;
    const score = 1 - Math.min(1, Math.max(0, (normalized - this._rho) / (1 - this._rho + 0.001)));
    return score;
  }
}

export class MLDetector {
  private _isolationForest: IsolationForestDetector;
  private _lof: LOFDetector;
  private _oneClassSVM: OneClassSVMDetector;

  constructor() {
    this._isolationForest = new IsolationForestDetector();
    this._lof = new LOFDetector();
    this._oneClassSVM = new OneClassSVMDetector();
  }

  train(samples: number[][]): void {
    this._isolationForest.train(samples);
    this._lof.train(samples);
    this._oneClassSVM.train(samples);
  }

  detect(sample: number[]): DetectionResult[] {
    return [
      {
        detectorName: 'isolation_forest',
        score: this._isolationForest.anomalyScore(sample),
        threshold: 0.5,
        isAnomaly: this._isolationForest.anomalyScore(sample) > 0.5,
        details: { method: 'isolation_forest' },
      },
      {
        detectorName: 'lof',
        score: this._lof.anomalyScore(sample),
        threshold: 0.5,
        isAnomaly: this._lof.anomalyScore(sample) > 0.5,
        details: { method: 'lof' },
      },
      {
        detectorName: 'one_class_svm',
        score: this._oneClassSVM.anomalyScore(sample),
        threshold: 0.5,
        isAnomaly: this._oneClassSVM.anomalyScore(sample) > 0.5,
        details: { method: 'one_class_svm' },
      },
    ];
  }

  getMaxScore(sample: number[]): number {
    const results = this.detect(sample);
    return results.reduce((max, r) => Math.max(max, r.score), 0);
  }
}
