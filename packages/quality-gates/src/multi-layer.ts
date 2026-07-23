import { GateDefinition, GateResult, LayerResult, VerificationLayer } from './types';

const DEFAULT_GATES: GateDefinition[] = [
  { name: 'lint', description: 'Lint sem erros', severity: 'error', layer: 'syntax', timeoutMs: 30000, blocking: true },
  { name: 'typecheck', description: 'Tipos corretos', severity: 'error', layer: 'syntax', timeoutMs: 60000, blocking: true },
  { name: 'unit-tests', description: 'Testes unitários passando', severity: 'error', layer: 'functional', timeoutMs: 120000, blocking: true },
  { name: 'integration-tests', description: 'Testes de integração passando', severity: 'error', layer: 'functional', timeoutMs: 180000, blocking: false },
  { name: 'build', description: 'Build concluído', severity: 'error', layer: 'syntax', timeoutMs: 120000, blocking: true },
  { name: 'security-scan', description: 'Scan de segurança', severity: 'critical', layer: 'systemic', timeoutMs: 60000, blocking: true },
  { name: 'coverage', description: 'Cobertura mínima', severity: 'warning', layer: 'contextual', timeoutMs: 30000, blocking: false },
];

export class MultiLayerVerifier {
  private gates: GateDefinition[] = [];

  constructor(gates?: GateDefinition[]) {
    this.gates = gates ?? [...DEFAULT_GATES];
  }

  async verifyAll(
    executor: (gate: GateDefinition) => Promise<GateResult>,
  ): Promise<{ layers: LayerResult[]; allPassed: boolean; totalDurationMs: number }> {
    const layers = ['syntax', 'semantic', 'functional', 'systemic', 'contextual'] as VerificationLayer[];
    const results: LayerResult[] = [];
    const start = Date.now();
    let allPassed = true;

    for (const layer of layers) {
      const layerGates = this.gates.filter(g => g.layer === layer);
      if (layerGates.length === 0) continue;

      const gateResults: GateResult[] = [];

      for (const gate of layerGates) {
        const result = await executor(gate);
        gateResults.push(result);
      }

      const passed = gateResults.filter(r => r.status === 'passed').length;
      const layerResult: LayerResult = {
        layer,
        passed: gateResults.every(r => r.status === 'passed'),
        total: gateResults.length,
        passedCount: passed,
        failedCount: gateResults.length - passed,
        durationMs: Date.now() - start,
        gates: gateResults,
      };

      if (!layerResult.passed) allPassed = false;
      results.push(layerResult);
    }

    return { layers: results, allPassed, totalDurationMs: Date.now() - start };
  }

  verifyLayer(layer: VerificationLayer, results: GateResult[]): LayerResult {
    const passed = results.filter(r => r.status === 'passed').length;
    return {
      layer,
      passed: results.every(r => r.status === 'passed'),
      total: results.length,
      passedCount: passed,
      failedCount: results.length - passed,
      durationMs: 0,
      gates: results,
    };
  }

  addGate(gate: GateDefinition): void {
    this.gates.push(gate);
  }

  getGates(): GateDefinition[] {
    return [...this.gates];
  }

  getGatesByLayer(layer: VerificationLayer): GateDefinition[] {
    return this.gates.filter(g => g.layer === layer);
  }
}
