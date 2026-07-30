import { continuityCommand } from '../continuity';

jest.mock('@ideia/event-bus', () => ({
  createBus: jest.fn().mockResolvedValue({ publish: jest.fn(), subscribe: jest.fn() }),
}));

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn().mockImplementation(() => ({ record: jest.fn(), verifyChain: jest.fn() })),
}));

jest.mock('@ideia/continuity-engine', () => ({
  ContinuityEngine: jest.fn().mockImplementation(() => ({
    getContinuityStatus: jest.fn().mockReturnValue({ pendingDecisions: 2, autoContinued: 5, escalated: 0, activeTimers: 3 }),
  })),
}));

describe('continuity command', () => {
  it('registers status subcommand', () => {
    const cmd = continuityCommand();
    const statusCmd = cmd.commands.find(c => c.name() === 'status');
    expect(statusCmd).toBeDefined();
  });

  it('has correct description', () => {
    const cmd = continuityCommand();
    expect(cmd.description()).toContain('Decision Continuity');
  });
});
