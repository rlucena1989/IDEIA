import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { createResourceManager } from '@ideia/resource-manager';
import { printHeader, printLine, printResult } from '../utils/output';
import { success, failure, CliCommandResult } from '../types/cli-result';
const logger = createLogger('resource');

export function resourceCommand(): Command {
  const cmd = new Command('resource').description('Resource monitoring and management: status, start, stop, config');

  const resourceManager = createResourceManager();

  cmd
    .command('start')
    .description('Start the resource monitor daemon')
    .option('--interval <ms>', 'Monitor interval in milliseconds')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<CliCommandResult> => {
      try {
        if (opts.interval) {
          resourceManager.updateConfig({ monitorIntervalMs: parseInt(opts.interval, 10) });
        }
        resourceManager.start();
        if (opts.json) {
          printLine(JSON.stringify({ status: 'started', running: true }, null, 2));
          return success('Started', { status: 'started', running: true });
        }
        printHeader('Resource Monitor');
        printResult('Resource monitor started', true);
        printLine(`Interval: ${resourceManager.getConfig().monitorIntervalMs}ms`);
        return success('Resource monitor started');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return failure(message);
      }
    });

  cmd
    .command('stop')
    .description('Stop the resource monitor daemon')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<CliCommandResult> => {
      try {
        resourceManager.stop();
        if (opts.json) {
          printLine(JSON.stringify({ status: 'stopped', running: false }, null, 2));
          return success('Stopped', { status: 'stopped', running: false });
        }
        printHeader('Resource Monitor');
        printResult('Resource monitor stopped', true);
        return success('Resource monitor stopped');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return failure(message);
      }
    });

  cmd
    .command('status')
    .description('Show current resource status and metrics')
    .option('--json', 'Output as JSON')
    .option('--watch', 'Watch mode — continuously update')
    .action(async (opts): Promise<void> => {
      try {
        const status = resourceManager.getStatus();

        if (opts.json) {
          printLine(JSON.stringify(status, null, 2));
          return;
        }

        printHeader('Resource Status');
        printLine(`Running: ${status.running}`);
        printLine(`Degradation mode: ${status.degradationMode}`);
        printLine(`Total self-healing actions: ${status.totalActions}`);
        printLine(`Budget OK: ${status.budgetOk}`);
        if (status.budgetViolations.length > 0) {
          status.budgetViolations.forEach((v) => printLine(`  Violation: ${v}`));
        }

        if (status.lastTrigger) {
          printHeader('Last Degradation Trigger');
          printLine(`Reason: ${status.lastTrigger.reason}`);
          printLine(`Metric: ${status.lastTrigger.metric} (${status.lastTrigger.value} / threshold ${status.lastTrigger.threshold})`);
        }

        if (opts.watch) {
          setTimeout(() => {
            resourceCommand().parse(['resource', 'status', '--watch'], { from: 'user' });
          }, 5000);
        }
        return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return;
      }
    });

  cmd
    .command('config')
    .description('Show or update resource manager configuration')
    .option('--set <key=value>', 'Set a configuration value (e.g. monitorIntervalMs=10000)')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<CliCommandResult> => {
      try {
        if (opts.set) {
          const [key, value] = opts.set.split('=');
          resourceManager.updateConfig({ [key]: isNaN(Number(value)) ? value : Number(value) } as Record<string, unknown>);
          printResult(`Config ${key} = ${value}`, true);
        }

        const config = resourceManager.getConfig();
        if (opts.json) {
          printLine(JSON.stringify(config, null, 2));
          return success('Config displayed', config);
        }

        printHeader('Resource Manager Config');
        printLine(`Monitor interval: ${config.monitorIntervalMs}ms`);
        printLine(`Auto-degrade: ${config.autoDegrade}`);
        printLine(`Self-healing: ${config.selfHealing.enabled}`);
        printLine(`Memory budget: ${config.budget.maxMemoryPercent}%`);
        printLine(`CPU budget: ${config.budget.maxCPUPercent}%`);
        printLine(`Process heap limit: ${config.budget.maxProcessHeapMB}MB`);
        return success('Resource config displayed');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return failure(message);
      }
    });

  return cmd;
}
