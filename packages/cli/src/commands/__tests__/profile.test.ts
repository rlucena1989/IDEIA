import { profileCommand } from '../profile';

jest.mock('@ideia/event-bus', () => ({
  createBus: jest.fn().mockResolvedValue({ publish: jest.fn(), subscribe: jest.fn() }),
}));

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn().mockImplementation(() => ({ record: jest.fn(), verifyChain: jest.fn() })),
}));

jest.mock('@ideia/usability-profile', () => ({
  UsabilityProfileEngine: jest.fn().mockImplementation(() => ({
    getState: jest.fn().mockReturnValue({ totalEvents: 42, currentProfile: 'developer', adaptations: [] }),
  })),
}));

describe('profile command', () => {
  it('registers status subcommand', () => {
    const cmd = profileCommand();
    const statusCmd = cmd.commands.find(c => c.name() === 'status');
    expect(statusCmd).toBeDefined();
  });

  it('has correct description', () => {
    const cmd = profileCommand();
    expect(cmd.description()).toContain('Usability Profile');
  });
});
