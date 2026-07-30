import { createEventBus } from './event-bus';
import { createLogger, type Logger } from '@ideia/logger';
import { createNatsEventBus, NatsEventBusConfig } from './nats-event-bus';
import { IEventBus } from './types';

const log = createLogger('event-bus-factory');
import { AuditTrail } from '@ideia/audit-trail';

export type BusType = 'memory' | 'nats' | 'auto';

export interface EventBusFactoryConfig {
  type?: BusType;
  nats?: NatsEventBusConfig;
  memory?: { maxHistory?: number };
  auditTrail?: AuditTrail;
  logger?: Logger;
}

export async function createBus(config?: EventBusFactoryConfig): Promise<IEventBus> {
  const envType = (typeof process !== 'undefined' ? process.env.EVENT_BUS_TYPE : undefined) as BusType | undefined;
  const type = config?.type ?? envType ?? 'auto';
  const fallbackLogger: Logger = {
    debug: () => {},
    warn: (msg: string) => log.warn(msg),
    error: (msg: string) => log.error(msg),
    info: (msg: string) => log.info(msg),
    fatal: (msg: string) => log.error(msg),
    child: () => fallbackLogger,
  };
  const logger = config?.logger ?? fallbackLogger;

  if (type === 'memory') {
    return createEventBus(config?.memory?.maxHistory, config?.auditTrail, logger);
  }

  if (type === 'nats') {
    const bus = createNatsEventBus({
      ...config?.nats,
      auditTrail: config?.auditTrail,
      logger,
    });
    try {
      await bus.connect();
      return bus;
    } catch (_err) {
      const errMsg = _err instanceof Error ? _err.message : String(_err);
      logger.warn('[EventBusFactory] NATS connection failed, falling back to in-memory: ' + errMsg);
      return createEventBus(config?.memory?.maxHistory, config?.auditTrail, logger);
    }
  }

  // auto: try NATS, fall back to memory
  const bus = createNatsEventBus({
    ...config?.nats,
    auditTrail: config?.auditTrail,
    logger,
  });
  try {
    await bus.connect();
    return bus;
  } catch {
    logger.info('[EventBusFactory] NATS unavailable, using in-memory EventBus');
    return createEventBus(config?.memory?.maxHistory, config?.auditTrail, logger);
  }
}
