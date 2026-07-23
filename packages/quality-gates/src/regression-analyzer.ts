import { RegressionResult, GateResult } from './types';

export class RegressionAnalyzer {
  analyze(before: GateResult[], after: GateResult[]): RegressionResult {
    const beforeMap = new Map(before.map(r => [r.gate, r]));
    const afterMap = new Map(after.map(r => [r.gate, r]));

    const newFailures: string[] = [];
    const fixedIssues: string[] = [];

    for (const [name, afterResult] of afterMap) {
      const beforeResult = beforeMap.get(name);
      if (!beforeResult) continue;

      if (beforeResult.status === 'passed' && afterResult.status === 'failed') {
        newFailures.push(name);
      }
      if (beforeResult.status === 'failed' && afterResult.status === 'passed') {
        fixedIssues.push(name);
      }
    }

    const _beforeScore = before.filter(r => r.status === 'passed').length / Math.max(before.length, 1);
    const afterScore = after.filter(r => r.status === 'passed').length / Math.max(after.length, 1);

    return {
      hasRegression: newFailures.length > 0,
      newFailures,
      fixedIssues,
      score: Math.round(afterScore * 100),
    };
  }
}
