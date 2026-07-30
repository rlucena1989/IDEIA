import { BackendApplication } from '@ideia/core-backend';
import { createLogger } from '@ideia/logger';
import { IServer, ServerConfig, RouteHandler, MiddlewareHandler } from './types';
const logger = createLogger('server');

export class DefaultServer implements IServer {
  readonly config: ServerConfig;
  private routes: RouteHandler[] = [];
  private middleware: MiddlewareHandler[] = [];
  private listening = false;

  constructor(config?: Partial<ServerConfig>) {
    this.config = {
      port: config?.port ?? 3000,
      host: config?.host ?? '127.0.0.1',
      cors: config?.cors ?? { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      bodyLimit: config?.bodyLimit ?? '1mb',
    };
  }

  async start(app: BackendApplication): Promise<void> {
    app.logger.info(`Starting server on ${this.config.host}:${this.config.port}`);
    this.listening = true;
  }

  async stop(): Promise<void> {
    this.listening = false;
  }

  addRoute(route: RouteHandler): void {
    this.routes.push(route);
  }

  addMiddleware(middleware: MiddlewareHandler): void {
    this.middleware.push(middleware);
  }

  isListening(): boolean {
    return this.listening;
  }

  getRoutes(): RouteHandler[] {
    return [...this.routes];
  }

  getMiddleware(): MiddlewareHandler[] {
    return [...this.middleware];
  }
}
