import type { Capability } from '../types/capability';

export interface DependencyGraph {
  nodes: Map<string, Capability>;
  edges: Map<string, string[]>;
}

export interface ResolutionResult {
  success: boolean;
  order: string[];
  graph: DependencyGraph;
  cycles: string[][];
  missing: string[];
  versionConflicts: string[];
}

export interface IDependencyResolver {
  resolve(capabilityIds: string[]): Promise<ResolutionResult>;
  validate(capability: Capability): Promise<{ valid: boolean; errors: string[] }>;
  getDependencyGraph(capabilityId: string): Promise<DependencyGraph>;
  detectCycles(capabilityId: string): Promise<string[][]>;
}
