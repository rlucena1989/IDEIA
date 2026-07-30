import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands');
import {
  ComplianceFramework,
  ComplianceControlRegistry,
  createDefaultRegistry,
  EvidenceCollector,
  ComplianceScoreCalculator,
} from '@ideia/compliance';
import { success, failure, CliCommandResult } from './types';

const log = createLogger('compliance-cli');

function getFrameworks(opts: Record<string, unknown>): ComplianceFramework[] {
  const standard = opts.standard as string | undefined;
  if (standard) {
    const upper = standard.toUpperCase() as ComplianceFramework;
    if (Object.values(ComplianceFramework).includes(upper)) {
      return [upper];
    }
    return [];
  }
  return Object.values(ComplianceFramework);
}

function formatScore(score: number, level: string): string {
  return `${score.toFixed(1)}% (${level})`;
}

function outputResult(result: CliCommandResult, json: boolean): void {
  if (json) {
    logger.info(JSON.stringify(result, null, 2));
    return;
  }
  logger.info(result.message);
}

export function complianceCommand(): Command {
  const cmd = new Command('compliance')
    .description('Compliance operations against configured standards (SOC2, LGPD, HIPAA, GDPR)');

  cmd
    .command('check')
    .description('Run compliance check against configured standards')
    .option('-s, --standard <standard>', 'Check a specific standard only')
    .option('--json', 'Output in JSON format')
    .action((opts: Record<string, unknown>): void => {
      try {
        const frameworks = getFrameworks(opts);
        if (frameworks.length === 0) {
          outputResult(failure(`Unknown standard: ${opts.standard}. Use one of: SOC2, LGPD, HIPAA, GDPR`), Boolean(opts.json));
          return;
        }

        const registry = createDefaultRegistry();
        const results: Array<{ framework: string; status: string; controls: number; implemented: number; missing: number }> = [];

        for (const fw of frameworks) {
          const stats = registry.statistics(fw);
          results.push({
            framework: fw,
            status: stats.missing === 0 ? 'PASS' : stats.missing < stats.total * 0.3 ? 'WARN' : 'FAIL',
            controls: stats.total,
            implemented: stats.implemented,
            missing: stats.missing,
          });
          log.info(`Checked ${fw}: ${stats.implemented}/${stats.total} controls implemented`);
        }

        const msg = results.map(r =>
          `  ${r.framework}: ${r.status} (${r.implemented}/${r.controls} controls, ${r.missing} missing)`
        ).join('\n');
        outputResult(success('Compliance check completed\n' + msg, results), Boolean(opts.json));
      } catch (error: unknown) {
        outputResult(failure(error instanceof Error ? error.message : String(error)), Boolean(opts.json));
      }
    });

  cmd
    .command('report')
    .description('Generate a compliance report')
    .option('-s, --standard <standard>', 'Report for a specific standard only')
    .option('--period <period>', 'Reporting period (e.g. "2026-Q2")', 'current')
    .option('--json', 'Output in JSON format')
    .action((opts: Record<string, unknown>): void => {
      try {
        const frameworks = getFrameworks(opts);
        if (frameworks.length === 0) {
          outputResult(failure(`Unknown standard: ${opts.standard}. Use one of: SOC2, LGPD, HIPAA, GDPR`), Boolean(opts.json));
          return;
        }

        const registry = createDefaultRegistry();
        const calculator = new ComplianceScoreCalculator(registry.listControls());
        const period = opts.period as string;
        const reportData: Array<{
          framework: string;
          score: number;
          level: string;
          controls: { total: number; implemented: number; partial: number; missing: number };
        }> = [];

        for (const fw of frameworks) {
          const score = calculator.calculate(fw);
          const stats = registry.statistics(fw);
          reportData.push({
            framework: fw,
            score: score.score,
            level: score.level,
            controls: {
              total: stats.total,
              implemented: stats.implemented,
              partial: stats.partial,
              missing: stats.missing,
            },
          });
          log.info(`Report generated for ${fw}: ${formatScore(score.score, score.level)}`);
        }

        const report = { period, generatedAt: new Date().toISOString(), results: reportData };
        const msg = 'Compliance Report \u2014 Period: ' + period + '\n' +
          reportData.map(r =>
            `  ${r.framework}: ${formatScore(r.score, r.level)} (${r.controls.implemented}/${r.controls.total} controls)`
          ).join('\n');
        outputResult(success(msg, report), Boolean(opts.json));
      } catch (error: unknown) {
        outputResult(failure(error instanceof Error ? error.message : String(error)), Boolean(opts.json));
      }
    });

  cmd
    .command('evidence')
    .description('List evidence items')
    .option('-c, --control <controlId>', 'Filter by control ID')
    .option('--json', 'Output in JSON format')
    .action((opts: Record<string, unknown>): void => {
      try {
        const collector = new EvidenceCollector();
        const controlId = opts.control as string | undefined;
        const evidence = controlId
          ? collector.getEvidence(controlId)
          : collector.listAll();

        const data = { count: evidence.length, items: evidence };
        const msg = `Evidence Items (${evidence.length})\n` +
          evidence.map(e =>
            `  ${e.id.substring(0, 8)}... | ${e.type} | control: ${e.controlId.substring(0, 8)}... | ${e.timestamp.toISOString()}`
          ).join('\n');
        outputResult(success(msg, data), Boolean(opts.json));
      } catch (error: unknown) {
        outputResult(failure(error instanceof Error ? error.message : String(error)), Boolean(opts.json));
      }
    });

  cmd
    .command('score')
    .description('Show compliance score')
    .option('-s, --standard <standard>', 'Score for a specific standard only')
    .option('--json', 'Output in JSON format')
    .action((opts: Record<string, unknown>): void => {
      try {
        const frameworks = getFrameworks(opts);
        if (frameworks.length === 0) {
          outputResult(failure(`Unknown standard: ${opts.standard}. Use one of: SOC2, LGPD, HIPAA, GDPR`), Boolean(opts.json));
          return;
        }

        const registry = createDefaultRegistry();
        const calculator = new ComplianceScoreCalculator(registry.listControls());
        const scores = frameworks.map(fw => calculator.calculate(fw));

        const msg = 'Compliance Scores\n' +
          scores.map(s =>
            `  ${s.framework}: ${formatScore(s.score, s.level)} (${s.implemented} implemented, ${s.partial} partial, ${s.missing} missing of ${s.total} applicable)`
          ).join('\n');
        outputResult(success(msg, scores), Boolean(opts.json));
      } catch (error: unknown) {
        outputResult(failure(error instanceof Error ? error.message : String(error)), Boolean(opts.json));
      }
    });

  return cmd;
}
