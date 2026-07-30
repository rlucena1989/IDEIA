export enum ProvenanceReason {
  INCLUDED = 'included',
  EXCLUDED_BUDGET = 'excluded_budget',
  EXCLUDED_RELEVANCE = 'excluded_relevance',
  EXCLUDED_CONFIDENTIAL = 'excluded_confidential',
  EXCLUDED_DUPLICATE = 'excluded_duplicate',
  EXCLUDED_POLICY = 'excluded_policy',
  EXCLUDED_ERROR = 'excluded_error',
}

export enum SourceType {
  FILE = 'file',
  DATABASE = 'database',
  WEB = 'web',
  LLM_OUTPUT = 'llm_output',
  USER_INPUT = 'user_input',
  MEMORY = 'memory',
  TOOL_RESULT = 'tool_result',
  CACHE = 'cache',
}

export interface ProvenanceEntry {
  id: string;
  itemId: string;
  source: string;
  sourceType: SourceType;
  reason: ProvenanceReason | string;
  score: number;
  contentHash: string;
  sourceHash: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  previousHash: string;
  hash: string;
  sequence: number;
}

export interface ContextItem {
  id: string;
  content: string;
  source: string;
  sourceType: SourceType;
  metadata: Record<string, unknown>;
  tokenCount: number;
  relevanceScore: number;
}

export interface AuditChain {
  entries: ProvenanceEntry[];
  merkleRoot: string;
  startTime: number;
  endTime: number;
  entryCount: number;
  valid: boolean;
}

export interface InfluenceNode {
  id: string;
  source: string;
  sourceType: SourceType;
  score: number;
  contentHash: string;
  matchedPortions: Array<{ start: number; end: number; text: string }>;
}

export interface InfluenceEdge {
  from: string;
  to: string;
  weight: number;
  relation: string;
}

export interface InfluenceGraph {
  nodes: InfluenceNode[];
  edges: InfluenceEdge[];
  totalInfluence: number;
}

export interface ZKProof {
  proof: string;
  publicInputs: { merkleRoot: string; entryCount: number; timestamp: number };
  protocol: string;
  curve: string;
}

export interface AttestationReport {
  teeType: string;
  enclaveHash: string;
  quote: string;
  timestamp: number;
  verified: boolean;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

export interface SourceStats {
  included: number;
  excluded: number;
  totalScore: number;
  sources: string[];
}
