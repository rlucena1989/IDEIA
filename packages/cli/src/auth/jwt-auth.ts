import { createLogger } from '@ideia/logger';
import { AppError } from '@ideia/contracts';
import { AgentIdentity, type AgentRole } from '@ideia/agent-identity';

const log = createLogger('jwt-auth');

export interface JwtPayload {
  sub: string;
  iss?: string;
  aud?: string;
  exp: number;
  iat: number;
  nbf?: number;
  jti?: string;
  roles: string[];
  agentId?: string;
  agentRole?: AgentRole;
  sessionId?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export interface JwtHeader {
  alg: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'ES256';
  typ: 'JWT';
  kid?: string;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(data: string): string {
  data = data.replace(/-/g, '+').replace(/_/g, '/');
  while (data.length % 4) data += '=';
  return Buffer.from(data, 'base64').toString('utf-8');
}

function createHmacSignature(payload: string, secret: string): string {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return base64UrlEncode(hmac.digest('base64'));
}

export function generateToken(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: string | number = '1h'
): string {
  const now = Math.floor(Date.now() / 1000);

  let expSeconds: number;
  if (typeof expiresIn === 'string') {
    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
    if (!match) throw new AppError('INVALID_EXPIRES_IN', `Invalid expiresIn format: ${expiresIn}`);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    expSeconds = parseInt(match[1]) * (multipliers[match[2]] || 3600);
  } else {
    expSeconds = expiresIn;
  }

  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expSeconds,
    jti: `jti_${now}_${Math.random().toString(36).slice(2, 10)}`,
  };

  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = createHmacSignature(signatureInput, secret);

  return `${signatureInput}.${signature}`;
}

export function verifyToken(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('INVALID_TOKEN_FORMAT', 'JWT must have 3 parts');
  }

  const [headerEncoded, payloadEncoded, signature] = parts;
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const expectedSignature = createHmacSignature(signatureInput, secret);

  if (signature !== expectedSignature) {
    throw new AppError('INVALID_SIGNATURE', 'JWT signature verification failed');
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadEncoded));
  } catch {
    throw new AppError('INVALID_PAYLOAD', 'Failed to parse JWT payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new AppError('TOKEN_EXPIRED', 'JWT has expired');
  }

  if (payload.nbf && payload.nbf > now) {
    throw new AppError('TOKEN_NOT_YET_VALID', 'JWT is not yet valid (nbf)');
  }

  return payload;
}

export function decodeToken(token: string): { header: JwtHeader; payload: JwtPayload } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('INVALID_TOKEN_FORMAT', 'JWT must have 3 parts');
  }

  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    payload: JSON.parse(base64UrlDecode(parts[1])),
  };
}

export function generateAgentToken(
  agentId: string,
  agentRole: AgentRole,
  secret: string,
  expiresIn?: string | number,
  metadata?: Record<string, unknown>
): string {
  return generateToken(
    {
      sub: agentId,
      agentId,
      agentRole,
      roles: [agentRole],
      metadata,
    },
    secret,
    expiresIn
  );
}

export interface AuthMiddlewareOptions {
  secret: string;
  requireAuth?: boolean;
  requiredRoles?: string[];
  agentIdentity?: AgentIdentity;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  const { secret, requireAuth = true, requiredRoles, agentIdentity } = options;

  return function authMiddleware(req: { headers: Record<string, string | undefined>; url?: string; method?: string }) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      if (!requireAuth) {
        log.info('No auth header, skipping auth');
        return { authenticated: false, reason: 'No auth header (not required)' };
      }
      throw new AppError('AUTH_REQUIRED', 'Authorization header required');
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      throw new AppError('INVALID_AUTH_HEADER', 'Authorization header must use Bearer scheme');
    }

    const token = match[1];
    const payload = verifyToken(token, secret);

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some(r => payload.roles.includes(r));
      if (!hasRole) {
        throw new AppError('INSUFFICIENT_ROLES', `Required roles: ${requiredRoles.join(', ')}`);
      }
    }

    if (agentIdentity && payload.agentRole) {
      const identity = agentIdentity;
      const checkResult = identity.check({
        role: payload.agentRole,
        action: req.method ? `agent.${req.method.toLowerCase()}` : 'agent.run',
        resource: req.url,
      });
      if (!checkResult.allowed) {
        throw new AppError('AGENT_NOT_ALLOWED', checkResult.reason);
      }
    }

    log.info('Auth middleware passed', {
      sub: payload.sub,
      roles: payload.roles,
      agentId: payload.agentId,
    });

    return { authenticated: true, payload, reason: 'Authenticated' };
  };
}
