"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestReplyManager = void 0;
exports.createRequestReplyManager = createRequestReplyManager;
const crypto_1 = require("crypto");
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('req-reply');
class RequestReplyManager {
    connectionManager;
    pendingRequests = new Map();
    handlers = new Map();
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
    }
    async initialize() {
        try {
            await this.connectionManager.connect();
        }
        catch (err) {
            log.info(`Initialized (offline mode): ${err}`);
            return;
        }
        log.info('Initialized');
    }
    async request(subject, data, timeout = 30000) {
        const requestId = this.generateRequestId();
        const request = { id: requestId, subject, data, timestamp: Date.now(), timeout };
        await this.publishRequest(subject, request);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request ${requestId} timed out after ${timeout}ms`));
            }, timeout);
            this.pendingRequests.set(requestId, { resolve: resolve, reject, timer });
        });
    }
    async respond(subject, handler) {
        this.handlers.set(subject, handler);
        log.info(`Registered handler for ${subject}`);
    }
    async publishRequest(subject, request) {
        const nc = this.connectionManager.getConnection();
        if (!nc)
            throw new Error('Not connected to NATS');
        const sc = this.connectionManager.getStringCodec();
        nc.publish(`ideia.req.${subject}`, sc.encode(JSON.stringify(request)));
    }
    async publishResponse(requestId, subject, response) {
        const nc = this.connectionManager.getConnection();
        if (!nc)
            throw new Error('Not connected to NATS');
        const sc = this.connectionManager.getStringCodec();
        nc.publish(`ideia.res.${subject}`, sc.encode(JSON.stringify(response)));
    }
    async handleIncomingRequest(requestJson) {
        try {
            const request = JSON.parse(requestJson);
            const handler = this.handlers.get(request.subject);
            if (handler) {
                try {
                    const result = await handler(request.data);
                    await this.publishResponse(request.id, request.subject, {
                        requestId: request.id, data: result, timestamp: Date.now(),
                    });
                }
                catch (err) {
                    await this.publishResponse(request.id, request.subject, {
                        requestId: request.id, data: null, error: String(err), timestamp: Date.now(),
                    });
                }
            }
        }
        catch {
            // Ignore parse errors
        }
    }
    async handleIncomingResponse(responseJson) {
        try {
            const response = JSON.parse(responseJson);
            const pending = this.pendingRequests.get(response.requestId);
            if (pending) {
                clearTimeout(pending.timer);
                this.pendingRequests.delete(response.requestId);
                if (response.error) {
                    pending.reject(new Error(response.error));
                }
                else {
                    pending.resolve(response.data);
                }
            }
        }
        catch {
            // Ignore parse errors
        }
    }
    generateRequestId() {
        return (0, crypto_1.randomUUID)();
    }
    getPendingRequestCount() {
        return this.pendingRequests.size;
    }
    getRegisteredHandlers() {
        return Array.from(this.handlers.keys());
    }
    async cleanup() {
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timer);
            pending.reject(new Error('RequestReplyManager shutting down'));
            this.pendingRequests.delete(id);
        }
    }
}
exports.RequestReplyManager = RequestReplyManager;
function createRequestReplyManager(connectionManager) {
    return new RequestReplyManager(connectionManager);
}
//# sourceMappingURL=req-reply.js.map