import { BenchmarkReport, BenchmarkResult, BenchmarkScenario } from './types';
export class AgentBenchmark {
  private scenarios: BenchmarkScenario[] = [];
  addScenario(scenario: BenchmarkScenario): void { this.scenarios.push(scenario); }
  addScenarios(scenarios: BenchmarkScenario[]): void { this.scenarios.push(...scenarios); }
  run(agentName: string, executor: (task: string) => Promise<{ output: string; latencyMs: number; tokensUsed: number; costUsd: number }>): Promise<BenchmarkReport> {
    return this.runAll(agentName, executor);
  }
  async runAll(agentName: string, executor: (task: string) => Promise<{ output: string; latencyMs: number; tokensUsed: number; costUsd: number }>): Promise<BenchmarkReport> {
    const results: BenchmarkResult[] = [];
    for (const scenario of this.scenarios) {
      const start = Date.now();
      try {
        const result = await executor(scenario.task);
        const accuracy = scenario.expectedOutput ? this.calcAccuracy(result.output, scenario.expectedOutput) : 1;
        results.push({ scenario: scenario.name, passed: accuracy >= 0.7, latencyMs: result.latencyMs, tokensUsed: result.tokensUsed, costUsd: result.costUsd, accuracy });
      } catch (_e) {
        results.push({ scenario: scenario.name, passed: false, latencyMs: Date.now() - start, tokensUsed: 0, costUsd: 0, accuracy: 0, error: String(_e) });
      }
    }
    const passed = results.filter(r => r.passed).length;
    const avgLatency = results.reduce((s, r) => s + r.latencyMs, 0) / results.length;
    const avgAccuracy = results.reduce((s, r) => s + r.accuracy, 0) / results.length;
    const totalCost = results.reduce((s, r) => s + r.costUsd, 0);
    const score = Math.round((passed / results.length * 50) + (avgAccuracy * 50));
    return { agentName, timestamp: new Date().toISOString(), totalScenarios: results.length, passed, failed: results.length - passed, avgLatency, avgAccuracy, totalCost, results, score };
  }
  private calcAccuracy(output: string, expected: string): number {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const o = norm(output), e = norm(expected);
    if (o === e) return 1;
    const words = e.split(' '); const matched = words.filter(w => o.includes(w)).length;
    return matched / words.length;
  }
}
export function createAgentBenchmark(): AgentBenchmark { return new AgentBenchmark(); }
