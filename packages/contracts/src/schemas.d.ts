import { z } from 'zod';
export declare const RequirementSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "review", "approved", "implemented", "verified", "rejected"]>>;
    category: z.ZodEnum<["functional", "non_functional", "security", "performance", "compliance", "ux"]>;
    source: z.ZodOptional<z.ZodString>;
    acceptanceCriteria: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    owner: z.ZodOptional<z.ZodString>;
    dependsOn: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    status: "approved" | "rejected" | "draft" | "review" | "implemented" | "verified";
    category: "functional" | "performance" | "security" | "non_functional" | "compliance" | "ux";
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    acceptanceCriteria: string[];
    tags: string[];
    dependsOn: string[];
    description?: string | undefined;
    source?: string | undefined;
    owner?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    category: "functional" | "performance" | "security" | "non_functional" | "compliance" | "ux";
    title: string;
    description?: string | undefined;
    source?: string | undefined;
    status?: "approved" | "rejected" | "draft" | "review" | "implemented" | "verified" | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    acceptanceCriteria?: string[] | undefined;
    tags?: string[] | undefined;
    owner?: string | undefined;
    dependsOn?: string[] | undefined;
}>;
export declare const WorkflowTaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["feature", "bug", "refactor", "docs", "chore", "research", "review"]>;
    priority: z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    status: z.ZodDefault<z.ZodEnum<["pending", "blocked", "in_progress", "completed", "cancelled"]>>;
    phase: z.ZodDefault<z.ZodNumber>;
    agent: z.ZodOptional<z.ZodString>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    complexity: z.ZodOptional<z.ZodEnum<["trivial", "simple", "moderate", "hard", "extreme"]>>;
    effort: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    dependencies: string[];
    metadata: Record<string, unknown>;
    id: string;
    createdAt: string;
    updatedAt: string;
    type: "docs" | "refactor" | "review" | "feature" | "bug" | "chore" | "research";
    status: "pending" | "blocked" | "in_progress" | "completed" | "cancelled";
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    phase: number;
    description?: string | undefined;
    agent?: string | undefined;
    complexity?: "trivial" | "simple" | "moderate" | "hard" | "extreme" | undefined;
    effort?: number | undefined;
    completedAt?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    type: "docs" | "refactor" | "review" | "feature" | "bug" | "chore" | "research";
    title: string;
    dependencies?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    description?: string | undefined;
    status?: "pending" | "blocked" | "in_progress" | "completed" | "cancelled" | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
    phase?: number | undefined;
    agent?: string | undefined;
    complexity?: "trivial" | "simple" | "moderate" | "hard" | "extreme" | undefined;
    effort?: number | undefined;
    completedAt?: string | undefined;
}>;
export declare const TraceLinkSchema: z.ZodObject<{
    id: z.ZodString;
    sourceType: z.ZodEnum<["requirement", "workflow_task", "feedback_event", "code_file", "test_file", "commit", "agent_action"]>;
    sourceId: z.ZodString;
    targetType: z.ZodEnum<["requirement", "workflow_task", "feedback_event", "code_file", "test_file", "commit", "agent_action"]>;
    targetId: z.ZodString;
    relationship: z.ZodEnum<["implements", "tests", "depends_on", "related_to", "validates", "documents", "blocks"]>;
    confidence: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodString;
    createdBy: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, unknown>;
    id: string;
    createdAt: string;
    sourceType: "requirement" | "workflow_task" | "feedback_event" | "code_file" | "test_file" | "commit" | "agent_action";
    sourceId: string;
    targetType: "requirement" | "workflow_task" | "feedback_event" | "code_file" | "test_file" | "commit" | "agent_action";
    targetId: string;
    relationship: "implements" | "tests" | "depends_on" | "related_to" | "validates" | "documents" | "blocks";
    confidence: number;
    createdBy?: string | undefined;
}, {
    id: string;
    createdAt: string;
    sourceType: "requirement" | "workflow_task" | "feedback_event" | "code_file" | "test_file" | "commit" | "agent_action";
    sourceId: string;
    targetType: "requirement" | "workflow_task" | "feedback_event" | "code_file" | "test_file" | "commit" | "agent_action";
    targetId: string;
    relationship: "implements" | "tests" | "depends_on" | "related_to" | "validates" | "documents" | "blocks";
    metadata?: Record<string, unknown> | undefined;
    confidence?: number | undefined;
    createdBy?: string | undefined;
}>;
export declare class Contract {
    static pre<T>(schema: z.ZodSchema<T>, data: unknown): z.SafeParseReturnType<unknown, T>;
}
export declare const FeedbackEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["approval", "rejection", "suggestion", "question", "comment", "issue"]>;
    source: z.ZodEnum<["user", "system", "ai", "reviewer", "ci"]>;
    targetType: z.ZodEnum<["requirement", "workflow_task", "code_block", "policy_rule", "agent_action", "report"]>;
    targetId: z.ZodString;
    content: z.ZodString;
    severity: z.ZodDefault<z.ZodEnum<["info", "warning", "error", "critical"]>>;
    decision: z.ZodDefault<z.ZodEnum<["approved", "rejected", "pending"]>>;
    createdAt: z.ZodString;
    createdBy: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    decision: "approved" | "rejected" | "pending";
    id: string;
    createdAt: string;
    type: "approval" | "rejection" | "suggestion" | "question" | "comment" | "issue";
    source: "system" | "user" | "ai" | "ci" | "reviewer";
    severity: "error" | "warning" | "info" | "critical";
    tags: string[];
    targetType: "requirement" | "workflow_task" | "agent_action" | "code_block" | "policy_rule" | "report";
    targetId: string;
    content: string;
    createdBy?: string | undefined;
}, {
    id: string;
    createdAt: string;
    type: "approval" | "rejection" | "suggestion" | "question" | "comment" | "issue";
    source: "system" | "user" | "ai" | "ci" | "reviewer";
    targetType: "requirement" | "workflow_task" | "agent_action" | "code_block" | "policy_rule" | "report";
    targetId: string;
    content: string;
    decision?: "approved" | "rejected" | "pending" | undefined;
    severity?: "error" | "warning" | "info" | "critical" | undefined;
    tags?: string[] | undefined;
    createdBy?: string | undefined;
}>;
export declare const AgentIdentitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["planner", "engineer", "qa", "reviewer", "security", "docs", "architect", "operator"]>;
    permissions: z.ZodDefault<z.ZodObject<{
        readPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        writePaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        forbiddenPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        maxConcurrency: z.ZodDefault<z.ZodNumber>;
        allowShell: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        readPaths: string[];
        writePaths: string[];
        forbiddenPaths: string[];
        maxConcurrency: number;
        allowShell: boolean;
    }, {
        readPaths?: string[] | undefined;
        writePaths?: string[] | undefined;
        forbiddenPaths?: string[] | undefined;
        maxConcurrency?: number | undefined;
        allowShell?: boolean | undefined;
    }>>;
    model: z.ZodOptional<z.ZodString>;
    mode: z.ZodDefault<z.ZodEnum<["auto", "semi", "manual"]>>;
    status: z.ZodDefault<z.ZodEnum<["idle", "running", "blocked", "error", "completed"]>>;
    createdAt: z.ZodString;
    lastRunAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, unknown>;
    id: string;
    name: string;
    createdAt: string;
    status: "error" | "blocked" | "completed" | "idle" | "running";
    role: "docs" | "security" | "reviewer" | "planner" | "engineer" | "qa" | "architect" | "operator";
    permissions: {
        readPaths: string[];
        writePaths: string[];
        forbiddenPaths: string[];
        maxConcurrency: number;
        allowShell: boolean;
    };
    mode: "auto" | "manual" | "semi";
    model?: string | undefined;
    lastRunAt?: string | undefined;
}, {
    id: string;
    name: string;
    createdAt: string;
    role: "docs" | "security" | "reviewer" | "planner" | "engineer" | "qa" | "architect" | "operator";
    metadata?: Record<string, unknown> | undefined;
    status?: "error" | "blocked" | "completed" | "idle" | "running" | undefined;
    permissions?: {
        readPaths?: string[] | undefined;
        writePaths?: string[] | undefined;
        forbiddenPaths?: string[] | undefined;
        maxConcurrency?: number | undefined;
        allowShell?: boolean | undefined;
    } | undefined;
    model?: string | undefined;
    mode?: "auto" | "manual" | "semi" | undefined;
    lastRunAt?: string | undefined;
}>;
export declare const BusEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodString;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    id: string;
    type: string;
    source: string;
    metadata?: Record<string, unknown> | undefined;
    payload?: Record<string, unknown> | undefined;
}, {
    timestamp: string;
    id: string;
    type: string;
    source: string;
    metadata?: Record<string, unknown> | undefined;
    payload?: Record<string, unknown> | undefined;
}>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type WorkflowTask = z.infer<typeof WorkflowTaskSchema>;
export type TraceLink = z.infer<typeof TraceLinkSchema>;
export type FeedbackEvent = z.infer<typeof FeedbackEventSchema>;
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;
export declare const AdapterConfigSchema: z.ZodObject<{
    name: z.ZodString;
    capabilities: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    capabilities: string[];
}, {
    name: string;
    capabilities: string[];
}>;
export declare const AdapterResultSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ok: boolean;
    error?: string | undefined;
    output?: string | undefined;
}, {
    ok: boolean;
    error?: string | undefined;
    output?: string | undefined;
}>;
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
export declare function validateAdapter(config: unknown): AdapterConfig;
export type BusEvent = z.infer<typeof BusEventSchema>;
export type BusEventType = BusEvent['type'];
//# sourceMappingURL=schemas.d.ts.map