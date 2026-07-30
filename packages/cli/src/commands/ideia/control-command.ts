import { Command } from 'commander';
import { ControlTower } from '@ideia/control-tower';
import { createSafetyCircuit, createContinuityScheduler } from '@ideia/safety-circuit';
import { createEscalationProtocol } from '@ideia/bhp';
import { success, failure, CliCommandResult } from '../../types/cli-result';

import { createLogger } from '@ideia/logger';

const log = createLogger('cli:commands:ideia:control-command');

export function ideiaControlCommand(): Command {
  const cmd = new Command('control').description('Control Tower — Safety, Autonomy, BHP, Escalation');

  cmd
    .command('status')
    .description('Show control tower status')
    .option('--json', 'Saída em JSON')
    .action((options): CliCommandResult => {
      const ct = new ControlTower();
      const status = ct.getStatus();

      if (options.json) {
        log.info(JSON.stringify(status, null, 2));
        return success('Control tower status', status);
      }

      log.info(`\n${'='.repeat(56)}`);
      log.info('  IDEIA — Control Tower Status');
      log.info(`${'='.repeat(56)}\n`);
      log.info(`  Autonomy: ${status.autonomyLevel}`);
      log.info(`  Health: ${status.healthPercent}%`);
      log.info(`  Mode: ${status.mode}`);
      log.info(`  Pending decisions: ${status.pendingDecisions}`);
      if (typeof status.activeTriggers === 'number' && status.activeTriggers > 0) {
        log.info(`  Active triggers: ${status.activeTriggers}`);
      }
      log.info(`  Timeline entries: ${status.lastAction}`);
      log.info('');
      return success('Control tower status', status);
    });

  cmd
    .command('safety')
    .description('Safety circuit status and evaluation')
    .option('--json', 'Saída em JSON')
    .action((options): CliCommandResult => {
      const sc = createSafetyCircuit();
      const status = sc.getStatus();

      if (options.json) {
        log.info(JSON.stringify(status, null, 2));
        return success('Safety circuit status', status);
      }

      log.info(`\n${'='.repeat(56)}`);
      log.info('  IDEIA — Safety Circuit');
      log.info(`${'='.repeat(56)}\n`);
      log.info(`  Mode: ${status.mode}`);
      log.info(`  Active triggers: ${status.activeTriggers.length}`);
      for (const t of status.activeTriggers) {
        log.info(`    - ${t.type}: ${t.reason}`);
      }
      log.info(`  Last decision: ${status.lastDecision?.action ?? 'None'}`);
      log.info('');
      return success('Safety circuit status', status);
    });

  cmd
    .command('emergency')
    .description('Emergency controls')
    .requiredOption('--action <action>', 'stop, pause, resume, or rollback')
    .option('--reason <reason>', 'Reason for emergency action', 'User request')
    .action((options): CliCommandResult => {
      const ct = new ControlTower();
      const action = options.action as string;

      switch (action) {
        case 'stop':
          ct.emergencyStop(options.reason);
          log.info(`\nEmergency stop: ${options.reason}\n`);
          return success(`Emergency stop: ${options.reason}`);
        case 'pause':
          ct.emergencyPause(options.reason);
          log.info(`\nEmergency pause: ${options.reason}\n`);
          return success(`Emergency pause: ${options.reason}`);
        case 'resume':
          ct.emergencyResume();
          log.info('\nEmergency resume: system recovered\n');
          return success('Emergency resume: system recovered');
        case 'rollback':
          ct.emergencyRollback(options.reason);
          log.info(`\nEmergency rollback: ${options.reason}\n`);
          return success(`Emergency rollback: ${options.reason}`);
        default:
          return failure(`Unknown action: ${action}. Use stop, pause, resume, or rollback.`);
      }
    });

  cmd
    .command('autonomy')
    .description('Set autonomy level')
    .requiredOption('--level <level>', 'passive, assisted, or autonomous')
    .action((options): CliCommandResult => {
      const level = options.level as string;
      if (!['passive', 'assisted', 'autonomous'].includes(level)) {
        return failure(`Invalid level: ${level}. Use passive, assisted, or autonomous.`);
      }
      const ct = new ControlTower();
      ct.setAutonomyLevel(level as 'passive' | 'assisted' | 'autonomous');
      log.info(`\nAutonomy set to: ${level}\n`);
      return success(`Autonomy set to: ${level}`);
    });

  cmd
    .command('escalate')
    .description('Escalate an issue')
    .requiredOption('--issue <issue>', 'Issue description')
    .option('--level <level>', 'info, warning, critical, or emergency', 'info')
    .option('--context <context>', 'Additional context', '')
    .option('--json', 'Saída em JSON')
    .action((options): CliCommandResult => {
      const ep = createEscalationProtocol();
      const req = ep.escalate(options.issue, options.context, options.level);

      if (options.json) {
        log.info(JSON.stringify(req, null, 2));
        return success('Escalation created', req);
      }

      log.info(`\nEscalation created:`);
      log.info(`  ID: ${req.id}`);
      log.info(`  Issue: ${req.issue}`);
      log.info(`  Level: ${req.level}`);
      log.info(`  Status: ${req.status}`);
      log.info('');
      return success('Escalation created', req);
    });

  cmd
    .command('continuity')
    .description('Continuity scheduler')
    .option('--action <action>', 'status, pause, resume', 'status')
    .option('--reason <reason>', 'Reason for pause', '')
    .option('--json', 'Saída em JSON')
    .action((options): CliCommandResult => {
      const cs = createContinuityScheduler();

      if (options.action === 'pause') {
        cs.pause(options.reason || 'CLI pause');
      } else if (options.action === 'resume') {
        cs.resume();
      }

      const state = cs.getState();
      const events = cs.getEvents();

      if (options.json) {
        log.info(JSON.stringify({ state, events }, null, 2));
        return success('Continuity scheduler state', { state, events });
      }

      log.info(`\n${'='.repeat(56)}`);
      log.info('  IDEIA — Continuity Scheduler');
      log.info(`${'='.repeat(56)}\n`);
      log.info(`  Paused: ${state.paused ? 'Yes' : 'No'}`);
      if (state.paused) {
        log.info(`  Reason: ${state.pauseReason}`);
        log.info(`  Since: ${state.pausedAt}`);
      }
      log.info(`  Auto-resume scheduled: ${state.resumesScheduled}`);
      log.info(`  Resumes executed: ${state.resumesExecuted}`);
      log.info(`  Events logged: ${events.length}`);
      log.info('');
      return success('Continuity scheduler state', { state, events });
    });

  return cmd;
}
