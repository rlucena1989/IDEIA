import { DefaultServer } from '../server';
import { RouteHandler, MiddlewareHandler } from '../types';

describe('DefaultServer', () => {
  it('should create with default config', () => {
    const server = new DefaultServer();
    expect(server.config.port).toBe(3000);
    expect(server.config.host).toBe('127.0.0.1');
    expect(server.config.cors).toEqual({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] });
    expect(server.config.bodyLimit).toBe('1mb');
  });

  it('should create with custom config', () => {
    const server = new DefaultServer({ port: 8080, host: '0.0.0.0', bodyLimit: '5mb' });
    expect(server.config.port).toBe(8080);
    expect(server.config.host).toBe('0.0.0.0');
    expect(server.config.bodyLimit).toBe('5mb');
  });

  it('should not be listening initially', () => {
    const server = new DefaultServer();
    expect(server.isListening()).toBe(false);
  });

  it('should start and set listening state', async () => {
    const server = new DefaultServer();
    const app = { logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } } as unknown;
    await server.start(app);
    expect(server.isListening()).toBe(true);
    expect(app.logger.info).toHaveBeenCalledWith('Starting server on 127.0.0.1:3000');
  });

  it('should stop and clear listening state', async () => {
    const server = new DefaultServer();
    const app = { logger: { info: jest.fn() } } as unknown;
    await server.start(app);
    await server.stop();
    expect(server.isListening()).toBe(false);
  });

  it('should add and retrieve routes', () => {
    const server = new DefaultServer();
    const route: RouteHandler = { method: 'GET', path: '/health', handler: jest.fn() };
    server.addRoute(route);
    expect(server.getRoutes()).toHaveLength(1);
    expect(server.getRoutes()[0]).toBe(route);
  });

  it('should add and retrieve middleware', () => {
    const server = new DefaultServer();
    const mw: MiddlewareHandler = { name: 'logger', handler: jest.fn() };
    server.addMiddleware(mw);
    expect(server.getMiddleware()).toHaveLength(1);
    expect(server.getMiddleware()[0]).toBe(mw);
  });

  it('should return a copy of routes array', () => {
    const server = new DefaultServer();
    server.addRoute({ method: 'GET', path: '/test', handler: jest.fn() });
    const routes = server.getRoutes();
    routes.pop();
    expect(server.getRoutes()).toHaveLength(1);
  });

  it('should return a copy of middleware array', () => {
    const server = new DefaultServer();
    server.addMiddleware({ name: 'mw', handler: jest.fn() });
    const mw = server.getMiddleware();
    mw.pop();
    expect(server.getMiddleware()).toHaveLength(1);
  });

  it('should log when stopping', async () => {
    const server = new DefaultServer();
    const app = { logger: { info: jest.fn() } } as unknown;
    await server.start(app);
    app.logger.info.mockClear();
    await server.stop();
    expect(server.isListening()).toBe(false);
  });

  it('should support CORS config', () => {
    const server = new DefaultServer({
      cors: { origin: 'https://example.com', methods: ['GET'] },
    });
    expect(server.config.cors?.origin).toBe('https://example.com');
    expect(server.config.cors?.methods).toEqual(['GET']);
  });
});
