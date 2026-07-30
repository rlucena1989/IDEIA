import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockProfiles = { list: jest.fn() };
const mockCreateBus = jest.fn();
const mockAuditTrail = jest.fn();
const mockCreateProfiles = jest.fn();
const mockPrintHeader = jest.fn();
const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();

jest.mock('@ideia/profiles', () => ({ Profiles: jest.fn(), createProfiles: (...args: unknown[]) => mockCreateProfiles(...args) }));
jest.mock('@ideia/event-bus', () => ({ createBus: (...args: unknown[]) => mockCreateBus(...args) }));
jest.mock('@ideia/audit-trail', () => ({ AuditTrail: jest.fn().mockImplementation(() => mockAuditTrail) }));
jest.mock('../../utils/output', () => ({ printHeader: (...args: unknown[]) => mockPrintHeader(...args), printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args) }));

function getCmd() {
  const { setupCommand } = require('../setup');
  return setupCommand();
}

describe('setupCommand', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockCreateBus.mockResolvedValue({} as never);
    mockCreateProfiles.mockReturnValue(mockProfiles);
    mockProfiles.list.mockReturnValue([{ id: 'default', name: 'Default Profile' }, { id: 'expert', name: 'Expert Profile' }]);
  });

  afterEach(() => { exitSpy.mockRestore(); });

  it('returns command named setup', () => { expect(getCmd().name()).toBe('setup'); });

  it('has subcommands wizard and status', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['wizard', 'status']);
  });

  it('wizard subcommand runs in standard mode by default', async () => {
    const cmd = getCmd();
    const wizard = cmd.commands.find((c: { name: () => string }) => c.name() === 'wizard')!;
    await wizard._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('standard mode'));
    expect(mockPrintResult).toHaveBeenCalledWith('IDEIA is ready to configure!', true);
  });

  it('wizard subcommand runs in quick mode', async () => {
    const cmd = getCmd();
    const wizard = cmd.commands.find((c: { name: () => string }) => c.name() === 'wizard')!;
    wizard.setOptionValue('quick', true);
    await wizard._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('quick mode'));
  });

  it('wizard subcommand runs in expert mode', async () => {
    const cmd = getCmd();
    const wizard = cmd.commands.find((c: { name: () => string }) => c.name() === 'wizard')!;
    wizard.setOptionValue('expert', true);
    await wizard._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('expert mode'));
  });

  it('wizard subcommand lists available profiles', async () => {
    const cmd = getCmd();
    const wizard = cmd.commands.find((c: { name: () => string }) => c.name() === 'wizard')!;
    await wizard._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('Default Profile'));
  });

  it('wizard subcommand outputs JSON with --json flag', async () => {
    const cmd = getCmd();
    const wizard = cmd.commands.find((c: { name: () => string }) => c.name() === 'wizard')!;
    wizard.setOptionValue('json', true);
    await wizard._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"profiles"'));
  });

  it('wizard subcommand handles errors', async () => {
    mockProfiles.list.mockImplementation(() => { throw new Error('wizard error'); });
    const cmd = getCmd();
    const wizard = cmd.commands.find((c: { name: () => string }) => c.name() === 'wizard')!;
    await wizard._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('status subcommand shows configured status', async () => {
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    await status._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('Configured: Yes'));
  });

  it('status subcommand shows not configured when no profiles', async () => {
    mockProfiles.list.mockReturnValue([]);
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    await status._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('Configured: No'));
  });

  it('status subcommand outputs JSON with --json flag', async () => {
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status.setOptionValue('json', true);
    await status._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"configured"'));
  });

  it('status subcommand handles errors', async () => {
    mockProfiles.list.mockImplementation(() => { throw new Error('status error'); });
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    await status._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
