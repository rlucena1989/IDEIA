import { injectable, inject } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { ProgressService } from '@theia/core/lib/common/progress-service';
const logger = createLogger('ideia-progress-contribution');

@injectable()
export class IDEIA_ProgressContribution {
  private progress: { id: string; cancel(): void; report(update: { message?: string; work?: { done: number; total: number } }): void } | undefined;

  constructor(
    @inject(ProgressService) private progressService: ProgressService,
  ) {}

  async start(task: string, message: string): Promise<void> {
    this.progress = await this.progressService.showProgress({ text: message, options: { cancelable: false } });
  }

  report(progress: number, message: string): void {
    if (this.progress) {
      this.progress.report({ message, work: { done: progress, total: 100 } });
    }
  }

  stop(): void {
    if (this.progress) {
      this.progress.cancel();
      this.progress = undefined;
    }
  }
}
