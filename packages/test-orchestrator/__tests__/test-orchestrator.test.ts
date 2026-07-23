import { describe, it, expect } from '@jest/globals';
import { TestOrchestrator, createTestOrchestrator, TestSuite, TestResult } from '../src/test-orchestrator';
import { QualityDashboard, createQualityDashboard } from '../src/quality-dashboard';

describe('TestOrchestrator', () => {
  it('should create with factory', () => {
    const o = createTestOrchestrator();
    expect(o).toBeDefined();
    expect(o.getSuites()).toHaveLength(0);
  });

  it('should register suites', () => {
    const o = createTestOrchestrator();
    o.registerSuite({ name: 'test', path: '.', command: 'echo', args: ['ok'], type: 'unit', timeout: 5000, required: true });
    expect(o.getSuites()).toHaveLength(1);
  });

  it('should register multiple suites', () => {
    const o = createTestOrchestrator();
    o.registerSuites([
      { name: 'a', path: '.', command: 'echo', type: 'unit', timeout: 5000, required: true },
      { name: 'b', path: '.', command: 'echo', type: 'unit', timeout: 5000, required: false },
    ]);
    expect(o.getSuites()).toHaveLength(2);
  });

  it('should return default suites', () => {
    const o = createTestOrchestrator();
    const suites = o.getDefaultSuites();
    expect(suites.length).toBeGreaterThanOrEqual(6);
    expect(suites.map(s => s.name)).toContain('lint');
    expect(suites.map(s => s.name)).toContain('test:unit');
    expect(suites.map(s => s.name)).toContain('typecheck');
  });

  it('should parse jest output', () => {
    const o = createTestOrchestrator();
    const output = 'Tests: 15 passed, 15 total';
    const result = o.parseOutput(output);
    expect(result.total).toBe(15);
    expect(result.passed).toBe(15);
    expect(result.failed).toBe(0);
  });

  it('should parse failed tests from output', () => {
    const o = createTestOrchestrator();
    const output = 'Tests: 2 failed, 13 passed, 15 total';
    const result = o.parseOutput(output);
    expect(result.total).toBe(15);
    expect(result.failed).toBe(2);
    expect(result.passed).toBe(13);
  });

  it('should return empty on unrecognized output', () => {
    const o = createTestOrchestrator();
    const result = o.parseOutput('unrecognized output format');
    expect(result.total).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('should run a suite that succeeds', async () => {
    const o = createTestOrchestrator();
    const cmd = process.platform === 'win32' ? 'cmd' : 'echo';
    const args = process.platform === 'win32' ? ['/c', 'echo', 'hello'] : ['hello'];
    const suite: TestSuite = { name: 'echo', path: '.', command: cmd, args, type: 'unit', timeout: 5000, required: false };
    const result = await o.runSuite(suite);
    expect(result.passed).toBe(true);
    expect(result.suite).toBe('echo');
    expect(result.output).toContain('hello');
  });

  it('should run a suite that fails', async () => {
    const o = createTestOrchestrator();
    const suite: TestSuite = { name: 'fail', path: '.', command: 'cmd-no-exist-12345', type: 'unit', timeout: 5000, required: false };
    const result = await o.runSuite(suite);
    expect(result.passed).toBe(false);
    expect(result.suite).toBe('fail');
  });
});

describe('QualityDashboard', () => {
  let dashboard: QualityDashboard;

  beforeEach(() => {
    dashboard = createQualityDashboard();
  });

  it('should compute code score from metrics', () => {
    const score = dashboard.computeScore('code', { testPassRate: 85, coverage: 70, lintErrors: 2 });
    expect(score.dimension).toBe('code');
    expect(score.score).toBeGreaterThan(0);
    expect(score.details.length).toBeGreaterThanOrEqual(2);
  });

  it('should compute security score', () => {
    const score = dashboard.computeScore('security', { vulns: 3 });
    expect(score.score).toBe(70);
    expect(score.details).toContain('Vulnerabilities: 3 (-30pts)');
  });

  it('should compute performance score from TTFT', () => {
    const fast = dashboard.computeScore('performance', { ttft: 50 });
    expect(fast.score).toBe(90);

    const slow = dashboard.computeScore('performance', { ttft: 5000 });
    expect(slow.score).toBe(30);
  });

  it('should calculate overall weighted score', () => {
    const dimensions = [
      { dimension: 'code' as const, score: 100, weight: 0.2, details: [] },
      { dimension: 'security' as const, score: 50, weight: 0.2, details: [] },
    ];
    const overall = dashboard.getOverallScore(dimensions);
    expect(overall).toBe(75);
  });

  it('should return 0 for empty dimensions', () => {
    expect(dashboard.getOverallScore([])).toBe(0);
  });

  it('should compute gate status from results', () => {
    const gates = dashboard.getGatesStatus([
      { name: 'lint', passed: true },
      { name: 'test:unit', passed: false },
    ]);
    expect(gates).toHaveLength(2);
    const lintGate = gates.find(g => g.name === 'lint');
    expect(lintGate?.passed).toBe(true);
    expect(lintGate?.required).toBe(false);
  });

  it('should record history', () => {
    dashboard.recordHistory(85, [
      { dimension: 'code', score: 90, weight: 0.2, details: [] },
    ]);
    expect(dashboard.getHistory()).toHaveLength(1);
    expect(dashboard.getHistory()[0].overallScore).toBe(85);
  });

  it('should generate full report', () => {
    const report = dashboard.generateReport(
      [{ name: 'test:unit', passed: true }],
      { testPassRate: 90, coverage: 80 }
    );
    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.dimensions).toHaveLength(6);
    expect(report.gates).toHaveLength(1);
    expect(report.timestamp).toBeDefined();
    expect(report.history).toHaveLength(1);
  });
});
