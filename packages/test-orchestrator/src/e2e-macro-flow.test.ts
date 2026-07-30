import { TestOrchestrator, TestSuite} from './test-orchestrator';
import { createTestOrchestrator } from './test-orchestrator';

export interface MacroTestConfig {
  skipLint?: boolean;
  skipTypecheck?: boolean;
  skipUnitTests?: boolean;
  skipIntegrationTests?: boolean;
  skipContractTests?: boolean;
  parallel?: boolean;
  timeoutMultiplier?: number;
}

export interface MacroTestResult {
  overall: 'passed' | 'failed' | 'partial';
  stages: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    durationMs: number;
    details?: string;
  }>;
  totalDurationMs: number;
  startedAt: string;
  completedAt: string;
}

export class MacroE2ETestFlow {
  private orchestrator: TestOrchestrator;

  constructor() {
    this.orchestrator = createTestOrchestrator();
  }

  async runFullIntegrationTest(config?: MacroTestConfig): Promise<MacroTestResult> {
    const startedAt = new Date().toISOString();
    const stages: MacroTestResult['stages'] = [];
    const multiplier = config?.timeoutMultiplier || 1;

    const stagesToRun: Array<{
      name: string;
      suite: TestSuite;
      skip: boolean;
    }> = [
      {
        name: 'Lint Check',
        suite: {
          name: 'lint',
          path: process.cwd(),
          command: 'npx',
          args: ['eslint', 'packages/', '--ext', '.ts', '--no-error-on-unmatched-pattern'],
          type: 'unit',
          timeout: 60000 * multiplier,
          required: false,
        },
        skip: config?.skipLint || false,
      },
      {
        name: 'TypeScript Type Check',
        suite: {
          name: 'typecheck',
          path: process.cwd(),
          command: 'npx',
          args: ['tsc', '--noEmit'],
          type: 'unit',
          timeout: 120000 * multiplier,
          required: true,
        },
        skip: config?.skipTypecheck || false,
      },
      {
        name: 'Unit Tests',
        suite: {
          name: 'test:unit',
          path: process.cwd(),
          command: 'npx',
          args: ['jest', '--passWithNoTests'],
          type: 'unit',
          timeout: 180000 * multiplier,
          required: true,
        },
        skip: config?.skipUnitTests || false,
      },
      {
        name: 'Integration Tests',
        suite: {
          name: 'test:integration',
          path: process.cwd(),
          command: 'npx',
          args: ['jest', '--config', 'jest.e2e.config.js', '--passWithNoTests'],
          type: 'integration',
          timeout: 300000 * multiplier,
          required: false,
        },
        skip: config?.skipIntegrationTests || false,
      },
      {
        name: 'Contract Tests',
        suite: {
          name: 'test:contract',
          path: process.cwd(),
          command: 'npx',
          args: ['jest', '--config', 'jest.contract.config.js', '--passWithNoTests'],
          type: 'contract',
          timeout: 120000 * multiplier,
          required: false,
        },
        skip: config?.skipContractTests || false,
      },
    ];

    const suitesToExecute = stagesToRun.filter(s => !s.skip);
    const suites = suitesToExecute.map(s => s.suite);

    let overallStatus: 'passed' | 'failed' | 'partial' = 'passed';

    if (config?.parallel && suitesToExecute.length > 1) {
      const report = await this.orchestrator.runParallel(suites);
      
      for (const result of report.suites) {
        const stageName = stagesToRun.find(s => s.suite.name === result.suite)?.name || result.suite;
        stages.push({
          name: stageName,
          status: result.passed ? 'passed' : 'failed',
          durationMs: result.durationMs,
          details: result.output.slice(0, 200),
        });
      }

      overallStatus = report.status === 'passed' ? 'passed' : 'failed';
    } else {
      for (const stage of stagesToRun) {
        const start = Date.now();
        try {
          const result = await this.orchestrator.runSuite(stage.suite);
          stages.push({
            name: stage.name,
            status: result.passed ? 'passed' : 'failed',
            durationMs: Date.now() - start,
            details: result.output.slice(0, 200),
          });

          if (!result.passed && stage.suite.required) {
            overallStatus = 'failed';
            break;
          } else if (!result.passed) {
            overallStatus = 'partial';
          }
        } catch (error) {
          stages.push({
            name: stage.name,
            status: 'failed',
            durationMs: Date.now() - start,
            details: String(error),
          });
          overallStatus = 'failed';
          break;
        }
      }
    }

    return {
      overall: overallStatus,
      stages,
      totalDurationMs: stages.reduce((sum, s) => sum + s.durationMs, 0),
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  async runQuickSmokeTest(): Promise<MacroTestResult> {
    return this.runFullIntegrationTest({
      skipLint: true,
      skipIntegrationTests: true,
      skipContractTests: true,
      parallel: false,
      timeoutMultiplier: 0.5,
    });
  }

  async runComprehensiveTest(): Promise<MacroTestResult> {
    return this.runFullIntegrationTest({
      parallel: true,
      timeoutMultiplier: 1.5,
    });
  }
}

export function createMacroE2ETestFlow(): MacroE2ETestFlow {
  return new MacroE2ETestFlow();
}
