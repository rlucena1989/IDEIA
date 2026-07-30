import { AppError } from '@ideia/contracts';
import { type AgentRole } from '@ideia/agent-identity';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@ideia/contracts', () => ({
  AppError: class AppError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'AppError';
    }
  },
}));

jest.mock('@ideia/agent-identity', () => {
  const Actual = jest.requireActual('@ideia/agent-identity');
  return {
    ...Actual,
    AgentIdentity: jest.fn().mockImplementation(() => ({
      check: jest.fn((req: { role: string; action: string; resource?: string }) => {
        if (req.role === 'ai-agent') {
          return { allowed: true, role: 'ai-agent', action: req.action, resource: req.resource, reason: 'Allowed' };
        }
        if (req.role === 'restricted') {
          return { allowed: false, role: 'restricted', action: req.action, resource: req.resource, reason: 'Not allowed' };
        }
        return { allowed: true, role: req.role, action: req.action, resource: req.resource, reason: 'Allowed' };
      }),
    })),
    AgentRole: undefined,
  };
});

import {
  generateToken,
  verifyToken,
  decodeToken,
  generateAgentToken,
  createAuthMiddleware,
  JwtPayload,
  JwtHeader,
} from '../jwt-auth';

describe('JwtPayload interface', () => {
  it('can be assigned with required fields', () => {
    const payload: JwtPayload = {
      sub: 'user1', exp: 1000, iat: 500, roles: ['admin'],
    };
    expect(payload.sub).toBe('user1');
  });

  it('allows optional fields', () => {
    const payload: JwtPayload = {
      sub: 'u1', exp: 1000, iat: 500, roles: [],
      iss: 'ideia', aud: 'cli', jti: 'jti_1', agentId: 'agent1',
      agentRole: 'ai-agent', sessionId: 'sess_1', permissions: ['read'],
      metadata: { env: 'prod' },
    };
    expect(payload.iss).toBe('ideia');
    expect(payload.metadata?.env).toBe('prod');
  });
});

describe('JwtHeader interface', () => {
  it('can be assigned with HS256', () => {
    const h: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    expect(h.alg).toBe('HS256');
  });

  it('allows optional kid', () => {
    const h: JwtHeader = { alg: 'RS256', typ: 'JWT', kid: 'key1' };
    expect(h.kid).toBe('key1');
  });
});

