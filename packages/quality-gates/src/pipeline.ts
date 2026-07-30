import { PipelineStatus, GateConfig } from './types';
import { createLogger } from '@ideia/logger';
import { LintGate } from './gates/lint';
import { TypecheckGate } from './gates/typecheck';
import { TestGate } from './gates/test';
import { CoverageGate } from './gates/coverage';
import { BuildGate } from './gates/build';
const logger = createLogger('pipeline');

type GateInstance = LintGate | TypecheckGate | TestGate | CoverageGate | BuildGate;

export class Pipeline {
  private gates: GateConfig[] = [];
  private results: any[] = [];
  private startTime = 0;

  constructor(gates?: GateConfig[]) {
    if (gates) this.gates = [...gates];
  }

  addGate(config: GateConfig): void {
    this.gates.push(config);
  }

  getGates(): GateConfig[] {
    return [...this.gates];
  }

  async run(projectRoot?: string): Promise<any> {
    const root = projectRoot || process.cwd();
    this.results = [];
    this.startTime = Date.now();
    const blockedBy: string[] = [];
    const warnings: string[] = [];

    for (const gate of this.gates) {
      const runner = this.createRunner(gate.name);
      if (!runner) {
        this.results.push({
          name: gate.name,
          passed: false,
          action: gate.action,
          durationMs: 0,
          errorCount: 1,
        });
        continue;
      }

      let result: any;

      if (runner instanceof CoverageGate) {
        result = await runner.run(root, gate.script, gate.action, gate.threshold);
      } else if (runner instanceof LintGate || runner instanceof TypecheckGate || runner instanceof TestGate || runner instanceof BuildGate) {
        result = await (runner as LintGate | TypecheckGate | TestGate | BuildGate).run(root, gate.script, gate.action);
      } else {
        this.results.push({
          name: gate.name,
          passed: false,
          action: gate.action,
          durationMs: 0,
        });
        continue;
      }

      this.results.push(result);

      if (!result.passed) {
        if (gate.action === 'block') {
          blockedBy.push(`${gate.name}: failed`);
        } else {
          warnings.push(`${gate.name}: failed (non-blocking)`);
        }
      }

      if (gate.action === 'block' && !result.passed) {
        break;
      }
    }

    const totalGates = this.results.length;
    const passedGates = this.results.filter(r => r.passed).length;
    const failedGates = totalGates - passedGates;

    return {
      running: false,
      completed: true,
      passed: blockedBy.length === 0,
      totalGates,
      passedGates,
      failedGates,
      blocked: blockedBy.length > 0,
      blockedBy,
      warnings,
      results: this.results,
      durationMs: Date.now() - this.startTime,
    };
  }

  getStatus(): any | null {
    if (this.results.length === 0) return null;
    const totalGates = this.results.length;
    const passedGates = this.results.filter(r => r.passed).length;
    const failedGates = totalGates - passedGates;
    const blockedBy = this.results.filter(r => !r.passed && r.action === 'block').map(r => r.name);
    return {
      running: false,
      completed: true,
      passed: blockedBy.length === 0,
      totalGates,
      passedGates,
      failedGates,
      blocked: blockedBy.length > 0,
      blockedBy,
      warnings: this.results.filter(r => !r.passed && r.action === 'warn').map(r => `${r.name}: failed (non-blocking)`),
      results: this.results,
      durationMs: Date.now() - this.startTime,
    };
  }

  getResults(): any[] {
    return [...this.results];
  }

  private createRunner(name: string): GateInstance | null {
    switch (name) {
      case 'lint': return new LintGate();
      case 'typecheck': return new TypecheckGate();
      case 'test': return new TestGate();
      case 'coverage': return new CoverageGate();
      case 'build': return new BuildGate();
      default: return null;
    }
  }
}


