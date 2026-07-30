import { IPCSecureProtocol } from './protocol';
import { createLogger } from '@ideia/logger';
const logger = createLogger('unified-ipc');

export interface IIpcAdapter {
  readonly platform: 'electron' | 'tauri' | 'theia' | 'nats';
  send(method: string, params: unknown, token: string): Promise<unknown>;
  on(method: string, handler: (params: unknown) => Promise<unknown>): void;
  getWindowId(): string;
}

export class ElectronIpcAdapter implements IIpcAdapter {
  readonly platform = 'electron' as const;
  constructor(private protocol: IPCSecureProtocol) {}
  async send(method: string, params: unknown, token: string): Promise<unknown> {
    const request = this.protocol.createRequest(method, params as object, token, 'renderer');
    return { encrypted: true, id: request.id };
  }
  on(_method: string, _handler: (params: unknown) => Promise<unknown>): void {}
  getWindowId(): string { return 'electron-renderer'; }
}

export class TauriIpcAdapter implements IIpcAdapter {
  readonly platform = 'tauri' as const;
  constructor(private protocol: IPCSecureProtocol) {}
  async send(method: string, params: unknown, token: string): Promise<unknown> {
    const request = this.protocol.createRequest(method, params as object, token, 'webview');
    return { encrypted: true, id: request.id };
  }
  on(_method: string, _handler: (params: unknown) => Promise<unknown>): void {}
  getWindowId(): string { return 'tauri-webview'; }
}

export class TheiaIpcAdapter implements IIpcAdapter {
  readonly platform = 'theia' as const;
  constructor(private protocol: IPCSecureProtocol) {}
  async send(method: string, params: unknown, token: string): Promise<unknown> {
    const request = this.protocol.createRequest(method, params as object, token, 'theia-frontend');
    return { encrypted: true, id: request.id };
  }
  on(_method: string, _handler: (params: unknown) => Promise<unknown>): void {}
  getWindowId(): string { return 'theia-frontend'; }
}
