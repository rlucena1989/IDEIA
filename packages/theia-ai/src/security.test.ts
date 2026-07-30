import { DefaultAiPermissionManager, AiAuditService } from './security';
import { AiAuditEntry, AiPermissionManager } from './types';

jest.mock('@ideia/core-contributions', () => ({
  Emitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  Disposable: { undefined },
}));

describe('DefaultAiPermissionManager', () => {
  let permissionManager: AiPermissionManager;

  beforeEach(() => {
    permissionManager = new DefaultAiPermissionManager();
  });

  it('checkPermission returns true', async () => {
    await expect(permissionManager.checkPermission('agent-1', 'read', 'file.ts')).resolves.toBe(true);
  });

  it('requestApproval returns true', async () => {
    await expect(permissionManager.requestApproval('agent-1', 'write', 'file.ts', 'need edit')).resolves.toBe(true);
  });
});

describe('AiAuditService', () => {
  let auditService: AiAuditService;

  beforeEach(() => {
    auditService = new AiAuditService();
  });

  it('log creates entry with SHA-256 hash chained to previous', () => {
    const entry1 = auditService.log({ agentId: 'a1', action: 'read', resource: 'f1', status: 'allowed' });
    const entry2 = auditService.log({ agentId: 'a1', action: 'write', resource: 'f2', status: 'approved' });

    expect(entry1.hash).toBeTruthy();
    expect(entry2.hash).toBeTruthy();
    expect(entry1.hash).not.toBe(entry2.hash);
    expect(entry1.id).toMatch(/^audit-/);
    expect(entry1.timestamp).toBeInstanceOf(Date);
  });

  it('getEntries returns a copy of all audit entries', () => {
    auditService.log({ agentId: 'a1', action: 'read', resource: 'f1', status: 'allowed' });
    const entries = auditService.getEntries();
    expect(entries).toHaveLength(1);
    entries.push({} as AiAuditEntry);
    expect(auditService.getEntries()).toHaveLength(1);
  });

  it('verifyChain returns true for a valid chain', () => {
    auditService.log({ agentId: 'a1', action: 'read', resource: 'f1', status: 'allowed' });
    auditService.log({ agentId: 'a2', action: 'write', resource: 'f2', status: 'denied' });
    expect(auditService.verifyChain()).toBe(true);
  });

  it('verifyChain returns false when an entry is tampered', () => {
    auditService.log({ agentId: 'a1', action: 'read', resource: 'f1', status: 'allowed' });
    auditService.log({ agentId: 'a2', action: 'write', resource: 'f2', status: 'denied' });
    const entries = auditService.getEntries();
    entries[0].action = 'tampered';
    expect(auditService.verifyChain()).toBe(false);
  });

  it('verifyChain returns true for single entry chain', () => {
    auditService.log({ agentId: 'a1', action: 'read', resource: 'f1', status: 'allowed' });
    expect(auditService.verifyChain()).toBe(true);
  });

  it('verifyChain returns true for empty chain', () => {
    expect(auditService.verifyChain()).toBe(true);
  });
});
