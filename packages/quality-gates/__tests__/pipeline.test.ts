import { Pipeline } from '../src/pipeline';
import { GateConfig } from '../src/types';

function makeGate(name: string, action: 'warn' | 'block', script: string): GateConfig {
  return { name, script, action, blocking: action === 'block' };
}

describe('Pipeline', () => {
  it('runs gates and returns results', async () => {
    const pipeline = new Pipeline([]);
    pipeline.addGate(makeGate('lint', 'warn', 'echo lint-ok'));
    pipeline.addGate(makeGate('build', 'block', 'echo build-ok'));
    const status = await pipeline.run();

    expect(status.completed).toBe(true);
    expect(status.totalGates).toBe(2);
    expect(status.passed).toBe(true);
    expect(status.blocked).toBe(false);
  });

  it('stops pipeline on blocking failure', async () => {
    const pipeline = new Pipeline([]);
    pipeline.addGate(makeGate('lint', 'warn', 'echo lint-warn'));
    pipeline.addGate(makeGate('build', 'block', 'exit 1'));
    pipeline.addGate(makeGate('test', 'warn', 'echo should-not-run'));
    const status = await pipeline.run();

    expect(status.blocked).toBe(true);
    expect(status.totalGates).toBe(2);
  });

  it('continues pipeline on warn failure', async () => {
    const pipeline = new Pipeline([]);
    pipeline.addGate(makeGate('lint', 'warn', 'exit 1'));
    pipeline.addGate(makeGate('build', 'warn', 'echo build-ok'));
    const status = await pipeline.run();

    expect(status.passed).toBe(true);
    expect(status.totalGates).toBe(2);
    expect(status.warnings.length).toBeGreaterThan(0);
  });

  it('getStatus returns null before run', () => {
    const pipeline = new Pipeline([]);
    expect(pipeline.getStatus()).toBeNull();
  });

  it('getResults returns results after run', async () => {
    const pipeline = new Pipeline([]);
    pipeline.addGate(makeGate('lint', 'warn', 'echo ok'));
    await pipeline.run();
    const results = pipeline.getResults();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('lint');
  });
});
