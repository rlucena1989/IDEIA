import { Emitter, Disposable, DisposableCollection } from '@ideia/core-contributions';
import { Command, CommandHandler, CommandRegistry } from './types';

export class DefaultCommandRegistry implements CommandRegistry {
  private commands = new Map<string, Command>();
  private handlers = new Map<string, CommandHandler>();
  private disposables = new DisposableCollection();

  private onCommandAddedEmitter = new Emitter<Command>();
  private onCommandExecutedEmitter = new Emitter<{ commandId: string; args: unknown[] }>();

  get onCommandAdded() { return this.onCommandAddedEmitter.event; }
  get onCommandExecuted() { return this.onCommandExecutedEmitter.event; }

  registerCommand(command: Command, handler: CommandHandler): Disposable {
    if (this.commands.has(command.id)) {
      throw new Error(`Command already registered: ${command.id}`);
    }
    this.commands.set(command.id, command);
    this.handlers.set(command.id, handler);
    this.onCommandAddedEmitter.fire(command);
    const d = { dispose: () => this.unregisterCommand(command.id) };
    this.disposables.push(d);
    return d;
  }

  getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  async executeCommand<T>(id: string, ...args: unknown[]): Promise<T | undefined> {
    const handler = this.handlers.get(id);
    if (!handler) {
      console.warn(`No handler registered for command: ${id}`);
      return undefined;
    }
    if (handler.isEnabled && !handler.isEnabled(...args)) {
      console.warn(`Command not enabled: ${id}`);
      return undefined;
    }
    this.onCommandExecutedEmitter.fire({ commandId: id, args });
    return handler.execute(...args) as Promise<T | undefined>;
  }

  isEnabled(id: string, ...args: unknown[]): boolean {
    const handler = this.handlers.get(id);
    if (!handler) return false;
    if (handler.isEnabled) return handler.isEnabled(...args);
    return true;
  }

  isVisible(id: string, ...args: unknown[]): boolean {
    const handler = this.handlers.get(id);
    if (!handler) return false;
    if (handler.isVisible) return handler.isVisible(...args);
    return true;
  }

  hasCommand(id: string): boolean {
    return this.commands.has(id);
  }

  private unregisterCommand(id: string): void {
    this.commands.delete(id);
    this.handlers.delete(id);
  }
}
