jest.mock('@ideia/core-contributions', () => {
  const listeners: Array<(...args: unknown[]) => void> = [];
  return {
    Emitter: jest.fn().mockImplementation(() => ({
      event: jest.fn((fn: (...args: unknown[]) => void) => {
        listeners.push(fn);
        return { dispose: () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); } };
      }),
      fire: jest.fn((e: unknown) => { listeners.forEach(l => l(e)); }),
      dispose: jest.fn(() => { listeners.length = 0; }),
    })),
    DisposableCollection: jest.fn().mockImplementation(() => ({
      push: jest.fn((d: { dispose: () => void }) => { return d; }),
      dispose: jest.fn(),
    })),
    ContributionProvider: jest.fn(),
    DefaultContributionProvider: jest.fn(),
  };
});

import { DefaultCommandRegistry } from '../registry';
import { Command, CommandHandler, CommandRegistry } from '../types';

describe('Command types', () => {
  it('Command shape is valid', () => {
    const cmd: Command = {
      id: 'test.command',
      label: 'Test Command',
      iconClass: 'fa-test',
      category: 'Testing',
      tooltip: 'A test command',
      shortcut: 'Ctrl+T',
      enabled: true,
    };
    expect(cmd.id).toBe('test.command');
    expect(cmd.label).toBe('Test Command');
    expect(cmd.iconClass).toBe('fa-test');
    expect(cmd.category).toBe('Testing');
    expect(cmd.tooltip).toBe('A test command');
    expect(cmd.shortcut).toBe('Ctrl+T');
    expect(cmd.enabled).toBe(true);
  });

  it('CommandHandler shape is valid', () => {
    const handler: CommandHandler = {
      execute: () => 'result',
      isEnabled: () => true,
      isVisible: () => true,
      getLabel: () => 'Label',
    };
    expect(handler.execute()).toBe('result');
    expect(handler.isEnabled!()).toBe(true);
    expect(handler.isVisible!()).toBe(true);
    expect(handler.getLabel!()).toBe('Label');
  });

  it('CommandHandler only requires execute', () => {
    const handler: CommandHandler = {
      execute: () => 42,
    };
    expect(handler.execute()).toBe(42);
  });

  it('CommandRegistry interface is implemented by DefaultCommandRegistry', () => {
    const registry: CommandRegistry = new DefaultCommandRegistry();
    expect(registry).toBeDefined();
  });
});

describe('DefaultCommandRegistry', () => {
  let registry: DefaultCommandRegistry;

  beforeEach(() => {
    registry = new DefaultCommandRegistry();
  });

  describe('registerCommand', () => {
    it('adds a command and returns a Disposable', () => {
      const handler: CommandHandler = { execute: () => 'ok' };
      const disposable = registry.registerCommand(
        { id: 'test.hello', label: 'Hello' },
        handler
      );

      expect(registry.getCommand('test.hello')).toEqual({
        id: 'test.hello',
        label: 'Hello',
      });
      expect(typeof disposable.dispose).toBe('function');
    });

    it('throws when registering a duplicate command id', () => {
      const handler: CommandHandler = { execute: () => 'ok' };
      registry.registerCommand({ id: 'test.dup' }, handler);

      expect(() =>
        registry.registerCommand({ id: 'test.dup' }, handler)
      ).toThrow('Command already registered: test.dup');
    });

    it('removes the command when the disposable is disposed', () => {
      const handler: CommandHandler = { execute: () => 'ok' };
      const disposable = registry.registerCommand(
        { id: 'test.temp' },
        handler
      );

      expect(registry.getCommand('test.temp')).toBeDefined();
      disposable.dispose();
      expect(registry.getCommand('test.temp')).toBeUndefined();
    });

    it('getCommands returns all registered commands', () => {
      registry.registerCommand({ id: 'cmd.a' }, { execute: () => 'a' });
      registry.registerCommand({ id: 'cmd.b' }, { execute: () => 'b' });

      const ids = registry.getCommands().map(c => c.id);
      expect(ids).toEqual(['cmd.a', 'cmd.b']);
    });
  });

  describe('executeCommand', () => {
    it('executes the handler and returns the result', async () => {
      registry.registerCommand(
        { id: 'test.greet' },
        { execute: (...args: unknown[]) => `Hello ${args[0]}` }
      );

      const result = await registry.executeCommand<string>('test.greet', 'World');
      expect(result).toBe('Hello World');
    });

    it('returns undefined for an unregistered command', async () => {
      const result = await registry.executeCommand('no.such.command');
      expect(result).toBeUndefined();
    });

    it('does not execute when handler.isEnabled returns false', async () => {
      const execute = jest.fn(() => 'should not run');
      registry.registerCommand(
        { id: 'test.disabled' },
        {
          execute,
          isEnabled: () => false,
        }
      );

      const result = await registry.executeCommand('test.disabled');
      expect(result).toBeUndefined();
      expect(execute).not.toHaveBeenCalled();
    });

    it('executes async handlers', async () => {
      registry.registerCommand(
        { id: 'test.async' },
        { execute: async () => 'async result' }
      );

      const result = await registry.executeCommand<string>('test.async');
      expect(result).toBe('async result');
    });
  });

  describe('isEnabled', () => {
    it('returns false for unregistered command', () => {
      expect(registry.isEnabled('no.such')).toBe(false);
    });

    it('returns true when handler has no isEnabled', () => {
      registry.registerCommand({ id: 'test.no-check' }, { execute: () => 'ok' });
      expect(registry.isEnabled('test.no-check')).toBe(true);
    });

    it('delegates to handler.isEnabled', () => {
      registry.registerCommand(
        { id: 'test.check' },
        {
          execute: () => 'ok',
          isEnabled: (...args: unknown[]) => args[0] === 'allowed',
        }
      );

      expect(registry.isEnabled('test.check', 'allowed')).toBe(true);
      expect(registry.isEnabled('test.check', 'denied')).toBe(false);
    });
  });

  describe('isVisible', () => {
    it('returns false for unregistered command', () => {
      expect(registry.isVisible('no.such')).toBe(false);
    });

    it('returns true when handler has no isVisible', () => {
      registry.registerCommand({ id: 'test.no-check' }, { execute: () => 'ok' });
      expect(registry.isVisible('test.no-check')).toBe(true);
    });

    it('delegates to handler.isVisible', () => {
      registry.registerCommand(
        { id: 'test.visible' },
        {
          execute: () => 'ok',
          isVisible: (...args: unknown[]) => args[0] !== 'hidden',
        }
      );

      expect(registry.isVisible('test.visible', 'shown')).toBe(true);
      expect(registry.isVisible('test.visible', 'hidden')).toBe(false);
    });
  });

  describe('events', () => {
    it('fires onCommandAdded when a command is registered', () => {
      const listener = jest.fn();
      registry.onCommandAdded(listener);

      registry.registerCommand({ id: 'test.event' }, { execute: () => 'ok' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test.event' })
      );
    });

    it('fires onCommandExecuted when a command is executed', async () => {
      const listener = jest.fn();
      registry.onCommandExecuted(listener);

      registry.registerCommand({ id: 'test.exec' }, { execute: () => 'done' });
      await registry.executeCommand('test.exec', 1, 2);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          commandId: 'test.exec',
          args: [1, 2],
        })
      );
    });

    it('returns undefined for disabled commands', async () => {
      const listener = jest.fn();
      registry.onCommandExecuted(listener);

      registry.registerCommand(
        { id: 'test.disabled' },
        { execute: () => 'ok', isEnabled: () => false }
      );
      const result = await registry.executeCommand('test.disabled');

      expect(result).toBeUndefined();
    });
  });
});
