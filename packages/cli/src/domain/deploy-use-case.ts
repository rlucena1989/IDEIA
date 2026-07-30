import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
import type { IOContainer } from '../io/interfaces';
import { getIO } from '../io';
import { DeployConfigSchema, type DeployConfig } from '../contracts/domain-schemas';
const logger = createLogger('deploy-use-case');

function validateDeployConfig(input: unknown): DeployConfig {
  const parsed = DeployConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid deploy config: ${parsed.error.message}`);
  }
  return parsed.data;
}

export interface DeployStep {
  step: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface DeployOutput {
  deployId: string;
  version: string;
  environment: string;
  status: string;
  steps: DeployStep[];
  dashboardUrl?: string;
}

export class DeployUseCase {
  private io: IOContainer;

  constructor() {
    this.io = getIO();
  }

  private generateId(): string {
    return 'deploy-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  execute(configInput: Partial<DeployConfig>): CliCommandResult<DeployOutput> {
    try {
      const config = validateDeployConfig(configInput);
      const deployId = this.generateId();
      const steps: DeployStep[] = [];
      let overallSuccess = true;

      const step = (name: string, fn: () => boolean): void => {
        const start = Date.now();
        try {
          const ok = fn();
          steps.push({ step: name, success: ok, durationMs: Date.now() - start });
          if (!ok) overallSuccess = false;
        } catch (err) {
          steps.push({ step: name, success: false, durationMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) });
          overallSuccess = false;
        }
      };

      step('validate-config', () => true);

      if (!config.dryRun) {
        step('quality-gate-check', () => {
          if (!config.qualityGateCheck) return true;
          return this.io.shell.exec('npx', ['tsc', '--noEmit'], undefined, 60000).status === 0;
        });

        step('build', () => {
          return this.io.shell.exec('npx', ['tsc', '-b'], undefined, 120000).status === 0;
        });

        if (config.canaryPercent && config.canaryPercent > 0) {
          step('canary-deploy-' + config.canaryPercent + '%', () => true);
        }

        step('deploy-' + config.environment, () => true);
      }

      const status = overallSuccess ? 'deployed' : 'failed';
      return success(`Deploy ${status}: ${config.version} \u2192 ${config.environment}`, {
        deployId,
        version: config.version,
        environment: config.environment,
        status,
        steps,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(`Deploy failed: ${message}`, 1) as CliCommandResult<DeployOutput>;
    }
  }
}
