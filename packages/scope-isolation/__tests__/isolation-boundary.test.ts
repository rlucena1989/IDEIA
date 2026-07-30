import { describe, it, expect } from '@jest/globals';
import { IsolationBoundary } from '../src/isolation-boundary';

describe('IsolationBoundary', () => {
  const defaultConfig = {
    selfSpace: ['/home/ideia'],
    projectSpace: ['/projects/myapp'],
    allowList: [],
    blockList: ['/etc', '/usr', '/proc'],
    readOnlyPaths: [],
  };

  it('should construct with valid config', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    expect(boundary).toBeDefined();
  });

  it('should allow read within self space root', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    const result = boundary.checkAccess('read', '/home/ideia/config.json');
    expect(result.allowed).toBe(true);
  });

  it('should deny read outside allowed paths', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    const result = boundary.checkAccess('read', '/etc/passwd');
    expect(result.allowed).toBe(false);
  });

  it('should allow read within project space', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    const result = boundary.checkAccess('read', '/projects/myapp/src/index.ts');
    expect(result.allowed).toBe(true);
  });

  it('should deny write to blocked path', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    const result = boundary.checkAccess('write', '/usr/local/bin');
    expect(result.allowed).toBe(false);
  });

  it('should provide reason when access is denied', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    const result = boundary.checkAccess('delete', '/etc/shadow');
    expect(result.allowed).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should handle path traversal attempts', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    const result = boundary.checkAccess('read', '/home/ideia/../../etc/passwd');
    expect(result.allowed).toBe(false);
  });

  it('should handle Windows-style paths on any platform', () => {
    const boundary = new IsolationBoundary({
      selfSpace: ['C:\\Users\\ideia'],
      projectSpace: ['D:\\projects'],
      blockList: [],
      readOnlyPaths: [],
    });
    const result = boundary.checkAccess('write', 'C:\\Users\\ideia\\doc.md');
    expect(result.allowed).toBe(true);
  });

  it('should audit operations', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    boundary.checkAccess('read', '/etc/hosts');
    const auditLog = boundary.getAuditLog();
    expect(auditLog.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow list operations on self space', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    const result = boundary.checkAccess('list', '/home/ideia');
    expect(result.allowed).toBe(true);
  });

  it('should deny operations on path in neither self nor project space', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    const result = boundary.checkAccess('read', '/tmp/random-file');
    expect(result.allowed).toBe(false);
  });

  it('should clear audit log', () => {
    const boundary = new IsolationBoundary(defaultConfig);
    boundary.checkAccess('read', '/etc/hosts');
    expect(boundary.getAuditLog().length).toBeGreaterThanOrEqual(1);
    boundary.clearAuditLog();
    expect(boundary.getAuditLog().length).toBe(0);
  });
});
