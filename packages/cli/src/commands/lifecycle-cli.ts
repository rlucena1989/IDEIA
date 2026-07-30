import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { ProjectLifecycleOrchestrator, type LifecyclePhase } from '../lifecycle/project-lifecycle-orchestrator';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

let orchestrator: ProjectLifecycleOrchestrator | null = null;

function getOrCreateOrchestrator(projectName?: string): ProjectLifecycleOrchestrator {
  if (!orchestrator) {
    orchestrator = new ProjectLifecycleOrchestrator(projectName ?? 'default');
  }
  return orchestrator;
}

export function lifecycleInitAction(projectName: string, opts: { json?: boolean }): void {
  try {
    orchestrator = new ProjectLifecycleOrchestrator(projectName);
    const report = orchestrator.getReport();
    const envelope = createEnvelope({
      ok: true, command: 'lifecycle init', version: getCliVersion(),
      data: { projectName, report },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printResult('Lifecycle initialized', true, `Project '${projectName}'`);
    printLine(`Current phase: ${report.currentPhase}`);
    printLine(`Progress: ${report.overallProgress}%`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error initializing lifecycle: ${message}`);
    process.exit(1);
  }
}

export function lifecycleStatusAction(opts: { json?: boolean }): void {
  try {
    const lc = getOrCreateOrchestrator();
    const report = lc.getReport();
    const envelope = createEnvelope({
      ok: true, command: 'lifecycle status', version: getCliVersion(), data: report,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printLine(lc.formatReport('text'));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error getting lifecycle status: ${message}`);
    process.exit(1);
  }
}

export function lifecyclePhasesAction(opts: { json?: boolean }): void {
  try {
    const lc = getOrCreateOrchestrator();
    const phases = lc.getPhaseDefinitions();
    const envelope = createEnvelope({
      ok: true, command: 'lifecycle phases', version: getCliVersion(),
      data: { count: phases.length, phases },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Lifecycle Phases (${phases.length})`);
    for (const p of phases) {
      const current = lc.getPhaseState(p.phase);
      const status = current?.status ?? 'pending';
      const icon = status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : status === 'failed' ? '❌' : '⏳';
      printLine(`  ${icon} ${p.label} (${p.phase})`);
      printLine(`     ${p.description}`);
      printLine(`     Agents: ${p.agents.join(', ')} | Est: ~${p.estimatedMinutes}min`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error listing phases: ${message}`);
    process.exit(1);
  }
}

export function lifecycleAdvanceAction(phase: string, opts: { json?: boolean; artifact?: string[] }): void {
  try {
    const lc = getOrCreateOrchestrator();
    const artifacts = opts.artifact ?? [];
    const ok = lc.advance(phase as LifecyclePhase, artifacts);
    if (!ok) {
      const report = lc.getReport();
      const errors = report.errors;
      printResult('Failed to advance', false, errors.length > 0 ? errors[errors.length - 1] : 'Unknown error');
      if (opts.json) {
        const envelope = createEnvelope({
          ok: false, command: 'lifecycle advance', version: getCliVersion(),
          errors: errors.length > 0 ? errors : ['Failed to advance phase'],
        });
        printLine(JSON.stringify(envelope, null, 2));
      }
      process.exit(1);
    }
    const report = lc.getReport();
    const envelope = createEnvelope({
      ok: true, command: 'lifecycle advance', version: getCliVersion(), data: report,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printResult('Phase completed', true, phase);
    printLine(`Progress: ${report.overallProgress}% | Current: ${report.currentPhase}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error advancing phase: ${message}`);
    process.exit(1);
  }
}

export function lifecycleAddCheckpointAction(phase: string, description: string, opts: { json?: boolean; pass?: boolean }): void {
  try {
    const lc = getOrCreateOrchestrator();
    lc.addCheckpoint(phase as LifecyclePhase, description, opts.pass ?? true);
    const envelope = createEnvelope({
      ok: true, command: 'lifecycle checkpoint', version: getCliVersion(),
      data: { phase, description, passed: opts.pass ?? true },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printResult('Checkpoint added', true, `${description} (${opts.pass ?? true ? 'passed' : 'failed'})`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error adding checkpoint: ${message}`);
    process.exit(1);
  }
}

export function lifecycleFailAction(phase: string, errorMsg: string, opts: { json?: boolean }): void {
  try {
    const lc = getOrCreateOrchestrator();
    lc.fail(phase as any, errorMsg);
    const report = lc.getReport();
    const envelope = createEnvelope({
      ok: false, command: 'lifecycle fail', version: getCliVersion(), data: report,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printResult('Phase failed', false, `${phase}: ${errorMsg}`);
    printLine(lc.formatReport('text'));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error failing phase: ${message}`);
    process.exit(1);
  }
}

export function lifecycleCommand(): Command {
  const cmd = new Command('lifecycle')
    .description('Project lifecycle management — from idea to monitoring');

  cmd
    .command('init <project-name>')
    .description('Initialize a new project lifecycle')
    .option('--json', 'JSON output')
    .action((projectName, opts) => lifecycleInitAction(projectName, opts));

  cmd
    .command('status')
    .description('Current lifecycle status and progress')
    .option('--json', 'JSON output')
    .action((opts) => lifecycleStatusAction(opts));

  cmd
    .command('phases')
    .description('List all lifecycle phases')
    .option('--json', 'JSON output')
    .action((opts) => lifecyclePhasesAction(opts));

  cmd
    .command('advance <phase>')
    .description('Mark a phase as completed and advance to the next')
    .option('--json', 'JSON output')
    .option('--artifact <items...>', 'Artifacts produced by this phase')
    .action((phase, opts) => lifecycleAdvanceAction(phase, opts));

  cmd
    .command('checkpoint <phase> <description>')
    .description('Add a checkpoint to a phase')
    .option('--json', 'JSON output')
    .option('--pass', 'Mark checkpoint as passed (default: true)', true)
    .action((phase, description, opts) => lifecycleAddCheckpointAction(phase, description, opts));

  cmd
    .command('fail <phase> <error>')
    .description('Mark a phase as failed with an error message')
    .option('--json', 'JSON output')
    .action((phase, errorMsg, opts) => lifecycleFailAction(phase, errorMsg, opts));

  return cmd;
}


