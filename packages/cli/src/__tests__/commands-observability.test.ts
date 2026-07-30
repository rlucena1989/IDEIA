import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('commands - observability', () => {
  let mod: typeof import('../commands/observability');

  beforeEach(() => {
    jest.resetModules();
    mod = require('../commands/observability');
  });

  it('observabilityCommand retorna um Command com subcomandos', () => {
    const cmd = mod.observabilityCommand();
    expect(cmd.name()).toBe('observability');
    const subcommands = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(subcommands).toContain('trace');
    expect(subcommands).toContain('metrics');
    expect(subcommands).toContain('dashboard');
    expect(subcommands).toContain('list');
    expect(subcommands).toContain('alert');
  });

  it('recordAutoTrace nao lanca excecao', () => {
    expect(() => mod.recordAutoTrace('test-cmd', 'success', 100)).not.toThrow();
    expect(() => mod.recordAutoTrace('test-cmd', 'error', 100, 'something failed')).not.toThrow();
  });

  it('exporta observabilityCommand como funcao', () => {
    expect(typeof mod.observabilityCommand).toBe('function');
  });

  it('exporta recordAutoTrace como funcao', () => {
    expect(typeof mod.recordAutoTrace).toBe('function');
  });
});
