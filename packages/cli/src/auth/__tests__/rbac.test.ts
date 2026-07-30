import { evaluatePolicy } from '@ideia/policy-engine';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@ideia/policy-engine', () => ({
  evaluatePolicy: jest.fn().mockReturnValue({ decision: 'allow', reason: 'Policy allowed' }),
}));

import {
  RBACRole,
  RBACPermission,
  ABACRule,
  ABACContext,
  RBAC_HIERARCHY,
  checkPermission,
  evaluateABAC,
  checkPermissionWithABAC,
} from '../rbac';

describe('Types', () => {
  describe('RBACRole', () => {
    it('includes standard roles', () => {
      const admin: RBACRole = 'admin';
      const dev: RBACRole = 'developer';
      const viewer: RBACRole = 'viewer';
      expect(admin).toBe('admin');
      expect(dev).toBe('developer');
      expect(viewer).toBe('viewer');
    });

    it('accepts custom roles as string', () => {
      const custom: RBACRole = 'custom_role';
      expect(custom).toBe('custom_role');
    });
  });

  describe('RBACPermission', () => {
    it('includes read, write, delete, admin', () => {
      const r: RBACPermission = 'read';
      const w: RBACPermission = 'write';
      const d: RBACPermission = 'delete';
      const a: RBACPermission = 'admin';
      expect(r).toBe('read');
      expect(w).toBe('write');
      expect(d).toBe('delete');
      expect(a).toBe('admin');
    });
  });
});

describe('RBAC_HIERARCHY', () => {
  it('admin has all permissions', () => {
    expect(RBAC_HIERARCHY.admin).toEqual(['read', 'write', 'delete', 'admin']);
  });

  it('developer has read and write', () => {
    expect(RBAC_HIERARCHY.developer).toEqual(['read', 'write']);
  });

  it('viewer has read only', () => {
    expect(RBAC_HIERARCHY.viewer).toEqual(['read']);
  });
});

describe('checkPermission', () => {
  beforeEach(() => {
    (evaluatePolicy as jest.Mock).mockReturnValue({ decision: 'allow', reason: 'Policy allowed' });
  });

  it('allows admin to delete any resource', () => {
    const result = checkPermission('admin', 'users', 'delete');
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('admin');
  });

  it('allows developer to write source', () => {
    const result = checkPermission('developer', 'source', 'write');
    expect(result.allowed).toBe(true);
  });

  it('allows viewer to read source', () => {
    const result = checkPermission('viewer', 'source', 'read');
    expect(result.allowed).toBe(true);
  });

  it('denies viewer write access', () => {
    const result = checkPermission('viewer', 'source', 'write');
    expect(result.allowed).toBe(false);
  });

  it('denies viewer delete access', () => {
    const result = checkPermission('viewer', 'source', 'delete');
    expect(result.allowed).toBe(false);
  });

  it('denies developer admin action', () => {
    const result = checkPermission('developer', 'config', 'admin');
    expect(result.allowed).toBe(false);
  });

  it('handles array of roles', () => {
    const result = checkPermission(['viewer', 'developer'], 'source', 'write');
    expect(result.allowed).toBe(true);
  });

  it('returns false for unknown role', () => {
    const result = checkPermission('unknown_role', 'resource', 'read');
    expect(result.allowed).toBe(false);
  });

  it('blocks when policy engine blocks', () => {
    (evaluatePolicy as jest.Mock).mockReturnValue({ decision: 'block', reason: 'Policy blocked due to risk' });
    const result = checkPermission('admin', 'production', 'delete');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('risk');
  });

  it('returns PermissionCheckResult with requiredPermission', () => {
    const result = checkPermission('viewer', 'resource', 'delete');
    expect(result.requiredPermission).toBe('delete');
  });
});

describe('ABACContext interface', () => {
  const ctx: ABACContext = {
    user: { id: 'u1', roles: ['developer'], department: 'eng', clearance: 3, location: 'us', team: ['alpha'] },
    resource: { type: 'document', owner: 'u1', classification: 'internal', tags: ['confidential'], project: 'ideia', environment: 'production' },
    environment: { time: new Date(), ipAddress: '10.0.0.1', userAgent: 'Mozilla', mfaVerified: true, riskScore: 0.1 },
  };

  it('holds user info', () => {
    expect(ctx.user.department).toBe('eng');
  });

  it('holds resource info', () => {
    expect(ctx.resource.type).toBe('document');
  });

  it('holds environment info', () => {
    expect(ctx.environment.mfaVerified).toBe(true);
  });
});

