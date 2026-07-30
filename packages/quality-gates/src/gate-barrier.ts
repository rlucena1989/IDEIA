import { GateDefinition, GateResult, GateStatus, BarrierDecision } from './types';
import { createLogger } from '@ideia/logger';

export class GateBarrier {
  private gates: GateDefinition[] = [];

  registerGate(gate: GateDefinition): void {
    this.gates.push(gate);
  }

  registerGates(gates: GateDefinition[]): void {
    this.gates.push(...gates);
  }

  async evaluate(results: GateResult[]): Promise<BarrierDecision> {
    const blockedBy: string[] = [];
    const warnings: string[] = [];
    let passedCount = 0;

    for (const result of results) {
      if (result.status === 'passed') {
        passedCount++;
        continue;
      }
      if (result.status === 'failed' && result.blocking) {
        blockedBy.push(`${result.gate} (${result.severity}): ${result.error ?? 'failed'}`);
      }
      if (result.status === 'failed' && !result.blocking) {
        warnings.push(`${result.gate}: ${result.error ?? 'failed'}`);
      }
    }

    const canProceed = blockedBy.length === 0;
    const confidence = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;

    return { canProceed, blockedBy, warnings, confidence };
  }

  getRegisteredGates(): GateDefinition[] {
    return [...this.gates];
  }

  isBlockingGate(name: string): boolean {
    const gate = this.gates.find(g => g.name === name);
    return gate?.blocking ?? false;
  }

  getGatesByLayer(layer: string): GateDefinition[] {
    return this.gates.filter(g => g.layer === layer);
  }
}
