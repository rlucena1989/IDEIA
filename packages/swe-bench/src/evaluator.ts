import { SWEBenchTask, SWEBenchResult, SWEBenchMetrics, SWEBenchConfig, TaskStatus } from './types';

export class SWEBenchEvaluator {
  private tasks: SWEBenchTask[] = [];
  private results: SWEBenchResult[] = [];

  loadTasks(tasks: SWEBenchTask[]): void { this.tasks = tasks; }
  addResult(result: SWEBenchResult): void { this.results.push(result); }
  addResults(results: SWEBenchResult[]): void { this.results.push(...results); }

  async evaluateSingleTask(task: SWEBenchTask, config: SWEBenchConfig): Promise<SWEBenchResult> {
    const logs: string[] = [];
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 3;
    let finalStatus: TaskStatus = 'pending';
    const log = (msg: string) => logs.push('[' + new Date().toISOString() + '] ' + msg);
    log('Starting task ' + task.id + ' (' + task.repo + ')');

    if (config.dryRun) {
      log('Dry-run mode: skipping execution');
      return { taskId: task.id, resolved: false, generatedPatch: '', diffFromGold: '',
        resolvedBy: 'unresolved', attempts: 1, durationMs: 0, costUsd: 0, tokensUsed: 0, logs, finalStatus: 'unresolved' };
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attempts++;
      try {
        finalStatus = 'agent-solving';
        log('Attempt ' + (attempt + 1) + ': Agent solving...');
        const solution = await this.simulateAgentSolve(task, config);
        if (!solution.patch || solution.patch.trim().length === 0) throw new Error('Agent returned empty patch');

        finalStatus = 'applying-patch';
        log('Applying patch...');
        const patchValid = this.validatePatch(solution.patch);
        if (!patchValid.valid) throw new Error('Invalid patch: ' + patchValid.errors.join(', '));

        finalStatus = 'running-tests';
        log('Running verification...');
        const testPassed = this.simulateTestExecution(task, solution.patch);
        const diffFromGold = this.computeDiff(solution.patch, task.createdPatch);
        const durationMs = Date.now() - startTime;
        finalStatus = testPassed ? 'resolved' : 'unresolved';
        log('Task ' + task.id + ' ' + (testPassed ? 'RESOLVED' : 'UNRESOLVED') + ' in ' + durationMs + 'ms');
        return { taskId: task.id, resolved: testPassed, generatedPatch: solution.patch, diffFromGold,
          resolvedBy: testPassed ? (attempt === 0 ? 'agent' : 'fix-loop') : 'unresolved',
          attempts, durationMs, costUsd: solution.costUsd, tokensUsed: solution.tokens, logs, finalStatus };
      } catch (error) {
        log('Attempt ' + (attempt + 1) + ' failed: ' + (error instanceof Error ? error.message : String(error)));
        if (attempt < maxAttempts - 1) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
    log('All ' + maxAttempts + ' attempts failed');
    return { taskId: task.id, resolved: false, generatedPatch: '', diffFromGold: '', resolvedBy: 'unresolved',
      attempts, durationMs: Date.now() - startTime, costUsd: 0, tokensUsed: 0, logs,
      errorMessage: 'Failed after ' + maxAttempts + ' attempts', finalStatus: 'error' };
  }

  private async simulateAgentSolve(task: SWEBenchTask, config: SWEBenchConfig): Promise<{ patch: string; tokens: number; costUsd: number; }> {
    const tokens = Math.floor(Math.random() * 500) + 100;
    const costUsd = tokens * 0.000002;
    if (Math.random() > 0.7) return { patch: task.createdPatch, tokens, costUsd };
    return { patch: '--- a/file.py\n+++ b/file.py\n@@ -1,3 +1,4 @@\n-old line\n+new line\n', tokens, costUsd };
  }

  private validatePatch(patchContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!patchContent || patchContent.trim().length === 0) { errors.push('Patch is empty'); return { valid: false, errors }; }
    const lines = patchContent.split('\n');
    let hasDiffMarker = false, hasHunkHeader = false;
    for (const line of lines) {
      if (line.startsWith('diff --git')) hasDiffMarker = true;
      if (/^@@\s+-\d+,\d+\s+\+\d+,\d+\s+@@/.test(line)) hasHunkHeader = true;
    }
    if (!hasDiffMarker) errors.push('Patch missing diff --git markers');
    if (!hasHunkHeader) errors.push('Patch missing hunk headers');
    return { valid: errors.length === 0, errors };
  }

  private simulateTestExecution(task: SWEBenchTask, patch: string): boolean {
    if (patch === task.createdPatch) return true;
    return this.computeTextSimilarity(patch, task.createdPatch) > 0.5;
  }

  private computeTextSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    const aLines = a.split('\n'), bLines = b.split('\n');
    return aLines.filter(l => bLines.includes(l)).length / Math.max(aLines.length, bLines.length);
  }

