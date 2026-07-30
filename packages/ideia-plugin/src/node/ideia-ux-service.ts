import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { UxDashboard } from '../common/ideia-protocol';
import { UxMetricsCollector } from '@ideia/ux-metrics';
const logger = createLogger('ideia-ux-service');

@injectable()
export class IDEIA_UxBackendService {
  private collector = new UxMetricsCollector();

  async getDashboard(): Promise<UxDashboard> {
    return this.collector.getDashboard() as unknown as UxDashboard;
  }

  async recordNps(score: number, reason?: string): Promise<void> {
    logger.info('NPS recorded', { score, reason });
  }

  async recordTaskCompletion(taskId: string, duration: number, success: boolean): Promise<void> {
    logger.info('Task completion recorded', { taskId, duration, success });
  }

  async getActiveUsers(): Promise<number> {
    return 1;
  }
}
