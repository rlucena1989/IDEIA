import { DecompositionPath, Goal, PlannedStep } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('tree-of-thought-planner');

export class TreeOfThoughtPlanner {
  async decompose(goal: Goal, branches = 3, depth = 3): Promise<PlannedStep[]> {
    const paths: DecompositionPath[] = [];
    for (let b = 0; b < branches; b++) {
      const path = this._generatePath(goal, depth);
      const score = this._evaluatePath(path, goal);
      paths.push({ path, score });
    }
    paths.sort((a, b) => b.score - a.score);
    const bestPath = paths[0];
    if (paths.length > 1 && paths[0].score - paths[1].score < 0.1) {
      return this._mergePaths(paths[0].path, paths[1].path);
    }
    return bestPath.path;
  }

  private _generatePath(goal: Goal, depth: number): PlannedStep[] {
    const steps: PlannedStep[] = [];
    const stepCount = Math.min(depth, Math.max(1, Math.ceil(goal.complexity * 3)));
    for (let i = 0; i < stepCount; i++) {
      steps.push({
        id: `tot_step_${i + 1}`,
        description: `ToT branch for ${goal.description} level ${i + 1}`,
        filesAffected: [],
        estimatedTokens: Math.ceil(goal.complexity * 400 / stepCount),
        dependencies: i > 0 ? [`tot_step_${i}`] : [],
        acceptanceCriteria: [`ToT criteria ${i + 1}`],
      });
    }
    return steps;
  }

  private _evaluatePath(path: PlannedStep[], _goal: Goal): number {
    const cohesion = path.length > 1 ? 1 / path.length : 1;
    const estimatedTokens = path.reduce((s, p) => s + p.estimatedTokens, 0);
    const tokenScore = Math.max(0, 1 - estimatedTokens / 10000);
    return cohesion * 0.4 + tokenScore * 0.6;
  }

  private _mergePaths(pathA: PlannedStep[], pathB: PlannedStep[]): PlannedStep[] {
    const merged: PlannedStep[] = [];
    const usedIds = new Set<string>();
    for (const step of pathA) {
      const match = pathB.find(s => s.description === step.description);
      if (match) {
        merged.push({
          ...step,
          acceptanceCriteria: [...new Set([...step.acceptanceCriteria, ...match.acceptanceCriteria])],
        });
      } else {
        merged.push(step);
      }
      usedIds.add(step.id);
    }
    for (const step of pathB) {
      if (!usedIds.has(step.id)) {
        merged.push({ ...step, alternative: true });
      }
    }
    return merged;
  }
}
