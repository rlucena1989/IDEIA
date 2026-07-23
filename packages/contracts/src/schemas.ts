import { z } from 'zod';

export const RequirementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['draft', 'review', 'approved', 'implemented', 'verified', 'rejected']).default('draft'),
  category: z.enum(['functional', 'non_functional', 'security', 'performance', 'compliance', 'ux']),
  source: z.string().max(200).optional(),
  acceptanceCriteria: z.array(z.string().max(1000)).default([]),
  tags: z.array(z.string().max(50)).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  owner: z.string().max(100).optional(),
  dependsOn: z.array(z.string().uuid()).default([]),
});

export const WorkflowTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['feature', 'bug', 'refactor', 'docs', 'chore', 'research', 'review']),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['pending', 'blocked', 'in_progress', 'completed', 'cancelled']).default('pending'),
  phase: z.number().int().min(0).max(100).default(0),
  agent: z.string().max(100).optional(),
  dependencies: z.array(z.string().uuid()).default([]),
  complexity: z.enum(['trivial', 'simple', 'moderate', 'hard', 'extreme']).optional(),
  effort: z.number().int().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const TraceLinkSchema = z.object({
  id: z.string().uuid(),
  sourceType: z.enum(['requirement', 'workflow_task', 'feedback_event', 'code_file', 'test_file', 'commit', 'agent_action']),
  sourceId: z.string().min(1),
  targetType: z.enum(['requirement', 'workflow_task', 'feedback_event', 'code_file', 'test_file', 'commit', 'agent_action']),
  targetId: z.string().min(1),
  relationship: z.enum(['implements', 'tests', 'depends_on', 'related_to', 'validates', 'documents', 'blocks']),
  confidence: z.number().min(0).max(1).default(1),
  createdAt: z.string().datetime(),
  createdBy: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).default({}),
});

export class Contract {
  static pre<T>(schema: z.ZodSchema<T>, data: unknown): z.SafeParseReturnType<unknown, T> {
    return schema.safeParse(data);
  }
}

export const FeedbackEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['approval', 'rejection', 'suggestion', 'question', 'comment', 'issue']),
  source: z.enum(['user', 'system', 'ai', 'reviewer', 'ci']),
  targetType: z.enum(['requirement', 'workflow_task', 'code_block', 'policy_rule', 'agent_action', 'report']),
  targetId: z.string().min(1),
  content: z.string().min(1).max(10000),
  severity: z.enum(['info', 'warning', 'error', 'critical']).default('info'),
  decision: z.enum(['approved', 'rejected', 'pending']).default('pending'),
  createdAt: z.string().datetime(),
  createdBy: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).default([]),
});

export const AgentIdentitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  role: z.enum(['planner', 'engineer', 'qa', 'reviewer', 'security', 'docs', 'architect', 'operator']),
  permissions: z.object({
    readPaths: z.array(z.string()).default([]),
    writePaths: z.array(z.string()).default([]),
    forbiddenPaths: z.array(z.string()).default([]),
    maxConcurrency: z.number().int().positive().default(1),
    allowShell: z.boolean().default(false),
  }).default({
    readPaths: [],
    writePaths: [],
    forbiddenPaths: [],
    maxConcurrency: 1,
    allowShell: false,
  }),
  model: z.string().max(100).optional(),
  mode: z.enum(['auto', 'semi', 'manual']).default('auto'),
  status: z.enum(['idle', 'running', 'blocked', 'error', 'completed']).default('idle'),
  createdAt: z.string().datetime(),
  lastRunAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const BusEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  timestamp: z.string().datetime(),
  source: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Requirement = z.infer<typeof RequirementSchema>;
export type WorkflowTask = z.infer<typeof WorkflowTaskSchema>;
export type TraceLink = z.infer<typeof TraceLinkSchema>;
export type FeedbackEvent = z.infer<typeof FeedbackEventSchema>;
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;
export const AdapterConfigSchema = z.object({
  name: z.string().min(1),
  capabilities: z.array(z.string()).min(1),
});

export const AdapterResultSchema = z.object({
  ok: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional(),
});

export type AdapterConfig = z.infer<typeof AdapterConfigSchema>;
export type AdapterResult = z.infer<typeof AdapterResultSchema>;

export interface AdapterInterface {
  name: string;
  capabilities: string[];
  detect(projectRoot: string): boolean;
  init(projectRoot: string): boolean;
  generateTemplate(pkgName: string): string;
  runLint(projectRoot: string): boolean;
  runTests(projectRoot: string): boolean;
  runBuild(projectRoot: string): boolean;
  qualityGate(projectRoot: string): boolean;
}

export function validateAdapter(config: unknown): AdapterConfig {
  const result = AdapterConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid adapter config: ${result.error.message}`);
  }
  return result.data;
}

export type BusEvent = z.infer<typeof BusEventSchema>;
export type BusEventType = BusEvent['type'];
