import { describe, it, expect } from '@jest/globals';
import { buildAuditTrail, createAuditEntry } from '../audit-trail';

describe('audit-trail', () => {
  it('buildAuditTrail should be defined', () => {
    expect(buildAuditTrail).toBeDefined();
  });

  it('createAuditEntry should be defined', () => {
    expect(createAuditEntry).toBeDefined();
  });

  it('should create a valid audit entry', () => {
    const entry = createAuditEntry({
      command: 'evolve run',
      action: 'generate',
      rationale: 'Need docs',
      requestId: 'req-123',
      result: 'ok',
      notes: ['Generated 3 artifacts.'],
    });
    expect(entry.auditId).toBeDefined();
    expect(entry.action).toBe('generate');
    expect(entry.result).toBe('ok');
    expect(entry.createdAt).toBeDefined();
  });

  it('buildAuditTrail should wrap entries', () => {
    const entry = createAuditEntry({
      command: 'test', action: 'sync', rationale: 'test',
      requestId: 'r1', result: 'ok',
    });
    const trail = buildAuditTrail([entry]);
    expect(trail.entries.length).toBe(1);
    expect(trail.generatedAt).toBeDefined();
  });
});
