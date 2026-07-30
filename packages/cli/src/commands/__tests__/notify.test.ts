import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockNotificationSystem = { notify: jest.fn<any>(), getHistory: jest.fn<any>(), configureChannel: jest.fn<any>() };
const mockCreateBus = jest.fn();
const mockPrintHeader = jest.fn();
const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();

jest.mock('@ideia/notification-system', () => ({ NotificationSystem: jest.fn().mockImplementation(() => mockNotificationSystem), NotificationSeverity: { Info: 'info', Warning: 'warning', Error: 'error', Critical: 'critical' }, NotificationLevel: { All: 'all' } }));
jest.mock('@ideia/event-bus', () => ({ createBus: (...args: unknown[]) => mockCreateBus(...args) }));
jest.mock('../../utils/output', () => ({ printHeader: (...args: unknown[]) => mockPrintHeader(...args), printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args) }));

function getCmd() {
  const { notifyCommand } = require('../notify');
  return notifyCommand();
}

describe('notifyCommand', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockCreateBus.mockResolvedValue({} as never);
    mockNotificationSystem.notify.mockResolvedValue(undefined);
    mockNotificationSystem.getHistory.mockReturnValue([
      { severity: 'info', title: 'Test', message: 'hello', timestamp: '2024-01-01T00:00:00Z' },
      { severity: 'error', title: 'Error', message: 'fail', timestamp: '2024-01-01T00:00:01Z' },
      { severity: 'warning', title: 'Warn', message: 'caution', timestamp: '2024-01-01T00:00:02Z' },
    ]);
    mockNotificationSystem.configureChannel.mockReturnValue(undefined);
  });

  afterEach(() => { exitSpy.mockRestore(); });

  it('returns command named notify', () => { expect(getCmd().name()).toBe('notify'); });

  it('has subcommands send, history, configure', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['send', 'history', 'configure']);
  });

  it('send subcommand sends notification with default severity', async () => {
    const cmd = getCmd();
    const send = cmd.commands.find((c: { name: () => string }) => c.name() === 'send')!;
    await send._actionHandler(['Hello world']);
    expect(mockNotificationSystem.notify).toHaveBeenCalledWith({ title: 'IDEIA Notification', message: 'Hello world', severity: 'info', level: 'all' }, undefined);
    expect(mockPrintResult).toHaveBeenCalledWith('Notification sent: Hello world', true);
  });

  it('send subcommand maps severity strings', async () => {
    const cmd = getCmd();
    const send = cmd.commands.find((c: { name: () => string }) => c.name() === 'send')!;
    send.setOptionValue('severity', 'error');
    send.setOptionValue('title', 'Oops');
    await send._actionHandler(['Error msg']);
    expect(mockNotificationSystem.notify).toHaveBeenCalledWith({ title: 'Oops', message: 'Error msg', severity: 'error', level: 'all' }, undefined);
  });

  it('send subcommand passes channel when specified', async () => {
    const cmd = getCmd();
    const send = cmd.commands.find((c: { name: () => string }) => c.name() === 'send')!;
    send.setOptionValue('channel', 'toast');
    await send._actionHandler(['Toast msg']);
    expect(mockNotificationSystem.notify).toHaveBeenCalledWith(expect.any(Object), ['toast']);
  });

  it('send subcommand outputs JSON with --json flag', async () => {
    const cmd = getCmd();
    const send = cmd.commands.find((c: { name: () => string }) => c.name() === 'send')!;
    send.setOptionValue('json', true);
    await send._actionHandler(['test']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('send subcommand handles errors', async () => {
    mockNotificationSystem.notify.mockRejectedValue(new Error('notify failed'));
    const cmd = getCmd();
    const send = cmd.commands.find((c: { name: () => string }) => c.name() === 'send')!;
    await send._actionHandler(['test']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('history subcommand shows notification history', async () => {
    const cmd = getCmd();
    const history = cmd.commands.find((c: { name: () => string }) => c.name() === 'history')!;
    await history._actionHandler([]);
    expect(mockPrintHeader).toHaveBeenCalledWith('Notification History');
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('[info]'));
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('[error]'));
  });

  it('history subcommand outputs JSON with --json flag', async () => {
    const cmd = getCmd();
    const history = cmd.commands.find((c: { name: () => string }) => c.name() === 'history')!;
    history.setOptionValue('json', true);
    await history._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"severity"'));
  });

  it('history subcommand uses default limit of 10', async () => {
    const cmd = getCmd();
    const history = cmd.commands.find((c: { name: () => string }) => c.name() === 'history')!;
    await history._actionHandler([]);
    expect(mockNotificationSystem.getHistory).toHaveBeenCalledWith(10);
  });

  it('history subcommand handles errors', async () => {
    mockNotificationSystem.getHistory.mockImplementation(() => { throw new Error('history fail'); });
    const cmd = getCmd();
    const history = cmd.commands.find((c: { name: () => string }) => c.name() === 'history')!;
    await history._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('configure subcommand enables channel by default', async () => {
    const cmd = getCmd();
    const configure = cmd.commands.find((c: { name: () => string }) => c.name() === 'configure')!;
    await configure._actionHandler(['desktop']);
    expect(mockNotificationSystem.configureChannel).toHaveBeenCalledWith('desktop', { enabled: true });
    expect(mockPrintResult).toHaveBeenCalledWith('Channel "desktop" configured', true);
  });

  it('configure subcommand disables channel when --enabled false', async () => {
    const cmd = getCmd();
    const configure = cmd.commands.find((c: { name: () => string }) => c.name() === 'configure')!;
    configure.setOptionValue('enabled', 'false');
    await configure._actionHandler(['slack']);
    expect(mockNotificationSystem.configureChannel).toHaveBeenCalledWith('slack', { enabled: false });
  });

  it('configure subcommand handles errors', async () => {
    mockNotificationSystem.configureChannel.mockImplementation(() => { throw new Error('cfg fail'); });
    const cmd = getCmd();
    const configure = cmd.commands.find((c: { name: () => string }) => c.name() === 'configure')!;
    await configure._actionHandler(['email']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
