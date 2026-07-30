export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface SchemaDefinition {
  type: string;
  version: number;
  fields: SchemaField[];
  createdAt: number;
  updatedAt: number;
}

export interface SchemaVersion {
  type: string;
  version: number;
  schema: SchemaDefinition;
  checksum: string;
  isDeprecated: boolean;
  deprecationDate?: number;
}

export interface Migration {
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (event: Record<string, unknown>) => Record<string, unknown>;
}

export interface MigrationPhase {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'rolled_back';
  startedAt?: number;
  completedAt?: number;
}

export interface MigrationPlan {
  type: string;
  fromVersion: number;
  toVersion: number;
  compatibility: string;
  phases: MigrationPhase[];
  estimatedDuration: string;
}

export interface BreakingChange {
  type: 'field_removed' | 'field_renamed' | 'type_changed' | 'required_added' | 'default_removed';
  field: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ExtendedCompatibilityReport {
  overall: 'FULL' | 'BACKWARD' | 'FORWARD' | 'NONE';
  backward: { compatible: boolean; score: number; details: string[] };
  forward: { compatible: boolean; score: number; details: string[] };
  breakingChanges: BreakingChange[];
  overallScore: number;
  recommendation: 'safe' | 'caution' | 'breaking';
  upgradeDifficulty: 'none' | 'low' | 'medium' | 'high';
}

export interface ProtobufField {
  name: string;
  type: string;
  label?: 'optional' | 'required' | 'repeated';
}

export interface ProtobufType {
  name: string;
  fields: ProtobufField[];
  version: number;
}

export interface ProtoCompatibility {
  compatible: boolean;
  added: string[];
  removed: string[];
  typeChanged: string[];
  wireCompatible: boolean;
}
