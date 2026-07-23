import { IncomingMessage, ServerResponse } from 'node:http';

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface SecurityConfig {
  rateLimit?: {
    maxRequestsPerMinute?: number;
    burstSize?: number;
    enabled?: boolean;
  };
  apiKey?: {
    key?: string;
    enabled?: boolean;
    exemptPaths?: string[];
  };
}

const DEFAULT_CONFIG: SecurityConfig = {
  rateLimit: {
    maxRequestsPerMinute: 100,
    burstSize: 150,
    enabled: true,
  },
  apiKey: {
    key: process.env['IDEIA_API_KEY'] || undefined,
    enabled: Boolean(process.env['IDEIA_API_KEY']),
    exemptPaths: ['/api/health'],
  },
};

export class SecurityMiddleware {
  private config: SecurityConfig;
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private cleanupTimer: NodeJS.Timeout;

  constructor(config?: SecurityConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
  }

  applyRateLimit(req: IncomingMessage, res: ServerResponse): boolean {
    if (!this.config.rateLimit?.enabled) return true;

    const ip = this.getClientIp(req);
    const key = `ip:${ip}`;
    const now = Date.now();
    const config = this.config.rateLimit ?? 100;

    let entry = this.rateLimitStore.get(key);
    if (!entry) {
      entry = { tokens: config.burstSize ?? 10, lastRefill: now };
      this.rateLimitStore.set(key, entry);
    }

    const elapsed = now - entry.lastRefill;
    const refillRate = (config.maxRequestsPerMinute ?? 60) / 60000;
    const tokensToAdd = elapsed * refillRate;
    entry.tokens = Math.min(config.burstSize ?? 10, entry.tokens + tokensToAdd);
    entry.lastRefill = now;

    if (entry.tokens >= 1) {
      entry.tokens -= 1;
      return true;
    }

    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': '60',
    });
    res.end(JSON.stringify({ ok: false, error: 'Too many requests. Please try again later.' }));
    return false;
  }

  checkApiKey(req: IncomingMessage, res: ServerResponse): boolean {
    if (!this.config.apiKey?.enabled) return true;

    const pathname = req.url?.split('?')[0] || '';
    const exemptPaths = this.config.apiKey.exemptPaths || [];
    if (exemptPaths.includes(pathname)) return true;

    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (token === this.config.apiKey.key) return true;

    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Unauthorized: invalid or missing API key' }));
    return false;
  }

  setSecurityHeaders(res: ServerResponse): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  getRateLimitStats(): { totalIps: number; totalEntries: number } {
    return {
      totalIps: this.rateLimitStore.size,
      totalEntries: Array.from(this.rateLimitStore.values()).length,
    };
  }

  private getClientIp(req: IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
      return ip;
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore) {
      if (now - entry.lastRefill > 300000) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.rateLimitStore.clear();
  }
}

export function createSecurityMiddleware(config?: SecurityConfig): SecurityMiddleware {
  return new SecurityMiddleware(config);
}
