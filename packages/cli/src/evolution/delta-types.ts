export interface StateChange {
  path: string;
  kind: 'added' | 'removed' | 'changed' | 'unchanged';
  before?: unknown;
  after?: unknown;
  impact: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

export interface StateDelta {
  generatedAt: string;
  fromVersion: string;
  toVersion: string;
  changes: StateChange[];
  summary: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
    critical: number;
  };
}
