import type { FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@ideia/logger';
const logger = createLogger('validator');

interface PropertyRule {
  type: string;
}

interface ValidationSchema {
  required: string[];
  properties?: Record<string, PropertyRule>;
}

const endpointSchemas: Record<string, ValidationSchema> = {
  'POST /api/command': {
    required: ['toolId'],
    properties: {
      toolId: { type: 'string' },
      params: { type: 'object' },
    },
  },
  'POST /api/plan/execute': {
    required: ['planId'],
    properties: {
      planId: { type: 'string' },
    },
  },
  'POST /api/privacy/forget': {
    required: ['identifier', 'type'],
    properties: {
      identifier: { type: 'string' },
      type: { type: 'string' },
    },
  },
};

function normalizeUrl(url: string): string {
  const pathname = url.split('?')[0];
  return pathname.replace(/\/+$/, '') || '/';
}

function matchSchema(method: string, url: string): ValidationSchema | undefined {
  const normalized = normalizeUrl(url);
  const direct = endpointSchemas[`${method} ${normalized}`];
  if (direct) return direct;

  for (const [key, schema] of Object.entries(endpointSchemas)) {
    const [m, p] = key.split(' ');
    if (m !== method) continue;
    const pattern = p.replace(/:(\w+)/g, '[^/]+');
    if (new RegExp(`^${pattern}$`).test(normalized)) {
      return schema;
    }
  }

  return undefined;
}

export function createValidator() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = matchSchema(request.method, request.url);
    if (!schema) return;

    const body = request.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ success: false, error: 'Request body is required' });
    }

    for (const field of schema.required) {
      const val = body[field];
      if (val === undefined || val === null || val === '') {
        return reply.status(400).send({ success: false, error: `Missing required field: ${field}` });
      }
    }

    if (schema.properties) {
      for (const [field, rule] of Object.entries(schema.properties)) {
        const val = body[field];
        if (val === undefined || val === null) continue;
        if (rule.type === 'string' && typeof val !== 'string') {
          return reply.status(400).send({ success: false, error: `Field '${field}' must be a string` });
        }
        if (rule.type === 'object' && (typeof val !== 'object' || Array.isArray(val) || val === null)) {
          return reply.status(400).send({ success: false, error: `Field '${field}' must be an object` });
        }
      }
    }
  };
}
