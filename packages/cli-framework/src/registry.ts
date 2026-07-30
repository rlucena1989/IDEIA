import { CLICommand, CLICommandRegistry, CLIResult } from './types';
import { createLogger } from '@ideia/logger';

export class DefaultCLICommandRegistry implements CLICommandRegistry {
  private commands = new Map<string, CLICommand>();

  registerCommand(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  getCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  async execute(
    name: string,
    args?: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<CLIResult> {
    const startTime = Date.now();
    const command = this.commands.get(name);

    if (!command) {
      return {
        exitCode: 1,
        error: `Unknown command: ${name}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      const exitCode = await command.handler(args || {}, options || {});
      return {
        exitCode,
        duration: Date.now() - startTime,
      };
    } catch (err) {
      return {
        exitCode: 1,
        error: (err as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }
}
