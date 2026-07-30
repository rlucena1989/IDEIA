import { describe, it, expect } from '@jest/globals';
import { configCommand } from '../config';

describe('configCommand', () => {
  it('should create a command with correct name', () => {
    const cmd = configCommand();
    expect(cmd.name()).toBe('config');
  });

  it('should have get subcommand', () => {
    const cmd = configCommand();
    const getCmd = cmd.commands.find(c => c.name() === 'get');
    expect(getCmd).toBeDefined();
  });

  it('should have set subcommand', () => {
    const cmd = configCommand();
    const setCmd = cmd.commands.find(c => c.name() === 'set');
    expect(setCmd).toBeDefined();
  });

  it('should have list subcommand', () => {
    const cmd = configCommand();
    const listCmd = cmd.commands.find(c => c.name() === 'list');
    expect(listCmd).toBeDefined();
  });
});
