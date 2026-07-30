import { createHash } from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('anti-replay');

export class AntiReplayProtection {
  private seenNonces = new Set<string>();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private readonly maxNonceAge: number;

  constructor(maxNonceAgeMs: number = 60000) {
    this.maxNonceAge = maxNonceAgeMs;
    const intervalMs = this.maxNonceAge;
    this.cleanupInterval = setInterval(() => this.cleanup(), intervalMs);
  }

  check(ipcRequest: { id: string; timestamp: bigint; source: string }): boolean {
    const nonce = createHash('sha256')
      .update(`${ipcRequest.id}|${ipcRequest.timestamp.toString()}|${ipcRequest.source}|${Date.now()}`)
      .digest('hex');
    if (this.seenNonces.has(nonce)) {
      return false;
    }
    this.seenNonces.add(nonce);
    return true;
  }

  private cleanup(): void {
    if (this.seenNonces.size > 10000) {
      this.seenNonces.clear();
    }
  }

  dispose(): void {
    clearInterval(this.cleanupInterval);
    this.seenNonces.clear();
  }
}
