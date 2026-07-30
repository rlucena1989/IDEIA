import { MemoryEntry, CompactedMemory, ProgressiveResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('progressive-memory-compactor');

export class ProgressiveMemoryCompactor {
  private _compactionLevels = [0.5, 0.3, 0.15, 0.05];

  async compact(memories: MemoryEntry[], targetLevel: number): Promise<CompactedMemory> {
    const level = Math.min(targetLevel, this._compactionLevels.length - 1);
    const ratio = this._compactionLevels[level] ?? 0.5;
    const sorted = [...memories].sort((a, b) => b.importance - a.importance);
    const retained = sorted.slice(0, Math.ceil(sorted.length * ratio));
    const summaries = this._generateSummaries(retained, level);
    const temporalClusters = this._clusterByTime(retained);
    return {
      originalCount: memories.length,
      compactedCount: retained.length,
      compressionRatio: retained.length / Math.max(1, memories.length),
      level,
      retained,
      summaries,
      temporalClusters,
      timestamp: Date.now(),
    };
  }

  async progressiveCompact(memories: MemoryEntry[], schedule: number[]): Promise<ProgressiveResult> {
    const stages: CompactedMemory[] = [];
    let current = [...memories];
    for (const level of schedule) {
      const result = await this.compact(current, level);
      stages.push(result);
      current = result.retained;
    }
    return {
      stages,
      finalCount: current.length,
      totalCompression: current.length / Math.max(1, memories.length),
      totalStages: stages.length,
    };
  }

  private _generateSummaries(memories: MemoryEntry[], level: number): string[] {
    return memories.map(m => {
      const words = m.content.split(/\s+/);
      const keepRatio = [0.8, 0.6, 0.4, 0.2][level] ?? 0.5;
      return words.slice(0, Math.ceil(words.length * keepRatio)).join(' ');
    });
  }

  private _clusterByTime(memories: MemoryEntry[]): Array<{ timeRange: [number, number]; count: number; avgImportance: number }> {
    const sorted = [...memories].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length === 0) return [];
    const windowMs = Math.max(1, (sorted[sorted.length - 1].timestamp - sorted[0].timestamp) / 5);
    const clusters: Array<{ timeRange: [number, number]; count: number; avgImportance: number }> = [];
    let start = sorted[0].timestamp;
    for (let i = 0; i < 5; i++) {
      const clusterMemories = sorted.filter(m => m.timestamp >= start && m.timestamp < start + windowMs);
      if (clusterMemories.length > 0) {
        clusters.push({
          timeRange: [start, start + windowMs],
          count: clusterMemories.length,
          avgImportance: clusterMemories.reduce((s, m) => s + m.importance, 0) / clusterMemories.length,
        });
      }
      start += windowMs;
    }
    return clusters;
  }
}
