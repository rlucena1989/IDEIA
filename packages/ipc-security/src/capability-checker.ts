import { randomBytes } from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('capability-checker');

export interface CapabilityToken {
  sub: string;
  permissions: string[];
  scope: Record<string, string[]>;
  iat: number;
  exp: number;
  source: string;
  jti: string;
}

export class CapabilityChecker {
  constructor(private publicKeyPem: string) {}

  verifyToken(token: string): CapabilityToken {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    return payload as CapabilityToken;
  }

  checkPermission(
    token: CapabilityToken,
    method: string,
    params: Record<string, unknown>
  ): boolean {
    const [domain, action] = method.split(':');
    const required = `${domain}:${action}`;
    if (!token.permissions.includes(required) && !token.permissions.includes(`${domain}:*`)) {
      return false;
    }
    if (token.scope?.[method]) {
      for (const [_key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          const ok = token.scope[method].some(scope => {
            if (scope.endsWith('*')) return value.startsWith(scope.slice(0, -1));
            if (scope.startsWith('regex:')) {
              const regex = new RegExp(scope.slice(6));
              return regex.test(value);
            }
            return value === scope;
          });
          if (!ok) return false;
        }
      }
    }
    if (token.source && params.source && token.source !== params.source) {
      return false;
    }
    return true;
  }
}

export function issueToken(
  sub: string,
  permissions: string[],
  scope: Record<string, string[]>,
  ttlSeconds: number = 3600,
  source?: string,
): string {
  const header = { alg: 'ES384', typ: 'JWT' };
  const payload: CapabilityToken = {
    sub, permissions, scope,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    source: source || '',
    jti: randomBytes(16).toString('hex'),
  };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${headerB64}.${payloadB64}.`;
}
