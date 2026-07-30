import { Task, TaskFamily } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('task-sampler');

export class TaskSampler {
  sampleTask(families: TaskFamily[]): Task {
    const family = families[Math.floor(Math.random() * families.length)];
    const pool = [...(family.supportSet || []), ...(family.querySet || [])];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  sampleBatch(
    families: TaskFamily[],
    supportSize: number,
    querySize: number,
  ): Array<{ support: Task[]; query: Task[]; family: TaskFamily }> {
    const batches: Array<{ support: Task[]; query: Task[]; family: TaskFamily }> = [];
    for (const family of families) {
      const shuffled = [...(family.supportSet ?? []), ...(family.querySet ?? [])].sort(() => Math.random() - 0.5);
      batches.push({
        support: shuffled.slice(0, supportSize),
        query: shuffled.slice(supportSize, supportSize + querySize),
        family,
      });
    }
    return batches;
  }

  sampleBatchFromFamily(family: TaskFamily, supportSize: number, querySize: number): { support: Task[]; query: Task[] } {
    const shuffled = [...(family.supportSet ?? []), ...(family.querySet ?? [])].sort(() => Math.random() - 0.5);
    return {
      support: shuffled.slice(0, supportSize),
      query: shuffled.slice(supportSize, supportSize + querySize),
    };
  }

  curriculumBatch(families: TaskFamily[], phase: number): TaskFamily {
    const sorted = this.curriculumOrder(families);
    const range = sorted.length;
    if (range === 0) throw new Error('No task families available');

    if (phase < 0.3) {
      const cutoff = Math.ceil(range * 0.3);
      return sorted[Math.floor(Math.random() * cutoff)];
    } else if (phase < 0.6) {
      const start = Math.ceil(range * 0.3);
      const end = Math.ceil(range * 0.7);
      return sorted[start + Math.floor(Math.random() * (end - start))];
    } else {
      const start = Math.ceil(range * 0.7);
      return sorted[start + Math.floor(Math.random() * (range - start))];
    }
  }

  stratifyByDomain(tasks: Task[]): Map<string, Task[]> {
    const groups = new Map<string, Task[]>();
    for (const task of tasks) {
      const domain = task.goal!.domain;
      const existing = groups.get(domain);
      if (existing) {
        existing.push(task);
      } else {
        groups.set(domain, [task]);
      }
    }
    return groups;
  }

  curriculumOrder(families: TaskFamily[]): TaskFamily[] {
    return [...families].sort((a, b) => this._familyComplexity(a) - this._familyComplexity(b));
  }

  similaritySort(families: TaskFamily[], target: TaskFamily): TaskFamily[] {
    return [...families].sort((a, b) => {
      const simA = this._computeSimilarity(a, target);
      const simB = this._computeSimilarity(b, target);
      return simB - simA;
    });
  }

  private _computeSimilarity(a: TaskFamily, b: TaskFamily): number {
    let score = 0;
    if (a.domain === b.domain) score += 0.4;
    if (a.metaFeatures && b.metaFeatures) {
      let dot = 0;
      let normA = 0;
      let normB = 0;
      for (const key of Object.keys(a.metaFeatures)) {
        const va = a.metaFeatures[key] || 0;
        const vb = b.metaFeatures[key] || 0;
        dot += va * vb;
        normA += va * va;
        normB += vb * vb;
      }
      if (normA > 0 && normB > 0) {
        score += 0.6 * (dot / (Math.sqrt(normA) * Math.sqrt(normB)));
      }
    }
    return score;
  }

  private _familyComplexity(family: TaskFamily): number {
    const avg = family.supportSet!.reduce((s, t) => s + t.goal!.complexity, 0);
    return family.supportSet!.length > 0 ? avg / family.supportSet!.length : 0;
  }
}