describe('evaluateABAC', () => {
  const baseContext: ABACContext = {
    user: { id: 'u1', roles: ['developer'], department: 'eng', clearance: 5 },
    resource: { type: 'document', classification: 'confidential' },
    environment: { time: new Date(), mfaVerified: true, riskScore: 0.1 },
  };

  it('allows when rule conditions match with allow effect', () => {
    const rules: ABACRule[] = [{
      name: 'allow-eng-dept',
      description: 'Engineering can access',
      effect: 'allow',
      conditions: [{ attribute: 'user.department', operator: 'eq', value: 'eng' }],
      priority: 10,
    }];
    const result = evaluateABAC(rules, baseContext);
    expect(result.allowed).toBe(true);
    expect(result.matchedRule).toBe('allow-eng-dept');
  });

  it('denies when rule conditions match with deny effect', () => {
    const rules: ABACRule[] = [{
      name: 'deny-external',
      description: 'Block external access',
      effect: 'deny',
      conditions: [{ attribute: 'resource.classification', operator: 'eq', value: 'confidential' }],
      priority: 10,
    }];
    const result = evaluateABAC(rules, baseContext);
    expect(result.allowed).toBe(false);
    expect(result.matchedRule).toBe('deny-external');
  });

  it('evaluates rules in priority order', () => {
    const rules: ABACRule[] = [
      {
        name: 'low-priority-allow',
        description: 'Low priority allow',
        effect: 'allow',
        conditions: [{ attribute: 'user.department', operator: 'eq', value: 'eng' }],
        priority: 1,
      },
      {
        name: 'high-priority-deny',
        description: 'High priority deny',
        effect: 'deny',
        conditions: [{ attribute: 'user.department', operator: 'eq', value: 'eng' }],
        priority: 100,
      },
    ];
    const result = evaluateABAC(rules, baseContext);
    expect(result.allowed).toBe(false);
    expect(result.matchedRule).toBe('high-priority-deny');
  });

  it('returns default deny when no rules match', () => {
    const rules: ABACRule[] = [{
      name: 'never-match',
      description: 'Wont match',
      effect: 'allow',
      conditions: [{ attribute: 'user.department', operator: 'eq', value: 'nonexistent' }],
      priority: 1,
    }];
    const result = evaluateABAC(rules, baseContext);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('default: deny');
  });

  it('returns default allow when configured and no rules match', () => {
    const result = evaluateABAC([], baseContext, 'allow');
    expect(result.allowed).toBe(true);
  });

  it('evaluates gt/gte/lt/lte operators', () => {
    const rules: ABACRule[] = [{
      name: 'clearance-check',
      description: 'Check clearance',
      effect: 'allow',
      conditions: [
        { attribute: 'user.clearance', operator: 'gte', value: 3 },
        { attribute: 'user.clearance', operator: 'lt', value: 10 },
      ],
      priority: 10,
    }];
    const result = evaluateABAC(rules, baseContext);
    expect(result.allowed).toBe(true);
  });

  it('evaluates contains operator', () => {
    const rules: ABACRule[] = [{
      name: 'team-check',
      description: 'Check team membership',
      effect: 'allow',
      conditions: [{ attribute: 'resource.type', operator: 'contains', value: 'doc' }],
      priority: 10,
    }];
    const result = evaluateABAC(rules, baseContext);
    expect(result.allowed).toBe(true);
  });

  it('evaluates matches operator with regex', () => {
    const rules: ABACRule[] = [{
      name: 'env-match',
      description: 'Match env pattern',
      effect: 'allow',
      conditions: [{ attribute: 'resource.classification', operator: 'matches', value: 'confid\\w+' }],
      priority: 10,
    }];
    const result = evaluateABAC(rules, baseContext);
    expect(result.allowed).toBe(true);
  });

  it('evaluates in/nin operators', () => {
    const ctx: ABACContext = {
      user: { id: 'u1', roles: ['developer'], department: 'eng', team: ['alpha', 'beta'] },
      resource: { type: 'doc', tags: ['internal'] },
      environment: {},
    };
    const rules: ABACRule[] = [
      {
        name: 'in-team',
        description: 'Team in list',
        effect: 'allow',
        conditions: [{ attribute: 'user.department', operator: 'in', value: ['eng', 'prod'] }],
        priority: 10,
      },
      {
        name: 'not-in-tags',
        description: 'Tag not in list',
        effect: 'deny',
        conditions: [{ attribute: 'resource.type', operator: 'nin', value: ['admin', 'system'] }],
        priority: 5,
      },
    ];
    const result = evaluateABAC(rules, ctx);
    expect(result.allowed).toBe(true);
    expect(result.matchedRule).toBe('in-team');
  });
});

describe('checkPermissionWithABAC', () => {
  const context: ABACContext = {
    user: { id: 'u1', roles: ['viewer'], department: 'eng', clearance: 2 },
    resource: { type: 'report', classification: 'internal' },
    environment: {},
  };

  beforeEach(() => {
    (evaluatePolicy as jest.Mock).mockReturnValue({ decision: 'allow', reason: 'Policy allowed' });
  });

  it('returns ABAC result when ABAC rules match', () => {
    const rules: ABACRule[] = [{
      name: 'eng-view',
      description: 'Eng can view',
      effect: 'allow',
      conditions: [{ attribute: 'user.department', operator: 'eq', value: 'eng' }],
      priority: 10,
    }];
    const result = checkPermissionWithABAC('viewer', 'report', 'read', rules, context);
    expect(result.allowed).toBe(true);
    expect(result.matchedRule).toBe('eng-view');
  });

  it('falls back to RBAC when ABAC rules do not match', () => {
    const rules: ABACRule[] = [{
      name: 'never-match',
      description: 'Never',
      effect: 'deny',
      conditions: [{ attribute: 'user.department', operator: 'eq', value: 'nope' }],
      priority: 10,
    }];
    const result = checkPermissionWithABAC('viewer', 'report', 'read', rules, context);
    expect(result.allowed).toBe(true);
    expect(result.matchedRule).toBeUndefined();
  });

  it('RBAC fallback denies when permission is insufficient', () => {
    const rules: ABACRule[] = [];
    const result = checkPermissionWithABAC('viewer', 'report', 'delete', rules, context);
    expect(result.allowed).toBe(false);
  });
});
