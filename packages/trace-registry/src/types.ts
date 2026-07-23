export type EntityType = 'requirement' | 'workflow_task' | 'feedback_event' | 'code_file' | 'test_file' | 'commit' | 'agent_action';

export type Relationship = 'implements' | 'tests' | 'depends_on' | 'related_to' | 'validates' | 'documents' | 'blocks';

export interface TraceLink {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationship: Relationship;
  confidence: number;
  createdAt: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface TraceNode {
  id: string;
  type: EntityType;
  label: string;
}

export interface TraceEdge {
  source: string;
  target: string;
  relationship: Relationship;
  confidence: number;
}

export interface TraceGraph {
  nodes: TraceNode[];
  edges: TraceEdge[];
}

export interface TracePath {
  path: TraceLink[];
  hops: number;
  totalConfidence: number;
}

export interface LinkRequest {
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationship: Relationship;
  confidence?: number;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}
