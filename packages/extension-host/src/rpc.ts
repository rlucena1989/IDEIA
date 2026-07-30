import { Emitter, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { RpcMessageTransport, RpcMessage, RpcProtocol } from './types';

class DefaultRpcMessageTransport implements RpcMessageTransport {
  private _open = true;
  private onMessageEmitter = new Emitter<RpcMessage>();

  get onMessage() { return this.onMessageEmitter.event; }

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

  receiveMessage(message: RpcMessage): void {
    if (!this._open) return;
    this.onMessageEmitter.fire(message);
  }
}

export class DefaultRpcProtocol implements RpcProtocol {
  private transport: DefaultRpcMessageTransport;
  private requests = new Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();
  private handlers = new Map<string, (params: unknown[]) => Promise<unknown>>();
  private nextId = 0;

  constructor() {
    this.transport = new DefaultRpcMessageTransport();
    this.transport.onMessage(msg => this.handleMessage(msg));
  }

  getTransport(): DefaultRpcMessageTransport {
    return this.transport;
  }

  sendRequest(method: string, params?: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = `rpc-${++this.nextId}`;
      this.requests.set(id, { resolve, reject });
      this.transport.send({ id, type: 'request', method, params });
      setTimeout(() => {
        if (this.requests.has(id)) {
          this.requests.delete(id);
          reject(new Error(`RPC timeout: ${method}`));
        }
      }, 30000);
    });
  }

  sendNotification(method: string, params?: unknown[]): void {
    const id = `notif-${++this.nextId}`;
    this.transport.send({ id, type: 'event', method, params });
  }

  onRequest(method: string, handler: (params: unknown[]) => Promise<unknown>): import('@ideia/core-contributions').Disposable {
    this.handlers.set(method, handler);
    return { dispose: () => this.handlers.delete(method) };
  }

  dispose(): void {
    this.transport.close();
    this.handlers.clear();
    for (const [, { reject }] of this.requests) {
      reject(new Error('RPC disposed'));
    }
    this.requests.clear();
  }

  private async handleMessage(msg: RpcMessage): Promise<void> {
    if (msg.type === 'request' && msg.method) {
      const handler = this.handlers.get(msg.method);
      if (handler) {
        try {
          const result = await handler(msg.params || []);
          this.transport.send({ id: msg.id, type: 'response', result });
        } catch (err) {
          this.transport.send({
            id: msg.id,
            type: 'response',
            error: { code: -1, message: (err as Error).message },
          });
        }
      }
    } else if (msg.type === 'response') {
      const pending = this.requests.get(msg.id);
      if (pending) {
        this.requests.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error.message));
        } else {
          pending.resolve(msg.result);
        }
      }
    }
  }
}
