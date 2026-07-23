"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsConnectionManager = void 0;
exports.createNatsConnectionManager = createNatsConnectionManager;
const nats_1 = require("nats");
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('nats-connection');
class NatsConnectionManager {
    nc = null;
    config;
    state = {
        connected: false,
        server: null,
        reconnects: 0,
        lastError: null,
    };
    reconnectTimer = null;
    stateChangeListeners = new Set();
    constructor(config = {}) {
        this.config = {
            reconnect: true,
            maxReconnectAttempts: 10,
            reconnectDelay: 2000,
            timeout: 5000,
            name: 'ideia-event-bus',
            ...config,
        };
    }
    getState() {
        return { ...this.state };
    }
    onStateChange(listener) {
        this.stateChangeListeners.add(listener);
        return () => this.stateChangeListeners.delete(listener);
    }
    notifyStateChange() {
        const stateSnapshot = this.getState();
        this.stateChangeListeners.forEach(listener => {
            try {
                listener(stateSnapshot);
            }
            catch (err) {
                log.error(`State change listener error: ${err}`);
            }
        });
    }
    async connect() {
        if (this.nc && this.nc.isClosed()) {
            this.nc = null;
            this.state.connected = false;
            this.state.server = null;
        }
        if (this.nc) {
            return this.nc;
        }
        const opts = {
            servers: this.config.servers || 'nats://localhost:4222',
            timeout: this.config.timeout,
            name: this.config.name,
            reconnect: this.config.reconnect,
            maxReconnectAttempts: this.config.maxReconnectAttempts,
            reconnectTimeWait: this.config.reconnectDelay,
        };
        if (this.config.token) {
            opts.token = this.config.token;
        }
        else if (this.config.user && this.config.pass) {
            opts.user = this.config.user;
            opts.pass = this.config.pass;
        }
        try {
            this.nc = await (0, nats_1.connect)(opts);
            const server = this.nc.getServer();
            this.state.connected = true;
            this.state.server = server?.toString() || 'unknown';
            this.state.lastError = null;
            this.state.reconnects = 0;
            this.notifyStateChange();
            log.info(`Connected to NATS at ${this.state.server}`);
            this.nc.closed().then(() => {
                log.info('Connection closed');
                this.state.connected = false;
                this.state.server = null;
                this.notifyStateChange();
                if (this.config.reconnect && this.state.reconnects < (this.config.maxReconnectAttempts || 10)) {
                    this.scheduleReconnect();
                }
            }).catch((err) => {
                log.error(`Connection error: ${err.message}`);
                this.state.lastError = err.message;
                this.state.connected = false;
                this.state.server = null;
                this.notifyStateChange();
                if (this.config.reconnect && this.state.reconnects < (this.config.maxReconnectAttempts || 10)) {
                    this.scheduleReconnect();
                }
            });
            return this.nc;
        }
        catch (err) {
            const error = err;
            this.state.lastError = error.message;
            this.state.connected = false;
            this.notifyStateChange();
            throw new Error(`Failed to connect to NATS: ${error.message}`);
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }
        const delay = this.config.reconnectDelay || 2000;
        this.state.reconnects++;
        this.notifyStateChange();
        log.info(`Scheduling reconnect attempt ${this.state.reconnects} in ${delay}ms`);
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.connect();
            }
            catch (err) {
                log.error(`Reconnect failed: ${err}`);
            }
        }, delay);
    }
    async disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.nc && !this.nc.isClosed()) {
            try {
                await this.nc.close();
                log.info('Disconnected from NATS');
            }
            catch (err) {
                log.error(`Error during disconnect: ${err}`);
            }
        }
        this.nc = null;
        this.state.connected = false;
        this.state.server = null;
        this.notifyStateChange();
    }
    getConnection() {
        return this.nc;
    }
    async isConnected() {
        if (!this.nc) {
            return false;
        }
        return !this.nc.isClosed();
    }
    getStringCodec() {
        return (0, nats_1.StringCodec)();
    }
}
exports.NatsConnectionManager = NatsConnectionManager;
function createNatsConnectionManager(config) {
    return new NatsConnectionManager(config);
}
//# sourceMappingURL=nats-connection.js.map