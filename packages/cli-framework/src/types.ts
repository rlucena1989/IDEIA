export interface CLICommand {
  id: string;
  name: string;
  description: string;
  args?: CLIArg[];
  options?: CLIOption[];
  handler: (args: Record<string, unknown>, options: Record<string, unknown>) => Promise<number>;
}

export interface CLIArg {
  name: string;
  description: string;
  required: boolean;
  default?: unknown;
}

export interface CLIOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  default?: unknown;
}

export interface CLIResult {
  exitCode: number;
  output?: string;
  error?: string;
  duration: number;
}

export interface CLICommandContribution {
  registerCommands(registry: CLICommandRegistry): void;
}

export interface CLICommandRegistry {
  registerCommand(command: CLICommand): void;
  getCommand(name: string): CLICommand | undefined;
  getCommands(): CLICommand[];
  execute(name: string, args?: Record<string, unknown>, options?: Record<string, unknown>): Promise<CLIResult>;
}
