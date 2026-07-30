import { readFileSync, existsSync } from 'node:fs';
import { createLogger } from '@ideia/logger';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import { TestOrchestrator } from '@ideia/test-orchestrator';

export interface QualityGateCheck {
  name: string;
  command: string;
  args: string[];
  required: boolean;
  timeout: number;
}

export type QualityGateLevel = 'commit' | 'pr' | 'release' | 'sprint';

export interface QualityGatesConfig {
  commit?: QualityGateCheck[];
  pr?: QualityGateCheck[];
  release?: QualityGateCheck[];
  sprint?: QualityGateCheck[];
}

export interface GateExecutionResult {
  name: string;
  passed: boolean;
  output: string;
  durationMs: number;
}

export interface GateRunReport {
  passed: boolean;
  checks: GateExecutionResult[];
}

export interface QualityGatesRunReport {
  commit: GateRunReport;
  pr: GateRunReport;
  release: GateRunReport;
  sprint: GateRunReport;
}

function buildDefaultConfig(): QualityGatesConfig {
  return {
    commit: [
      { name: 'lint-staged', command: 'npx', args: ['lint-staged'], required: true, timeout: 30000 },
      { name: 'commitlint', command: 'npx', args: ['commitlint', '--edit'], required: true, timeout: 10000 },
      { name: 'tsc', command: 'npx', args: ['tsc', '--noEmit'], required: true, timeout: 60000 },
      { name: 'jest', command: 'npx', args: ['jest', '--changedSince', 'HEAD~1'], required: true, timeout: 120000 },
      { name: 'talisman', command: 'npx', args: ['talisman', '--pattern'], required: false, timeout: 30000 },
    ],
    pr: [
      { name: 'eslint', command: 'npx', args: ['eslint', '.', '--max-warnings=0'], required: true, timeout: 60000 },
      { name: 'typecheck', command: 'npx', args: ['tsc', '--noEmit'], required: true, timeout: 60000 },
      { name: 'coverage', command: 'npx', args: ['jest', '--coverage'], required: true, timeout: 120000 },
      { name: 'boundaries', command: 'npx', args: ['dependency-cruise', '.'], required: false, timeout: 30000 },
      { name: 'security-scan', command: 'npx', args: ['snyk', 'test'], required: false, timeout: 120000 },
      { name: 'contract-check', command: 'npx', args: ['pact', 'verify'], required: false, timeout: 60000 },
    ],
    release: [
      { name: 'e2e', command: 'npx', args: ['playwright', 'test'], required: true, timeout: 300000 },
      { name: 'performance', command: 'npx', args: ['k6', 'run'], required: true, timeout: 120000 },
      { name: 'security', command: 'npx', args: ['snyk', 'test', '--all-projects'], required: true, timeout: 120000 },
      { name: 'audit', command: 'npx', args: ['audit-ci', '--moderate'], required: true, timeout: 60000 },
      { name: 'sbom', command: 'npx', args: ['sbom-utility'], required: false, timeout: 30000 },
    ],
    sprint: [
      { name: 'coverage-check', command: 'npx', args: ['jest', '--coverage'], required: true, timeout: 10000 },
      { name: 'tech-debt', command: 'npx', args: ['grep', '-r', 'TODO\\|FIXME', '--include=*.ts', '.'], required: false, timeout: 10000 },
      { name: 'test-flakiness', command: 'npx', args: ['jest', '--repeat', '3'], required: false, timeout: 180000 },
    ],
  };
}

export class QualityGatesRunner {
  private config: QualityGatesConfig;
  private orchestrator: TestOrchestrator;

  constructor(configOrPath?: QualityGatesConfig | string) {
    if (!configOrPath) {
      this.config = buildDefaultConfig();
    } else if (typeof configOrPath === 'string') {
      this.config = this.loadConfigFromFile(configOrPath);
    } else {
      this.config = { ...buildDefaultConfig(), ...configOrPath };
    }
    this.orchestrator = new TestOrchestrator();
  }

  static getDefaultConfig(): QualityGatesConfig {
    return buildDefaultConfig();
  }

  private loadConfigFromFile(filePath: string): QualityGatesConfig {
    const resolvedPath = resolve(filePath);
    if (!existsSync(resolvedPath)) {
      return buildDefaultConfig();
    }
    const content = readFileSync(resolvedPath, 'utf-8');
    if (resolvedPath.endsWith('.yaml') || resolvedPath.endsWith('.yml')) {
      return load(content) as QualityGatesConfig;
    }
    return JSON.parse(content) as QualityGatesConfig;
  }

  async runGate(gateLevel: QualityGateLevel): Promise<GateExecutionResult[]> {
    const checks = this.config[gateLevel];
    if (!checks || checks.length === 0) {
      return [];
    }

    const results: GateExecutionResult[] = [];

    for (const check of checks) {
      const suite = {
        name: check.name,
        path: process.cwd(),
        command: check.command,
        args: check.args,
        type: 'unit' as const,
        timeout: check.timeout,
        required: check.required,
      };

      this.orchestrator.registerSuite(suite);
      const testResult = await this.orchestrator.runSuite(suite);

      results.push({
        name: check.name,
        passed: testResult.passed,
        output: testResult.output.slice(0, 500),
        durationMs: testResult.durationMs,
      });

      if (check.required && !testResult.passed) {
        break;
      }
    }

    return results;
  }

  async runAllGates(): Promise<QualityGatesRunReport> {
    const levels: QualityGateLevel[] = ['commit', 'pr', 'release', 'sprint'];
    const reports: Partial<QualityGatesRunReport> = {};

    for (const level of levels) {
      const checks = await this.runGate(level);
      reports[level] = {
        passed: checks.every(c => c.passed),
        checks,
      };
    }

    return reports as QualityGatesRunReport;
  }
}

export function createQualityGatesRunner(config?: QualityGatesConfig | string): QualityGatesRunner {
  return new QualityGatesRunner(config);
}
