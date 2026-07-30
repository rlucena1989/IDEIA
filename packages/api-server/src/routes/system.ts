import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@ideia/logger';
import { ConfigManager } from '@ideia/config-engine';
const config = ConfigManager.getInstance();
const logger = createLogger('system');


interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  module?: string;
}

interface LogQuery {
  level?: string;
  module?: string;
  limit?: number;
  offset?: number;
}

const logBuffer: LogEntry[] = [];
const MAX_LOG_BUFFER = 1000;

export function captureLog(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.splice(0, logBuffer.length - MAX_LOG_BUFFER);
  }
}

export function createSystemRoutes() {
  return async function systemRoutes(app: FastifyInstance) {
    app.get('/api/logs', async (request: FastifyRequest<{ Querystring: LogQuery }>, reply: FastifyReply) => {
      const { level, module: moduleFilter, limit = 100, offset = 0 } = request.query;

      let filtered = [...logBuffer];

      if (level) {
        filtered = filtered.filter(e => e.level === level);
      }
      if (moduleFilter) {
        filtered = filtered.filter(e => e.module === moduleFilter);
      }

      const total = filtered.length;
      filtered = filtered.slice(offset, offset + limit);

      return reply.send({
        success: true,
        data: {
          logs: filtered,
          total,
          offset,
          limit,
        },
      });
    });

    app.get('/api/config', async (_request: FastifyRequest, reply: FastifyReply) => {
      const cfg = (config as any);
      const configData = {
        version: cfg.get?.('npm_package_version') || process.env['npm_package_version'] || '0.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        env: cfg.get?.('NODE_ENV') || process.env['NODE_ENV'] || 'development',
        features: {
          auth: !!(cfg.get?.('API_KEY') || process.env['API_KEY']) || !!(cfg.get?.('JWT_SECRET') || process.env['JWT_SECRET']),
          logs: true,
          monitoring: true,
        },
      };

      return reply.send({
        success: true,
        data: configData,
      });
    });
  };
}
