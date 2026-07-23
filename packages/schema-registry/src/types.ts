export type SchemaFormat = 'zod' | 'yaml' | 'json' | 'typescript';
export type SchemaStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type CompatibilityMode = 'backward' | 'forward' | 'full' | 'none';

export interface SchemaEntry {
  id: string;
  name: string;
  version: number;
  format: SchemaFormat;
  content: string;
  status: SchemaStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  compatibility?: CompatibilityMode;
}

export interface SchemaVersionDiff {
  schemaName: string;
  oldVersion: number;
  newVersion: number;
  changes: string[];
  breaking: boolean;
}

export interface BreakingChange {
  type: string;
  field: string;
  description: string;
  severity: 'breaking' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  fieldErrors?: Record<string, string[]>;
}

export interface CompatibilityResult {
  compatible: boolean;
  mode: CompatibilityMode;
  changes: BreakingChange[];
  details?: string;
}

export interface SchemaMetadata {
  name: string;
  latestVersion: number;
  totalVersions: number;
  status: SchemaStatus;
  format: SchemaFormat;
  createdAt: string;
  tags: string[];
}