describe('generateToken', () => {
  const secret = process.env['JWT_TEST_SECRET'] || 'test-secret-not-for-prod';

  it('returns a string token with three parts', () => {
    const token = generateToken({ sub: 'user1', roles: ['developer'] }, secret);
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('includes header with HS256 algorithm', () => {
    const token = generateToken({ sub: 'user1', roles: [] }, secret);
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');
    expect(header.typ).toBe('JWT');
  });

  it('includes payload with sub, roles, iat, exp, jti', () => {
    const token = generateToken({ sub: 'user1', roles: ['admin'] }, secret);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.sub).toBe('user1');
    expect(payload.roles).toEqual(['admin']);
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.jti).toBeDefined();
  });

  it('accepts custom expiresIn as number of seconds', () => {
    const _ = Math.floor(Date.now() / 1000);
    const token = generateToken({ sub: 'u1', roles: [] }, secret, 3600);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('accepts expiresIn string format', () => {
    const token = generateToken({ sub: 'u1', roles: [] }, secret, '1h');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('throws AppError for invalid expiresIn format', () => {
    expect(() => generateToken({ sub: 'u1', roles: [] }, secret, 'bad')).toThrow(AppError);
  });

  it('includes agentId and agentRole when provided via payload', () => {
    const token = generateToken({ sub: 'agent1', agentId: 'agent1', agentRole: 'ai-agent', roles: ['ai-agent'] }, secret);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.agentId).toBe('agent1');
    expect(payload.agentRole).toBe('ai-agent');
  });
});

describe('verifyToken', () => {
  const secret = process.env['JWT_TEST_SECRET'] || 'test-secret-not-for-prod';

  it('returns decoded payload for a valid token', () => {
    const token = generateToken({ sub: 'user1', roles: ['developer'] }, secret);
    const payload = verifyToken(token, secret);
    expect(payload.sub).toBe('user1');
    expect(payload.roles).toEqual(['developer']);
  });

  it('throws AppError for malformed token', () => {
    expect(() => verifyToken('bad.token', secret)).toThrow(AppError);
    expect(() => verifyToken('bad.token.here.now', secret)).toThrow(AppError);
  });

  it('throws AppError for invalid signature', () => {
    const token = generateToken({ sub: 'user1', roles: [] }, secret);
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.invalidsignature`;
    expect(() => verifyToken(tampered, secret)).toThrow(AppError);
  });

  it('throws AppError for expired token', () => {
    const token = generateToken({ sub: 'user1', roles: [] }, secret, '1s');
    jest.spyOn(Date, 'now').mockReturnValueOnce((Math.floor(Date.now() / 1000) + 2) * 1000);
    expect(() => verifyToken(token, secret)).toThrow(AppError);
  });

  it('throws AppError for token with nbf in the future', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const token = generateToken({ sub: 'u1', roles: [] }, secret, '1h');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    payload.nbf = future;
    const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tampered = `${token.split('.')[0]}.${tamperedPayload}.${token.split('.')[2]}`;
    expect(() => verifyToken(tampered, secret)).toThrow(AppError);
  });
});

describe('decodeToken', () => {
  const secret = process.env['JWT_TEST_SECRET'] || 'test-secret-not-for-prod';

  it('returns header and payload without verification', () => {
    const token = generateToken({ sub: 'user1', roles: ['dev'] }, secret);
    const decoded = decodeToken(token);
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.payload.sub).toBe('user1');
    expect(decoded.payload.roles).toEqual(['dev']);
  });

  it('throws AppError for malformed token', () => {
    expect(() => decodeToken('bad')).toThrow(AppError);
  });
});

describe('generateAgentToken', () => {
  const secret = process.env['AGENT_TEST_SECRET'] || 'agent-secret-not-for-prod';

  it('generates a token with agent fields', () => {
    const token = generateAgentToken('agent_1', 'ai-agent', secret);
    const decoded = decodeToken(token);
    expect(decoded.payload.sub).toBe('agent_1');
    expect(decoded.payload.agentId).toBe('agent_1');
    expect(decoded.payload.agentRole).toBe('ai-agent');
    expect(decoded.payload.roles).toContain('ai-agent');
  });

  it('accepts optional expiresIn and metadata', () => {
    const token = generateAgentToken('agent_2', 'dev', secret, '30m', { env: 'test' });
    const decoded = decodeToken(token);
    expect(decoded.payload.metadata?.env).toBe('test');
  });
});

describe('createAuthMiddleware', () => {
  const secret = process.env['MIDDLEWARE_TEST_SECRET'] || 'middleware-secret-not-for-prod';

  function makeRequest(headers: Record<string, string | undefined>, url?: string, method?: string) {
    return { headers, url, method } as { headers: Record<string, string | undefined>; url?: string; method?: string };
  }

  describe('without requireAuth', () => {
    it('returns unauthenticated result when no header', () => {
      const middleware = createAuthMiddleware({ secret, requireAuth: false });
      const result = middleware(makeRequest({}));
      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain('not required');
    });
  });

  describe('with requireAuth', () => {
    it('throws when authorization header is missing', () => {
      const middleware = createAuthMiddleware({ secret });
      expect(() => middleware(makeRequest({}))).toThrow(AppError);
    });

    it('throws when header is not Bearer', () => {
      const middleware = createAuthMiddleware({ secret });
      expect(() => middleware(makeRequest({ authorization: 'Basic abc' }))).toThrow(AppError);
    });

    it('returns authenticated result for valid token', () => {
      const token = generateToken({ sub: 'user1', roles: ['developer'] }, secret);
      const middleware = createAuthMiddleware({ secret });
      const result = middleware(makeRequest({ authorization: `Bearer ${token}` }));
      expect(result.authenticated).toBe(true);
      expect(result.payload && result.payload.sub).toBe('user1');
    });
  });

  describe('with requiredRoles', () => {
    it('passes when token has required role', () => {
      const token = generateToken({ sub: 'user1', roles: ['admin', 'developer'] }, secret);
      const middleware = createAuthMiddleware({ secret, requiredRoles: ['admin'] });
      const result = middleware(makeRequest({ authorization: `Bearer ${token}` }));
      expect(result.authenticated).toBe(true);
    });

    it('throws when token lacks required roles', () => {
      const token = generateToken({ sub: 'user1', roles: ['viewer'] }, secret);
      const middleware = createAuthMiddleware({ secret, requiredRoles: ['admin'] });
      expect(() => middleware(makeRequest({ authorization: `Bearer ${token}` }))).toThrow(AppError);
    });
  });

  describe('with agentIdentity', () => {
    it('passes when agent identity check succeeds', () => {
      const ai = new (jest.requireMock('@ideia/agent-identity').AgentIdentity)();
      const token = generateToken({ sub: 'agent1', agentRole: 'ai-agent', roles: ['ai-agent'] }, secret);
      const middleware = createAuthMiddleware({ secret, agentIdentity: ai });
      const result = middleware(makeRequest({ authorization: `Bearer ${token}` }, '/api/resource', 'GET'));
      expect(result.authenticated).toBe(true);
    });

    it('throws when agent identity check fails', () => {
      const ai = new (jest.requireMock('@ideia/agent-identity').AgentIdentity)();
      (ai.check as jest.Mock).mockReturnValueOnce({ allowed: false, role: 'restricted', action: 'agent.run', resource: '/api', reason: 'Not allowed' });
      const token = generateToken({ sub: 'agent_restricted', agentRole: 'restricted' as AgentRole, roles: ['restricted'] }, secret);
      const middleware = createAuthMiddleware({ secret, agentIdentity: ai });
      expect(() => middleware(makeRequest({ authorization: `Bearer ${token}` }, '/api'))).toThrow(AppError);
    });
  });
});
