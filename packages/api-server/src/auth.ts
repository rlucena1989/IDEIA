import type { FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@ideia/logger';
import crypto from 'node:crypto';
const logger = createLogger('auth');

export interface AuthConfig {
  apiKey?: string;
  jwtSecret?: string;
}

export function createAuthMiddleware(config: AuthConfig) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!config.apiKey && !config.jwtSecret) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({ error: 'Missing authorization header' });
    }

    if (config.apiKey) {
      const apiKey = authHeader.replace('Bearer ', '');
      if (!config.apiKey || apiKey.length !== config.apiKey.length || !crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(config.apiKey))) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }
      return;
    }

    return reply.status(401).send({ error: 'No auth method configured' });
  };
}
