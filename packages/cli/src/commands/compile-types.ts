export type Target = typeof TARGETS[number];

export const TARGETS = [
  'claude', 'cursor', 'copilot', 'windsurf', 'cline',
  'gemini', 'continue', 'zed', 'amazon-q', 'codex',
  'aider', 'cursor-mdc', 'github-actions',
] as const;

export interface LawsConfig {
  architecture?: string;
  defensive_programming?: boolean;
  contract_first?: boolean;
  rules?: string[];
  path_scoped_rules?: Record<string, string[]>;
}

export interface ProjectManifest {
  project?: { name?: string };
  backend?: { framework?: string };
  frontend?: { framework?: string };
  quality?: { coverage_min?: number; unit_tests?: boolean };
}

interface PathScopedOutput {
  path: string;
  content: string;
}
