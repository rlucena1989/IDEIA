import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import type { IEventBus } from '@ideia/event-bus';
import type {  } from '@ideia/event-bus';
import {
  IDEIA_HealthService, HealthReport, SubsystemHealth, SystemMetrics,
} from '../common/ideia-protocol';
const logger = createLogger('health-service');

@injectable()
export class IDEIA_HealthBackendService implements IDEIA_HealthService {
  private startupTime = Date.now();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) { this.eventBus = eventBus; }

  async getHealth(): Promise<HealthReport> {
    const now = new Date().toISOString();
    const subsystems: SubsystemHealth[] = [
      {
        name: 'eventBus',
        status: 'healthy',
        lastCheck: now,
      },
      {
        name: 'memory',
        status: 'healthy',
        lastCheck: now,
      },
      {
        name: 'services',
        status: 'healthy',
        lastCheck: now,
      },
      {
        name: 'cli',
        status: 'healthy',
        lastCheck: now,
      },
    ];

    try {
      const count = await this.eventBus.subscriberCount();
      subsystems[0] = {
        name: 'eventBus',
        status: count >= 0 ? 'healthy' : 'degraded',
        lastCheck: now,
        detail: `${count} subscribers`,
      };
    } catch {
      subsystems[0] = {
        name: 'eventBus',
        status: 'unhealthy',
        lastCheck: now,
        detail: 'Cannot reach event bus',
      };
    }

    const memUsage = process.memoryUsage();
    const heapPercent = memUsage.heapUsed / memUsage.heapTotal;
    if (heapPercent > 0.9) {
      subsystems[1] = {
        name: 'memory',
        status: 'degraded',
        lastCheck: now,
        detail: `Heap ${Math.round(heapPercent * 100)}% used`,
      };
    }

    // Check CLI availability
    try {
      const { execSync } = require('child_process');
      execSync('ai-devkit --version', { stdio: 'ignore', timeout: 5000 });
      subsystems[3] = {
        name: 'cli',
        status: 'healthy',
        lastCheck: now,
        detail: 'CLI available',
      };
    } catch {
      subsystems[3] = {
        name: 'cli',
        status: 'degraded',
        lastCheck: now,
        detail: 'CLI not installed - extension running in degraded mode',
      };
    }

    const overall: HealthReport['overall'] = subsystems.some(s => s.status === 'unhealthy')
      ? 'unhealthy'
      : subsystems.some(s => s.status === 'degraded')
        ? 'degraded'
        : 'healthy';

    return {
      overall,
      subsystems,
      uptime: Math.floor((Date.now() - this.startupTime) / 1000),
      timestamp: now,
    };
  }

  async getMetrics(): Promise<SystemMetrics> {
    let eventBusSubscribers = 0;
    try {
      eventBusSubscribers = await this.eventBus.subscriberCount();
    } catch {
      eventBusSubscribers = -1;
    }

    const memUsage = process.memoryUsage().heapUsed;

    return {
      eventBusSubscribers,
      activeConversations: 0,
      activeStreams: 0,
      memoryUsage: Math.round(memUsage / 1024 / 1024),
      servicesRegistered: 10,
      uptimeSeconds: Math.floor((Date.now() - this.startupTime) / 1000),
      lastEventTimestamp: null,
    };
  }
}
