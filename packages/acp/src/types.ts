import { z } from 'zod';

export const ContextSourceSchema = z.enum(['codebase', 'git', 'stack', 'memory', 'user', 'system', 'external']);
export type ContextSource = z.infer<typeof ContextSourceSchema>;

export const ContextItemSchema = z.object({
  id: z.string(),
  source: ContextSourceSchema,
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.number(),
  relevance: z.number().min(0).max(1).optional(),
});
export type ContextItem = z.infer<typeof ContextItemSchema>;

export const ACPPayloadSchema = z.object({
  protocol: z.literal('acp-v1'),
  requestId: z.string(),
  timestamp: z.string(),
  sources: z.array(ContextItemSchema),
  compressed: z.boolean().default(false),
  tokenCount: z.number().optional(),
  ttl: z.number().optional(),
});
export type ACPPayload = z.infer<typeof ACPPayloadSchema>;

export interface ContextProvider {
  name: string;
  collect(options?: Record<string, unknown>): Promise<ContextItem[]>;
}

export interface CacheEntry {
  payload: ACPPayload;
  cachedAt: number;
  ttl: number;
}
