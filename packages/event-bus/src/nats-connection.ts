import { connect, NatsConnection, ConnectionOptions, StringCodec } from 'nats';
import { createLogger } from '@ideia/logger';

const log = createLogger('nats-connection');

export interface NatsConnectionConfig {
  servers?: string | string[];
  token?: string;
  user?: string;
  pass?: string;
  name?: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  timeout?: number;
}

export interface ConnectionState {
  connected: boolean;
  server: string | null;
  reconnects: number;
  lastError: string | null;
}

export class NatsConnectionManager {
  private nc: NatsConnection | null = null;
  private config: NatsConnectionConfig;
  private state: ConnectionState = {
    connected: false,
    server: null,
    reconnects: 0,
    lastError: null,
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stateChangeListeners: Set<(state: ConnectionState) => void> = new Set();

  constructor(config: NatsConnectionConfig = {}) {
    this.config = {
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 2000,
      timeout: 5000,
      name: 'ideia-event-bus',
      ...config,
    };
  }

  getState(): ConnectionState {
    return { ...this.state };
  }

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  private notifyStateChange(): void {
    const stateSnapshot = this.getState();
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(stateSnapshot);
      } catch (_err) {
        log.error(`State change listener error: ${err}`);
      }
    });
  }

  async connect(): Promise<NatsConnection> {
    if (this.nc && this.nc.isClosed()) {
      this.nc = null;
      this.state.connected = false;
      this.state.server = null;
    }

    if (this.nc) {
      return this.nc;
    }

    const opts: ConnectionOptions = {
      servers: this.config.servers || 'nats://localhost:4222',
      timeout: this.config.timeout,
      name: this.config.name,
      reconnect: this.config.reconnect,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      reconnectTimeWait: this.config.reconnectDelay,
    };

    if (this.config.token) {
      opts.token = this.config.token;
    } else if (this.config.user && this.config.pass) {
      opts.user = this.config.user;
      opts.pass = this.config.pass;
    }

    try {
      this.nc = await connect(opts);
      
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
      }).catch((err: Error) => {
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
    } catch (_err) {
      const error = err as Error;
      this.state.lastError = error.message;
      this.state.connected = false;
      this.notifyStateChange();
      throw new Error(`Failed to connect to NATS: ${error.message}`);
    }
  }

  private scheduleReconnect(): void {
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
      } catch (_err) {
        log.error(`Reconnect failed: ${err}`);
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.nc && !this.nc.isClosed()) {
      try {
        await this.nc.close();
        log.info('Disconnected from NATS');
      } catch (_err) {
        log.error(`Error during disconnect: ${err}`);
      }
    }

    this.nc = null;
    this.state.connected = false;
    this.state.server = null;
    this.notifyStateChange();
  }

  getConnection(): NatsConnection | null {
    return this.nc;
  }

  async isConnected(): Promise<boolean> {
    if (!this.nc) {
      return false;
    }
    return !this.nc.isClosed();
  }

  async hasJetStream(): Promise<boolean> {
    if (!this.nc || this.nc.isClosed()) return false;
    try {
      await this.nc.jetstreamManager();
      return true;
    } catch {
      return false;
    }
  }

  getStringCodec() {
    return StringCodec();
  }
}

export function createNatsConnectionManager(config?: NatsConnectionConfig): NatsConnectionManager {
  return new NatsConnectionManager(config);
}
