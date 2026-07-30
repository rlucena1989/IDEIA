import { describe, it, expect } from '@jest/globals';
import { ViolationAudit } from '../src/violation-audit';
import { ScopeViolationError, PathValidator } from '../src/scope-isolation';
import { Scope } from '../src/types';

describe('cross-scope-audit', () => {
  describe('ViolationAudit', () => {
    it('records a cross-scope violation', () => {
      const audit = new ViolationAudit();
      const event = audit.auditCrossScope(
        'self' as Scope,
        'project' as Scope,
        '/project/secret.txt',
        '/project/secret.txt',
        'read',
      );
      expect(event.id).toBeDefined();
      expect(event.fromScope).toBe('self');
      expect(event.targetPath).toBe('/project/secret.txt');
      expect(event.policyAction).toBe('blocked');
    });

    it('records violation from error', () => {
      const audit = new ViolationAudit();
      const error = new ScopeViolationError('self' as Scope, '/project/file.ts', '/project/file.ts', 'Test violation');
      const event = audit.recordFromError(error);
      expect(event.id).toBeDefined();
      expect(event.reason).toContain('Test violation');
    });

    it('lists violations by scope', () => {
      const audit = new ViolationAudit();
      audit.auditCrossScope('self' as Scope, 'project' as Scope, '/p1', '/p1', 'read');
      audit.auditCrossScope('self' as Scope, 'system' as Scope, '/s1', '/s1', 'write');
      audit.auditCrossScope('project' as Scope, 'self' as Scope, '/s2', '/s2', 'read');

      const selfEvents = audit.list('self' as Scope);
      expect(selfEvents.length).toBe(2);

      const projectEvents = audit.list('project' as Scope);
      expect(projectEvents.length).toBe(1);
    });

    it('lists all events when no scope filter', () => {
      const audit = new ViolationAudit();
      audit.auditCrossScope('self' as Scope, 'project' as Scope, '/p1', '/p1', 'read');
      audit.auditCrossScope('project' as Scope, 'self' as Scope, '/s1', '/s1', 'write');

      const all = audit.list();
      expect(all.length).toBe(2);
    });

    it('counts violations by scope', () => {
      const audit = new ViolationAudit();
      audit.auditCrossScope('self' as Scope, 'project' as Scope, '/p', '/p', 'read');
      audit.auditCrossScope('project' as Scope, 'system' as Scope, '/s', '/s', 'write');

      expect(audit.count('self' as Scope)).toBe(1);
      expect(audit.count()).toBe(2);
    });

    it('returns recent violations in reverse order', () => {
      const audit = new ViolationAudit();
      audit.auditCrossScope('self' as Scope, 'project' as Scope, '/p1', '/p1', 'read');
      audit.auditCrossScope('self' as Scope, 'project' as Scope, '/p2', '/p2', 'read');
      audit.auditCrossScope('self' as Scope, 'project' as Scope, '/p3', '/p3', 'read');

      const recent = audit.recent(2);
      expect(recent.length).toBe(2);
      expect(recent[0].targetPath).toBe('/p3');
      expect(recent[1].targetPath).toBe('/p2');
    });

    it('clears all violations', () => {
      const audit = new ViolationAudit();
      audit.auditCrossScope('self' as Scope, 'project' as Scope, '/p', '/p', 'read');
      expect(audit.count()).toBe(1);
      audit.clear();
      expect(audit.count()).toBe(0);
    });

    it('handles empty recent', () => {
      const audit = new ViolationAudit();
      expect(audit.recent(5)).toEqual([]);
    });
  });

  describe('ScopeViolationError', () => {
    it('creates error with correct properties', () => {
      const error = new ScopeViolationError('self' as Scope, '/project/file.ts', '/resolved/path', 'Custom message');
      expect(error.name).toBe('ScopeViolationError');
      expect(error.fromScope).toBe('self');
      expect(error.targetPath).toBe('/project/file.ts');
      expect(error.resolvedPath).toBe('/resolved/path');
      expect(error.message).toBe('Custom message');
    });

    it('uses default message when not provided', () => {
      const error = new ScopeViolationError('self' as Scope, '/target', '/resolved');
      expect(error.message).toContain('Cross-scope access blocked');
      expect(error.message).toContain('self');
      expect(error.message).toContain('/target');
    });
  });
});
