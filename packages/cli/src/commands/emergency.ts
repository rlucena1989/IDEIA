import { Command } from 'commander';
import { ControlTower } from '@ideia/control-tower';
import { SafetyCircuit, createSafetyCircuit } from '@ideia/safety-circuit';
import { EmergencyStop, createEmergencyStop } from '@ideia/safety-circuit';
import { createBus } from '@ideia/event-bus';
import { printHeader, printLine, printResult } from '../utils/output';

export function emergencyCommand(): Command {
  const cmd = new Command('emergency')
    .description('Emergency controls: stop, pause, rollback, resume');

  const eventBus = await createBus();
  const safetyCircuit = createSafetyCircuit(eventBus);
  const emergencyStop = createEmergencyStop(eventBus);
  const controlTower = new ControlTower(eventBus, undefined, safetyCircuit, emergencyStop);

  cmd
    .command('stop')
    .description('Emergency stop - halts all autonomous cycles immediately')
    .option('--reason <reason>', 'Reason for emergency stop')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        await controlTower.emergencyStop(opts.reason || 'User requested emergency stop');
        const status = controlTower.getStatus();
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
        await controlTower.emergencyPause(opts.reason || 'User requested pause');
        const status = controlTower.getStatus();
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
        await controlTower.emergencyRollback(id || 'last');
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
        await controlTower.emergencyResume();
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
