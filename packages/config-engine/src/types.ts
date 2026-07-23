export type ConfigValue = string | number | boolean | null | ConfigObject | ConfigArray;

export interface ConfigObject {
  [key: string]: ConfigValue;
}

export type ConfigArray = ConfigValue[];

export interface FullConfig {
  [key: string]: ConfigValue;
}

export interface SecurityRule {
  path: string;
  minValue?: number;
  maxValue?: number;
  allowedValues?: ConfigValue[];
  required?: boolean;
  description?: string;
}

export interface ConfigDiff {
  path: string;
  oldValue: ConfigValue | undefined;
  newValue: ConfigValue | undefined;
  operation: 'added' | 'removed' | 'modified';
}

export interface DiffResult {
  from: string;
  to: string;
  changes: ConfigDiff[];
}

export interface ConfigSnapshot {
  id: string;
  name: string;
  timestamp: string;
  config: FullConfig;
  context?: string;
}

export interface ImportResult {
  success: boolean;
  applied: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  changes: ConfigDiff[];
}

export type ContextType = 'production' | 'development' | 'emergency' | 'learning';
