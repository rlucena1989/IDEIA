import { Tutorial, TutorialSession, CompletionSummary, TutorialProgress } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('renderer');

export type OutputFormat = 'cli' | 'markdown' | 'json';

export class TutorialRenderer {
  render(tutorial: Tutorial, format: OutputFormat): string {
    switch (format) {
      case 'cli': return this.renderCLI(tutorial);
      case 'markdown': return this.renderMarkdown(tutorial);
      case 'json': return this.renderJSON(tutorial);
    }
  }

  renderProgress(progress: TutorialProgress, format: OutputFormat): string {
    switch (format) {
      case 'cli': return this.renderProgressCLI(progress);
      case 'markdown': return this.renderProgressMarkdown(progress);
      case 'json': return JSON.stringify(progress, null, 2);
    }
  }

  renderSession(session: TutorialSession, format: OutputFormat): string {
    switch (format) {
      case 'cli': return this.renderSessionCLI(session);
      case 'markdown': return this.renderSessionMarkdown(session);
      case 'json': return JSON.stringify(session, null, 2);
    }
  }

  renderSummary(summary: CompletionSummary, format: OutputFormat): string {
    switch (format) {
      case 'cli': return this.renderSummaryCLI(summary);
      case 'markdown': return this.renderSummaryMarkdown(summary);
      case 'json': return JSON.stringify(summary, null, 2);
    }
  }

  private renderCLI(tutorial: Tutorial): string {
    const bar = this.progressBar(0, tutorial.steps.length);
    const steps = tutorial.steps.map((s, i) =>
      `  ${i + 1}. [ ] ${s.title}\n     ${s.description}`
    ).join('\n');
    return [
      `\x1b[1m${tutorial.name}\x1b[0m`,
      `  ${tutorial.description}`,
      `  \x1b[36mDifficulty:\x1b[0m ${tutorial.difficulty}  \x1b[36mEst:\x1b[0m ${tutorial.estimatedMinutes}min  \x1b[36mSteps:\x1b[0m ${tutorial.steps.length}`,
      `  \x1b[33m${bar}\x1b[0m`,
      '',
      steps,
      ''
    ].join('\n');
  }

  private renderMarkdown(tutorial: Tutorial): string {
    const steps = tutorial.steps.map((s, i) =>
      `### ${i + 1}. ${s.title}\n\n${s.description}\n\n\`\`\`bash\n${s.command || '# no command'}\n\`\`\`\n\n> 💡 ${s.hint}`
    ).join('\n\n');
    return [
      `# ${tutorial.name}`,
      '',
      tutorial.description,
      '',
      `| Difficulty | Time | Steps | Tags |`,
      `|------------|------|-------|------|`,
      `| ${tutorial.difficulty} | ${tutorial.estimatedMinutes}min | ${tutorial.steps.length} | ${tutorial.tags.join(', ')} |`,
      '',
      '## Steps',
      '',
      steps,
      ''
    ].join('\n');
  }

  private renderJSON(tutorial: Tutorial): string {
    return JSON.stringify(tutorial, null, 2);
  }

  private renderProgressCLI(progress: TutorialProgress): string {
    const status = progress.completed ? '\x1b[32m✓ COMPLETE\x1b[0m' : '\x1b[33m⟳ IN PROGRESS\x1b[0m';
    return `${status} | Step ${progress.currentStep} | Score: ${progress.score}`;
  }

  private renderProgressMarkdown(progress: TutorialProgress): string {
    return [
      `**Progress:** ${progress.completed ? '✅ Complete' : '🔄 In Progress'}`,
      `**Step:** ${progress.currentStep}`,
      `**Score:** ${progress.score}`,
      `**Started:** ${new Date(progress.startedAt).toISOString()}`,
      progress.completedAt ? `**Completed:** ${new Date(progress.completedAt).toISOString()}` : ''
    ].filter(Boolean).join('\n');
  }

  private renderSessionCLI(session: TutorialSession): string {
    const step = session.steps[session.currentStep] || session.steps[session.steps.length - 1];
    const idx = session.currentStep < session.steps.length ? session.currentStep + 1 : session.steps.length;
    return [
      `\x1b[1mStep ${idx}/${session.steps.length}: ${step.title}\x1b[0m`,
      `  ${step.description}`,
      step.command ? `  \x1b[36m$\x1b[0m ${step.command}` : '',
      `  \x1b[2m💡 ${step.hint}\x1b[0m`
    ].filter(Boolean).join('\n');
  }

  private renderSessionMarkdown(session: TutorialSession): string {
    const step = session.steps[session.currentStep] || session.steps[session.steps.length - 1];
    const idx = session.currentStep < session.steps.length ? session.currentStep + 1 : session.steps.length;
    return [
      `## Step ${idx}/${session.steps.length}: ${step.title}`,
      '',
      step.description,
      '',
      step.command ? `\`\`\`bash\n${step.command}\n\`\`\`` : '',
      '',
      `> 💡 ${step.hint}`
    ].filter(Boolean).join('\n');
  }

  private renderSummaryCLI(summary: CompletionSummary): string {
    const statusLine = summary.completed
      ? '  \x1b[32m\u2713 COMPLETED\x1b[0m'
      : '  \x1b[31m\u2717 INCOMPLETE\x1b[0m';
    const lines = [
      '',
      '\x1b[1m═══════════════════════════════════════\x1b[0m',
      `  \x1b[1m${summary.tutorialName}\x1b[0m`,
      statusLine,
      `  Score: ${summary.score}/100`,
      `  Steps: ${summary.completedSteps}/${summary.totalSteps}`,
      `  Time: ${Math.round(summary.timeSpent / 1000)}s`,
      `  Hints: ${summary.hintsUsed}`,
      summary.badges.length > 0 ? `  Badges: ${summary.badges.join(', ')}` : '',
      '\x1b[1m═══════════════════════════════════════\x1b[0m',
      ''
    ].filter(Boolean).join('\n');
    return lines;
  }

  private renderSummaryMarkdown(summary: CompletionSummary): string {
    return [
      '# Tutorial Complete',
      '',
      `**${summary.tutorialName}**`,
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Status | ${summary.completed ? '✅ Complete' : '❌ Incomplete'} |`,
      `| Score | ${summary.score}/100 |`,
      `| Steps | ${summary.completedSteps}/${summary.totalSteps} |`,
      `| Time | ${Math.round(summary.timeSpent / 1000)}s |`,
      `| Hints Used | ${summary.hintsUsed} |`,
      summary.badges.length > 0 ? `| Badges | ${summary.badges.join(', ')} |` : '',
      ''
    ].filter(Boolean).join('\n');
  }

  private progressBar(current: number, total: number, width = 30): string {
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    return '[' + '='.repeat(filled) + '>'.repeat(Math.min(1, filled ? 0 : 1)) + ' '.repeat(empty) + ']';
  }
}
