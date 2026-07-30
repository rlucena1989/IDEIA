import { evaluatePolicy } from '@ideia/policy-engine';
import { createLogger } from '@ideia/logger';

const log = createLogger('rbac');

export type RBACRole = 'admin' | 'developer' | 'viewer' | string;
export type RBACPermission = 'read' | 'write' | 'delete' | 'admin';

export const RBAC_HIERARCHY: Record<string, RBACPermission[]> = {
  admin: ['read', 'write', 'delete', 'admin'],
  developer: ['read', 'write'],
  viewer: ['read'],
};

const PERMISSION_WEIGHTS: Record<RBACPermission, number> = {
  read: 1,
  write: 2,
  delete: 3,
  admin: 4,
};

export interface ABACRule {
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  conditions: ABACCondition[];
  priority: number;
}

export interface ABACCondition {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches';
  value: unknown;
}

export interface ABACContext {
  user: {
    id: string;
    roles: string[];
    department?: string;
    clearance?: number;
    location?: string;
    team?: string[];
  };
  resource: {
    type: string;
    owner?: string;
    classification?: string;
    tags?: string[];
    project?: string;
    environment?: string;
  };
  environment: {
    time?: Date;
    ipAddress?: string;
    userAgent?: string;
    mfaVerified?: boolean;
    riskScore?: number;
  };
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  matchedRule?: string;
  requiredPermission?: RBACPermission;
}

function _getRoleWeight(role: RBACRole): number {
  const basePermissions = RBAC_HIERARCHY[role];
  if (basePermissions) {
    return Math.max(...basePermissions.map(p => PERMISSION_WEIGHTS[p]));
  }
  return 0;
}

export function checkPermission(
  role: RBACRole | RBACRole[],
  resource: string,
  action: RBACPermission
): PermissionCheckResult {
  const roles = Array.isArray(role) ? role : [role];
  const resourceAction = `${resource}.${action}`;

  const policyResult = evaluatePolicy({
    actionType: resourceAction,
    resource,
    riskLevel: action === 'admin' || action === 'delete' ? 'high' : 'medium',
  });

  if (policyResult.decision === 'block') {
    log.warn('Policy blocked', { role, resource, action, reason: policyResult.reason });
    return { allowed: false, reason: policyResult.reason };
  }

  for (const r of roles) {
    const permissions = RBAC_HIERARCHY[r];
    if (!permissions) {
      log.warn('Unknown role', { role: r });
      continue;
    }

    const actionWeight = PERMISSION_WEIGHTS[action];
    const roleMaxWeight = Math.max(...permissions.map(p => PERMISSION_WEIGHTS[p]));

    if (actionWeight <= roleMaxWeight && permissions.includes(action)) {
      return {
        allowed: true,
        reason: `Role '${r}' has '${action}' permission on '${resource}'`,
        requiredPermission: action,
      };
    }
  }

  return {
    allowed: false,
    reason: `None of the roles [${roles.join(', ')}] have '${action}' permission on '${resource}'`,
    requiredPermission: action,
  };
}

function evaluateCondition(condition: ABACCondition, context: ABACContext): boolean {
  const value = resolveAttribute(condition.attribute, context);
  if (value === undefined) return false;

  switch (condition.operator) {
    case 'eq':
      return value === condition.value;
    case 'neq':
      return value !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value);
    case 'nin':
      return Array.isArray(condition.value) && !condition.value.includes(value);
    case 'gt':
      return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
    case 'gte':
      return typeof value === 'number' && typeof condition.value === 'number' && value >= condition.value;
    case 'lt':
      return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
    case 'lte':
      return typeof value === 'number' && typeof condition.value === 'number' && value <= condition.value;
    case 'contains':
      return typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value as string);
    case 'matches':
      return typeof value === 'string' && typeof condition.value === 'string' && new RegExp(condition.value as string).test(value);
    default:
      return false;
  }
}

function resolveAttribute(attribute: string, context: ABACContext): unknown {
  const parts = attribute.split('.');
  let current: Record<string, unknown> = context as unknown as Record<string, unknown>;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part] as Record<string, unknown>;
    } else {
      return undefined;
    }
  }

  return current;
}

export function evaluateABAC(
  rules: ABACRule[],
  context: ABACContext,
  defaultEffect: 'allow' | 'deny' = 'deny'
): PermissionCheckResult {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    const allConditionsMet = rule.conditions.every(cond => evaluateCondition(cond, context));
    if (allConditionsMet) {
      const allowed = rule.effect === 'allow';
      log.info('ABAC rule matched', {
        rule: rule.name,
        effect: rule.effect,
      });
      return {
        allowed,
        reason: `ABAC rule '${rule.name}': ${rule.effect}`,
        matchedRule: rule.name,
      };
    }
  }

  return {
    allowed: defaultEffect === 'allow',
    reason: `No ABAC rules matched, default: ${defaultEffect}`,
  };
}

export function checkPermissionWithABAC(
  role: RBACRole | RBACRole[],
  resource: string,
  action: RBACPermission,
  abacRules: ABACRule[],
  context: ABACContext
): PermissionCheckResult {
  const abacResult = evaluateABAC(abacRules, context);
  if (abacResult.matchedRule) {
    return abacResult;
  }

  return checkPermission(role, resource, action);
}
