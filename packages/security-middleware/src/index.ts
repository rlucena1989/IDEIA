export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface SecurityConfig {
  rateLimit?: RateLimitConfig;
  blockedPaths?: RegExp[];
  allowedOrigins?: string[];
  maxBodySize?: number;
}

export interface SecurityViolation {
  type: 'rate_limit' | 'blocked_path' | 'invalid_origin' | 'body_too_large' | 'injection_attempt';
  source: string;
  detail: string;
  timestamp: string;
}

export class SecurityMiddleware {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();
  private violations: SecurityViolation[] = [];
  private config: SecurityConfig;

  constructor(config?: SecurityConfig) {
    this.config = {
      rateLimit: { windowMs: 60000, maxRequests: 100 },
      blockedPaths: [/\.env$/, /\.git\//, /node_modules\//, /secret/i, /credential/i],
      allowedOrigins: ['http://localhost:3001', 'http://127.0.0.1:3001'],
      maxBodySize: 10 * 1024 * 1024,
      ...config,
    };
  }

  checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.requests.get(clientId);

    if (!entry || now > entry.resetAt) {
      const limit = this.config.rateLimit ?? { windowMs: 60000, maxRequests: 100 };
      this.requests.set(clientId, { count: 1, resetAt: now + limit.windowMs });
      return { allowed: true, remaining: limit.maxRequests - 1, resetAt: now + limit.windowMs };
    }

    const limit = this.config.rateLimit ?? { windowMs: 60000, maxRequests: 100 };
    if (entry.count >= limit.maxRequests) {
      this.violations.push({ type: 'rate_limit', source: clientId, detail: `Exceeded ${limit.maxRequests} requests per ${limit.windowMs}ms`, timestamp: new Date().toISOString() });
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: limit.maxRequests - entry.count, resetAt: entry.resetAt };
  }

  checkPath(path: string): { allowed: boolean; reason?: string } {
    for (const pattern of this.config.blockedPaths ?? []) {
      if (pattern.test(path)) {
        this.violations.push({ type: 'blocked_path', source: path, detail: `Path matches blocked pattern: ${pattern}`, timestamp: new Date().toISOString() });
        return { allowed: false, reason: `Access to ${path} is blocked` };
      }
    }
    return { allowed: true };
  }

  checkOrigin(origin: string | undefined): { allowed: boolean } {
    if (!origin) return { allowed: true };
    const origins = this.config.allowedOrigins ?? ['*'];
    if (origins.includes(origin)) return { allowed: true };
    this.violations.push({ type: 'invalid_origin', source: origin, detail: `Origin not in allowed list`, timestamp: new Date().toISOString() });
    return { allowed: false };
  }

  checkBodySize(size: number): { allowed: boolean } {
    if (size > (this.config.maxBodySize ?? 1048576)) {
      this.violations.push({ type: 'body_too_large', source: String(size), detail: `Body size ${size} exceeds max ${this.config.maxBodySize}`, timestamp: new Date().toISOString() });
      return { allowed: false };
    }
    return { allowed: true };
  }

  sanitizeShellCommand(input: string): string {
    const dangerous = /[;&|`$(){}[\]!#~\n\r]/g;
    if (dangerous.test(input)) {
      this.violations.push({ type: 'injection_attempt', source: input.slice(0, 100), detail: 'Shell metacharacters detected', timestamp: new Date().toISOString() });
    }
    return input.replace(dangerous, '');
  }

  getViolations(): SecurityViolation[] {
    return [...this.violations];
  }

  clearViolations(): void {
    this.violations = [];
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export function createSecurityMiddleware(config?: SecurityConfig): SecurityMiddleware {
  return new SecurityMiddleware(config);
}

export * from './llm-guard';
export * from './sso';
export { SamlHandler, LdapHandler, createSamlHandler, createLdapHandler } from './sso';
