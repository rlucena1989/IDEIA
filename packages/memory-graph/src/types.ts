import { z } from 'zod';
import { createLogger } from '@ideia/logger';

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['decision', 'pattern', 'artifact', 'memory', 'error', 'external']),
  label: z.string(),
  properties: z.record(z.unknown()),
  tags: z.array(z.string()),
  timestamp: z.number(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  relation: z.string(),
  weight: z.number().min(0).max(1),
  timestamp: z.number(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphQuerySchema = z.object({
  filters: z.object({
    type: z.string().optional(),
    tag: z.string().optional(),
    search: z.string().optional(),
  }),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type GraphQuery = z.infer<typeof GraphQuerySchema>;

export const GraphPathSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  score: z.number(),
});
export type GraphPath = z.infer<typeof GraphPathSchema>;


export const GraphSnapshotSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  timestamp: z.string(),
  version: z.string(),
});
export type GraphSnapshot = z.infer<typeof GraphSnapshotSchema>;
