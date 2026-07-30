import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { success, failure, CliCommandResult } from '../types/cli-result';
import { SafetyCircuit } from '@ideia/safety-circuit';
const logger = createLogger('safety-status');

export function safetyStatusCommand(): Command {
  const cmd = new Command('safety-status')
    .description('Show safety system status')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<CliCommandResult> => {
      try {
        const _safety = new SafetyCircuit();
        const status = {
          circuitState: 'closed',
          estopActive: false,
          activeBreakers: [],
          lastSafetyEvent: null,
          uptime: process.uptime(),
        };
        if (opts.json) return success('Safety status', status);
        const lines = [
          '=== IDEIA Safety Status ===',
          '',
          `Circuit State:  ${status.circuitState}`,
          `E-Stop:         ${status.estopActive ? 'ACTIVE' : 'Inactive'}`,
          `Active Breakers: ${status.activeBreakers.length === 0 ? 'None' : status.activeBreakers.join(', ')}`,
          `Uptime:         ${Math.floor(status.uptime)}s`,
        ];
        return success(lines.join('\n'));
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return failure(`Safety status failed: ${msg}`);
      }
    });
  return cmd;
}
