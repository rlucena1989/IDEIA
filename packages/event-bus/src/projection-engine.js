"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentSessionProjection = exports.ProjectionEngine = void 0;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('projection-engine');
class ProjectionEngine {
    projections = new Map();
    register(projection) {
        this.projections.set(projection.name, projection);
    }
    process(events) {
        for (const event of events) {
            for (const projection of this.projections.values()) {
                projection.project(event);
            }
        }
    }
    getState(name) {
        const projection = this.projections.get(name);
        if (projection === undefined) {
            return undefined;
        }
        return projection.getState();
    }
    reset(name) {
        const projection = this.projections.get(name);
        if (projection !== undefined) {
            projection.reset();
        }
    }
    getProjectionResult(name, eventsProcessed) {
        const projection = this.projections.get(name);
        if (projection === undefined) {
            return undefined;
        }
        return {
            name: projection.name,
            state: projection.getState(),
            eventsProcessed,
            duration: 0,
        };
    }
}
exports.ProjectionEngine = ProjectionEngine;
class AgentSessionProjection {
    name = 'agent-sessions';
    state = {
        sessionCount: 0,
        activeSessions: 0,
        completedSessions: 0,
        failedSessions: 0,
        agentSessions: new Map(),
    };
    project(event) {
        switch (event.type) {
            case 'decision_made': {
                const agentId = event.metadata.agentId;
                this.state.sessionCount += 1;
                this.state.activeSessions += 1;
                this.state.agentSessions.set(agentId, {
                    started: event.metadata.timestamp,
                    status: 'active',
                });
                break;
            }
            case 'decision_completed': {
                this.state.activeSessions = Math.max(0, this.state.activeSessions - 1);
                this.state.completedSessions += 1;
                const agentId = event.metadata.agentId;
                const existing = this.state.agentSessions.get(agentId);
                if (existing !== undefined) {
                    this.state.agentSessions.set(agentId, {
                        ...existing,
                        completed: event.metadata.timestamp,
                        status: 'completed',
                    });
                }
                break;
            }
            case 'session_started': {
                const agentId = event.metadata.agentId;
                this.state.sessionCount += 1;
                this.state.activeSessions += 1;
                this.state.agentSessions.set(agentId, {
                    started: event.metadata.timestamp,
                    status: 'active',
                });
                break;
            }
            case 'session_ended': {
                this.state.activeSessions = Math.max(0, this.state.activeSessions - 1);
                const endedAgentId = event.metadata.agentId;
                const endedSession = this.state.agentSessions.get(endedAgentId);
                if (endedSession !== undefined) {
                    const status = event.data.status ?? 'completed';
                    if (status === 'failed') {
                        this.state.failedSessions += 1;
                    }
                    else {
                        this.state.completedSessions += 1;
                    }
                    this.state.agentSessions.set(endedAgentId, {
                        ...endedSession,
                        completed: event.metadata.timestamp,
                        status,
                    });
                }
                break;
            }
        }
    }
    getState() {
        return {
            sessionCount: this.state.sessionCount,
            activeSessions: this.state.activeSessions,
            completedSessions: this.state.completedSessions,
            failedSessions: this.state.failedSessions,
            agentSessions: new Map(this.state.agentSessions),
        };
    }
    reset() {
        this.state = {
            sessionCount: 0,
            activeSessions: 0,
            completedSessions: 0,
            failedSessions: 0,
            agentSessions: new Map(),
        };
    }
}
exports.AgentSessionProjection = AgentSessionProjection;
//# sourceMappingURL=projection-engine.js.map