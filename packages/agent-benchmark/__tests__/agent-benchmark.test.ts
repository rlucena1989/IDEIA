import { AgentBenchmark } from '../src/agent-benchmark';
describe('AgentBenchmark', () => {
  it('should run scenarios and produce report', async () => {
    const bench = new AgentBenchmark();
    bench.addScenario({ name: 'Hello', description: 'Say hello', task: 'Say hello', expectedOutput: 'hello', timeout: 5000 });
    const report = await bench.run('test-agent', async () => ({ output: 'hello world', latencyMs: 100, tokensUsed: 10, costUsd: 0.001 }));
    expect(report.totalScenarios).toBe(1);
    expect(report.passed).toBe(1);
    expect(report.score).toBeGreaterThan(0);
  });
  it('should handle failures', async () => {
    const bench = new AgentBenchmark();
    bench.addScenario({ name: 'Fail', description: 'Will fail', task: 'fail', timeout: 1000 });
    const report = await bench.run('failing-agent', async () => { throw new Error('timeout'); });
    expect(report.failed).toBe(1);
    expect(report.score).toBe(0);
  });
  it('should calculate accuracy', () => {
    const bench = new AgentBenchmark();
    expect((bench as any).calcAccuracy('hello world', 'hello')).toBeGreaterThan(0);
    expect((bench as any).calcAccuracy('foo', 'bar')).toBe(0);
  });
});
