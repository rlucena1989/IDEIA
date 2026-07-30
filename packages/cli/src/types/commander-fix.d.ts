// Extend Commander types to accept CliCommandResult return types
import 'commander';

declare module 'commander' {
  interface Command {
    action(fn: (...args: any[]) => any): this;
  }
}
