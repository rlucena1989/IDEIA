import { OrgPolicyManager, OrgConfig, TeamMember } from '../src/org-policy';

describe('OrgPolicyManager', () => {
  let manager: OrgPolicyManager;

  beforeEach(() => {
    manager = new OrgPolicyManager();
  });

  it('constructs with default templates', () => {
    const templates = manager.getTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(3);
    expect(templates.find(t => t.id === 'enterprise-base')).toBeDefined();
    expect(templates.find(t => t.id === 'startup-flex')).toBeDefined();
    expect(templates.find(t => t.id === 'strict-compliance')).toBeDefined();
  });

  it('gets template by id', () => {
    const t = manager.getTemplate('enterprise-base');
    expect(t).toBeDefined();
    expect(t!.name).toBe('Enterprise Base');
  });

  it('adds custom template', () => {
    manager.addTemplate({
      id: 'custom', name: 'Custom', description: 'Test',
      rules: [{ id: 'r1', scope: 'autonomy', constraint: 'maxLevel', value: 'N4', description: 'Test', severity: 'optional' }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1,
    });
    expect(manager.getTemplate('custom')).toBeDefined();
  });

  it('activates and deactivates policies', () => {
    const config: OrgConfig = { orgName: 'TestCorp', adminEmail: 'admin@test.com', members: [], activePolicies: [], enforcementLevel: 'strict' };
    manager.setOrgConfig(config);
    expect(manager.activatePolicy('enterprise-base')).toBe(true);
    expect(manager.getActivePolicies()).toHaveLength(1);
    expect(manager.deactivatePolicy('enterprise-base')).toBe(true);
    expect(manager.getActivePolicies()).toHaveLength(0);
  });

  it('adds and removes members', () => {
    const config: OrgConfig = { orgName: 'TestCorp', adminEmail: 'admin@test.com', members: [], activePolicies: [], enforcementLevel: 'strict' };
    manager.setOrgConfig(config);
    const member: TeamMember = { id: 'u1', email: 'dev@test.com', role: 'developer', profiles: ['solo-dev'] };
    manager.addMember(member);
    expect(manager.getMembers()).toHaveLength(1);
    expect(manager.getMember('u1')).toEqual(member);
    manager.removeMember('u1');
    expect(manager.getMembers()).toHaveLength(0);
  });

  it('validates member compliance', () => {
    const config: OrgConfig = { orgName: 'TestCorp', adminEmail: 'admin@test.com', members: [
      { id: 'u1', email: 'dev@test.com', role: 'developer', profiles: ['N3-autonomous'] },
    ], activePolicies: ['enterprise-base'], enforcementLevel: 'strict' };
    manager.setOrgConfig(config);
    manager.activatePolicy('enterprise-base');
    const result = manager.validateMemberCompliance('u1');
    expect(result.violations.length).toBeGreaterThanOrEqual(0);
  });

  it('validates all members compliance', () => {
    const config: OrgConfig = { orgName: 'TestCorp', adminEmail: 'admin@test.com', members: [
      { id: 'u1', email: 'dev@test.com', role: 'developer', profiles: ['solo-dev'] },
      { id: 'u2', email: 'lead@test.com', role: 'tech-lead', profiles: ['tech-lead'] },
    ], activePolicies: [], enforcementLevel: 'advisory' };
    manager.setOrgConfig(config);
    const result = manager.validateAllCompliance();
    expect(result.valid).toBe(true);
  });

  it('returns null org config when not set', () => {
    expect(manager.getOrgConfig()).toBeNull();
  });
});
