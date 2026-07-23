import { AgentIdentity } from '../src/agent-identity';

describe('AgentIdentity', () => {
  it('should allow admin all actions', () => {
    const identity = new AgentIdentity();
    expect(identity.check({ role: 'admin', action: 'file.delete', resource: 'src/main.ts' }).allowed).toBe(true);
    expect(identity.check({ role: 'admin', action: 'policy.change' }).allowed).toBe(true);
    expect(identity.check({ role: 'admin', action: 'shell.exec' }).allowed).toBe(true);
  });

  it('should block reviewer writes', () => {
    const identity = new AgentIdentity();
    const result = identity.check({ role: 'reviewer', action: 'file.write', resource: 'src/main.ts' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('lacks');
  });

  it('should allow reviewer reads', () => {
    const identity = new AgentIdentity();
    expect(identity.check({ role: 'reviewer', action: 'file.read', resource: 'src/main.ts' }).allowed).toBe(true);
  });

  it('should require approval for ai-agent', () => {
    const identity = new AgentIdentity();
    const role = identity.getRole('ai-agent');
    expect(role?.requiresApproval).toBe(true);
  });

  it('should limit dev to read/write', () => {
    const identity = new AgentIdentity();
    expect(identity.check({ role: 'dev', action: 'file.read' }).allowed).toBe(true);
    expect(identity.check({ role: 'dev', action: 'file.write' }).allowed).toBe(true);
    expect(identity.check({ role: 'dev', action: 'file.delete' }).allowed).toBe(false);
    expect(identity.check({ role: 'dev', action: 'policy.change' }).allowed).toBe(false);
  });

  it('should reject unknown roles', () => {
    const identity = new AgentIdentity();
    const result = identity.check({ role: 'hacker', action: 'file.read' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Unknown role');
  });

  it('should list all roles', () => {
    const identity = new AgentIdentity();
    const roles = identity.listRoles();
    expect(roles).toHaveLength(5);
    expect(roles.map(r => r.role)).toContain('admin');
    expect(roles.map(r => r.role)).toContain('dev');
  });

  it('should register custom roles', () => {
    const identity = new AgentIdentity();
    identity.registerRole({
      role: 'custom',
      permissions: ['read'],
      resourcePatterns: ['custom/**'],
      maxConcurrency: 1,
      requiresApproval: false,
      description: 'Custom role',
    });
    expect(identity.getRole('custom')).toBeDefined();
    expect(identity.check({ role: 'custom', action: 'file.read', resource: 'custom/file.txt' }).allowed).toBe(true);
  });

  it('should block resource outside allowed patterns', () => {
    const identity = new AgentIdentity();
    const result = identity.check({ role: 'ai-agent', action: 'file.read', resource: '/etc/passwd' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('does not match');
  });

  it('should suggest required role', () => {
    const identity = new AgentIdentity();
    const result = identity.check({ role: 'observer', action: 'file.delete' });
    expect(result.allowed).toBe(false);
    expect(result.requiredRole).toBeDefined();
  });
});
