import { describe, it, expect } from '@jest/globals';
import { PathValidator as ScopePathValidator } from '../src/path-validator';
import { PathValidator } from '../src/scope-isolation';

describe('path-traversal-enhanced', () => {
  describe('ScopePathValidator path traversal prevention', () => {
    it('blocks simple traversal with ../', () => {
      expect(ScopePathValidator.validate('read', '../etc/passwd', 'self').allowed).toBe(false);
    });

    it('blocks deep traversal ../../../../', () => {
      expect(ScopePathValidator.validate('write', '../../../../etc/shadow', 'project').allowed).toBe(false);
    });

    it('blocks windows-style traversal with backslashes', () => {
      expect(ScopePathValidator.validate('read', '..\\..\\Windows\\System32\\cmd.exe', 'self').allowed).toBe(false);
    });

    it('blocks mixed traversal with ..\\/', () => {
      expect(ScopePathValidator.validate('read', '..\\/../etc/hosts', 'self').allowed).toBe(false);
    });

    it('allows encoded path without literal ..', () => {
      expect(ScopePathValidator.validate('read', 'safe/folder/file.ts', 'self').allowed).toBe(true);
    });

    it('blocks path with explicit .. in middle', () => {
      expect(ScopePathValidator.validate('read', 'safe/../../etc/passwd', 'self').allowed).toBe(false);
    });

    it('allows clean absolute path', () => {
      expect(ScopePathValidator.validate('read', '/home/ideia/file.ts', 'self').allowed).toBe(true);
    });

    it('allows clean relative path without dotdot', () => {
      expect(ScopePathValidator.validate('read', 'src/file.ts', 'self').allowed).toBe(true);
    });

    it('blocks write from self to system scope', () => {
      const result = ScopePathValidator.validate('write', '/node_modules/some-pkg', 'self');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('write');
    });

    it('allows self write to self scope', () => {
      const result = ScopePathValidator.validate('write', '/.ideia/config.json', 'self');
      expect(result.allowed).toBe(true);
    });

    it('blocks project write to system', () => {
      const result = ScopePathValidator.validate('write', '/node_modules/pkg', 'project');
      expect(result.allowed).toBe(false);
    });
  });

  describe('PathValidator (original) scope enforcement', () => {
    it('blocks self scope from writing to project', () => {
      const validator = new PathValidator({
        selfSpace: ['/home/ideia'],
        projectSpace: ['/project'],
      });
      const result = validator.resolvePath('self', '/project/secret.txt');
      expect(result.crossScope).toBe(true);
      expect(result.blocked).toBe(true);
    });

    it('allows project scope reading project files', () => {
      const validator = new PathValidator({
        selfSpace: ['/home/ideia'],
        projectSpace: ['/project'],
      });
      const result = validator.resolvePath('project', '/project/src/index.ts');
      expect(result.crossScope).toBe(false);
      expect(result.blocked).toBe(false);
    });

    it('allows self scope reading self files', () => {
      const validator = new PathValidator({
        selfSpace: ['/home/ideia'],
        projectSpace: ['/project'],
      });
      const result = validator.resolvePath('self', '/home/ideia/config.yaml');
      expect(result.crossScope).toBe(false);
      expect(result.blocked).toBe(false);
    });
  });

  describe('hasPathTraversal', () => {
    it('detects simple traversal', () => {
      expect(ScopePathValidator.hasPathTraversal('../../etc/passwd')).toBe(true);
    });

    it('detects windows traversal', () => {
      expect(ScopePathValidator.hasPathTraversal('..\\..\\Windows\\System32')).toBe(true);
    });

    it('detects nested traversal with .. segments', () => {
      expect(ScopePathValidator.hasPathTraversal('a/b/../../c')).toBe(true);
    });

    it('returns false for clean paths', () => {
      expect(ScopePathValidator.hasPathTraversal('/home/user/file.ts')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(ScopePathValidator.hasPathTraversal('')).toBe(false);
    });
  });

  describe('detectScope', () => {
    it('detects self scope from .ideia path', () => {
      expect(ScopePathValidator.detectScope('/home/.ideia/config.json')).toBe('self');
    });

    it('detects self scope from .ai path', () => {
      expect(ScopePathValidator.detectScope('/home/.ai/config.yaml')).toBe('self');
    });

    it('detects system scope from node_modules', () => {
      expect(ScopePathValidator.detectScope('/project/node_modules/pkg/index.js')).toBe('system');
    });

    it('detects system scope from .git', () => {
      expect(ScopePathValidator.detectScope('/project/.git/HEAD')).toBe('system');
    });

    it('detects project scope otherwise', () => {
      expect(ScopePathValidator.detectScope('/project/src/main.ts')).toBe('project');
    });
  });
});
