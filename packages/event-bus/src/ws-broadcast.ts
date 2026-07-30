import { WebSocketServer, WebSocket } from 'ws';
import { createLogger } from '@ideia/logger';
import type { IEventBus } from './types';
const logger = createLogger('ws-broadcast');

export interface WSBroadcastConfig {
  port: number;
  host?: string;
  path?: string;
}

export class WSBroadcast {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private config: WSBroadcastConfig;
  private subscriptionId: string | null = null;
  private eventBus: IEventBus | null = null;

  constructor(config: WSBroadcastConfig) {
    this.config = config;
  }

  async start(eventBus: IEventBus): Promise<boolean> {
    try {
      this.eventBus = eventBus;
      this.wss = new WebSocketServer({
        port: this.config.port,
        host: this.config.host,
        path: this.config.path,
      });

      this.wss.on('connection', (ws: WebSocket) => {
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
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(msg);
            } catch {
              this.clients.delete(client);
            }
          }
        }
      });

      return true;
    } catch {
      if (this.wss) {
        try { this.wss.close(); } catch { /* ignore */ }
        this.wss = null;
      }
      return false;
    }
  }

  async stop(): Promise<void> {
    if (this.eventBus && this.subscriptionId) {
      await this.eventBus.unsubscribe(this.subscriptionId);
    }
    if (this.wss) {
      for (const client of this.clients) {
        try { client.close(); } catch { /* ignore */ }
      }
      try { this.wss.close(); } catch { /* ignore */ }
      this.wss = null;
    }
    this.clients.clear();
  }

  getClientCount(): number {
    return this.clients.size;
  }

  isRunning(): boolean {
    return this.wss !== null;
  }
}

export function createWSBroadcast(config: WSBroadcastConfig): WSBroadcast {
  return new WSBroadcast(config);
}
