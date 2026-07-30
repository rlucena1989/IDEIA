import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { AgentAddress, AgentMessage, MessageType } from './types';
const logger = createLogger('jsonrpc-protocol-handler');

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

export class JSONRPCProtocolHandler {
  private _handlers: Map<string, (params: unknown, meta: { from: AgentAddress; correlationId: string }) => Promise<unknown>> = new Map();
  private _requestId = 0;

  static readonly ERROR_CODES = {
    PARSE_ERROR: { code: -32700, message: 'Parse error' },
    INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
    METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
    INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
    INTERNAL_ERROR: { code: -32603, message: 'Internal error' },
  } as const;

  registerMethod(
    method: string,
    handler: (params: unknown, meta: { from: AgentAddress; correlationId: string }) => Promise<unknown>,
  ): void {
    this._handlers.set(method, handler);
  }

  async handleMessage(msg: AgentMessage): Promise<AgentMessage | null> {
    const parsed = this.parseRequest(msg.payload);
    if (!parsed) return null;

    if ('id' in parsed && parsed.id !== undefined && parsed.id !== null) {
      return this._handleRequest(parsed as JSONRPCRequest, msg.from, msg.metadata.correlationId);
    }

    this._handleNotification(parsed as JSONRPCNotification, msg.from);
    return null;
  }

  buildRequest(method: string, params?: unknown[] | Record<string, unknown>): JSONRPCRequest {
    this._requestId++;
    return { jsonrpc: '2.0', id: this._requestId, method, params };
  }

  buildResponse(id: string | number | null, result?: unknown, error?: { code: number; message: string; data?: unknown }): JSONRPCResponse {
    return { jsonrpc: '2.0', id, result, error };
  }

  buildNotification(method: string, params?: unknown[] | Record<string, unknown>): JSONRPCNotification {
    return { jsonrpc: '2.0', method, params };
  }

  private async _handleRequest(
    req: JSONRPCRequest, from: AgentAddress, correlationId: string,
  ): Promise<AgentMessage> {
    const handler = this._handlers.get(req.method);

    if (!handler) {
      return {
        id: randomUUID(),
        type: 'response' as MessageType,
        from: { id: 'jsonrpc', type: 'supervisor' as const, instance: 'protocol' },
        to: from,
        payload: this.buildResponse(req.id, undefined, {
          code: -32601,
          message: `Method not found: ${req.method}`,
        }),
        metadata: {
          correlationId,
          ttl: 30000,
          priority: 2,
          timestamp: Date.now(),
          traceId: randomUUID(),
          spanId: randomUUID(),
        },
      };
    }

    try {
      const result = await handler(req.params, { from, correlationId });
      return {
        id: randomUUID(),
        type: 'response' as MessageType,
        from: { id: 'jsonrpc', type: 'supervisor' as const, instance: 'protocol' },
        to: from,
        payload: this.buildResponse(req.id, result),
        metadata: {
          correlationId,
          ttl: 30000,
          priority: 2,
          timestamp: Date.now(),
          traceId: randomUUID(),
          spanId: randomUUID(),
        },
      };
    } catch (err) {
      return {
        id: randomUUID(),
        type: 'response' as MessageType,
        from: { id: 'jsonrpc', type: 'supervisor' as const, instance: 'protocol' },
        to: from,
        payload: this.buildResponse(req.id, undefined, {
          code: -32603,
          message: String(err),
        }),
        metadata: {
          correlationId,
          ttl: 30000,
          priority: 2,
          timestamp: Date.now(),
          traceId: randomUUID(),
          spanId: randomUUID(),
        },
      };
    }
  }

  private _handleNotification(notif: JSONRPCNotification, _from: AgentAddress): void {
    const handler = this._handlers.get(notif.method);
    if (handler) {
      handler(notif.params, { from: _from, correlationId: randomUUID() }).catch(() => {});
    }
  }

  parseRequest(data: unknown): JSONRPCRequest | JSONRPCNotification | null {
    const msg = data as Record<string, unknown> | undefined;
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return null;
    if (msg.id !== undefined && msg.id !== null) {
      return msg as unknown as JSONRPCRequest;
    }
    return msg as unknown as JSONRPCNotification;
  }
}
