jest.mock('@ideia/event-bus', () => ({
  createBus: jest.fn().mockResolvedValue({
    publish: jest.fn(),
    subscribe: jest.fn(),
  }),
}), { virtual: true });

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn().mockImplementation(() => ({
    record: jest.fn(),
    verifyChain: jest.fn(),
  })),
}), { virtual: true });

jest.mock('@ideia/bhp', () => {
  const mockHistory: any[] = [];
  return {
    BHP: jest.fn().mockImplementation(() => ({
      sendHelp: jest.fn().mockReturnValue('msg-001'),
      getHistory: jest.fn().mockReturnValue(mockHistory),
    })),
  };
}, { virtual: true });

import { bhpCommand } from '../bhp';

describe('bhp command', () => {
  it('registers status subcommand', () => {
    const cmd = bhpCommand();
    const statusCmd = cmd.commands.find(c => c.name() === 'status');
    expect(statusCmd).toBeDefined();
  });

  it('registers help subcommand', () => {
    const cmd = bhpCommand();
    const helpCmd = cmd.commands.find(c => c.name() === 'help');
    expect(helpCmd).toBeDefined();
  });

  it('registers history subcommand', () => {
    const cmd = bhpCommand();
    const historyCmd = cmd.commands.find(c => c.name() === 'history');
    expect(historyCmd).toBeDefined();
  });

  it('has correct description', () => {
    const cmd = bhpCommand();
    expect(cmd.description()).toContain('Bidirectional Help Protocol');
  });
});
