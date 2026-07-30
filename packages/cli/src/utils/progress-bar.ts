import ora from 'ora';
import { createLogger } from '@ideia/logger';
const logger = createLogger('progress-bar');

export interface ProgressOptions {
  text: string;
  color?: 'cyan' | 'yellow' | 'green' | 'red' | 'blue';
  spinner?: string;
}

export class ProgressBar {
  private spinner: ReturnType<typeof ora>;
  private startTime: number;
  private totalSteps: number;
  private currentStep: number;

  constructor(options: ProgressOptions) {
    this.startTime = Date.now();
    this.totalSteps = 0;
    this.currentStep = 0;
    this.spinner = ora({
      text: options.text,
      color: options.color || 'cyan',
      spinner: options.spinner || 'dots',
    }).start();
  }

  setTotalSteps(steps: number): void {
    this.totalSteps = steps;
    this.updateProgress();
  }

  advance(steps: number = 1): void {
    this.currentStep += steps;
    this.updateProgress();
  }

  setText(text: string): void {
    this.spinner.text = text;
  }

  succeed(text?: string): void {
    this.spinner.succeed(text);
  }

  fail(text?: string): void {
    this.spinner.fail(text);
  }

  warn(text?: string): void {
    this.spinner.warn(text);
  }

  info(text?: string): void {
    this.spinner.info(text);
  }

  stop(): void {
    this.spinner.stop();
  }

  stopAndPersist(text?: string): void {
    this.spinner.stopAndPersist({ text });
  }

  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  getETA(): number {
    if (this.currentStep === 0 || this.totalSteps === 0) {
      return 0;
    }
    const elapsedMs = this.getElapsedMs();
    const msPerStep = elapsedMs / this.currentStep;
    const remainingSteps = this.totalSteps - this.currentStep;
    return Math.round(msPerStep * remainingSteps);
  }

  private updateProgress(): void {
    if (this.totalSteps > 0) {
      const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
      const eta = this.formatTime(this.getETA());
      this.spinner.text = `${this.spinner.text} (${percentage}%) - ETA: ${eta}`;
    }
  }

  private formatTime(ms: number): string {
    if (ms < 1000) return '< 1s';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  }

  static create(options: ProgressOptions): ProgressBar {
    return new ProgressBar(options);
  }
}

export function createProgressBar(options: ProgressOptions): ProgressBar {
  return ProgressBar.create(options);
}
