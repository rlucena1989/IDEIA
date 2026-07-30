import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@ideia/logger';
const logger = createLogger('command');

export interface CommandRequest {
  toolId?: string;
  name?: string;
  args?: string[];
  params?: Record<string, unknown>;
}

export interface PlanExecuteRequest {
  planId: string;
}

export interface CommandResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export function createCommandRoutes(authMiddleware: (request: FastifyRequest, reply: FastifyReply) => Promise<void>) {
  return async function commandRoutes(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware);

    app.post('/api/command', async (request: FastifyRequest<{ Body: CommandRequest }>, reply: FastifyReply) => {
      const { toolId, name, params } = request.body;
      const commandName = toolId ?? name;
      if (!commandName) {
        return reply.status(400).send({ success: false, error: 'Missing required field: toolId' } satisfies CommandResponse);
      }
      return reply.send({ success: true, data: { command: commandName, params: params ?? {} } } satisfies CommandResponse);
    });

    app.post('/api/plan/execute', async (request: FastifyRequest<{ Body: PlanExecuteRequest }>, reply: FastifyReply) => {
      const { planId } = request.body;
      if (!planId) {
        return reply.status(400).send({ success: false, error: 'Missing required field: planId' } satisfies CommandResponse);
      }
      return reply.send({ success: true, data: { planId, status: 'executing' } } satisfies CommandResponse);
    });

    app.get('/api/command/list', async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: {
          commands: [
            { name: 'project:generate', description: 'Generate a new project scaffold', category: 'project' },
            { name: 'project:analyze', description: 'Analyze existing project structure', category: 'project' },
            { name: 'file:create', description: 'Create a new file', category: 'file' },
            { name: 'file:read', description: 'Read file contents', category: 'file' },
            { name: 'file:write', description: 'Write content to file', category: 'file' },
            { name: 'code:refactor', description: 'Refactor code', category: 'code' },
            { name: 'code:format', description: 'Format code', category: 'code' },
            { name: 'test:run', description: 'Run tests', category: 'test' },
            { name: 'test:generate', description: 'Generate tests', category: 'test' },
            { name: 'git:commit', description: 'Create a commit', category: 'git' },
            { name: 'git:push', description: 'Push to remote', category: 'git' },
            { name: 'deploy:staging', description: 'Deploy to staging', category: 'deploy' },
            { name: 'deploy:production', description: 'Deploy to production', category: 'deploy' },
          ],
          total: 13,
        },
      } satisfies CommandResponse);
    });

    app.get('/api/status', async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    });
  };
}
