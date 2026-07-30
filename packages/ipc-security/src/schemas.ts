import { z } from 'zod';
import { createLogger } from '@ideia/logger';
const logger = createLogger('schemas');

export const FsReadSchema = z.object({
  path: z.string().min(1).max(4096),
  encoding: z.enum(['utf-8', 'base64', 'hex', 'binary']).optional().default('utf-8'),
  offset: z.number().int().min(0).optional(),
  length: z.number().int().min(1).max(1024 * 1024).optional(),
});

export const FsWriteSchema = z.object({
  path: z.string().min(1).max(4096),
  data: z.string().max(10 * 1024 * 1024),
  encoding: z.enum(['utf-8', 'base64', 'hex']).optional().default('utf-8'),
  append: z.boolean().optional().default(false),
});

export const ShellExecSchema = z.object({
  command: z.string().min(1).max(256),
  args: z.array(z.string()).max(256).optional().default([]),
  env: z.record(z.string()).optional(),
  timeout: z.number().int().min(100).max(300000).optional().default(30000),
  cwd: z.string().max(4096).optional(),
});

export const AgentSpawnSchema = z.object({
  agentType: z.enum(['analyst', 'architect', 'programmer', 'reviewer', 'tester', 'devops']),
  config: z.record(z.unknown()).optional(),
  capabilities: z.array(z.string()).optional(),
  ttl: z.number().int().min(60000).max(86400000).optional().default(3600000),
});

export const DialogOpenSchema = z.object({
  title: z.string().max(256).optional(),
  defaultPath: z.string().max(4096).optional(),
  filters: z.array(z.object({
    name: z.string().max(128),
    extensions: z.array(z.string().max(32)).max(100),
  })).max(20).optional(),
  properties: z.array(z.enum(['openFile', 'openDirectory', 'multiSelections'])).optional(),
});

export const NatsPublishSchema = z.object({
  topic: z.string().min(1).max(512).regex(/^[a-zA-Z0-9_.>-]+$/),
  data: z.record(z.unknown()),
  ttl: z.number().int().min(0).max(86400).optional().default(0),
});

export const IPCRequestEnvelope = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  method: z.string().min(1).max(256),
  params: z.record(z.unknown()),
  token: z.string().min(1).max(4096),
  source: z.string().min(1).max(128),
  timestamp: z.number().int().positive(),
  hmac: z.string().length(64),
});
