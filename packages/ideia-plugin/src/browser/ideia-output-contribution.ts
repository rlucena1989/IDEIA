import { injectable, inject } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { OutputChannelManager } from '@theia/output/lib/browser/output-channel';
const logger = createLogger('ideia-output-contribution');

@injectable()
export class IDEIA_OutputContribution {
  private channelName = 'IDEIA';

  constructor(
    @inject(OutputChannelManager) private outputChannelManager: OutputChannelManager,
  ) {}

  log(message: string): void {
    const channel = this.outputChannelManager.getChannel(this.channelName);
    channel.appendLine(message);
  }

  clear(): void {
    const channel = this.outputChannelManager.getChannel(this.channelName);
    channel.clear();
  }

  show(): void {
    const channel = this.outputChannelManager.getChannel(this.channelName);
    channel.show();
  }
}
