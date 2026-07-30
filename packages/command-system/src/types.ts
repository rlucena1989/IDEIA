import { Contribution, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';

export interface Command {
  id: string;
  label?: string;
  iconClass?: string;
  category?: string;
  tooltip?: string;
  shortcut?: string;
  enabled?: boolean;
}

export interface CommandHandler {
  execute(...args: unknown[]): unknown | Promise<unknown>;
  isEnabled?(...args: unknown[]): boolean;
  isVisible?(...args: unknown[]): boolean;
  getLabel?(...args: unknown[]): string;
}

export interface CommandRegistry {
  registerCommand(command: Command, handler: CommandHandler): Disposable;
  getCommand(id: string): Command | undefined;
  getCommands(): Command[];
  executeCommand<T>(id: string, ...args: unknown[]): Promise<T | undefined>;
  isEnabled(id: string, ...args: unknown[]): boolean;
  isVisible(id: string, ...args: unknown[]): boolean;
  onCommandAdded: import('@ideia/core-contributions').Event<Command>;
  onCommandExecuted: import('@ideia/core-contributions').Event<{ commandId: string; args: unknown[] }>;
}
