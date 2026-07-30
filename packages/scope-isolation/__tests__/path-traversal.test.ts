import { describe, it, expect } from '@jest/globals';
import { PathValidator as ScopePathValidator } from '../src/path-validator';
import { PathValidator } from '../src/scope-isolation';

describe('path-traversal', () => {
  describe('ScopePathValidator traversal prevention', () => {
    it('blocks traversal with ../etc/passwd from self scope', () => {
      const result = ScopePathValidator.validate('read', '../../etc/passwd', 'self');
      expect(result.allowed).toBe(false);
    });

    it('blocks traversal with ..\\..\\Windows\\System32 from self scope', () => {
      const result = ScopePathValidator.validate('read', '..\\..\\Windows\\System32', 'self');
      expect(result.allowed).toBe(false);
    });

    it('allows normal path within project scope from project', () => {
      const result = ScopePathValidator.validate('read', '/project/src/index.ts', 'project');
      expect(result.allowed).toBe(true);
    });

    it('allows read of project scope from self', () => {
      const result = ScopePathValidator.validate('read', '/project/src/index.ts', 'self');
      expect(result.allowed).toBe(true);
    });

    it('blocks traversal with no .. in clean path', () => {
      expect(ScopePathValidator.hasPathTraversal('/project/file.ts')).toBe(false);
      expect(ScopePathValidator.hasPathTraversal('../../etc/passwd')).toBe(true);
      expect(ScopePathValidator.hasPathTraversal('..\\..\\Windows\\System32')).toBe(true);
    });
  });

  describe('PathValidator (original) traversal prevention', () => {
    it('blocks cross-scope access from self to project', () => {
      const validator = new PathValidator({
        selfSpace: ['/home/ideia'],
        projectSpace: ['/projects'],
      });
      const result = validator.resolvePath('self', '/projects/some-file');
      expect(result.crossScope).toBe(true);
      expect(result.blocked).toBe(true);
    });

    it('allows same-scope access', () => {
      const validator = new PathValidator({
        selfSpace: ['/home/ideia'],
        projectSpace: ['/projects'],
      });
      const result = validator.resolvePath('self', '/home/ideia/config.json');
      expect(result.crossScope).toBe(false);
      expect(result.blocked).toBe(false);
    });
  });
});
