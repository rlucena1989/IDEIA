import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@ideia/logger';
const logger = createLogger('swagger');

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'IDEIA API Server',
    description: 'HTTP API for IDEIA CLI command execution, plan management, and system operations',
    version: process.env.npm_package_version ?? '0.0.0',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Development server' }],
  components: {
    schemas: {
      CommandRequest: {
        type: 'object',
        required: ['toolId'],
        properties: {
          toolId: { type: 'string', description: 'Command or tool identifier' },
          params: { type: 'object', description: 'Optional parameters for the command' },
        },
      },
      CommandResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          error: { type: 'string' },
        },
      },
      PlanExecuteRequest: {
        type: 'object',
        required: ['planId'],
        properties: {
          planId: { type: 'string', description: 'The plan ID to execute' },
        },
      },
      ForgetRequest: {
        type: 'object',
        required: ['identifier', 'type'],
        properties: {
          identifier: { type: 'string', description: 'User identifier to forget' },
          type: { type: 'string', enum: ['email', 'user_id', 'session_id'] },
          scope: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional scope of tables to clean',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          uptime: { type: 'number' },
        },
      },
    },
  },
  paths: {
    '/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness check',
        responses: {
          '200': {
            description: 'Server is alive',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
          },
        },
      },
    },
    '/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check',
        responses: {
          '200': { description: 'Server is ready' },
          '503': { description: 'Server is not ready' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check with dependencies',
        responses: {
          '200': { description: 'Healthy' },
          '503': { description: 'Unhealthy or degraded' },
        },
      },
    },
    '/api/command': {
      post: {
        tags: ['Command'],
        summary: 'Execute a command or tool',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CommandRequest' } } },
        },
        responses: {
          '200': {
            description: 'Command executed successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CommandResponse' } } },
          },
          '400': {
            description: 'Invalid request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '429': {
            description: 'Too many requests',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/command/list': {
      get: {
        tags: ['Command'],
        summary: 'List available commands',
        responses: {
          '200': {
            description: 'List of commands',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CommandResponse' } } },
          },
        },
      },
    },
    '/api/plan/execute': {
      post: {
        tags: ['Plan'],
        summary: 'Execute a plan by ID',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PlanExecuteRequest' } } },
        },
        responses: {
          '200': {
            description: 'Plan execution started',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CommandResponse' } } },
          },
          '400': {
            description: 'Invalid request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/status': {
      get: {
        tags: ['System'],
        summary: 'Server status overview',
        responses: { '200': { description: 'Server status' } },
      },
    },
    '/api/logs': {
      get: {
        tags: ['System'],
        summary: 'Query server logs',
        parameters: [
          { name: 'level', in: 'query', schema: { type: 'string' } },
          { name: 'module', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'Log entries' } },
      },
    },
    '/api/config': {
      get: {
        tags: ['System'],
        summary: 'Server configuration',
        responses: { '200': { description: 'Configuration data' } },
      },
    },
    '/api/privacy/forget': {
      post: {
        tags: ['Privacy'],
        summary: 'Request data erasure (right to be forgotten)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgetRequest' } } },
        },
        responses: {
          '200': { description: 'Erasure request processed' },
          '400': {
            description: 'Invalid request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/privacy/status': {
      get: {
        tags: ['Privacy'],
        summary: 'Privacy framework status',
        responses: { '200': { description: 'Privacy settings and capabilities' } },
      },
    },
  },
};

const swaggerUiHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IDEIA API Server - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script>
    SwaggerUIBundle({
      url: '/docs/json',
      dom_id: '#swagger-ui',
    });
  </script>
</body>
</html>`;

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  app.get('/docs/json', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(openapiSpec);
  });

  app.get('/docs', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return reply.send(swaggerUiHtml);
  });
}
