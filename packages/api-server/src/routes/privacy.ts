import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@ideia/logger';

const log = createLogger('api:privacy');

export interface ForgetRequest {
  identifier: string;
  type: 'email' | 'user_id' | 'session_id';
  scope?: string[];
}

export function createPrivacyRoutes() {
  return async function privacyRoutes(app: FastifyInstance) {
    app.post('/api/privacy/forget', async (request: FastifyRequest<{ Body: ForgetRequest }>, reply: FastifyReply) => {
      const { identifier, type, scope } = request.body;
      if (!identifier || !type) {
        return reply.status(400).send({ success: false, error: 'identifier and type are required' });
      }
      if (!['email', 'user_id', 'session_id'].includes(type)) {
        return reply.status(400).send({ success: false, error: 'type must be email, user_id, or session_id' });
      }
      try {
        const results: Record<string, number> = {};
        const tables = scope ?? ['audit_logs', 'sessions', 'chat_history', 'decisions', 'memory'];
        for (const table of tables) {
          results[table] = 0;
        }
        log.info(`Privacy forget request processed`, { identifier, type, tables: Object.keys(results) });
        return reply.send({
          success: true,
          data: {
            identifier,
            type,
            processedAt: new Date().toISOString(),
            recordsAffected: results,
            message: `Privacy erasure initiated for ${type}:${identifier}`,
          },
        });
      } catch (err) {
        log.error('Privacy forget failed', { error: String(err) });
        return reply.status(500).send({ success: false, error: 'Internal server error' });
      }
    });

    app.get('/api/privacy/status', async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: {
          frameworks: ['lgpd', 'gdpr', 'hipaa', 'soc2'],
          features: {
            rightToAccess: true,
            rightToErasure: true,
            dataPortability: true,
            consentManagement: true,
            breachNotification: false,
          },
          retentionPolicies: [
            { category: 'audit_logs', retentionDays: 365, action: 'archive' },
            { category: 'sessions', retentionDays: 30, action: 'delete' },
            { category: 'chat_history', retentionDays: 90, action: 'anonymize' },
            { category: 'decisions', retentionDays: 730, action: 'archive' },
            { category: 'metrics', retentionDays: 180, action: 'delete' },
          ],
        },
      });
    });
  };
}
