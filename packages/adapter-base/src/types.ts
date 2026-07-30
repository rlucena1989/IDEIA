export interface InitResult {
  success: boolean;
  files: string[];
}

export interface CommandResult {
  success: boolean;
  output: string;
}

export interface QualityGateResult {
  passed: boolean;
  score: number;
  issues: string[];
}

export interface AdapterConfig {
  projectRoot?: string;
}

export interface AdapterMetadata {
  language: string;
  experimental: boolean;
  version: string;
  commands: Array<{ id: string; label: string; description: string }>;
}
