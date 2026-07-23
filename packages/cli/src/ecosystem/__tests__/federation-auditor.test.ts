import { describe, it, expect } from '@jest/globals';
import { auditEcosystem } from '../federation-auditor';

describe('federation-auditor', () => {
  it('auditEcosystem should be defined', () => {
    expect(auditEcosystem).toBeDefined();
  });

  it('should create audit entry', () => {
    const entry = auditEcosystem('domain-x', 'sync', 'ok');
    expect(entry.subject).toBe('domain-x');
    expect(entry.action).toBe('sync');
    expect(entry.outcome).toBe('ok');
    expect(entry.auditId).toBeDefined();
  });
});
