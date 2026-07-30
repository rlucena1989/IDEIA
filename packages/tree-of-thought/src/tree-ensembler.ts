import { SearchConfig } from './types';
import { createLogger } from '@ideia/logger';
import { ThoughtNode, ScoredPath } from './thought-node';
const logger = createLogger('tree-ensembler');

export class TreeEnsembler {
  select(paths: ScoredPath[], config: SearchConfig): ScoredPath {
    if (paths.length === 0) return { path: [], score: 0 };
    if (paths.length === 1) return paths[0];

    paths.sort((a, b) => b.score - a.score);

    const threshold = config.ensembleThreshold ?? 0.1;
    if (paths[0].score - paths[1].score > threshold) {
      return paths[0];
    }

    const topN = Math.min(3, paths.length);
    const topPaths = paths.slice(0, topN);
    return this.ensemble(topPaths);
  }

  ensemble(paths: ScoredPath[]): ScoredPath {
    if (paths.length === 0) return { path: [], score: 0 };
    if (paths.length === 1) return paths[0];

    const mergedSteps = this._weightedMerge(paths);
    const avgScore = paths.reduce((sum, p) => sum + p.score, 0) / paths.length;

    return { path: mergedSteps, score: avgScore };
  }

  private _weightedMerge(paths: ScoredPath[]): ThoughtNode[] {
    const merged: ThoughtNode[] = [];
    const seen = new Set<string>();

    const sorted = [...paths].sort((a, b) => b.score - a.score);

    for (const path of sorted) {
      for (const node of path.path) {
        const key = this._nodeFingerprint(node);
        if (!seen.has(key)) {
          merged.push(node);
          seen.add(key);
        }
      }
    }

    return merged;
  }

  private _nodeFingerprint(node: ThoughtNode): string {
    return node.content.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 60);
  }
}