  computeDiff(generatedPatch: string, goldPatch: string): string {
    if (!generatedPatch || !goldPatch) return 'N/A';
    const gen = generatedPatch.replace(/\r\n/g, '\n').trim();
    const gold = goldPatch.replace(/\r\n/g, '\n').trim();
    if (gen === gold) return 'Exact match';
    if (gen.includes(gold) || gold.includes(gen)) return 'Partial match';
    const genLines = gen.split('\n'), goldLines = gold.split('\n');
    return 'Diff: ' + genLines.length + ' generated vs ' + goldLines.length + ' gold lines, ' + genLines.filter(l => goldLines.includes(l)).length + ' matching';
  }

  computeMetrics(): SWEBenchMetrics {
    if (this.results.length === 0) return { totalTasks: 0, resolved: 0, resolveRate: 0, avgDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0, totalCostUsd: 0, avgCostPerTask: 0, totalTokens: 0, avgTokensPerTask: 0, avgAttemptsPerTask: 0, errors: 0, timeouts: 0 };
    const resolved = this.results.filter(r => r.resolved);
    const durations = this.results.map(r => r.durationMs).sort((a, b) => a - b);
    const n = durations.length;
    return { totalTasks: this.results.length, resolved: resolved.length, resolveRate: resolved.length / this.results.length,
      avgDurationMs: durations.reduce((s, d) => s + d, 0) / n, medianDurationMs: durations[Math.floor(n / 2)], p95DurationMs: durations[Math.floor(n * 0.95)],
      totalCostUsd: this.results.reduce((s, r) => s + r.costUsd, 0), avgCostPerTask: this.results.reduce((s, r) => s + r.costUsd, 0) / n,
      totalTokens: this.results.reduce((s, r) => s + r.tokensUsed, 0), avgTokensPerTask: this.results.reduce((s, r) => s + r.tokensUsed, 0) / n,
      avgAttemptsPerTask: this.results.reduce((s, r) => s + r.attempts, 0) / n,
      errors: this.results.filter(r => r.finalStatus === 'error').length, timeouts: this.results.filter(r => r.finalStatus === 'timeout').length };
  }

  toCsv(): string {
    const header = 'taskId,resolved,durationMs,costUsd,tokens,attempts,resolvedBy,finalStatus';
    const rows = this.results.map(r => r.taskId + ',' + r.resolved + ',' + r.durationMs + ',' + r.costUsd + ',' + r.tokensUsed + ',' + r.attempts + ',' + r.resolvedBy + ',' + r.finalStatus);
    return [header, ...rows].join('\n');
  }

  getSortableRanking(): Array<{ taskId: string; score: number; resolved: boolean }> {
    return this.results.map(r => ({ taskId: r.taskId, score: r.resolved ? 1 - (r.durationMs / 600000) : 0, resolved: r.resolved })).sort((a, b) => b.score - a.score);
  }

  getResults(): SWEBenchResult[] { return [...this.results]; }
  getTasks(): SWEBenchTask[] { return [...this.tasks]; }
  reset(): void { this.tasks = []; this.results = []; }
}