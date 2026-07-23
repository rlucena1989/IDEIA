import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string().uuid(),
  workspaceRoot: z.string().min(1),
  status: z.enum(['active', 'ended']).default('active'),
  metadata: z.record(z.unknown()).default({}),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
});

export const DecisionSchema = z.object({
  id: z.string().uuid(),
  actionId: z.string().min(1),
  actionType: z.string().min(1),
  decision: z.string().min(1),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export const MemorySchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  category: z.string().min(1),
  source: z.string().optional(),
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export const AuditSchema = z.object({
  id: z.string().uuid(),
  actor: z.string().min(1),
  eventType: z.string().min(1),
  target: z.string().optional(),
  decision: z.string().min(1),
  result: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  previousHash: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const VectorSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  embedding: z.array(z.number()),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export type Session = z.infer<typeof SessionSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type Audit = z.infer<typeof AuditSchema>;
export type Vector = z.infer<typeof VectorSchema>;

export const SCHEMAS = {
  session: SessionSchema,
  decision: DecisionSchema,
  memory: MemorySchema,
  audit: AuditSchema,
  vector: VectorSchema,
};

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}

const _PG_TYPE_MAP: Record<string, string> = {
  'z.string().uuid()': 'UUID',
  'z.string().min(1)': 'TEXT NOT NULL',
  'z.string()': 'TEXT',
  'z.string().datetime()': 'TIMESTAMPTZ',
  'z.string().datetime().optional()': 'TIMESTAMPTZ',
  'z.string().optional()': 'TEXT',
  'z.enum': 'TEXT',
  'z.array': 'JSONB',
  'z.record': 'JSONB',
  default: 'TEXT',
};

export function zodToDDL(tableName: string, schema: z.ZodObject<z.ZodRawShape>, pgvector = false): string {
  const shape = schema.shape;
  const cols: string[] = [];

  for (const [key, field] of Object.entries(shape)) {
    const pgCol = key === 'id' ? 'id UUID PRIMARY KEY' :
      key === 'embedding' && pgvector ? 'embedding VECTOR(1536)' :
      key === 'tags' ? 'tags TEXT[]' :
      key === 'metadata' ? "metadata JSONB DEFAULT '{}'" :
      key === 'createdAt' || key === 'startedAt' ? `${snakeCase(key)} TIMESTAMPTZ DEFAULT NOW()` :
      key === 'endedAt' ? `${snakeCase(key)} TIMESTAMPTZ` :
      key.endsWith('At') || key.endsWith('edAt') ? `${snakeCase(key)} TIMESTAMPTZ` :
      `${snakeCase(key)} ${pgType(key, field)}`;
    cols.push(`  ${pgCol}`);
  }

  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n${cols.join(',\n')}\n);`;
}

function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}

function pgType(key: string, field: z.ZodTypeAny): string {
  if (field._def?.typeName === 'ZodString') return 'TEXT' + (field.isNullable() ? '' : ' NOT NULL');
  if (field._def?.typeName === 'ZodArray') return 'JSONB';
  if (field._def?.typeName === 'ZodRecord') return 'JSONB';
  if (field._def?.typeName === 'ZodOptional') return 'TEXT';
  if (field._def?.typeName === 'ZodEnum') return 'TEXT';
  return 'TEXT';
}
