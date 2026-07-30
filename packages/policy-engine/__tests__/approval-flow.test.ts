import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), fatal: jest.fn(), child: jest.fn(),
  })),
}));

import { ApprovalFlow, ApprovalLevel, ApprovalStatus, ApprovalRequest } from '../src/approval-flow';

describe('ApprovalFlow', () => {
  let flow: ApprovalFlow;

  beforeEach(() => {
    flow = new ApprovalFlow();
  });

  afterEach(() => {
    flow.stopStaleChecker();
  });

  describe('createRequest', () => {
    it('creates a pending request', () => {
      const req = flow.createRequest('deploy', 'app-1', 'deploy:production', 'dev-user', ApprovalLevel.Team, ['lead-1', 'lead-2']);
      expect(req.status).toBe(ApprovalStatus.Pending);
      expect(req.requester).toBe('dev-user');
      expect(req.currentLevel).toBe(ApprovalLevel.Self);
      expect(req.id).toMatch(/^apr-/);
    });

    it('creates request with metadata', () => {
      const req = flow.createRequest('deploy', 'app-1', 'deploy:production', 'dev-user', ApprovalLevel.Team, ['lead-1'], { env: 'prod' });
      expect(req.metadata).toEqual({ env: 'prod' });
    });
  });

  describe('approve', () => {
    it('returns null for unknown request', () => {
      expect(flow.approve('unknown', 'user')).toBeNull();
    });

    it('throws for unauthorized approver', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Team, ['lead-1']);
      expect(() => flow.approve(req.id, 'hacker')).toThrow('not authorized');
    });

    it('throws for duplicate approval', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      flow.approve(req.id, 'lead-1');
      expect(() => flow.approve(req.id, 'lead-1')).toThrow('already approved');
    });

    it('approves a self-level request with one approver', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      const approved = flow.approve(req.id, 'lead-1');
      expect(approved?.status).toBe(ApprovalStatus.Approved);
    });

    it('escalates to next level when min approvers met', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Organization, ['lead-1', 'lead-2', 'lead-3']);
      flow.approve(req.id, 'lead-1');
      expect(flow.getRequest(req.id)?.currentLevel).toBe(ApprovalLevel.Team);
    });
  });

  describe('reject', () => {
    it('returns null for unknown request', () => {
      expect(flow.reject('unknown', 'user', 'no reason')).toBeNull();
    });

    it('throws for unauthorized approver', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      expect(() => flow.reject(req.id, 'hacker', 'bad')).toThrow('not authorized');
    });

    it('marks as rejected', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      const rejected = flow.reject(req.id, 'lead-1', 'not ready');
      expect(rejected?.status).toBe(ApprovalStatus.Rejected);
      expect(rejected?.reason).toBe('not ready');
    });
  });

  describe('cancel', () => {
    it('returns null for unknown request', () => {
      expect(flow.cancel('unknown', 'user')).toBeNull();
    });

    it('throws if non-requester tries to cancel', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      expect(() => flow.cancel(req.id, 'other-user')).toThrow('Only the requester');
    });

    it('cancels the request', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      const cancelled = flow.cancel(req.id, 'dev');
      expect(cancelled?.status).toBe(ApprovalStatus.Cancelled);
    });
  });

  describe('getRequest', () => {
    it('returns a request by id', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      const found = flow.getRequest(req.id);
      expect(found?.id).toBe(req.id);
    });

    it('returns null for unknown id', () => {
      expect(flow.getRequest('non-existent')).toBeNull();
    });
  });

  describe('getPendingRequests', () => {
    it('returns pending requests', () => {
      flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      flow.createRequest('deploy', 'app-2', 'action', 'dev', ApprovalLevel.Team, ['lead-2']);
      expect(flow.getPendingRequests()).toHaveLength(2);
    });

    it('filters by level', () => {
      flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Team, ['lead-1', 'lead-2']);
      flow.createRequest('deploy', 'app-2', 'action', 'dev', ApprovalLevel.Organization, ['lead-3', 'lead-4', 'lead-5']);
      expect(flow.getPendingRequests(ApprovalLevel.Self)).toHaveLength(2);
    });

    it('excludes approved/rejected requests', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      flow.approve(req.id, 'lead-1');
      expect(flow.getPendingRequests()).toHaveLength(0);
    });
  });

  describe('getRequestHistory', () => {
    it('returns all requests sorted by creation date', () => {
      flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      flow.createRequest('deploy', 'app-2', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      const history = flow.getRequestHistory();
      expect(history).toHaveLength(2);
    });

    it('filters by requester', () => {
      flow.createRequest('deploy', 'app-1', 'action', 'dev1', ApprovalLevel.Self, ['lead-1']);
      flow.createRequest('deploy', 'app-2', 'action', 'dev2', ApprovalLevel.Self, ['lead-1']);
      expect(flow.getRequestHistory('dev1')).toHaveLength(1);
    });
  });

  describe('escalateStaleRequests', () => {
    it('returns empty array if no escalation rules', () => {
      const f = new ApprovalFlow({ escalationRules: undefined });
      f.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Team, ['lead-1']);
      expect(f.escalateStaleRequests()).toEqual([]);
    });

    it('skips non-pending requests', () => {
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      flow.approve(req.id, 'lead-1');
      expect(flow.escalateStaleRequests()).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('updates config', () => {
      flow.updateConfig({ escalationRules: { escalateAfterMs: 1000, escalateToLevel: ApprovalLevel.Organization } });
      expect(flow.getConfig().escalationRules?.escalateAfterMs).toBe(1000);
    });
  });

  describe('callbacks', () => {
    it('calls onApprove when approved', () => {
      const onApprove = jest.fn() as jest.Mock<() => void>;
      flow.setCallbacks({ onApprove: onApprove as unknown as (request: ApprovalRequest) => void | Promise<void> });
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      flow.approve(req.id, 'lead-1');
      expect(onApprove).toHaveBeenCalledTimes(1);
    });

    it('calls onReject when rejected', () => {
      const onReject = jest.fn() as jest.Mock<() => void>;
      flow.setCallbacks({ onReject: onReject as unknown as (request: ApprovalRequest) => void | Promise<void> });
      const req = flow.createRequest('deploy', 'app-1', 'action', 'dev', ApprovalLevel.Self, ['lead-1']);
      flow.reject(req.id, 'lead-1', 'no');
      expect(onReject).toHaveBeenCalledTimes(1);
    });
  });

  describe('stale checker', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('starts and stops the stale checker', () => {
      flow.startStaleChecker();
      expect(flow['staleCheckTimer']).not.toBeNull();
      flow.stopStaleChecker();
      expect(flow['staleCheckTimer']).toBeNull();
    });

    it('does not start duplicate intervals', () => {
      flow.startStaleChecker();
      const timer1 = flow['staleCheckTimer'];
      flow.startStaleChecker();
      expect(flow['staleCheckTimer']).toBe(timer1);
      flow.stopStaleChecker();
    });
  });
});
