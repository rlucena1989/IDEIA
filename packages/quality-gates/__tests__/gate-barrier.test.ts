import { GateBarrier } from '../src/gate-barrier';

describe('GateBarrier', () => {
  const barrier = new GateBarrier();
  barrier.registerGate({ name: 'lint', description: '', severity: 'error', layer: 'syntax', timeoutMs: 30000, blocking: true });
  barrier.registerGate({ name: 'tests', description: '', severity: 'error', layer: 'functional', timeoutMs: 30000, blocking: false });

  it('blocks when blocking gates fail', async () => {
    const decision = await barrier.evaluate([
      { gate: 'lint', status: 'passed', severity: 'error', layer: 'syntax', durationMs: 100, blocking: true },
      { gate: 'tests', status: 'failed', severity: 'error', layer: 'functional', durationMs: 100, blocking: false },
    ]);
    expect(decision.canProceed).toBe(true);
  });

  it('blocks on critical failures', async () => {
    const decision = await barrier.evaluate([
      { gate: 'lint', status: 'failed', severity: 'error', layer: 'syntax', durationMs: 100, error: 'lint error', blocking: true },
    ]);
    expect(decision.canProceed).toBe(false);
    expect(decision.blockedBy.length).toBeGreaterThan(0);
  });

  it('identifies blocking gates', () => {
    expect(barrier.isBlockingGate('lint')).toBe(true);
    expect(barrier.isBlockingGate('tests')).toBe(false);
  });
});
