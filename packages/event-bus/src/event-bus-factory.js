"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBus = createBus;
const event_bus_1 = require("./event-bus");
const logger_1 = require("@ideia/logger");
const nats_event_bus_1 = require("./nats-event-bus");
const log = (0, logger_1.createLogger)('event-bus-factory');
async function createBus(config) {
    const type = config?.type ?? 'auto';
    const fallbackLogger = {
        debug: () => { },
        warn: (msg) => log.warn(msg),
        error: (msg) => log.error(msg),
        info: (msg) => log.info(msg),
        fatal: (msg) => log.error(msg),
        child: () => fallbackLogger,
    };
    const logger = config?.logger ?? fallbackLogger;
    if (type === 'memory') {
        return (0, event_bus_1.createEventBus)(config?.memory?.maxHistory, config?.auditTrail, logger);
    }
    if (type === 'nats') {
        const bus = (0, nats_event_bus_1.createNatsEventBus)({
            ...config?.nats,
            auditTrail: config?.auditTrail,
            logger,
        });
        try {
            await bus.connect();
            return bus;
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.warn('[EventBusFactory] NATS connection failed, falling back to in-memory: ' + errMsg);
            return (0, event_bus_1.createEventBus)(config?.memory?.maxHistory, config?.auditTrail, logger);
        }
    }
    // auto: try NATS, fall back to memory
    const bus = (0, nats_event_bus_1.createNatsEventBus)({
        ...config?.nats,
        auditTrail: config?.auditTrail,
        logger,
    });
    try {
        await bus.connect();
        return bus;
    }
    catch {
        logger.info('[EventBusFactory] NATS unavailable, using in-memory EventBus');
        return (0, event_bus_1.createEventBus)(config?.memory?.maxHistory, config?.auditTrail, logger);
    }
}
//# sourceMappingURL=event-bus-factory.js.map