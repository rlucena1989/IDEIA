import { Disposable } from '@ideia/core-contributions';

export interface RpcChannel {
  readonly id: string;
  send(message: RpcMessage): void;
  onMessage: import('@ideia/core-contributions').Event<RpcMessage>;
  close(): void;
  isOpen(): boolean;
}

export interface RpcMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  params?: unknown[];
  result?: unknown;
  error?: RpcError;
}

export interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface ConnectionHandler {
  handleConnection(channel: RpcChannel): void;
}

export interface RpcConnection {
  readonly channel: RpcChannel;
  sendRequest(method: string, params?: unknown[]): Promise<unknown>;
  sendNotification(method: string, params?: unknown[]): void;
  onRequest: import('@ideia/core-contributions').Event<{ method: string; params: unknown[] }>;
  close(): void;
}

export interface RpcProxyFactory {
  createProxy<T>(connection: RpcConnection): T;
  createLocalProxy<T>(service: T, connection: RpcConnection): void;
}
