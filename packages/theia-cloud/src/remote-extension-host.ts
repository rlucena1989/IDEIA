import { createLogger } from '@ideia/logger';
import type { Logger } from '@ideia/logger';
import type {
  RemoteConnection,
  ConnectionStatus,
  ExtensionHostConfig,
} from './types-remote';

export class RemoteExtensionHost {
  private connections: Map<string, RemoteConnection> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private heartbeatTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private reconnectCounts: Map<string, number> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger('theia-cloud:remote-extension-host');
  }

  connect(config: ExtensionHostConfig): RemoteConnection {
    const id = `reh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const connection: RemoteConnection = {
      id,
      status: 'connecting',
      host: config.host,
      port: config.port,
      protocol: config.protocol,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.connections.set(id, connection);
    this.reconnectCounts.set(id, 0);
    this.logger.info('Remote extension host connecting', { connectionId: id, host: config.host, port: config.port });
    this.initWebSocket(id, config);
    return connection;
  }

  disconnect(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }
    this.stopHeartbeat(connectionId);
    this.clearReconnect(connectionId);
    this.reconnectCounts.delete(connectionId);
    const ws = this.wsConnections.get(connectionId);
    if (ws) {
      ws.close(1000, 'Client disconnect');
      this.wsConnections.delete(connectionId);
    }
    connection.status = 'disconnected';
    connection.lastActivity = Date.now();
    this.logger.info('Remote extension host disconnected', { connectionId });
    return true;
  }

  reconnect(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }
    const config: ExtensionHostConfig = {
      host: connection.host,
      port: connection.port,
      protocol: connection.protocol as 'wss' | 'tcp' | 'ssh',
      token: '',
      autoReconnect: true,
      maxReconnectAttempts: 10,
      heartbeatInterval: 15000,
    };
    this.disconnect(connectionId);
    connection.status = 'reconnecting';
    this.initWebSocket(connectionId, config);
    this.logger.info('Remote extension host reconnecting', { connectionId });
    return true;
  }

  getStatus(connectionId: string): ConnectionStatus {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return 'disconnected';
    }
    return connection.status;
  }

  listConnections(): RemoteConnection[] {
    return Array.from(this.connections.values());
  }

  private initWebSocket(connectionId: string, config: ExtensionHostConfig): void {
    const url = `ws://${config.host}:${config.port}/remote`;
    try {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.status = 'connected';
          connection.lastActivity = Date.now();
        }
        this.reconnectCounts.set(connectionId, 0);
        this.startHeartbeat(connectionId, config.heartbeatInterval);
        this.logger.info('WebSocket connected', { connectionId });
      };
      ws.onclose = () => {
        this.stopHeartbeat(connectionId);
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.status = 'disconnected';
          connection.lastActivity = Date.now();
          if (config.autoReconnect) {
            this.scheduleReconnect(connectionId, config);
          }
        }
        this.wsConnections.delete(connectionId);
      };
      ws.onerror = () => {
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.status = 'error';
          connection.lastActivity = Date.now();
        }
      };
      this.wsConnections.set(connectionId, ws);
    } catch {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.status = 'error';
      }
    }
  }

  private scheduleReconnect(connectionId: string, config: ExtensionHostConfig): void {
    const attempts = this.reconnectCounts.get(connectionId) ?? 0;
    if (attempts >= config.maxReconnectAttempts) {
      this.logger.warn('Max reconnect attempts reached', { connectionId });
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.status = 'error';
      }
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
    this.reconnectCounts.set(connectionId, attempts + 1);
    const timer = setTimeout(() => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.status = 'reconnecting';
        this.initWebSocket(connectionId, config);
      }
    }, delay);
    this.reconnectTimers.set(connectionId, timer);
  }

  private startHeartbeat(connectionId: string, interval: number): void {
    this.stopHeartbeat(connectionId);
    const timer = setInterval(() => {
      const ws = this.wsConnections.get(connectionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: Date.now() }));
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.lastActivity = Date.now();
        }
      }
    }, interval);
    this.heartbeatTimers.set(connectionId, timer);
  }

  private stopHeartbeat(connectionId: string): void {
    const timer = this.heartbeatTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionId);
    }
  }

  private clearReconnect(connectionId: string): void {
    const timer = this.reconnectTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(connectionId);
    }
  }
}
