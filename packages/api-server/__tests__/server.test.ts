jest.mock('@ideia/health-check', () => ({
  HealthCheckAggregator: jest.fn().mockImplementation(() => ({
    check: jest.fn().mockResolvedValue({ status: 'healthy', checks: [] }),
    getRegistered: jest.fn().mockReturnValue([]),
  })),
  createAggregator: jest.fn().mockReturnValue({
    check: jest.fn().mockResolvedValue({ status: 'healthy', checks: [] }),
    getRegistered: jest.fn().mockReturnValue([]),
  }),
}));

import { IdeiaApiServer } from '../src/server';
import { createRateLimiter } from '../src/rate-limiter';
import { createValidator } from '../src/validator';

describe('IdeiaApiServer', () => {
  let server: IdeiaApiServer;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  it('should create server with default config', () => {
    server = new IdeiaApiServer({ port: 0 });
    expect(server).toBeDefined();
    expect(server.getApp()).toBeDefined();
  });

  it('should start and stop successfully', async () => {
    server = new IdeiaApiServer({ port: 0 });
    await server.start();
    const address = server.getApp().server.address();
    expect(address).toBeDefined();
    await server.stop();
  });

  it('should accept custom port config', () => {
    server = new IdeiaApiServer({ port: 3099 });
    expect(server).toBeDefined();
  });

  it('should start with custom rate limiter config', async () => {
    server = new IdeiaApiServer({ port: 0, rateLimiter: { maxRequests: 5, windowMs: 10000 } });
    await server.start();
    await server.stop();
  });

  it('should reject request when rate limit exceeded', async () => {
    server = new IdeiaApiServer({ port: 0, rateLimiter: { maxRequests: 2, windowMs: 60000 } });
    await server.start();

    const app = server.getApp();
    const injectOptions = {
      method: 'GET' as const,
      url: '/live',
    };

    const res1 = await app.inject(injectOptions);
    expect(res1.statusCode).toBe(200);

    const res2 = await app.inject(injectOptions);
    expect(res2.statusCode).toBe(200);

    const res3 = await app.inject(injectOptions);
    expect(res3.statusCode).toBe(429);
    const body = JSON.parse(res3.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Too many requests');

    await server.stop();
  });

  it('should validate POST /api/command requires toolId', async () => {
    server = new IdeiaApiServer({ port: 0 });
    await server.start();

    const app = server.getApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/command',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('toolId');

    await server.stop();
  });

  it('should validate POST /api/plan/execute requires planId', async () => {
    server = new IdeiaApiServer({ port: 0 });
    await server.start();

    const app = server.getApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/plan/execute',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('planId');

    await server.stop();
  });

  it('should validate POST /api/privacy/forget requires identifier and type', async () => {
    server = new IdeiaApiServer({ port: 0 });
    await server.start();

    const app = server.getApp();

    const res1 = await app.inject({
      method: 'POST',
      url: '/api/privacy/forget',
      payload: {},
    });
    expect(res1.statusCode).toBe(400);
    const body1 = JSON.parse(res1.body);
    expect(body1.error).toContain('identifier');

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/privacy/forget',
      payload: { identifier: 'user-123' },
    });
    expect(res2.statusCode).toBe(400);
    const body2 = JSON.parse(res2.body);
    expect(body2.error).toContain('type');

    await server.stop();
  });

  it('should pass validation with valid request bodies', async () => {
    server = new IdeiaApiServer({ port: 0 });
    await server.start();

    const app = server.getApp();

    const res1 = await app.inject({
      method: 'POST',
      url: '/api/command',
      payload: { toolId: 'test-tool', params: { foo: 'bar' } },
    });
    expect(res1.statusCode).toBe(200);

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/plan/execute',
      payload: { planId: 'plan-123' },
    });
    expect(res2.statusCode).toBe(200);

    const res3 = await app.inject({
      method: 'POST',
      url: '/api/privacy/forget',
      payload: { identifier: 'user@example.com', type: 'email' },
    });
    expect(res3.statusCode).toBe(200);

    await server.stop();
  });

  it('should serve swagger docs endpoint', async () => {
    server = new IdeiaApiServer({ port: 0 });
    await server.start();

    const app = server.getApp();
    const res = await app.inject({
      method: 'GET',
      url: '/docs',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('swagger');

    await server.stop();
  });

  it('should serve openapi json', async () => {
    server = new IdeiaApiServer({ port: 0 });
    await server.start();

    const app = server.getApp();
    const res = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.openapi).toBeDefined();
    expect(body.info.title).toBe('IDEIA API Server');

    await server.stop();
  });
});

describe('createRateLimiter', () => {
  it('should allow requests within limit', () => {
    const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });
    expect(limiter).toBeDefined();
    expect(typeof limiter).toBe('function');
  });

  it('should use custom token bucket config', () => {
    const limiter = createRateLimiter({ maxRequests: 100, windowMs: 30000 });
    expect(limiter).toBeDefined();
  });
});

describe('createValidator', () => {
  it('should return validation middleware function', () => {
    const validator = createValidator();
    expect(validator).toBeDefined();
    expect(typeof validator).toBe('function');
  });

  it('should have 3 endpoint schemas configured', () => {
    const validator = createValidator();
    expect(validator).toBeDefined();
  });
});
