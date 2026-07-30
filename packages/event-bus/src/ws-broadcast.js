"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WSBroadcast = void 0;
exports.createWSBroadcast = createWSBroadcast;
const ws_1 = require("ws");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('ws-broadcast');
class WSBroadcast {
    wss = null;
    clients = new Set();
    config;
    subscriptionId = null;
    eventBus = null;
    constructor(config) {
        this.config = config;
    }
    async start(eventBus) {
        try {
            this.eventBus = eventBus;
            this.wss = new ws_1.WebSocketServer({
                port: this.config.port,
                host: this.config.host,
                path: this.config.path,
            });
            this.wss.on('connection', (ws) => {
                this.clients.add(ws);
                ws.on('close', () => {
                    this.clients.delete(ws);
                });
                ws.on('error', () => {
                    this.clients.delete(ws);
                });
            });
            this.subscriptionId = await eventBus.subscribe('*', (event) => {
                const msg = JSON.stringify(event);
                for (const client of this.clients) {
                    if (client.readyState === ws_1.WebSocket.OPEN) {
                        try {
                            client.send(msg);
                        }
                        catch {
                            this.clients.delete(client);
                        }
                    }
                }
            });
            return true;
        }
        catch {
            if (this.wss) {
                try {
                    this.wss.close();
                }
                catch { /* ignore */ }
                this.wss = null;
            }
            return false;
        }
    }
    async stop() {
        if (this.eventBus && this.subscriptionId) {
            await this.eventBus.unsubscribe(this.subscriptionId);
        }
        if (this.wss) {
            for (const client of this.clients) {
                try {
                    client.close();
                }
                catch { /* ignore */ }
            }
            try {
                this.wss.close();
            }
            catch { /* ignore */ }
            this.wss = null;
        }
        this.clients.clear();
    }
    getClientCount() {
        return this.clients.size;
    }
    isRunning() {
        return this.wss !== null;
    }
}
exports.WSBroadcast = WSBroadcast;
function createWSBroadcast(config) {
    return new WSBroadcast(config);
}
//# sourceMappingURL=ws-broadcast.js.map