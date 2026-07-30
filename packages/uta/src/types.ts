import { z } from 'zod';
import { createLogger } from '@ideia/logger';

export const ToolParamSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  required: z.boolean().default(false),
});
export type ToolParam = z.infer<typeof ToolParamSchema>;

export const ToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  params: z.array(ToolParamSchema),
  returns: z.string().optional(),
  examples: z.array(z.string()).optional(),
  rateLimit: z.number().optional(),
});
export type Tool = z.infer<typeof ToolSchema>;

export const ToolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  duration: z.number(),
  toolId: z.string(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

export const ToolCallSchema = z.object({
  toolId: z.string(),
  params: z.record(z.unknown()),
  timestamp: z.string().optional(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export interface ToolHandler {
  (params: Record<string, unknown>): Promise<unknown>;
}
