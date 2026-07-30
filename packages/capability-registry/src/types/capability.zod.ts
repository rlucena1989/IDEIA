import { z } from 'zod';
import { createLogger } from '@ideia/logger';
const logger = createLogger('capability.zod');

const CapabilityCategorySchema = z.enum(['agent', 'tool', 'context-pack', 'adapter', 'registry', 'workflow', 'observation', 'memory', 'pipeline', 'integration']);

const CapabilityStatusSchema = z.enum(['active', 'deprecated', 'experimental', 'draft']);

const CapabilityInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  required: z.boolean(),
  default: z.unknown().optional(),
  schema: z.record(z.unknown()).optional(),
});

const CapabilityDependencySchema = z.object({
  id: z.string().min(1).max(200),
  version: z.string().min(1).max(50),
  optional: z.boolean().optional(),
});

const CapabilityMetadataSchema = z.object({
  author: z.string().optional(),
  package: z.string().optional(),
  sourceFile: z.string().optional(),
  since: z.string().optional(),
  maturity: z.number().min(0).max(10).optional(),
  tags: z.array(z.string()),
  keywords: z.array(z.string()),
  links: z.record(z.string()),
});

export const CapabilitySchema = z.object({
  id: z.string().min(1).max(200).regex(/^[a-z0-9._-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: CapabilityCategorySchema,
  subcategory: z.string().min(1).max(100),
  version: z.string().min(1).max(50),
  status: CapabilityStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  dependsOn: z.array(CapabilityDependencySchema).default([]),
  inputs: z.array(CapabilityInputSchema).default([]),
  outputs: z.array(CapabilityInputSchema).default([]),
  examples: z.array(z.object({ description: z.string(), input: z.record(z.unknown()), output: z.record(z.unknown()) })).default([]),
  tags: z.array(z.string()).default([]),
  metadata: CapabilityMetadataSchema,
});

export type CapabilityDTO = z.infer<typeof CapabilitySchema>;

export function validateCapability(data: unknown): CapabilityDTO {
  return CapabilitySchema.parse(data);
}
