export type AgentRole = 'admin' | 'dev' | 'reviewer' | 'ai-agent' | 'observer';
export type Permission = 'read' | 'write' | 'delete' | 'execute' | 'admin';

export interface RoleDefinition {
  role: string;
  permissions: Permission[];
  resourcePatterns: string[];
  maxConcurrency: number;
  requiresApproval: boolean;
  description: string;
}

export interface IdentityCheckRequest {
  role: AgentRole | string;
  action: string;
  resource?: string;
}

export interface IdentityCheckResult {
  allowed: boolean;
  role: string;
  action: string;
  resource?: string;
  reason: string;
  requiredRole?: string;
}
