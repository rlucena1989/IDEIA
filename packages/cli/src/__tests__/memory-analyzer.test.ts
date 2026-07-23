import { analyzeMemory } from '../runtime/memory-analyzer';

describe('memory-analyzer', () => {
  it('should detect eval usage as critical', () => {
    const code = 'eval(userInput); const result = eval("1+1");';
    const report = analyzeMemory(code);
    const evalMetric = report.metrics.find(m => m.name === 'eval_usage');
    expect(evalMetric).toBeDefined();
    expect(evalMetric!.value).toBe(2);
    expect(evalMetric!.status).toBe('critical');
    expect(report.leakSignals.length).toBeGreaterThan(0);
  });

  it('should detect global vars', () => {
    const code = 'var x = 1;\nvar y = 2;\nvar z = 3;\nvar w = 4;\nvar v = 5;\nvar u = 6;';
    const report = analyzeMemory(code);
    const globalMetric = report.metrics.find(m => m.name === 'global_vars');
    expect(globalMetric).toBeDefined();
    expect(globalMetric!.value).toBeGreaterThanOrEqual(6);
    expect(globalMetric!.status).toBe('warning');
  });

  it('should score clean code as 100', () => {
    const code = 'const x = 1; const y = 2; console.log(x + y);';
    const report = analyzeMemory(code);
    expect(report.score).toBe(100);
    expect(report.warnings).toBe(0);
    expect(report.criticals).toBe(0);
  });

  it('should detect nested closures', () => {
    const code = 'function outer() { function inner() { function deepest() { return 1; } } }';
    const report = analyzeMemory(code);
    const closureMetric = report.metrics.find(m => m.name === 'closure_vars');
    expect(closureMetric).toBeDefined();
    expect(closureMetric!.value).toBeGreaterThan(0);
  });
});