import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { RpcChannel, RpcMessage } from './types';
const logger = createLogger('channel');

export class DefaultRpcChannel implements RpcChannel {
  readonly id: string;
  private _open = true;
  private onMessageEmitter = new Emitter<RpcMessage>();

  get onMessage() { return this.onMessageEmitter.event; }

  constructor(id: string) {
    this.id = id;
  }

  send(message: RpcMessage): void {
    if (!this._open) return;
    this.onMessageEmitter.fire(message);
  }

  close(): void {
    this._open = false;
    this.onMessageEmitter.dispose();
  }

  isOpen(): boolean {
    return this._open;
  }

  receive(message: RpcMessage): void {
    if (!this._open) return;
    this.onMessageEmitter.fire(message);
  }
}

export class DefaultRpcConnection {
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (err: unknown) => void }>();
  private onRequestEmitter = new Emitter<{ method: string; params: unknown[] }>();
  private channel: RpcChannel;
  private messageId = 0;

  get onRequest() { return this.onRequestEmitter.event; }

  constructor(channel: RpcChannel) {
    this.channel = channel;
    this.channel.onMessage(msg => this.handleMessage(msg));
  }

  sendRequest(method: string, params?: unknown[]): Promise<unknown> {
    const id = `req-${++this.messageId}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.channel.send({ id, type: 'request', method, params });
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  sendNotification(method: string, params?: unknown[]): void {
    const id = `notif-${++this.messageId}`;
    this.channel.send({ id, type: 'notification', method, params });
  }

  close(): void {
    this.channel.close();
    this.onRequestEmitter.dispose();
    for (const [, { reject }] of this.pendingRequests) {
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  private handleMessage(msg: RpcMessage): void {
    if (msg.type === 'request') {
      this.onRequestEmitter.fire({ method: msg.method || '', params: msg.params || [] });
    } else if (msg.type === 'response') {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error.message));
        } else {
          pending.resolve(msg.result);
        }
      }
    }
  }
}
