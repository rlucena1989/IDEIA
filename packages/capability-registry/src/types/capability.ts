export type CapabilityCategory = 'agent' | 'tool' | 'context-pack' | 'adapter' | 'registry' | 'workflow' | 'observation' | 'memory' | 'pipeline' | 'integration';

export type CapabilityStatus = 'active' | 'deprecated' | 'experimental' | 'draft';

export interface CapabilityInput {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  default?: unknown;
  schema?: Record<string, unknown>;
}

export interface CapabilityOutput {
  name: string;
  type: string;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface CapabilityDependency {
  id: string;
  version: string;
  optional?: boolean;
}

export interface CapabilityExample {
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface CapabilityMetadata {
  author?: string;
  package?: string;
  sourceFile?: string;
  since?: string;
  maturity?: number;
  tags: string[];
  keywords: string[];
  links: Record<string, string>;
  embedding?: number[];
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  subcategory: string;
  version: string;
  status: CapabilityStatus;
  createdAt: string;
  updatedAt: string;
  dependsOn: CapabilityDependency[];
  inputs: CapabilityInput[];
  outputs: CapabilityOutput[];
  examples: CapabilityExample[];
  tags: string[];
  metadata: CapabilityMetadata;
}

export interface CapabilityMatch {
  capability: Capability;
  score: number;
  matchReasons: string[];
}

export interface CapabilityQuery {
  text?: string;
  category?: CapabilityCategory;
  subcategory?: string;
  tags?: string[];
  status?: CapabilityStatus;
  versionMin?: string;
  limit?: number;
  offset?: number;
}

export interface RegistryEvent {
  type: 'registered' | 'updated' | 'deprecated' | 'removed' | 'dependency-changed';
  capability: Capability;
  timestamp: string;
}
