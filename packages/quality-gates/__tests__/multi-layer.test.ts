import { MultiLayerVerifier } from '../src/multi-layer';

describe('MultiLayerVerifier', () => {
  const verifier = new MultiLayerVerifier();

  it('runs all layers sequentially', async () => {
    const result = await verifier.verifyAll(async (gate) => ({
      gate: gate.name,
      status: 'passed',
      severity: gate.severity,
      layer: gate.layer,
      durationMs: 10,
      blocking: gate.blocking,
    }));

    expect(result.layers.length).toBeGreaterThanOrEqual(3);
    expect(result.layers[0].layer).toBe('syntax');
  });

  it('reports allPassed correctly', async () => {
    const result = await verifier.verifyAll(async (gate) => ({
      gate: gate.name,
      status: gate.name === 'lint' ? 'failed' : 'passed',
      severity: gate.severity,
      layer: gate.layer,
      durationMs: 10,
      error: gate.name === 'lint' ? 'error' : undefined,
      blocking: gate.blocking,
    }));

    expect(result.allPassed).toBe(false);
  });

  it('filters gates by layer', () => {
    const syntaxGates = verifier.getGatesByLayer('syntax');
    expect(syntaxGates.length).toBeGreaterThan(0);
    expect(syntaxGates.every(g => g.layer === 'syntax')).toBe(true);
  });
});
