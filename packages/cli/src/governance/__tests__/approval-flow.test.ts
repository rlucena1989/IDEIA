import { describe, it, expect } from '@jest/globals';
import { createApprovalRequest, approveAction } from '../approval-flow';

describe('approval-flow', () => {
  it('createApprovalRequest should be defined', () => {
    expect(createApprovalRequest).toBeDefined();
  });

  it('should create a pending request', () => {
    const req = createApprovalRequest({ action: 'generate', requestedBy: 'user', reason: 'Need approval' });
    expect(req.action).toBe('generate');
    expect(req.requestedBy).toBe('user');
    expect(req.approvalId).toBeDefined();
  });

  it('approveAction should approve', () => {
    const req = createApprovalRequest({ action: 'sync', requestedBy: 'bot', reason: 'Sync required' });
    const result = approveAction(req, true, 'admin');
    expect(result.approved).toBe(true);
    expect(result.approvedBy).toBe('admin');
    expect(result.note).toContain('Action approved');
  });

  it('approveAction should reject', () => {
    const req = createApprovalRequest({ action: 'publish', requestedBy: 'bot', reason: 'Publish' });
    const result = approveAction(req, false);
    expect(result.approved).toBe(false);
    expect(result.approvedBy).toBeUndefined();
    expect(result.note).toContain('Action rejected');
  });
});
