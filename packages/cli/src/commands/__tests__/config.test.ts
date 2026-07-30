import { Command } from 'commander';

const mockBus = { emit: jest.fn(), on: jest.fn() };
const mockAuditTrailInstance = { append: jest.fn() };
const mockProfilesInstance = {
  list: jest.fn().mockReturnValue([]),
  apply: jest.fn().mockResolvedValue(undefined),
  export: jest.fn().mockReturnValue('{}'),
  import: jest.fn(),
};

jest.mock('@ideia/event-bus', () => ({ createBus: jest.fn() }));
jest.mock('@ideia/audit-trail', () => ({ AuditTrail: jest.fn() }));
jest.mock('@ideia/profiles', () => ({ createProfiles: jest.fn() }));

import { configCommand } from '../config';
import { createBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { createProfiles } from '@ideia/profiles';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (createBus as jest.Mock).mockResolvedValue(mockBus);
  (AuditTrail as jest.Mock).mockImplementation(() => mockAuditTrailInstance);
  (createProfiles as jest.Mock).mockReturnValue(mockProfilesInstance);
});

describe('configCommand', () => {
  it('returns a Commander Command with name config', async () => {
    const cmd = await configCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('config');
  });

  it('has description', async () => {
    const cmd = await configCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('creates event bus and audit trail', async () => {
    await configCommand();
    expect(createBus).toHaveBeenCalledTimes(1);
    expect(AuditTrail).toHaveBeenCalledTimes(1);
  });

  it('creates profiles with bus and audit trail', async () => {
    await configCommand();
    expect(createProfiles).toHaveBeenCalledWith(mockBus, mockAuditTrailInstance);
  });

  it('has show sub-command', async () => {
    const cmd = await configCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('show');
  });

  it('has profile sub-command', async () => {
    const cmd = await configCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('profile');
  });

  it('profile sub-command has list, apply, export, import children', async () => {
    const cmd = await configCommand();
    const profile = cmd.commands.find((c: Command) => c.name() === 'profile');
    expect(profile).toBeDefined();
    const childNames = profile!.commands.map((c: Command) => c.name());
    expect(childNames).toContain('list');
    expect(childNames).toContain('apply');
    expect(childNames).toContain('export');
    expect(childNames).toContain('import');
  });
});
