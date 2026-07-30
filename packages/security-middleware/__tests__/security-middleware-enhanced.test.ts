import {
  SecurityMiddleware,
  createSecurityMiddleware,
  createRateLimitMiddlewareConfig,
  createRequestSizeLimitConfig,
  sanitizeInput,
  checkRateLimit,
  checkRequestSize,
} from '../src/index';

describe('SecurityMiddleware Enhanced', () => {
  let middleware: SecurityMiddleware;

  beforeEach(() => {
    middleware = createSecurityMiddleware();
  });

  describe('createRateLimitMiddlewareConfig', () => {
    it('should create default config', () => {
      const config = createRateLimitMiddlewareConfig();
      expect(config.windowMs).toBe(60000);
      expect(config.maxRequests).toBe(100);
      expect(config.burstMax).toBe(200);
      expect(config.burstWindowMs).toBe(1000);
    });

    it('should create custom config', () => {
      const config = createRateLimitMiddlewareConfig({ windowMs: 30000, maxRequests: 50 });
      expect(config.windowMs).toBe(30000);
      expect(config.maxRequests).toBe(50);
      expect(config.burstMax).toBe(100);
    });

    it('should create config without burst defaults', () => {
      const config = createRateLimitMiddlewareConfig({ windowMs: 10000, maxRequests: 10, burstMax: 15 });
      expect(config.burstMax).toBe(15);
    });
  });

  describe('createRequestSizeLimitConfig', () => {
    it('should create default config', () => {
      const config = createRequestSizeLimitConfig();
      expect(config.maxBodySize).toBe(10 * 1024 * 1024);
      expect(config.maxUrlLength).toBe(2048);
      expect(config.maxFieldCount).toBe(100);
      expect(config.maxFileSize).toBe(5 * 1024 * 1024);
    });

    it('should create custom config', () => {
      const config = createRequestSizeLimitConfig({ maxBodySize: 1024, maxUrlLength: 512 });
      expect(config.maxBodySize).toBe(1024);
      expect(config.maxUrlLength).toBe(512);
    });
  });

  describe('sanitizeInput', () => {
    it('should strip HTML tags by default', () => {
      expect(sanitizeInput('<p>hello</p>')).toBe('hello');
    });

    it('should strip script tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>hello')).toBe('alert("xss")hello');
    });

    it('should strip javascript: URLs', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should strip event handlers', () => {
      const result = sanitizeInput('<div onload="evil()">content</div>');
      expect(result).not.toContain('onload');
      expect(result).toContain('content');
    });

    it('should truncate to maxLength', () => {
      const result = sanitizeInput('a'.repeat(500), { maxLength: 10 });
      expect(result.length).toBe(10);
    });

    it('should allow safe input unchanged', () => {
      expect(sanitizeInput('hello world')).toBe('hello world');
    });

    it('should allow specified tags when configured', () => {
      const result = sanitizeInput('<b>bold</b><script>evil</script>', { allowedTags: ['b'], stripHtml: true });
      expect(result).not.toContain('<script>');
    });

    it('should not double-encode safe text', () => {
      expect(sanitizeInput('normal text with numbers 123')).toBe('normal text with numbers 123');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const map = new Map<string, { count: number; resetAt: number }>();
      const config = createRateLimitMiddlewareConfig({ windowMs: 60000, maxRequests: 10 });
      const result = checkRateLimit(map, 'client-1', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should block requests exceeding burst limit', () => {
      const map = new Map<string, { count: number; resetAt: number }>();
      const config = createRateLimitMiddlewareConfig({ windowMs: 60000, maxRequests: 5, burstMax: 7 });
      for (let i = 0; i < 7; i++) {
        checkRateLimit(map, 'burst-client', config);
      }
      const result = checkRateLimit(map, 'burst-client', config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      const map = new Map<string, { count: number; resetAt: number }>();
      const config = createRateLimitMiddlewareConfig({ windowMs: 50, maxRequests: 3 });
      for (let i = 0; i < 3; i++) {
        checkRateLimit(map, 'reset-client', config);
      }
      let result = checkRateLimit(map, 'reset-client', config);
      expect(result.allowed).toBe(false);
      return new Promise<void>(resolve => {
        setTimeout(() => {
          result = checkRateLimit(map, 'reset-client', config);
          expect(result.allowed).toBe(true);
          expect(result.remaining).toBeGreaterThanOrEqual(0);
          resolve();
        }, 60);
      });
    });
  });

  describe('checkRequestSize', () => {
    it('should allow normal requests', () => {
      const config = createRequestSizeLimitConfig();
      expect(checkRequestSize('/api/test', { key: 'value' }, config).allowed).toBe(true);
    });

    it('should block long URLs', () => {
      const config = createRequestSizeLimitConfig({ maxUrlLength: 10 });
      expect(checkRequestSize('/very/long/url/path', null, config).allowed).toBe(false);
    });

    it('should block large bodies', () => {
      const config = createRequestSizeLimitConfig({ maxBodySize: 10 });
      expect(checkRequestSize('/api', 'this is a very long body that exceeds the limit', config).allowed).toBe(false);
    });

    it('should block requests with too many fields', () => {
      const config = createRequestSizeLimitConfig({ maxFieldCount: 2 });
      const body = { a: 1, b: 2, c: 3 };
      expect(checkRequestSize('/api', body, config).allowed).toBe(false);
    });

    it('should allow requests with no body', () => {
      const config = createRequestSizeLimitConfig();
      expect(checkRequestSize('/api/health', undefined, config).allowed).toBe(true);
    });
  });

  describe('getConfig returns config', () => {
    it('should return current config', () => {
      const config = middleware.getConfig();
      expect(config).toBeDefined();
      expect(config.blockedPaths).toBeDefined();
      expect(config.allowedOrigins).toContain('http://localhost:3001');
    });

    it('should allow custom config', () => {
      const custom = createSecurityMiddleware({ maxBodySize: 2048 });
      const config = custom.getConfig();
      expect(config.maxBodySize).toBe(2048);
    });
  });

  describe('updateConfig', () => {
    it('should update config fields', () => {
      middleware.updateConfig({ maxBodySize: 5000 });
      expect(middleware.getConfig().maxBodySize).toBe(5000);
    });
  });
});
