import { SecurityMiddleware, createSecurityMiddleware } from '../security-middleware';
import { IncomingMessage, ServerResponse } from 'node:http';

function makeReq(url = '/', headers: Record<string, string> = {}): IncomingMessage {
  const socket = { remoteAddress: '127.0.0.1' };
  return { url, headers, socket, method: 'GET' } as unknown as IncomingMessage;
}

function makeRes(): ServerResponse {
  const chunks: string[] = [];
  const headers: Record<string, string> = {};
  return {
    writeHead: jest.fn((status: number, h?: Record<string, string>) => { if (h) Object.assign(headers, h); }),
    end: jest.fn((data: string) => { chunks.push(data); }),
    setHeader: jest.fn((key: string, value: string) => { headers[key] = value; }),
    getHeader: (key: string) => headers[key],
    _chunks: chunks,
  } as unknown as ServerResponse;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SecurityMiddleware', () => {
  describe('constructor and factory', () => {
    it('should create instance via constructor', () => {
      const mw = new SecurityMiddleware();
      expect(mw).toBeDefined();
      expect(mw).toBeInstanceOf(SecurityMiddleware);
    });

    it('should create instance via factory function', () => {
      const mw = createSecurityMiddleware();
      expect(mw).toBeDefined();
      expect(mw).toBeInstanceOf(SecurityMiddleware);
    });

    it('should accept custom configuration', () => {
      const mw = createSecurityMiddleware({
        rateLimit: { maxRequestsPerMinute: 200, burstSize: 300, enabled: true },
        apiKey: { key: 'custom-key', enabled: true, exemptPaths: ['/api/health', '/status'] },
      });
      expect(mw).toBeDefined();
    });
  });

  describe('setSecurityHeaders', () => {
    it('should set all security headers', () => {
      const mw = createSecurityMiddleware();
      const res = makeRes();

      mw.setSecurityHeaders(res);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    });
  });

  describe('applyRateLimit', () => {
    it('should allow requests under rate limit', () => {
      const mw = createSecurityMiddleware();
      const req = makeReq();
      const res = makeRes();

      const result = mw.applyRateLimit(req, res);

      expect(result).toBe(true);
      expect(res.writeHead).not.toHaveBeenCalled();
    });

    it('should allow multiple requests up to burst limit', () => {
      const mw = createSecurityMiddleware({
        rateLimit: { maxRequestsPerMinute: 60, burstSize: 5, enabled: true },
      });
      const req = makeReq();
      const res = makeRes();

      for (let i = 0; i < 5; i++) {
        expect(mw.applyRateLimit(req, res)).toBe(true);
      }
    });

    it('should block requests over rate limit', () => {
      const mw = createSecurityMiddleware({
        rateLimit: { maxRequestsPerMinute: 60, burstSize: 1, enabled: true },
      });
      const req = makeReq();
      const res = makeRes();

      expect(mw.applyRateLimit(req, res)).toBe(true);
      expect(mw.applyRateLimit(req, res)).toBe(false);
      expect(res.writeHead).toHaveBeenCalledWith(429, expect.any(Object));
    });

    it('should return true when rate limit is disabled', () => {
      const mw = createSecurityMiddleware({
        rateLimit: { enabled: false },
      });
      const req = makeReq();
      const res = makeRes();

      expect(mw.applyRateLimit(req, res)).toBe(true);
    });

    it('should use x-forwarded-for for client IP', () => {
      const mw = createSecurityMiddleware({
        rateLimit: { maxRequestsPerMinute: 60, burstSize: 1, enabled: true },
      });
      const req = makeReq('/', { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' });
      const res = makeRes();

      expect(mw.applyRateLimit(req, res)).toBe(true);
      expect(mw.applyRateLimit(req, res)).toBe(false);
    });
  });

  describe('checkApiKey', () => {
    it('should return true when API key auth is disabled', () => {
      const mw = createSecurityMiddleware({ apiKey: { enabled: false } });
      const res = makeRes();

      expect(mw.checkApiKey(makeReq(), res)).toBe(true);
    });

    it('should return true with valid API key in Authorization header', () => {
      const mw = createSecurityMiddleware({
        apiKey: { key: 'secret-key-123', enabled: true },
      });
      const req = makeReq('/', { authorization: 'Bearer secret-key-123' });
      const res = makeRes();

      expect(mw.checkApiKey(req, res)).toBe(true);
    });

    it('should reject request without API key', () => {
      const mw = createSecurityMiddleware({
        apiKey: { key: 'secret-key-123', enabled: true },
      });
      const req = makeReq();
      const res = makeRes();

      expect(mw.checkApiKey(req, res)).toBe(false);
      expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
    });

    it('should reject request with wrong API key', () => {
      const mw = createSecurityMiddleware({
        apiKey: { key: 'secret-key-123', enabled: true },
      });
      const req = makeReq('/', { authorization: 'Bearer wrong-key' });
      const res = makeRes();

      expect(mw.checkApiKey(req, res)).toBe(false);
    });

    it('should bypass auth for exempt paths', () => {
      const mw = createSecurityMiddleware({
        apiKey: { key: 'secret-key-123', enabled: true, exemptPaths: ['/api/health'] },
      });
      const req = makeReq('/api/health');
      const res = makeRes();

      expect(mw.checkApiKey(req, res)).toBe(true);
    });

    it('should handle missing Bearer prefix', () => {
      const mw = createSecurityMiddleware({
        apiKey: { key: 'secret-key-123', enabled: true },
      });
      const req = makeReq('/', { authorization: 'secret-key-123' });
      const res = makeRes();

      expect(mw.checkApiKey(req, res)).toBe(false);
    });
  });

  describe('getRateLimitStats', () => {
    it('should return stats about rate limit store', () => {
      const mw = createSecurityMiddleware({
        rateLimit: { maxRequestsPerMinute: 60, burstSize: 5, enabled: true },
      });
      const req = makeReq();
      const res = makeRes();

      mw.applyRateLimit(req, res);
      mw.applyRateLimit(makeReq('/different', { 'x-forwarded-for': '10.0.0.2' }), makeRes());

      const stats = mw.getRateLimitStats();
      expect(stats.totalIps).toBe(2);
      expect(stats.totalEntries).toBe(2);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      const mw = createSecurityMiddleware();
      const clearSpy = jest.spyOn(global, 'clearInterval');

      mw.destroy();

      expect(mw.getRateLimitStats().totalIps).toBe(0);
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
