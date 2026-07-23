import { describe, it, expect } from '@jest/globals';
import { PathValidator, ScopeIsolation, ScopeViolationError as _ScopeViolationError } from '../src/scope-isolation';
import { IsolationPolicy } from '../src/isolation-policy';

describe('scope-isolation', () => {
  it('PathValidator can be constructed with allowed paths', () => {
    const validator = new PathValidator({ selfSpace: ['/home/ideia'], projectSpace: ['/projects'] });
    expect(validator).toBeDefined();
  });

  it('PathValidator.resolvePath returns result for valid path', () => {
    const validator = new PathValidator({ selfSpace: ['/home/ideia'], projectSpace: ['/project'] });
    const result = validator.resolvePath('self', '/some/path');
    expect(result).toBeDefined();
    expect(typeof result.resolvedPath).toBe('string');
  });

  it('ScopeIsolation can be constructed', () => {
    const si = new ScopeIsolation({ selfSpace: ['/home/ideia'], projectSpace: ['/project'] });
    expect(si).toBeDefined();
  });

  it('IsolationPolicy can be constructed with no args', () => {
    const policy = new IsolationPolicy();
    expect(policy).toBeDefined();
    expect(policy.crossSpaceAccess).toBe('block');
  });
});
