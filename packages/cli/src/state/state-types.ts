export interface DevkitStateMetric {
  name: string;
  value: number | string | boolean;
  unit?: string;
  description?: string;
}

export interface DevkitStateBlock {
  id: string;
  title: string;
  status: 'done' | 'partial' | 'blocked' | 'experimental';
  summary: string;
  evidence: string[];
  risks?: string[];
}

export interface DevkitStateArtifact {
  path: string;
  purpose: string;
  status: 'present' | 'missing' | 'stale' | 'partial';
}

export interface DevkitStateCommand {
  command: string;
  purpose: string;
  status: 'active' | 'deprecated' | 'planned';
}

export interface DevkitState {
  version: string;
  lastUpdated: string;
  summary: string;
  blocks: DevkitStateBlock[];
  metrics: DevkitStateMetric[];
  artifacts: DevkitStateArtifact[];
  commands: DevkitStateCommand[];
  blockers: string[];
  nextSteps: string[];
}
