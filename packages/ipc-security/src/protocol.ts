import { randomBytes, createHmac, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('protocol');

export const PROTOCOL_VERSION = 1;
export const MAX_PAYLOAD_SIZE = 65536;
const NONCE_SIZE = 12;
const HMAC_KEY_SIZE = 32;

export interface IPCRequest {
  id: string;
  method: string;
  params: Buffer;
  token: string;
  source: string;
  timestamp: bigint;
  hmac: Buffer;
}

export interface IPCResponse {
  id: string;
  success: boolean;
  data?: Buffer;
  error?: string;
  timestamp: bigint;
  hmac: Buffer;
}

export class IPCSecureProtocol {
  private hmacKey: Buffer;
  private encryptionKey: Buffer;

  constructor(hmacKey: Buffer, encryptionKey: Buffer) {
    if (hmacKey.length !== HMAC_KEY_SIZE) throw new Error(`HMAC key must be ${HMAC_KEY_SIZE} bytes`);
    if (encryptionKey.length !== 32) throw new Error('Encryption key must be 32 bytes');
    this.hmacKey = hmacKey;
    this.encryptionKey = encryptionKey;
  }

  encrypt(plaintext: Buffer): { ciphertext: Buffer; nonce: Buffer } {
    const nonce = randomBytes(NONCE_SIZE);
    const cipher = createCipheriv('chacha20-poly1305', this.encryptionKey, nonce);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { ciphertext: Buffer.concat([encrypted, authTag]), nonce };
  }

  decrypt(ciphertext: Buffer, nonce: Buffer): Buffer {
    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
    const decipher = createDecipheriv('chacha20-poly1305', this.encryptionKey, nonce);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  createRequest(method: string, params: object, token: string, source: string): IPCRequest {
    const id = randomBytes(16).toString('hex');
    const paramsBuffer = Buffer.from(JSON.stringify(params));
    if (paramsBuffer.length > MAX_PAYLOAD_SIZE) throw new Error('Payload exceeds maximum size');
    const { ciphertext, nonce } = this.encrypt(paramsBuffer);
    const request: IPCRequest = {
      id, method,
      params: Buffer.concat([nonce, ciphertext]),
      token, source,
      timestamp: BigInt(Date.now()) * 1_000_000n,
      hmac: Buffer.alloc(0),
    };
    request.hmac = this.sign(request);
    return request;
  }

  sign(msg: IPCRequest | IPCResponse): Buffer {
    const data = this.serializeForHMAC(msg);
    return createHmac('sha256', this.hmacKey).update(data).digest();
  }

  verify(msg: IPCRequest | IPCResponse): boolean {
    const expected = this.sign({ ...msg, hmac: Buffer.alloc(0) } as IPCRequest & IPCResponse);
    if (expected.length !== msg.hmac.length) return false;
    return timingSafeEqual(expected, msg.hmac);
  }

  private serializeForHMAC(msg: IPCRequest | IPCResponse): Buffer {
    const parts: Buffer[] = [];
    if ('method' in msg) {
      parts.push(Buffer.from(msg.id), Buffer.from(msg.method), msg.params);
      parts.push(Buffer.from(msg.token), Buffer.from(msg.source));
      parts.push(Buffer.from(msg.timestamp.toString()));
    } else {
      parts.push(Buffer.from(msg.id), Buffer.from(msg.success ? '1' : '0'));
      if (msg.data) parts.push(msg.data);
      if (msg.error) parts.push(Buffer.from(msg.error));
      parts.push(Buffer.from(msg.timestamp.toString()));
    }
    return Buffer.concat(parts);
  }

  createResponse(request: IPCRequest, success: boolean, data?: object, error?: string): IPCResponse {
    const response: IPCResponse = {
      id: request.id, success,
      timestamp: BigInt(Date.now()) * 1_000_000n,
      hmac: Buffer.alloc(0),
      ...(data && { data: this.encrypt(Buffer.from(JSON.stringify(data))).ciphertext }),
      ...(error && { error }),
    };
    response.hmac = this.sign(response);
    return response;
  }

  verifyTimestamp(msg: IPCRequest | IPCResponse, maxAgeMs: number = 5000): boolean {
    const now = BigInt(Date.now()) * 1_000_000n;
    const age = Number(now - msg.timestamp) / 1_000_000;
    return Math.abs(age) <= maxAgeMs;
  }
}
