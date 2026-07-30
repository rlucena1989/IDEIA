import { Command } from 'commander';

jest.mock('@ideia/notification-system', () => ({
  NotificationManager: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ id: 'n-1', title: 'Test', message: 'Msg', severity: 'info', timestamp: new Date() }),
    getHistory: jest.fn().mockReturnValue([]),
    getHistoryBySeverity: jest.fn().mockReturnValue([]),
    dismiss: jest.fn().mockReturnValue(true),
    dismissAll: jest.fn(),
    clear: jest.fn(),
    getRateLimitStatus: jest.fn().mockReturnValue({ remaining: 5, resetTime: new Date() }),
    registerChannel: jest.fn(),
    configure: jest.fn(),
  })),
  NotificationSeverity: { Info: 'info', Warning: 'warning', Error: 'error', Success: 'success' },
}));

jest.mock('@ideia/event-bus', () => ({
  createBus: jest.fn().mockResolvedValue({ emit: jest.fn(), on: jest.fn() }),
}));

import { notificationsCommand } from '../notifications';

describe('notificationsCommand', () => {
  it('returns a Commander Command with name notification', () => {
    const cmd = notificationsCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('notification');
  });

  it('has description', () => {
    const cmd = notificationsCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has list sub-command', () => {
    const cmd = notificationsCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('list');
  });

  it('has dismiss sub-command', () => {
    const cmd = notificationsCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('dismiss');
  });

  it('has clear sub-command', () => {
    const cmd = notificationsCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('clear');
  });

  it('has status sub-command', () => {
    const cmd = notificationsCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('status');
  });
});
