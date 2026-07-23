import { createQualityGateSystem } from '../src/index';
import { GateResult } from '../src/types';

const pass = (name: string, layer?: string, severity?: string): GateResult => ({
  gate: name, status: 'passed' as const, severity: (severity ?? 'error') as GateResult['severity'], layer: (layer ?? 'syntax') as GateResult['layer'], durationMs: 10, blocking: true,
});

const fail = (name: string): GateResult => ({
  gate: name, status: 'failed' as const, severity: 'error' as const, layer: 'functional' as const, durationMs: 10, error: 'fail', blocking: true,
});

describe('QualityGateSystem (integration)', () => {
  const qgs = createQualityGateSystem();

  qgs.addGate('lint', 'Sem erros de lint', 'error', 'syntax', true);
  qgs.addGate('tests', 'Testes passando', 'error', 'functional', true);
  qgs.addGate('security', 'Sem vulnerabilidades', 'critical', 'systemic', true);

  it('executes all gates and returns decision', async () => {
    const result = await qgs.executeAll(async (gate) => ({
      gate: gate.name,
      status: 'passed' as const,
      severity: gate.severity,
      layer: gate.layer,
      durationMs: 10,
      blocking: gate.blocking,
    }));

    expect(result.decision.canProceed).toBe(true);
    expect(result.confidence.overall).toBeGreaterThanOrEqual(70);
    expect(result.layers.layers.length).toBeGreaterThanOrEqual(2);
  });

  it('detects regression', () => {
    const regression = qgs.detectRegression([pass('tests')], [fail('tests')]);
    expect(regression.hasRegression).toBe(true);
  });
});
