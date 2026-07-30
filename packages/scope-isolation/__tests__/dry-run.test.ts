import { describe, it, expect } from '@jest/globals';
import { ScopePolicy } from '../src/scope-policy';
import { PolicyEnforcer } from '../src/policy-enforcer';
import { PolicyParser } from '../src/policy-parser';

describe('dry-run', () => {
  it('ScopePolicy allows dry-run policy check without execution', () => {
    const policy = new ScopePolicy();
    const allowed = policy.isOperationAllowed('read', 'self', 'project');
    expect(allowed).toBe(true);
  });

  it('PolicyEnforcer simulates operation without executing', () => {
    const enforcer = new PolicyEnforcer();
    const result = enforcer.enforce('write', '/project/test.ts', 'self');
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('resolvedPath');
  });

  it('PolicyParser generates valid default yaml', () => {
    const yaml = PolicyParser.generateDefaultYaml();
    expect(yaml).toContain('version');
    expect(yaml).toContain('scopes');
    const parsed = PolicyParser.parse(yaml);
    expect(parsed.version).toBe('1.0');
    expect(parsed.scopes.has('self')).toBe(true);
    expect(parsed.scopes.has('project')).toBe(true);
    expect(parsed.scopes.has('system')).toBe(true);
  });

  it('PolicyEnforcer reports not loaded before load', () => {
    const enforcer = new PolicyEnforcer();
    expect(enforcer.isLoaded()).toBe(false);
  });
});
