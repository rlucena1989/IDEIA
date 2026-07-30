jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { auditTrail } from '../audit-trail';

describe('auditTrail', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 3 file entries', () => {
    auditTrail('Order', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
  });

  it('generates AuditEntry type file', () => {
    auditTrail('Invoice', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('AuditEntry.ts');
    expect(files[0].content).toContain('AuditAction');
  });

  it('generates AuditService class file', () => {
    auditTrail('User', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].path).toContain('AuditService.ts');
    expect(files[1].content).toContain('class AuditService');
  });

  it('generates test file for AuditService', () => {
    auditTrail('Payment', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[2].path).toContain('AuditService.test.ts');
    expect(files[2].content).toContain('describe(');
  });

  it('interpolates entity name in test content', () => {
    auditTrail('Refund', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[2].content).toContain('{{Name}}');
  });
});
