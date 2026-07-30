import { OnboardingWizard } from './onboarding-wizard';
import { WizardState, WizardStep, AUTONOMY_OPTIONS, AutonomyLevel } from './types';
import { ConfigGenerator } from './config-generator';
import { createLogger } from '@ideia/logger';
import * as readline from 'readline';

const log = createLogger('onboarding:wizard-cli');

export class CliWizard {
  private wizard: OnboardingWizard;
  private rl: readline.Interface;

  constructor(wizard: OnboardingWizard) {
    this.wizard = wizard;
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }

  async start(): Promise<void> {
    const firstStep = this.wizard.start();
    log.info('\n\x1b[36m=== IDEIA Onboarding ===\x1b[0m\n');
    log.info('\x1b[33mWelcome! Let\'s configure your IDEIA experience.\x1b[0m\n');

    let step: WizardStep | null = firstStep;
    while (step) {
      this.renderProgressBar();
      await this.renderStep(step);
      const answers = await this.promptFields(step);
      const result = this.wizard.submitStep({ stepId: step.id, answers });
      if (result.complete) break;
      step = result.next;
    }

    this.rl.close();
    const summary = this.wizard.complete();
    log.info('\n\x1b[32m=== Setup Complete! ===\x1b[0m\n');
    const generator = new ConfigGenerator();
    generator.generate(summary.config as unknown as Map<string, Record<string, string | number | boolean | string[]>>, summary.profile);
    log.info('CLI wizard completed');
  }

  renderAutonomyMenu(): string {
    return AUTONOMY_OPTIONS.map((opt, i) =>
      `  \x1b[36m${i + 1}\x1b[0m) \x1b[1m${opt.label}\x1b[0m — ${opt.description}`
    ).join('\n');
  }

  renderProgressBar(): void {
    const { current, total, percent } = this.wizard.getProgress();
    const barWidth = 30;
    const filled = Math.round((percent / 100) * barWidth);
    const empty = barWidth - filled;
    const bar = '\x1b[34m' + '█'.repeat(filled) + '\x1b[0m' + '░'.repeat(empty);
    log.info(`\n\x1b[2mProgress: [${bar}] ${current}/${total} (${percent}%)\x1b[0m\n`);
  }

  private async renderStep(step: WizardStep): Promise<void> {
    log.info(`\n\x1b[1;36m[${step.id}]\x1b[0m \x1b[1m${step.title}\x1b[0m`);
    log.info(`\x1b[2m${step.description}\x1b[0m\n`);

    if (step.id === 'autonomy') {
      log.info(this.renderAutonomyMenu());
      log.info('');
    }
  }

  private async promptFields(step: WizardStep): Promise<Record<string, string | number | boolean | string[]>> {
    const answers: Record<string, string | number | boolean | string[]> = {};
    for (const field of step.fields) {
      const required = field.required ? ' \x1b[31m(required)\x1b[0m' : '';
      const hint = field.placeholder ? ` \x1b[2m(e.g. ${field.placeholder})\x1b[0m` : '';
      const answer = await this.prompt(`\x1b[33m${field.label}\x1b[0m${required}${hint}: `);

      if (field.type === 'multiselect') {
        answers[field.id] = answer.split(',').map(s => s.trim()).filter(Boolean);
      } else if (field.type === 'number') {
        answers[field.id] = parseFloat(answer) || 0;
      } else if (field.type === 'slider') {
        answers[field.id] = parseFloat(answer) || 0.5;
      } else if (field.type === 'toggle') {
        answers[field.id] = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y' || answer === 'true';
      } else if (field.id === 'level' && step.id === 'autonomy') {
        const idx = parseInt(answer, 10) - 1;
        answers[field.id] = (idx >= 0 && idx < AUTONOMY_OPTIONS.length) ? AUTONOMY_OPTIONS[idx].value : field.defaultValue ?? 'N1';
      } else {
        answers[field.id] = answer || (field.defaultValue as string) ?? '';
      }
    }
    return answers;
  }

  private prompt(question: string): Promise<string> {
    return new Promise(resolve => this.rl.question(question, resolve));
  }
}

export function createCliWizard(wizard: OnboardingWizard): CliWizard {
  return new CliWizard(wizard);
}
