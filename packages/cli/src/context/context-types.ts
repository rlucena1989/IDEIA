export interface OperationalContext {
  contextId: string;
  name: string;
  type: 'product' | 'workspace' | 'module' | 'extension' | 'generation' | 'governance';
  status: 'active' | 'idle' | 'blocked' | 'archived';
  priority: number;
  source: string;
  updatedAt: string;
  createdAt: string;
  tags: string[];
  dependencies: string[];
  summary: string;
}

export interface ContextSnapshot {
  contextId: string;
  version: string;
  stateRef: string;
  generatedAt: string;
}
