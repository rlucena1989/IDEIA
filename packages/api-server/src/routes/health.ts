import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@ideia/logger';
import { HealthCheckAggregator, createAggregator } from '@ideia/health-check';
const logger = createLogger('health');

export function createHealthRoutes(aggregator?: HealthCheckAggregator) {
  const health = aggregator ?? createAggregator({ version: process.env.npm_package_version ?? '0.0.0' });

  return async function healthRoutes(app: FastifyInstance) {
    app.get('/live', async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: 'alive', uptime: process.uptime() });
    });

    app.get('/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await health.check();
      if (result.status === 'unhealthy') {
        return reply.status(503).send(result);
      }
      return reply.send(result);
    });

    app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await health.check();
      const httpStatus = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
      return reply.status(httpStatus).send(result);
    });
  };
}
