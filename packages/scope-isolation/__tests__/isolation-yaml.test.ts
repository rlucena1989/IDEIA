import { describe, it, expect } from '@jest/globals';
import { PolicyParser, ParsedIsolationPolicy } from '../src/policy-parser';
import { PolicyEnforcer } from '../src/policy-enforcer';

describe('isolation-yaml', () => {
  describe('PolicyParser.parseIsolationYaml', () => {
    it('parses valid isolation yaml with all scopes', () => {
      const yaml = `
version: "1.0"
scopes:
  self:
    allow_read: [self, project]
    allow_write: [self]
    deny_read: []
    deny_write: [project, system]
  project:
    allow_read: [project]
    allow_write: [project, self]
    deny_read: [system]
    deny_write: [system]
  system:
    allow_read: [self, project, system]
    allow_write: [system]
    deny_read: []
    deny_write: [self, project]
`;
      const parsed = PolicyParser.parseIsolationYaml(yaml);
      expect(parsed.version).toBe('1.0');
      expect(parsed.scopes.has('self')).toBe(true);
      expect(parsed.scopes.has('project')).toBe(true);
      expect(parsed.scopes.has('system')).toBe(true);
    });

    it('parses with minimal config', () => {
      const yaml = `
version: "1.0"
scopes:
  self:
    allow_read: [self]
    allow_write: [self]
  project:
    allow_read: [project]
    allow_write: [project]
`;
      const parsed = PolicyParser.parseIsolationYaml(yaml);
      expect(parsed.version).toBe('1.0');
      expect(parsed.scopes.has('self')).toBe(true);
      expect(parsed.scopes.has('project')).toBe(true);
    });

    it('throws on invalid yaml format', () => {
      expect(() => PolicyParser.parseIsolationYaml('not: valid: yaml: [[[')).toThrow();
    });

    it('parses empty scopes gracefully', () => {
      const yaml = `version: "1.0"\nscopes: {}`;
      const parsed = PolicyParser.parseIsolationYaml(yaml);
      expect(parsed.version).toBe('1.0');
      expect(parsed.scopes.size).toBe(0);
    });
  });

  describe('PolicyParser.isOperationAllowed', () => {
    let policy: ParsedIsolationPolicy;

    beforeEach(() => {
      policy = PolicyParser.parseIsolationYaml(`
version: "1.0"
scopes:
  self:
    allow_read: [self, project]
    allow_write: [self]
    deny_read: []
    deny_write: [project, system]
  project:
    allow_read: [project]
    allow_write: [project, self]
    deny_read: [system]
    deny_write: [system]
  system:
    allow_read: [self, project, system]
    allow_write: [system]
    deny_read: []
    deny_write: [self, project]
`);
    });

    it('allows self reading self (self allows read from self)', () => {
      expect(PolicyParser.isOperationAllowed(policy, 'read', 'self', 'self')).toBe(true);
    });

    it('allows project reading project', () => {
      expect(PolicyParser.isOperationAllowed(policy, 'read', 'project', 'project')).toBe(true);
    });

    it('allows project writing to project', () => {
      expect(PolicyParser.isOperationAllowed(policy, 'write', 'project', 'project')).toBe(true);
    });

    it('allows project reading system (system allows read from project)', () => {
      expect(PolicyParser.isOperationAllowed(policy, 'read', 'project', 'system')).toBe(true);
    });

    it('blocks system reading project (project allow_read only [project])', () => {
      expect(PolicyParser.isOperationAllowed(policy, 'read', 'system', 'project')).toBe(false);
    });

    it('allows system writing to system', () => {
      expect(PolicyParser.isOperationAllowed(policy, 'write', 'system', 'system')).toBe(true);
    });

    it('blocks system reading self (self allow_read only [self, project])', () => {
      expect(PolicyParser.isOperationAllowed(policy, 'read', 'system', 'self')).toBe(false);
    });

    it('blocks system writing to project (project deny_write has system)', () => {
      expect(PolicyParser.isOperationAllowed(policy, 'write', 'system', 'project')).toBe(false);
    });
  });

  describe('PolicyEnforcer with YAML policy', () => {
    it('enforces deny based on yaml policy', () => {
      const yaml = `
version: "1.0"
scopes:
  self:
    allow_read: [self]
    allow_write: [self]
    deny_read: [project]
    deny_write: [project, system]
  project:
    allow_read: [project]
    allow_write: [project]
    deny_read: [self]
    deny_write: [self, system]
`;
      const parsed = PolicyParser.parseIsolationYaml(yaml);
      const enforcer = new PolicyEnforcer();
      enforcer.load(parsed);

      const denied = enforcer.enforce('read', '/project/file.ts', 'self');
      expect(denied.allowed).toBe(false);

      const allowed = enforcer.enforce('read', '/.ideia/config.json', 'self');
      expect(allowed.allowed).toBe(true);
    });

    it('isLoaded returns true after load', () => {
      const parsed = PolicyParser.parseIsolationYaml(`version: "1.0"\nscopes: {}`);
      const enforcer = new PolicyEnforcer();
      expect(enforcer.isLoaded()).toBe(false);
      enforcer.load(parsed);
      expect(enforcer.isLoaded()).toBe(true);
    });
  });

  describe('PolicyParser.generateDefaultYaml', () => {
    it('generates valid default yaml', () => {
      const yaml = PolicyParser.generateDefaultYaml();
      expect(yaml).toContain('version');
      expect(yaml).toContain('scopes');
      expect(yaml).toContain('self');
      expect(yaml).toContain('project');
      expect(yaml).toContain('system');
    });

    it('generated yaml can be re-parsed', () => {
      const yaml = PolicyParser.generateDefaultYaml();
      const parsed = PolicyParser.parseIsolationYaml(yaml);
      expect(parsed.version).toBe('1.0');
      expect(parsed.scopes.size).toBe(3);
    });

    it('default yaml has correct structure', () => {
      const yaml = PolicyParser.generateDefaultYaml();
      const parsed = PolicyParser.parseIsolationYaml(yaml);
      expect(parsed.scopes.has('self')).toBe(true);
      expect(parsed.scopes.has('project')).toBe(true);
      expect(parsed.scopes.has('system')).toBe(true);
    });

    it('default yaml self scope allows self reading self', () => {
      const yaml = PolicyParser.generateDefaultYaml();
      const parsed = PolicyParser.parseIsolationYaml(yaml);
      expect(PolicyParser.isOperationAllowed(parsed, 'read', 'self', 'self')).toBe(true);
    });

    it('default yaml system scope rules', () => {
      const yaml = PolicyParser.generateDefaultYaml();
      const parsed = PolicyParser.parseIsolationYaml(yaml);
      expect(PolicyParser.isOperationAllowed(parsed, 'read', 'self', 'system')).toBe(true);
      expect(PolicyParser.isOperationAllowed(parsed, 'read', 'self', 'self')).toBe(true);
      expect(PolicyParser.isOperationAllowed(parsed, 'write', 'self', 'self')).toBe(true);
      expect(PolicyParser.isOperationAllowed(parsed, 'write', 'self', 'project')).toBe(true);
    });
  });
});
