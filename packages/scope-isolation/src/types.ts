export type Scope = 'self' | 'project' | 'system';

export interface AllowedPaths {
  selfSpace: string[];
  projectSpace: string[];
}

export type CrossSpaceAccess = 'block' | 'allow-with-bypass';

export interface IsolationPolicyConfig {
  crossSpaceAccess: CrossSpaceAccess;
  bypassRequired: boolean;
  approvalLevel: string;
  dryRunFirst: boolean;
}

export interface ScopeViolationEvent {
  id: string;
  timestamp: string;
  fromScope: Scope;
  targetPath: string;
  resolvedPath: string;
  policyAction: 'blocked' | 'bypass-required' | 'allowed';
  approvalLevel?: string;
  reason: string;
}

export interface ScopeIsolationOptions {
  allowedPaths: AllowedPaths;
  policy?: IsolationPolicyConfig;
}

export interface ResolveResult {
  resolvedPath: string;
  crossScope: boolean;
  blocked: boolean;
  reason?: string;
}
