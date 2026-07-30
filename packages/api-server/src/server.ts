import Fastify, { type FastifyInstance } from 'fastify';
import { createLogger } from '@ideia/logger';
import { ConfigManager } from '@ideia/config-engine';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cors = require('@fastify/cors');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('@fastify/helmet');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rateLimit = require('@fastify/rate-limit');
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { createCommandRoutes } from './routes/command';
import { createAuthMiddleware, type AuthConfig } from './auth';
import { createHealthRoutes } from './routes/health';
import { createSystemRoutes } from './routes/system';
import { createPrivacyRoutes } from './routes/privacy';
import { createRateLimiter, type RateLimiterConfig } from './rate-limiter';
import { createValidator } from './validator';
import { registerSwagger } from './swagger';
const config = ConfigManager.getInstance();
const logger = createLogger('server');


export interface ServerConfig {
  port: number;
  auth?: AuthConfig;
  rateLimiter?: RateLimiterConfig;
  tls?: boolean;
}

function loadFastifyTlsOptions(): object | undefined {
  const certDir = join(process.cwd(), 'certs');
  const keyPath = join(certDir, 'key.pem');
  const certPath = join(certDir, 'cert.pem');
  try {
    if (existsSync(keyPath) && existsSync(certPath)) {
      return {
        key: readFileSync(keyPath),
        cert: readFileSync(certPath),
        secureOptions: crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1,
        ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
        honorCipherOrder: true,
        minVersion: 'TLSv1.3',
      };
    }
  } catch { /* certs not found — HTTP fallback */ }
  return undefined;
}

export class IdeiaApiServer {
  private app: FastifyInstance;
  private config: ServerConfig;

  constructor(config?: Partial<ServerConfig>) {
    this.config = {
      port: config?.port ?? parseInt(process.env['PORT'] ?? '3001', 10),
      auth: config?.auth ?? {
        apiKey: process.env['API_KEY'],
        jwtSecret: process.env['JWT_SECRET'],
      },
      rateLimiter: config?.rateLimiter ?? {
        maxRequests: parseInt(process.env['RATE_LIMIT_MAX'] ?? '100', 10),
        windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '60000', 10),
      },
      tls: config?.tls,
    };
    const httpsOpts = this.config.tls !== false ? loadFastifyTlsOptions() : undefined;
    this.app = Fastify({ logger: true, https: httpsOpts as any }) as unknown as FastifyInstance;
    if (httpsOpts) logger.info('[API] TLS 1.3 enabled (AES-256-GCM + CHACHA20-POLY1305)');
  }

  async start(): Promise<void> {
    await this.app.register(cors, {
      origin: process.env['CORS_ORIGIN'] || true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
    });

    await this.app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
      xssFilter: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    });

    await this.app.register(rateLimit, {
      max: (this.config.rateLimiter?.maxRequests ?? 100),
      timeWindow: (this.config.rateLimiter?.windowMs ?? 60000),
    });

    const validator = createValidator();
    this.app.addHook('preHandler', validator);

    await this.app.register(registerSwagger);

    const authMiddleware = createAuthMiddleware(this.config.auth ?? {});
    await this.app.register(createHealthRoutes());
    await this.app.register(createCommandRoutes(authMiddleware));
    await this.app.register(createSystemRoutes());
    await this.app.register(createPrivacyRoutes());
    await this.app.listen({ port: this.config.port, host: '0.0.0.0' });
  }

  async stop(): Promise<void> {
    await this.app.close();
  }

  getApp(): FastifyInstance {
    return this.app;
  }
}
