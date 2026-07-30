import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@ideia/autonomous-evolution-engine', () => ({ EvolutionCycle: class {} }));
jest.mock('@ideia/event-bus', () => ({ createBus: () => Promise.resolve() }));
jest.mock('@ideia/audit-trail', () => ({ AuditTrail: class {} }));

describe('commands - evolution', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('evolutionCommand retorna Command com scan, status e auto-fix', () => {
    const { evolutionCommand } = require('../commands/evolution');
    const cmd = evolutionCommand();
    expect(cmd.name()).toBe('evolution');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('scan');
    expect(names).toContain('status');
    expect(names).toContain('auto-fix');
  });
});
