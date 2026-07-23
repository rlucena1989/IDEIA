import { NatsConnectionManager } from './nats-connection';
import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';

const log = createLogger('req-reply');

export interface RequestMessage<T = unknown> {
  id: string;
  subject: string;
  data: T;
  timestamp: number;
  timeout?: number;
}

export interface ResponseMessage<T = unknown> {
  requestId: string;
  data: T;
  error?: string;
  timestamp: number;
}

export interface RequestHandler<TRequest = unknown, TResponse = unknown> {
  (request: TRequest): Promise<TResponse> | TResponse;
}

export class RequestReplyManager {
  private connectionManager: NatsConnectionManager;
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timer: NodeJS.Timeout;
  }> = new Map();
  private handlers: Map<string, RequestHandler> = new Map();

  constructor(connectionManager: NatsConnectionManager) {
    this.connectionManager = connectionManager;
  }

  async initialize(): Promise<void> {
    try {
      await this.connectionManager.connect();
    } catch (_err) {
      log.info(`Initialized (offline mode): ${err}`);
      return;
    }
    log.info('Initialized');
  }

  async request<TRequest = unknown, TResponse = unknown>(subject: string, data: TRequest, timeout = 30000): Promise<TResponse> {
    const requestId = this.generateRequestId();
    const request: RequestMessage = { id: requestId, subject, data, timestamp: Date.now(), timeout };
    await this.publishRequest(subject, request);

    return new Promise<TResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request ${requestId} timed out after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject, timer });
    });
  }

  async respond<TRequest = unknown, TResponse = unknown>(subject: string, handler: RequestHandler<TRequest, TResponse>): Promise<void> {
    this.handlers.set(subject, handler as RequestHandler);
    log.info(`Registered handler for ${subject}`);
  }

  private async publishRequest(subject: string, request: RequestMessage): Promise<void> {
    const nc = this.connectionManager.getConnection();
    if (!nc) throw new Error('Not connected to NATS');
    const sc = this.connectionManager.getStringCodec();
    nc.publish(`ideia.req.${subject}`, sc.encode(JSON.stringify(request)));
  }

  private async publishResponse(requestId: string, subject: string, response: ResponseMessage): Promise<void> {
    const nc = this.connectionManager.getConnection();
    if (!nc) throw new Error('Not connected to NATS');
    const sc = this.connectionManager.getStringCodec();
    nc.publish(`ideia.res.${subject}`, sc.encode(JSON.stringify(response)));
  }

  async handleIncomingRequest(requestJson: string): Promise<void> {
    try {
      const request: RequestMessage = JSON.parse(requestJson);
      const handler = this.handlers.get(request.subject);
      if (handler) {
        try {
          const result = await handler(request.data);
          await this.publishResponse(request.id, request.subject, {
            requestId: request.id, data: result, timestamp: Date.now(),
          });
        } catch (_err) {
          await this.publishResponse(request.id, request.subject, {
            requestId: request.id, data: null, error: String(err), timestamp: Date.now(),
          });
        }
      }
    } catch (_err) {
      // Log silenciado propositalmente — falha nao bloqueia fluxo
    }
  }

  async handleIncomingResponse(responseJson: string): Promise<void> {
    try {
      const response: ResponseMessage = JSON.parse(responseJson);
      const pending = this.pendingRequests.get(response.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(response.requestId);
        if (response.error) {
          pending.reject(new Error(response.error));
        } else {
          pending.resolve(response.data);
        }
      }
    } catch (_err) {
      // Log silenciado propositalmente — falha nao bloqueia fluxo
    }
  }

  private generateRequestId(): string {
    return randomUUID();
  }

  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  async cleanup(): Promise<void> {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('RequestReplyManager shutting down'));
      this.pendingRequests.delete(id);
    }
  }
}

export function createRequestReplyManager(connectionManager: NatsConnectionManager): RequestReplyManager {
  return new RequestReplyManager(connectionManager);
}
