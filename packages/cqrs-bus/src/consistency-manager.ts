import { IKvStore } from './command-bus';
import { createLogger } from '@ideia/logger';
const logger = createLogger('consistency-manager');

export class ConsistencyManager {
  constructor(private kv: IKvStore) {}

  async isProjectionCurrent(projectionName: string): Promise<boolean> {
    const lastEvent = await this.getLastEventTimestamp();
    const lastProjection = await this.getLastProjectionTimestamp(projectionName);
    return lastProjection >= lastEvent;
  }

  async waitForConsistency(projectionName: string, timeout = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.isProjectionCurrent(projectionName)) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    return false;
  }

  async getProjectionLag(projectionName: string): Promise<{ lagMs: number; pendingEvents: number }> {
    const lastProj = await this.getLastProjectionTimestamp(projectionName);
    return {
      lagMs: Date.now() - lastProj,
      pendingEvents: 0,
    };
  }

  private async getLastEventTimestamp(): Promise<number> {
    try {
      const entry = await this.kv.get('_meta:last_event_ts');
      if (entry) return Number(new TextDecoder().decode((entry as any).value));
    } catch { /* fallback */ }
    return 0;
  }

  private async getLastProjectionTimestamp(projectionName: string): Promise<number> {
    try {
      const entry = await this.kv.get(`_meta:proj_ts:${projectionName}`);
      if (entry) return Number(new TextDecoder().decode((entry as any).value));
    } catch { /* fallback */ }
    return 0;
  }
}
