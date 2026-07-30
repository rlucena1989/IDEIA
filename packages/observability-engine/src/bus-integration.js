"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wireSessionObservability = wireSessionObservability;
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('observability:bus-integration');
function wireSessionObservability(bus, sessionObserver) {
    const subs = [];
    bus.subscribe('session:created', async (event) => {
        const payload = event.payload;
        const code = payload?.code;
        const sessionId = code?.sessionId ?? payload?.id ?? 'unknown';
        const metadata = payload;
        sessionObserver.onSessionCreated(sessionId, metadata);
        await bus.emit({
            type: 'observability:track',
            source: 'observability-engine',
            payload: { type: 'session_start', sessionId, timestamp: new Date().toISOString() },
        });
        log.info('Session event wired: session:created -> observability', { sessionId });
    }).then((id) => subs.push(id));
    return () => {
        for (const id of subs) {
            bus.unsubscribe(id).catch(() => { });
        }
    };
}
//# sourceMappingURL=bus-integration.js.map