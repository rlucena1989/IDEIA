import { Command } from 'commander';
import { runPipeline, printStatus, listAllCheckpoints } from '../utils/gate/runner';

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function gateRunAction(opts: { stage?: string; resume?: boolean; json?: boolean }): void {
  const cwd = process.cwd();
  runPipeline(cwd, opts.stage as string, !!opts.resume, !!opts.json);
}

export function gateStatusAction(opts: { json?: boolean }): void {
  printStatus(process.cwd(), !!opts.json);
}

export function gateCheckpointsAction(): void {
  const cps = listAllCheckpoints(process.cwd());
  if (cps.length === 0) {
    console.log('Nenhum checkpoint encontrado.');
    return;
  }
  console.log('Checkpoints disponiveis:');
  cps.forEach(c => console.log(`  - ${c}`));
}

export function gateCommand(): Command {
  const cmd = new Command('gate')
    .description('Quality Gate Pipeline — progressive multi-stage quality checks');

  cmd.command('run')
    .description('Execute full quality gate pipeline (lint → test → security → build → architecture → deploy readiness)')
    .option('--stage <stage>', 'Start from a specific stage')
    .option('--resume', 'Resume from last failed stage')
    .option('--json', 'JSON output')
    .action((opts: Record<string, unknown>) => {
      const cwd = process.cwd();
      runPipeline(cwd, opts.stage as string, !!opts.resume, !!opts.json);
    });

  cmd.command('status')
    .description('Show current checkpoint and stage results')
    .option('--json', 'JSON output')
    .action((opts: Record<string, unknown>) => {
      printStatus(process.cwd(), !!opts.json);
    });

  cmd.command('checkpoints')
    .description('List available checkpoints')
    .action(() => {
      const cps = listAllCheckpoints(process.cwd());
      if (cps.length === 0) {
        console.log('Nenhum checkpoint encontrado.');
        return;
      }
      console.log('Checkpoints disponiveis:');
      cps.forEach(c => console.log(`  - ${c}`));
    });

  return cmd;
}
