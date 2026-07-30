import { Task, TaskFamily, PlanningContext } from './types';

export class MAMLStateEncoder {
  encode(task: Task, family: TaskFamily, context: PlanningContext): Float32Array {
    const features: number[] = [];
    features.push(this._encodeComplexity(task));
    features.push(this._encodeSimilarity(task, family));
    features.push(this._encodeContext(context));
    features.push(this._encodeTaskType(task));
    features.push(this._encodeResourceDemand(task));
    return new Float32Array(features);
  }

  private _encodeComplexity(task: Task): number {
    let complexity = 0;
    complexity += Math.min(task.description.length / 1000, 1);
    if (task.acceptanceCriteria) complexity += Math.min(task.acceptanceCriteria.length / 10, 0.5);
    if (task.dependencies) complexity += Math.min(task.dependencies.length / 5, 0.3);
    if (task.technicalNotes) complexity += Math.min(task.technicalNotes.length / 500, 0.2);
    return Math.min(complexity, 1);
  }

  private _encodeSimilarity(task: Task, family: TaskFamily): number {
    if (!family.tasks || family.tasks.length === 0) return 0;
    let maxSim = 0;
    for (const t of family.tasks) {
      const sim = this._computeSimilarity(task, t);
      if (sim > maxSim) maxSim = sim;
    }
    return maxSim;
  }

  private _computeSimilarity(a: Task, b: Task): number {
    let score = 0;
    const aWords = new Set(a.description.toLowerCase().split(/\W+/));
    const bWords = new Set(b.description.toLowerCase().split(/\W+/));
    let intersection = 0;
    for (const w of aWords) if (bWords.has(w)) intersection++;
    const union = aWords.size + bWords.size - intersection;
    score += union > 0 ? intersection / union : 0;
    if (a.domain === b.domain) score += 0.2;
    if (a.type === b.type) score += 0.15;
    return Math.min(score, 1);
  }

  private _encodeContext(context: PlanningContext): number {
    let score = 0;
    score += context.hasExamples ? 0.3 : 0;
    score += context.hasSimilarTasks ? 0.2 : 0;
    score += context.hasArchitecturalGuidance ? 0.2 : 0;
    score += context.hasConstraints ? 0.15 : 0;
    score += context.hasRiskAssessment ? 0.15 : 0;
    return Math.min(score, 1);
  }

  private _encodeTaskType(task: Task): number {
    const typeMap: Record<string, number> = { feature: 0.8, bugfix: 0.3, refactor: 0.5, test: 0.2, docs: 0.1, security: 0.7, performance: 0.6, devops: 0.4 };
    return typeMap[task.type] ?? 0.5;
  }

  private _encodeResourceDemand(task: Task): number {
    const hasFiles = task.files && task.files.length > 0;
    const hasDeps = task.dependencies && task.dependencies.length > 0;
    let demand = 0.3;
    if (hasFiles) demand += 0.3;
    if (hasDeps) demand += 0.2;
    if (task.acceptanceCriteria) demand += 0.1;
    if (task.technicalNotes) demand += 0.1;
    return Math.min(demand, 1);
  }
}
