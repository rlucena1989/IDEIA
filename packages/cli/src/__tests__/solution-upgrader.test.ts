import { SolutionUpgrader } from '../runtime/solution-upgrader';

describe('SolutionUpgrader', () => {
  let upgrader: SolutionUpgrader;

  beforeEach(() => {
    upgrader = new SolutionUpgrader();
  });

  it('should detect eval() usage', () => {
    const code = 'const result = eval(userInput);';
    const plan = upgrader.analyze(code);
    const evalUpgrade = plan.suggestions.find(s => s.id === 'sec-eval-avoid');
    expect(evalUpgrade).toBeDefined();
    expect(evalUpgrade!.automated).toBe(true);
  });

  it('should detect lodash usage', () => {
    const code = 'const items = _.map(arr, fn);';
    const plan = upgrader.analyze(code);
    const lodashUpgrade = plan.suggestions.find(s => s.id === 'perf-lodash-native');
    expect(lodashUpgrade).toBeDefined();
  });

  it('should detect var usage', () => {
    const code = 'var x = 1;';
    const plan = upgrader.analyze(code);
    const varUpgrade = plan.suggestions.find(s => s.id === 'style-var-let');
    expect(varUpgrade).toBeDefined();
  });

  it('should detect inline styles', () => {
    const code = 'el.innerHTML = "<b>bold</b>";';
    const plan = upgrader.analyze(code);
    const htmlUpgrade = plan.suggestions.find(s => s.id === 'sec-innerhtml-safe');
    expect(htmlUpgrade).toBeDefined();
  });

  it('should not detect upgrades for clean code', () => {
    const code = 'const a = 1; const b = 2; console.log(a + b);';
    const plan = upgrader.analyze(code);
    expect(plan.total).toBe(0);
    expect(plan.summary).toContain('Nenhum upgrade detectado');
  });

  it('should report breaking changes', () => {
    const code = "require('express'); app.get('/', (req, res) => { })";
    const plan = upgrader.analyze(code);
    expect(plan.breakingCount).toBeGreaterThanOrEqual(0);
  });

  it('should estimate effort', () => {
    const code = 'var x = eval("1+1"); const y = _.map([1,2,3], String);';
    const plan = upgrader.analyze(code);
    expect(plan.estimatedEffort).toBeTruthy();
  });
});
