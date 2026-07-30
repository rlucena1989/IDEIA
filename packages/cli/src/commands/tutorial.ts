import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { TutorialSystem, type TutorialLevel } from '../tutorials/tutorial-system';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const tutorialSystem = new TutorialSystem();

export function tutorialListAction(opts: { json?: boolean; level?: string }): void {
  try {
    const level = opts.level as TutorialLevel | undefined;
    const tutorials = level ? tutorialSystem.listTutorials(level) : tutorialSystem.listTutorials();
    const envelope = createEnvelope({
      ok: true, command: 'tutorial list', version: getCliVersion(),
      data: { count: tutorials.length, tutorials },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Tutorials (${tutorials.length})`);
    for (const t of tutorials) {
      const badges = t.badgeName ? ` [Badge: ${t.badgeName}]` : '';
      printLine(`  ${t.id} — ${t.name} (${t.level}, ~${t.estimatedMinutes}min)${badges}`);
      printLine(`     ${t.description}`);
      printLine(`     Steps: ${t.steps.length} | Prerequisites: ${t.prerequisites.length > 0 ? t.prerequisites.join(', ') : '(none)'}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error listing tutorials: ${message}`);
    process.exit(1);
  }
}

export function tutorialShowAction(id: string, opts: { json?: boolean }): void {
  try {
    const tutorial = tutorialSystem.getTutorial(id);
    if (!tutorial) {
      printResult('Tutorial not found', false, `No tutorial matching '${id}'`);
      process.exit(1);
    }
    const envelope = createEnvelope({
      ok: true, command: 'tutorial show', version: getCliVersion(), data: tutorial,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Tutorial: ${tutorial.name}`);
    printLine(`  ID: ${tutorial.id}`);
    printLine(`  Level: ${tutorial.level}`);
    printLine(`  Duration: ~${tutorial.estimatedMinutes}min`);
    printLine(`  Description: ${tutorial.description}`);
    if (tutorial.badgeName) printLine(`  Badge: ${tutorial.badgeName}`);
    if (tutorial.prerequisites.length > 0) printLine(`  Prerequisites: ${tutorial.prerequisites.join(', ')}`);
    printLine(`  Steps:`);
    for (const step of tutorial.steps) {
      printLine(`    ${step.order}. ${step.title}`);
      printLine(`       ${step.description}`);
      if (step.command) printLine(`       Command: ${step.command}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error showing tutorial: ${message}`);
    process.exit(1);
  }
}

export function tutorialStartAction(id: string, opts: { json?: boolean }): void {
  try {
    const result = tutorialSystem.startTutorial(id);
    if ('error' in result) {
      printResult('Failed to start', false, result.error);
      if (opts.json) {
        const envelope = createEnvelope({
          ok: false, command: 'tutorial start', version: getCliVersion(), errors: [result.error],
        });
        printLine(JSON.stringify(envelope, null, 2));
      }
      process.exit(1);
    }
    const envelope = createEnvelope({
      ok: true, command: 'tutorial start', version: getCliVersion(), data: result,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    const tutorial = tutorialSystem.getTutorial(id);
    printResult('Tutorial started', true, id);
    if (tutorial && tutorial.steps.length > 0) {
      printLine(`First step: ${tutorial.steps[0].order}. ${tutorial.steps[0].title}`);
      printLine(`  ${tutorial.steps[0].description}`);
      if (tutorial.steps[0].command) printLine(`  Run: ${tutorial.steps[0].command}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error starting tutorial: ${message}`);
    process.exit(1);
  }
}

export function tutorialAdvanceAction(id: string, stepId: string, opts: { json?: boolean; error?: string }): void {
  try {
    const result = tutorialSystem.advanceStep(id, stepId, !opts.error, opts.error);
    if ('error' in result) {
      printResult('Failed to advance', false, result.error);
      if (opts.json) {
        const envelope = createEnvelope({
          ok: false, command: 'tutorial advance', version: getCliVersion(), errors: [result.error],
        });
        printLine(JSON.stringify(envelope, null, 2));
      }
      process.exit(1);
    }
    const tutorial = tutorialSystem.getTutorial(id);
    const currentStep = tutorial ? tutorial.steps[result.currentStepIndex] : undefined;
    const envelope = createEnvelope({
      ok: true, command: 'tutorial advance', version: getCliVersion(),
      data: { progress: result, nextStep: currentStep },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    if (result.status === 'completed') {
      printResult('Tutorial completed!', true, id);
      const badges = tutorialSystem.getCompletedBadges();
      const badge = badges.find(b => b.tutorialId === id);
      if (badge) printLine(`  Badge earned: ${badge.badgeName}`);
    } else if (currentStep) {
      printResult('Step completed', true, stepId);
      printLine(`Next step: ${currentStep.order}. ${currentStep.title}`);
      printLine(`  ${currentStep.description}`);
      if (currentStep.command) printLine(`  Run: ${currentStep.command}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error advancing tutorial: ${message}`);
    process.exit(1);
  }
}

export function tutorialProgressAction(id: string, opts: { json?: boolean }): void {
  try {
    const progress = tutorialSystem.getProgress(id);
    if (!progress) {
      printResult('No progress', false, `Tutorial '${id}' not started yet`);
      if (opts.json) {
        const envelope = createEnvelope({
          ok: false, command: 'tutorial progress', version: getCliVersion(),
          errors: [`Tutorial '${id}' not started yet`],
        });
        printLine(JSON.stringify(envelope, null, 2));
      }
      process.exit(1);
    }
    const tutorial = tutorialSystem.getTutorial(id);
    const envelope = createEnvelope({
      ok: true, command: 'tutorial progress', version: getCliVersion(), data: progress,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Progress: ${id}`);
    printLine(`  Status: ${progress.status}`);
    if (progress.startedAt) printLine(`  Started: ${progress.startedAt}`);
    if (progress.completedAt) printLine(`  Completed: ${progress.completedAt}`);
    printLine(`  Steps:`);
    for (const step of progress.steps) {
      const icon = step.status === 'completed' ? '✅' : step.status === 'in_progress' ? '🔄' : step.status === 'failed' ? '❌' : '⏳';
      const stepDef = tutorial?.steps.find(s => s.id === step.stepId);
      printLine(`    ${icon} ${stepDef?.title ?? step.stepId} — ${step.status} (${step.attempts} attempt(s))`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error getting progress: ${message}`);
    process.exit(1);
  }
}

export function tutorialBadgesAction(opts: { json?: boolean }): void {
  try {
    const badges = tutorialSystem.getCompletedBadges();
    const stats = tutorialSystem.getOverallStats();
    const envelope = createEnvelope({
      ok: true, command: 'tutorial badges', version: getCliVersion(),
      data: { stats, badges },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Tutorial Badges (${badges.length})`);
    for (const b of badges) {
      printLine(`  ${b.badgeName} — completed ${b.completedAt}`);
    }
    printLine('');
    printLine(`Stats: ${stats.completed} completed, ${stats.inProgress} in progress, ${stats.totalTutorials} total`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error listing badges: ${message}`);
    process.exit(1);
  }
}

export function tutorialStatsAction(opts: { json?: boolean }): void {
  try {
    const stats = tutorialSystem.getOverallStats();
    const envelope = createEnvelope({
      ok: true, command: 'tutorial stats', version: getCliVersion(), data: stats,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Tutorial Stats');
    printLine(`  Total tutorials: ${stats.totalTutorials}`);
    printLine(`  Completed: ${stats.completed}`);
    printLine(`  In progress: ${stats.inProgress}`);
    printLine(`  Badges earned: ${stats.badges}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error getting stats: ${message}`);
    process.exit(1);
  }
}

export function tutorialCommand(): Command {
  const cmd = new Command('tutorial')
    .description('Interactive tutorial system with progress tracking and badges');

  cmd
    .command('list')
    .description('List available tutorials')
    .option('--json', 'JSON output')
    .option('--level <level>', 'Filter by level (beginner, intermediate, advanced)')
    .action((opts) => tutorialListAction(opts));

  cmd
    .command('show <id>')
    .description('Show details of a specific tutorial')
    .option('--json', 'JSON output')
    .action((id, opts) => tutorialShowAction(id, opts));

  cmd
    .command('start <id>')
    .description('Start a tutorial')
    .option('--json', 'JSON output')
    .action((id, opts) => tutorialStartAction(id, opts));

  cmd
    .command('advance <id> <step-id>')
    .description('Advance to the next tutorial step')
    .option('--json', 'JSON output')
    .option('--error <message>', 'Mark step as failed with error message')
    .action((id, stepId, opts) => tutorialAdvanceAction(id, stepId, opts));

  cmd
    .command('progress <id>')
    .description('Check progress of a tutorial')
    .option('--json', 'JSON output')
    .action((id, opts) => tutorialProgressAction(id, opts));

  cmd
    .command('badges')
    .description('List earned badges')
    .option('--json', 'JSON output')
    .action((opts) => tutorialBadgesAction(opts));

  cmd
    .command('stats')
    .description('Overall tutorial statistics')
    .option('--json', 'JSON output')
    .action((opts) => tutorialStatsAction(opts));

  return cmd;
}
