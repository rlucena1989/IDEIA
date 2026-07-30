import { IPCSecureProtocol, IPCRequest } from './protocol';
import { createLogger } from '@ideia/logger';
import { CapabilityChecker } from './capability-checker';
import { AuditLogger } from './audit-logger';
const logger = createLogger('secure-router');

export type IPCHandler = (params: Record<string, unknown>, source: string) => Promise<object>;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class SecureIPCRouter {
  private handlers = new Map<string, IPCHandler>();
  private rateLimits = new Map<string, RateLimitEntry>();

  constructor(
    private protocol: IPCSecureProtocol,
    private capabilityChecker: CapabilityChecker,
    private auditLogger: AuditLogger,
    private config: {
      maxRequestsPerMinute: number;
      maxPayloadSize: number;
      maxTokenAgeMs: number;
    } = { maxRequestsPerMinute: 100, maxPayloadSize: 65536, maxTokenAgeMs: 5000 },
  ) {}

  registerHandler(method: string, handler: IPCHandler): void {
    if (this.handlers.has(method)) throw new Error(`Handler already registered: ${method}`);
    this.handlers.set(method, handler);
  }

  async handle(rawRequest: Buffer): Promise<Buffer> {
    const startTime = Date.now();
    try {
      if (rawRequest.length < 44) throw new Error('Request too short');
      const nonce = rawRequest.subarray(0, 12);
      const encryptedBody = rawRequest.subarray(12);
      if (encryptedBody.length > this.config.maxPayloadSize) {
        throw new Error('Payload exceeds maximum size');
      }
      const decrypted = this.protocol.decrypt(encryptedBody, nonce);
      const parsed = JSON.parse(decrypted.toString('utf-8'));
      const request: IPCRequest = {
        id: parsed.id,
        method: parsed.method,
        params: Buffer.from(JSON.stringify(parsed.params)),
        token: parsed.token,
        source: parsed.source,
        timestamp: BigInt(parsed.timestamp),
        hmac: Buffer.from(parsed.hmac, 'hex'),
      };
      const age = Date.now() - Number(request.timestamp) / 1_000_000;
      if (Math.abs(age) > this.config.maxTokenAgeMs) {
        throw new Error('Request expired or from future');
      }
      if (!this.protocol.verify(request)) {
        throw new Error('HMAC verification failed');
      }
      const token = this.capabilityChecker.verifyToken(request.token);
      if (!this.capabilityChecker.checkPermission(token, request.method, parsed.params)) {
        throw new Error(`Permission denied: ${request.method}`);
      }
      const key = `${token.sub}:${request.method}`;
      if (!this.checkRateLimit(key)) {
        throw new Error('Rate limit exceeded');
      }
      const handler = this.handlers.get(request.method);
      if (!handler) throw new Error(`No handler: ${request.method}`);
      const result = await handler(parsed.params, request.source);
      const response = this.protocol.createResponse(request, true, result as object);
      this.auditLogger.log({
        action: request.method,
        agentId: token.sub,
        source: request.source,
        success: true,
        durationMs: Date.now() - startTime,
        params: parsed.params,
      });
      const respData = JSON.stringify(response);
      const enc = this.protocol.encrypt(Buffer.from(respData));
      return Buffer.concat([enc.nonce, enc.ciphertext]);
    } catch (err) {
      const msg = (err as Error).message;
      this.auditLogger.log({
        action: 'unknown',
        agentId: 'unknown',
        source: 'unknown',
        success: false,
        durationMs: Date.now() - startTime,
        params: { error: msg },
      });
      const errResp = JSON.stringify({ success: false, error: 'Access denied' });
      const enc = this.protocol.encrypt(Buffer.from(errResp));
      return Buffer.concat([enc.nonce, enc.ciphertext]);
    }
  }

  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(key);
    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(key, { count: 1, resetAt: now + 60000 });
      return true;
    }
    if (entry.count >= this.config.maxRequestsPerMinute) return false;
    entry.count++;
    return true;
  }
}
