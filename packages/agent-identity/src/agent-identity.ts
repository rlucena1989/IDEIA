import { AgentRole, IdentityCheckRequest, IdentityCheckResult, Permission, RoleDefinition } from './types';
import { createLogger } from '@ideia/logger';

const ACTION_PERMISSION_MAP: Record<string, Permission> = {
  'file.read': 'read',
  'file.write': 'write',
  'file.delete': 'delete',
  'file.rename': 'write',
  'shell.exec': 'execute',
  'policy.change': 'admin',
  'user.create': 'admin',
  'agent.run': 'execute',
  'config.read': 'read',
  'config.write': 'write',
  'audit.read': 'read',
  'deploy.run': 'execute',
};

const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  admin: {
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'execute', 'admin'],
    resourcePatterns: ['*'],
    maxConcurrency: 10,
    requiresApproval: false,
    description: 'Full access to all resources and operations',
  },
  dev: {
    role: 'dev',
    permissions: ['read', 'write'],
    resourcePatterns: ['src/**', 'packages/**', 'tests/**', 'docs/**'],
    maxConcurrency: 3,
    requiresApproval: false,
    description: 'Can read and write source code and documentation',
  },
  reviewer: {
    role: 'reviewer',
    permissions: ['read'],
    resourcePatterns: ['*'],
    maxConcurrency: 5,
    requiresApproval: false,
    description: 'Read-only access to review code and policies',
  },
  'ai-agent': {
    role: 'ai-agent',
    permissions: ['read', 'write'],
    resourcePatterns: ['src/**', 'packages/**', '**/*.test.ts', 'docs/**'],
    maxConcurrency: 2,
    requiresApproval: true,
    description: 'AI agent with limited write access requiring approval',
  },
  observer: {
    role: 'observer',
    permissions: ['read'],
    resourcePatterns: ['.ai/**', 'README.md'],
    maxConcurrency: 1,
    requiresApproval: false,
    description: 'Can only read AI context files',
  },
};

export class AgentIdentity {
  private roles: Map<string, RoleDefinition>;

  constructor(customRoles?: Record<string, RoleDefinition>) {
    this.roles = new Map(Object.entries({ ...DEFAULT_ROLES, ...customRoles }));
  }

  check(request: IdentityCheckRequest): IdentityCheckResult {
    const role = this.roles.get(request.role);
    if (!role) {
      return {
        allowed: false,
        role: request.role,
        action: request.action,
        resource: request.resource,
        reason: `Unknown role: ${request.role}. Available roles: ${Array.from(this.roles.keys()).join(', ')}`,
      };
    }

    const requiredPermission = ACTION_PERMISSION_MAP[request.action] || 'read';
    const hasPermission = role.permissions.includes(requiredPermission);
    const hasPattern = role.resourcePatterns.some(p => p === '*' || this.matchPattern(p, request.resource || ''));

    const allowed = hasPermission && (hasPattern || !request.resource);
    const reasons: string[] = [];

    if (!hasPermission) {
      reasons.push(`Role '${request.role}' lacks '${requiredPermission}' permission needed for '${request.action}'`);
    }
    if (request.resource && !hasPattern) {
      reasons.push(`Resource '${request.resource}' does not match allowed patterns for '${request.role}'`);
    }

    return {
      allowed,
      role: request.role,
      action: request.action,
      resource: request.resource,
      reason: allowed
        ? `Allowed: ${request.role} can ${request.action}${request.resource ? ` on ${request.resource}` : ''}`
        : `Blocked: ${reasons.join('; ')}`,
      requiredRole: !hasPermission ? this.findRoleWithPermission(requiredPermission) : undefined,
    };
  }

  getRole(roleName: string): RoleDefinition | undefined {
    return this.roles.get(roleName);
  }

  listRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  registerRole(role: RoleDefinition): void {
    this.roles.set(role.role, role);
  }

  private matchPattern(pattern: string, resource: string): boolean {
    const regexStr = '^' + pattern
      .replace(/\*\*/g, '___GLOBSTAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___GLOBSTAR___/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(regexStr).test(resource);
  }

  private findRoleWithPermission(permission: Permission): string | undefined {
    const entry = Array.from(this.roles.entries()).find(([, def]) => def.permissions.includes(permission));
    return entry?.[1].role;
  }
}

export function createAgentIdentity(customRoles?: Record<string, RoleDefinition>): AgentIdentity {
  return new AgentIdentity(customRoles);
}
