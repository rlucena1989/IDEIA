import { describe, it, expect } from '@jest/globals';
import { PathValidator } from '../../packages/scope-isolation/src/scope-isolation';
import path from 'node:path';

describe('Chaos: Path Traversal', () => {
  const allowedPaths = {
    selfSpace: [path.resolve('/home/ideia')],
    projectSpace: [path.resolve('/projects/myapp')],
  };

  function makeValidator(): PathValidator {
    return new PathValidator(allowedPaths);
  }

  it('should block self scope from accessing project space', () => {
    const validator = makeValidator();
    const projectFile = '/projects/myapp/src/secret.ts';
    const result = validator.resolvePath('self', projectFile);
    expect(result.blocked).toBe(true);
    expect(result.crossScope).toBe(true);
    expect(result.reason).toContain('Self-scope attempted to access project space');
  });

  it('should block project scope from accessing self space', () => {
    const validator = makeValidator();
    const selfFile = '/home/ideia/config.json';
    const result = validator.resolvePath('project', selfFile);
    expect(result.blocked).toBe(true);
    expect(result.crossScope).toBe(true);
    expect(result.reason).toContain('Project-scope attempted to access self space');
  });

  it('should block self scope traversal into project space via ..', () => {
    const validator = makeValidator();
    const traversed = path.resolve('/home/ideia/../../../projects/myapp/src/index.ts');
    const result = validator.resolvePath('self', traversed);
    expect(result.blocked).toBe(true);
    expect(result.crossScope).toBe(true);
  });

  it('should block project scope traversal into self space via ..', () => {
    const validator = makeValidator();
    const traversed = path.resolve('/projects/myapp/../../home/ideia/secrets.json');
    const result = validator.resolvePath('project', traversed);
    expect(result.blocked).toBe(true);
    expect(result.crossScope).toBe(true);
  });

  it('should allow valid path within self scope', () => {
    const validator = makeValidator();
    const result = validator.resolvePath('self', '/home/ideia/source.ts');
    expect(result.blocked).toBe(false);
    expect(result.crossScope).toBe(false);
  });

  it('should allow valid path within project scope', () => {
    const validator = makeValidator();
    const result = validator.resolvePath('project', '/projects/myapp/src/index.ts');
    expect(result.blocked).toBe(false);
    expect(result.crossScope).toBe(false);
  });

  it('should throw ScopeViolationError for blocked cross-scope paths', () => {
    const validator = makeValidator();
    expect(() => validator.resolvePathOrThrow('self', '/projects/myapp/data.db')).toThrow();
  });

  it('should return allowed path lists', () => {
    const validator = makeValidator();
    const selfList = validator.getAllowedList('self');
    expect(selfList.length).toBeGreaterThanOrEqual(1);
    expect(selfList[0]).toEqual(path.resolve('/home/ideia'));
    const projectList = validator.getAllowedList('project');
    expect(projectList.length).toBeGreaterThanOrEqual(1);
    expect(projectList[0]).toEqual(path.resolve('/projects/myapp'));
  });

  it('should detect path within self scope correctly', () => {
    const validator = makeValidator();
    expect(validator.isWithinScope('self', '/home/ideia/test.ts')).toBe(true);
    expect(validator.isWithinScope('self', '/projects/myapp/test.ts')).toBe(false);
  });

  it('should detect path within project scope correctly', () => {
    const validator = makeValidator();
    expect(validator.isWithinScope('project', '/projects/myapp/test.ts')).toBe(true);
    expect(validator.isWithinScope('project', '/home/ideia/test.ts')).toBe(false);
  });
});
