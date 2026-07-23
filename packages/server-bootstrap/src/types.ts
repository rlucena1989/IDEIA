import { BackendApplication } from '@ideia/core-backend';

export interface ServerConfig {
  port: number;
  host: string;
  ssl?: { cert: string; key: string };
  cors?: { origin: string; methods: string[] };
  bodyLimit?: string;
  staticDir?: string;
}

export interface RouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: unknown, res: unknown) => void | Promise<void>;
}

export interface MiddlewareHandler {
  name: string;
  handler: (req: unknown, res: unknown, next: () => void) => void | Promise<void>;
}

export interface IServer {
  readonly config: ServerConfig;
  start(app: BackendApplication): Promise<void>;
  stop(): Promise<void>;
  addRoute(route: RouteHandler): void;
  addMiddleware(middleware: MiddlewareHandler): void;
  isListening(): boolean;
}
