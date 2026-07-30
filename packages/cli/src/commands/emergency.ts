import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { ControlTower } from '@ideia/control-tower';
import { createSafetyCircuit } from '@ideia/safety-circuit';
import { createEmergencyStop } from '@ideia/safety-circuit';
import { createBus, EventBus } from '@ideia/event-bus';
import { printHeader, printLine, printResult } from '../utils/output';

export function emergencyCommand(): Command {
  const cmd = new Command('emergency')
    .description('Emergency controls: stop, pause, rollback, resume');

  let _eventBus: EventBus;
  async function getBus(): Promise<EventBus> {
    if (!_eventBus) _eventBus = await createBus() as unknown as EventBus;
    return _eventBus;
  }
  async function getTower(): Promise<ControlTower> {
    const bus = await getBus();
    return new ControlTower(bus, undefined, createSafetyCircuit(bus), createEmergencyStop(bus));
  }

  cmd
    .command('stop')
    .description('Emergency stop - halts all autonomous cycles immediately')
    .option('--reason <reason>', 'Reason for emergency stop')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const tower = await getTower();
        await tower.emergencyStop(opts.reason || 'User requested emergency stop');
        const status = tower.getStatus();
        if (opts.json) { printLine(JSON.stringify({ status: 'stopped', mode: status.mode, autonomyLevel: status.autonomyLevel }, null, 2)); return; }
        printHeader('Emergency Stop');
        printResult('System halted', true);
        printLine(`Mode: ${status.mode}`);
        printLine(`Autonomy: ${status.autonomyLevel}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Emergency stop failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('pause')
    .description('Pause all autonomous cycles')
    .option('--reason <reason>', 'Reason for pause')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const tower = await getTower();
        await tower.emergencyPause(opts.reason || 'User requested pause');
        const status = tower.getStatus();
        if (opts.json) { printLine(JSON.stringify({ status: 'paused', mode: status.mode }, null, 2)); return; }
        printHeader('Emergency Pause');
        printResult('System paused', true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Pause failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('rollback')
    .argument('[id]', 'Rollback point ID to revert')
    .description('Rollback last or specific autonomous change')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      try {
        const tower = await getTower();
        await tower.emergencyRollback(id || 'last');
        if (opts.json) { printLine(JSON.stringify({ status: 'rolled-back', id: id || 'last' }, null, 2)); return; }
        printHeader('Emergency Rollback');
        printResult(`Rollback ${id || 'last'} completed`, true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Rollback failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('resume')
    .description('Resume normal operation after emergency stop/pause')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const tower = await getTower();
        await tower.emergencyResume();
        if (opts.json) { printLine(JSON.stringify({ status: 'resumed' }, null, 2)); return; }
        printHeader('Resume');
        printResult('System resumed', true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Resume failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
