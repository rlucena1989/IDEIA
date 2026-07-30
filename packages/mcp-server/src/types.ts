import { z } from 'zod';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export const McpVersionSchema = z.literal('mcp-v1');
export type McpVersion = z.infer<typeof McpVersionSchema>;

export const McpRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});
export type McpRequest = z.infer<typeof McpRequestSchema>;

export const McpResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: z.object({ code: z.number(), message: z.string() }).optional(),
});
export type McpResponse = z.infer<typeof McpResponseSchema>;

export const McpToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.unknown()).optional(),
    required: z.array(z.string()).optional(),
  }),
});
export type McpTool = z.infer<typeof McpToolSchema>;

export const McpResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});
export type McpResource = z.infer<typeof McpResourceSchema>;

export const McpCapabilitiesSchema = z.object({
  tools: z.record(z.unknown()).optional(),
  resources: z.record(z.unknown()).optional(),
  logging: z.record(z.unknown()).optional(),
});
export type McpCapabilities = z.infer<typeof McpCapabilitiesSchema>;

export interface McpToolHandler {
  (params: Record<string, unknown>): Promise<unknown>;
}

export interface McpTransport {
  send(response: McpResponse): void;
  onMessage(handler: (msg: McpRequest) => void): void;
  close(): void;
}

export const DEFAULT_MCP_TIMEOUT_MS = 30000;

export interface McpServerConfig {
  defaultTimeoutMs?: number;
  maxTimeoutMs?: number;
  toolTimeouts?: Record<string, number>;
}

export class McpTimeoutError extends Error {
  public code: string;
  public timeout: number;

  constructor(message: string, timeout: number) {
    super(message);
    this.name = 'McpTimeoutError';
    this.code = 'TIMEOUT';
    this.timeout = timeout;
  }
}
