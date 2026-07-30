"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterResultSchema = exports.AdapterConfigSchema = exports.BusEventSchema = exports.AgentIdentitySchema = exports.FeedbackEventSchema = exports.Contract = exports.TraceLinkSchema = exports.WorkflowTaskSchema = exports.RequirementSchema = void 0;
exports.validateAdapter = validateAdapter;
const zod_1 = require("zod");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('schemas');
exports.RequirementSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    priority: zod_1.z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    status: zod_1.z.enum(['draft', 'review', 'approved', 'implemented', 'verified', 'rejected']).default('draft'),
    category: zod_1.z.enum(['functional', 'non_functional', 'security', 'performance', 'compliance', 'ux']),
    source: zod_1.z.string().max(200).optional(),
    acceptanceCriteria: zod_1.z.array(zod_1.z.string().max(1000)).default([]),
    tags: zod_1.z.array(zod_1.z.string().max(50)).default([]),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    owner: zod_1.z.string().max(100).optional(),
    dependsOn: zod_1.z.array(zod_1.z.string().uuid()).default([]),
});
exports.WorkflowTaskSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    type: zod_1.z.enum(['feature', 'bug', 'refactor', 'docs', 'chore', 'research', 'review']),
    priority: zod_1.z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    status: zod_1.z.enum(['pending', 'blocked', 'in_progress', 'completed', 'cancelled']).default('pending'),
    phase: zod_1.z.number().int().min(0).max(100).default(0),
    agent: zod_1.z.string().max(100).optional(),
    dependencies: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    complexity: zod_1.z.enum(['trivial', 'simple', 'moderate', 'hard', 'extreme']).optional(),
    effort: zod_1.z.number().int().positive().optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    completedAt: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.TraceLinkSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceType: zod_1.z.enum(['requirement', 'workflow_task', 'feedback_event', 'code_file', 'test_file', 'commit', 'agent_action']),
    sourceId: zod_1.z.string().min(1),
    targetType: zod_1.z.enum(['requirement', 'workflow_task', 'feedback_event', 'code_file', 'test_file', 'commit', 'agent_action']),
    targetId: zod_1.z.string().min(1),
    relationship: zod_1.z.enum(['implements', 'tests', 'depends_on', 'related_to', 'validates', 'documents', 'blocks']),
    confidence: zod_1.z.number().min(0).max(1).default(1),
    createdAt: zod_1.z.string().datetime(),
    createdBy: zod_1.z.string().max(100).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
class Contract {
    static pre(schema, data) {
        return schema.safeParse(data);
    }
}
exports.Contract = Contract;
exports.FeedbackEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['approval', 'rejection', 'suggestion', 'question', 'comment', 'issue']),
    source: zod_1.z.enum(['user', 'system', 'ai', 'reviewer', 'ci']),
    targetType: zod_1.z.enum(['requirement', 'workflow_task', 'code_block', 'policy_rule', 'agent_action', 'report']),
    targetId: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1).max(10000),
    severity: zod_1.z.enum(['info', 'warning', 'error', 'critical']).default('info'),
    decision: zod_1.z.enum(['approved', 'rejected', 'pending']).default('pending'),
    createdAt: zod_1.z.string().datetime(),
    createdBy: zod_1.z.string().max(100).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(50)).default([]),
});
exports.AgentIdentitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    role: zod_1.z.enum(['planner', 'engineer', 'qa', 'reviewer', 'security', 'docs', 'architect', 'operator']),
    permissions: zod_1.z.object({
        readPaths: zod_1.z.array(zod_1.z.string()).default([]),
        writePaths: zod_1.z.array(zod_1.z.string()).default([]),
        forbiddenPaths: zod_1.z.array(zod_1.z.string()).default([]),
        maxConcurrency: zod_1.z.number().int().positive().default(1),
        allowShell: zod_1.z.boolean().default(false),
    }).default({
        readPaths: [],
        writePaths: [],
        forbiddenPaths: [],
        maxConcurrency: 1,
        allowShell: false,
    }),
    model: zod_1.z.string().max(100).optional(),
    mode: zod_1.z.enum(['auto', 'semi', 'manual']).default('auto'),
    status: zod_1.z.enum(['idle', 'running', 'blocked', 'error', 'completed']).default('idle'),
    createdAt: zod_1.z.string().datetime(),
    lastRunAt: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.BusEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.string().min(1),
    timestamp: zod_1.z.string().datetime(),
    source: zod_1.z.string().min(1),
    payload: zod_1.z.record(zod_1.z.unknown()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.AdapterConfigSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    capabilities: zod_1.z.array(zod_1.z.string()).min(1),
});
exports.AdapterResultSchema = zod_1.z.object({
    ok: zod_1.z.boolean(),
    output: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
});
function validateAdapter(config) {
    const result = exports.AdapterConfigSchema.safeParse(config);
    if (!result.success) {
        throw new Error(`Invalid adapter config: ${result.error.message}`);
    }
    return result.data;
}
//# sourceMappingURL=schemas.js.map