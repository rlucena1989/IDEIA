import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { runReview } from '../utils/review/index';

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function runner(checks: string[]) {
  return (opts: Record<string, unknown>) => {
    const cwd = process.cwd();
    const result = runReview(checks, cwd, !!opts.json);
    if (result.summary.critical > 0) process.exit(1);
  };
}

export function reviewCommand(): Command {
  const cmd = new Command('review')
    .description('Execute adversarial reviews (anti-slop, regression, security, performance)')
    .option('--json', 'Output JSON')
    .option('--diff <file>', 'Review only diff against main (file-based)');

  cmd.command('anti-slop').description('Detect boilerplate, dead code, duplication').action(runner(['anti-slop']));
  cmd.command('regression').description('Check for contract-breaking changes').action(runner(['regression']));
  cmd.command('security').description('Scan for exposed secrets, excessive permissions').action(runner(['security']));
  cmd.command('performance').description('Detect N+1 queries, inefficient loops').action(runner(['performance']));
  cmd.command('all').description('Run all 4 reviews in parallel').action(runner(['anti-slop', 'regression', 'security', 'performance']));

  return cmd;
}
