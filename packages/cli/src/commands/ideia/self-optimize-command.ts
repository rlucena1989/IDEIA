import { Command } from 'commander';
import { createScopeIsolation, createIsolationPolicy, createViolationAudit } from '@ideia/scope-isolation';
import { createEvolutionDaemon } from '@ideia/autonomous-evolution-engine';
import { createBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import path from 'node:path';
import { getIO } from '../../io';
import { success, failure, CliCommandResult } from '../../types/cli-result';

import { createLogger } from '@ideia/logger';

const log = createLogger('cli:commands:ideia:self-optimize-command');

export function ideiaSelfOptimizeCommand(): Command {
  const cmd = new Command('self-optimize')
    .description('Self-Optimization Panel & Autonomous Evolution');

  cmd
    .command('status')
    .description('Show self-optimization status')
    .option('--json', 'Saída em JSON')
    .action(async (options): Promise<CliCommandResult> => {
      try {
        const root = getIO().fs.cwd();
        const eventBus = await createBus({ memory: { maxHistory: 100 } });
        const auditTrail = new AuditTrail(path.join(root, '.ideia', 'audit.jsonl'));
        const selfSpace = path.join(root, '.ideia');
        const scopeIsolation = createScopeIsolation({ selfSpace: [selfSpace], projectSpace: [root] });
        const isolationPolicy = createIsolationPolicy();
        const violationAudit = createViolationAudit();
        const daemon = createEvolutionDaemon({
          intervalMs: 3600000,
        });

        const dashboard = {
          name: 'IDEIA Self-Optimization Dashboard',
          status: scopeIsolation ? 'active' : 'inactive',
          selfSpace,
          isolationPolicy,
          violationAudit,
          scope: {
            selfSpace,
            policy: isolationPolicy.toConfig(),
            violations: violationAudit.count(),
          },
          evolution: {
            running: false,
            cyclesCompleted: 0,
            lastCycleAt: null,
            consecutiveFailures: 0,
            lastSuccess: null,
          },
        };
        const daemonState = dashboard.evolution;

        if (options.json) {
          log.info(JSON.stringify(dashboard, null, 2));
          return success('Self-optimization status', dashboard);
        }

        log.info(`\n${'='.repeat(56)}`);
        log.info('  IDEIA — Self-Optimization Status');
        log.info(`${'='.repeat(56)}\n`);

        log.info('  Scope Isolation:');
        log.info(`    Self-space: ${selfSpace}`);
        log.info(`    Cross-space access: ${isolationPolicy.crossSpaceAccess}`);
        log.info(`    Violations: ${violationAudit.count()}`);

        log.info('\n  Evolution Daemon:');
        log.info(`    Running: ${daemonState.running ? 'Yes' : 'No'}`);
        log.info(`    Cycles completed: ${daemonState.cyclesCompleted}`);
        log.info(`    Last cycle: ${daemonState.lastCycleAt ?? 'Never'}`);
        log.info(`    Consecutive failures: ${daemonState.consecutiveFailures}`);
        log.info(`    Last success: ${daemonState.lastSuccess ?? 'N/A'}`);
        log.info('');
        return success('Self-optimization status', dashboard);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return failure(`Error: ${message}`);
      }
    });

  cmd
    .command('run-cycle')
    .description('Run a single evolution cycle now')
    .option('--autonomy <level>', 'Autonomy level (passive, assisted, autonomous)', 'assisted')
    .option('--json', 'Saída em JSON')
    .action(async (options): Promise<CliCommandResult> => {
      try {
        const root = getIO().fs.cwd();
        const eventBus = await createBus({ memory: { maxHistory: 100 } });
        const auditTrail = new AuditTrail(path.join(root, '.ideia', 'audit.jsonl'));
        const selfSpace = path.join(root, '.ideia');
        const scopeIsolation = createScopeIsolation({ selfSpace: [selfSpace], projectSpace: [root] });
        const daemon = createEvolutionDaemon({
          intervalMs: 3600000,
        });

        log.info(`\nRunning evolution cycle (autonomy: ${options.autonomy})...\n`);
        const report = await daemon.runOnce();

        const data = {
          cycleId: report.cycleId,
          success: report.success,
          durationMs: report.duration,
          stepsExecuted: report.stepsExecuted,
          stepsFailed: report.stepsFailed,
          adrGenerated: report.adrGenerated,
          scanResults: report.scanResults.map(s => ({ scanner: s.scanner, score: s.score, findings: s.findings.length })),
          errors: report.errors,
        };

        if (options.json) {
          log.info(JSON.stringify(data, null, 2));
          log.info(JSON.stringify({ ok: true, data }));
          return {} as unknown as CliCommandResult;
        }

        log.info(`  Cycle: ${report.cycleId}`);
        log.info(`  Duration: ${report.duration}ms`);
        log.info(`  Status: ${report.success ? 'SUCCESS' : 'FAILED'}`);
        log.info(`  Scans: ${report.scanResults.length}`);
        log.info(`  Steps: ${report.stepsExecuted} executed, ${report.stepsFailed} failed`);
        log.info(`  ADRs generated: ${report.adrGenerated}`);
        if (report.errors.length > 0) {
          log.info(`  Errors: ${report.errors.join(', ')}`);
        }
        log.info('');
        return success('Evolution cycle completed', data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return failure(`Error: ${message}`);
      }
    });

  cmd
    .command('daemon')
    .description('Start/stop the evolution daemon')
    .requiredOption('--action <action>', 'start or stop')
    .option('--autonomy <level>', 'Autonomy level (passive, assisted, autonomous)', 'assisted')
    .action(async (options): Promise<CliCommandResult> => {
      try {
        const root = getIO().fs.cwd();
        const eventBus = await createBus({ memory: { maxHistory: 100 } });
        const auditTrail = new AuditTrail(path.join(root, '.ideia', 'audit.jsonl'));
        const selfSpace = path.join(root, '.ideia');
        const scopeIsolation = createScopeIsolation({ selfSpace: [selfSpace], projectSpace: [root] });
        const daemon = createEvolutionDaemon({
          intervalMs: 3600000, autonomyLevel: options.autonomy,
        } as any);

        if (options.action === 'start') {
          await daemon.start();
          log.info('\nEvolution daemon started');
          return success('Evolution daemon started');
        } else if (options.action === 'stop') {
          await daemon.stop();
          log.info('\nEvolution daemon stopped');
          return success('Evolution daemon stopped');
        } else {
          return failure(`Unknown action: ${options.action}. Use start or stop.`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return failure(`Error: ${message}`);
      }
    });

  cmd
    .command('violations')
    .description('List scope isolation violations')
    .option('--json', 'Saída em JSON')
    .action((options): CliCommandResult => {
      const audit = createViolationAudit();
      const violations = audit.list();

      if (options.json) {
        log.info(JSON.stringify({ violations, count: violations.length }, null, 2));
        return success('Violations list', { violations, count: violations.length });
      }

      if (violations.length === 0) {
        log.info('\n  No violations recorded.\n');
        return success('No violations recorded');
      }

      log.info(`\n${'='.repeat(56)}`);
      log.info('  Scope Isolation Violations');
      log.info(`${'='.repeat(56)}\n`);
      for (const v of violations.slice(-10).reverse()) {
        log.info(`  [${v.fromScope}] ${v.targetPath}`);
        log.info(`    ${v.reason}`);
        log.info(`    ${v.timestamp}\n`);
      }
      log.info(`  Total: ${violations.length}\n`);
      return success('Violations listed', { violations, count: violations.length });
    });

  return cmd;
}
