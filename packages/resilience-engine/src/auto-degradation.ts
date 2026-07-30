import { createLogger } from '@ideia/logger';
import { DegradationManager, DegradationMode } from './resilience-engine';
import { IEventBus } from '@ideia/event-bus';

const log = createLogger('resilience:auto-degradation');

const BREAKER_TO_DEGRADATION: Record<string, DegradationMode> = {
  'error-rate.stop': 'emergency',
  'error-rate.throttle': 'limited',
  'throughput.throttle': 'limited',
  'throughput.alert': 'degraded',
  'latency.throttle': 'degraded',
  'latency.alert': 'degraded',
  'memory.alert': 'degraded',
  'rollback-rate.stop': 'emergency',
};

export async function createAutoDegradationSubscriber(bus: IEventBus, degradationManager: DegradationManager): Promise<string> {
  const unsubscribe = await bus.subscribe('breaker.tripped', async (event: unknown) => {
    const payload = event as { results?: Array<{ breakerType: string; action: string }> };
    if (!payload?.results) return;
    let deepestMode: DegradationMode = 'normal';
    for (const result of payload.results) {
      const key = `${result.breakerType}.${result.action}`;
      const mode = BREAKER_TO_DEGRADATION[key];
      if (mode) {
        const order = ['normal', 'degraded', 'limited', 'emergency', 'offline'];
        if (order.indexOf(mode) > order.indexOf(deepestMode)) {
          deepestMode = mode;
        }
      }
    }
    if (deepestMode !== 'normal') {
      degradationManager.setMode(deepestMode);
      log.warn(`Auto-degradation: set mode to ${deepestMode}`);
    }
  });

  log.info('Auto-degradation subscriber active');
  return unsubscribe;
}
