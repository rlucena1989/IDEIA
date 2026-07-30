"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionObserver = void 0;
exports.createSessionObserver = createSessionObserver;
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('session-observer');
class SessionObserver {
    sessions = new Map();
    engine;
    logger;
    constructor(engine, logger) {
        this.engine = engine;
        this.logger = logger ?? log;
    }
    onSessionCreated(sessionId, metadata) {
        const info = {
            sessionId,
            startedAt: new Date().toISOString(),
            commandCount: 0,
            errorCount: 0,
            commands: [],
            errors: [],
            metadata: metadata ?? {},
        };
        this.sessions.set(sessionId, info);
        this.engine.recordMetric('session.created', 1, { sessionId });
        this.logger.info('Session created', { sessionId });
    }
    onSessionCommand(sessionId, command) {
        const info = this.sessions.get(sessionId);
        if (!info)
            return;
        info.commandCount++;
        if (info.commands.length < 1000) {
            info.commands.push(command);
        }
        this.engine.recordMetric('session.command', 1, { sessionId });
    }
    onSessionError(sessionId, error) {
        const info = this.sessions.get(sessionId);
        if (!info)
            return;
        info.errorCount++;
        if (info.errors.length < 100) {
            info.errors.push(error);
        }
        this.engine.recordMetric('session.error', 1, { sessionId });
        this.logger.warn('Session error', { sessionId, error });
    }
    onSessionEnd(sessionId) {
        const info = this.sessions.get(sessionId);
        if (!info)
            return undefined;
        info.endedAt = new Date().toISOString();
        info.durationMs = new Date(info.endedAt).getTime() - new Date(info.startedAt).getTime();
        this.engine.recordMetric('session.ended', 1, { sessionId });
        this.engine.recordMetric('session.duration_ms', info.durationMs, { sessionId });
        this.engine.recordMetric('session.commands_total', info.commandCount, { sessionId });
        this.engine.recordMetric('session.errors_total', info.errorCount, { sessionId });
        this.logger.info('Session ended', { sessionId, durationMs: info.durationMs, commands: info.commandCount, errors: info.errorCount });
        return { ...info };
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getActiveSessions() {
        const result = [];
        for (const info of this.sessions.values()) {
            if (!info.endedAt) {
                result.push({ ...info });
            }
        }
        return result;
    }
    getSessionSummary() {
        let active = 0;
        let completed = 0;
        let totalCommands = 0;
        let totalErrors = 0;
        for (const info of this.sessions.values()) {
            if (info.endedAt) {
                completed++;
            }
            else {
                active++;
            }
            totalCommands += info.commandCount;
            totalErrors += info.errorCount;
        }
        return { total: this.sessions.size, active, completed, totalCommands, totalErrors };
    }
    clear() {
        this.sessions.clear();
    }
}
exports.SessionObserver = SessionObserver;
function createSessionObserver(engine) {
    return new SessionObserver(engine);
}
//# sourceMappingURL=session-observer.js.map