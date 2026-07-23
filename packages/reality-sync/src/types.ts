export interface SyncEvent {
  type: 'package:changed' | 'package:added' | 'package:removed'
       | 'file:created' | 'file:modified' | 'file:deleted'
       | 'gap:resolved' | 'test:changed' | 'doc:changed';
  path: string;
  timestamp: number;
}

export interface SyncResult {
  ok: boolean;
  actions: string[];
  errors: string[];
  durationMs: number;
}

export interface ManifestSection {
  name: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface FixAction {
  id: string;
  type: 'file:create' | 'file:write' | 'file:delete' | 'shell:exec' | 'config:update';
  target: string;
  description: string;
  payload: string | Record<string, unknown>;
  risk: 'low' | 'medium' | 'high';
}

export interface FixPlan {
  id: string;
  actions: FixAction[];
  description: string;
  createdAt: number;
}

export interface ScanResult {
  total: number;
  fixable: number;
  unfixable: number;
  autoFixable: { id: string; severity: string; description: string; category: string; autoFixable: boolean; autoFix?: FixAction[] }[];
  requiresHuman: { id: string; severity: string; description: string; category: string; autoFixable: boolean }[];
}

export interface InitiativeReport {
  timestamp: number;
  scanned: number;
  fixed: number;
  failed: number;
  skipped: number;
  details: { id: string; status: 'fixed' | 'failed' | 'skipped'; message: string }[];
}

export interface SyncConfig {
  workspaceRoot: string;
  docsDir: string;
  packagesDir: string;
  manifestPath: string;
  gapsPath: string;
  registryPath: string;
  watchPaths: string[];
  ignorePatterns: string[];
}
