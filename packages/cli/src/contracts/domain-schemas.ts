import { z } from 'zod';
import { createLogger } from '@ideia/logger';
const logger = createLogger('domain-schemas');

export const InitRequestSchema = z.object({
  projectName: z.string().min(1, 'Project name is required').max(100),
  template: z.enum(['default', 'minimal', 'full', 'theia-plugin', 'cli']).optional().default('default'),
  language: z.enum(['typescript', 'javascript', 'python']).optional().default('typescript'),
  packageManager: z.enum(['npm', 'yarn', 'pnpm']).optional().default('npm'),
  gitInit: z.boolean().optional().default(true),
  installDeps: z.boolean().optional().default(true),
  dryRun: z.boolean().optional().default(false),
  autonomyLevel: z.number().int().min(0).max(4).optional().default(1),
});

export type InitRequest = z.infer<typeof InitRequestSchema>;

export const DeployEnvironmentSchema = z.enum(['development', 'staging', 'production', 'canary']);
export type DeployEnvironment = z.infer<typeof DeployEnvironmentSchema>;

export const DeployConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Semver format required'),
  environment: DeployEnvironmentSchema,
  canaryPercent: z.number().int().min(0).max(100).optional().default(0),
  autoRollback: z.boolean().optional().default(true),
  qualityGateCheck: z.boolean().optional().default(true),
  notifyChannels: z.array(z.string()).optional().default([]),
  timeout: z.number().int().positive().optional().default(300000),
  dryRun: z.boolean().optional().default(false),
});

export type DeployConfig = z.infer<typeof DeployConfigSchema>;

export const GenerateRequestSchema = z.object({
  template: z.string().min(1, 'Template name is required'),
  name: z.string().min(1, 'Name is required'),
  outputDir: z.string().optional(),
  language: z.enum(['typescript', 'javascript', 'python', 'rust', 'go']).optional().default('typescript'),
  force: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
  variables: z.record(z.string(), z.unknown()).optional().default({}),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const ConfigEntrySchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.unknown(),
  scope: z.enum(['global', 'project', 'local']).optional().default('project'),
  description: z.string().optional(),
});

export type ConfigEntry = z.infer<typeof ConfigEntrySchema>;

export const ConfigQuerySchema = z.object({
  key: z.string().optional(),
  scope: z.enum(['global', 'project', 'local']).optional(),
  prefix: z.string().optional(),
});

export type ConfigQuery = z.infer<typeof ConfigQuerySchema>;

export const AuditQuerySchema = z.object({
  eventType: z.string().optional(),
  actor: z.enum(['user', 'system', 'ai']).optional(),
  target: z.string().optional(),
  limit: z.number().int().positive().optional().default(50),
  fromTimestamp: z.string().optional(),
  toTimestamp: z.string().optional(),
  includeChain: z.boolean().optional().default(false),
});

export type AuditQuery = z.infer<typeof AuditQuerySchema>;

export const QualityGateQuerySchema = z.object({
  gate: z.enum(['commit', 'pr', 'release', 'sprint']).optional(),
  dimension: z.enum(['code', 'security', 'performance', 'ux', 'integration', 'resilience', 'data']).optional(),
  strict: z.boolean().optional().default(false),
});

export type QualityGateQuery = z.infer<typeof QualityGateQuerySchema>;
