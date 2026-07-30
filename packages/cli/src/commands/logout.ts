import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { printLine, printResult, finish } from '../utils/output';
const logger = createLogger('logout');

export function logoutCommand(): Command {
  const cmd = new Command('logout');

  cmd
    .description('End the current session')
    .option('--all', 'Logout from all devices')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        printLine('👋 Logging out...');

        if (options.json) {
          printLine(JSON.stringify({ status: 'logged_out', all: !!options.all }));
        } else {
          printLine('✅ Logged out successfully');
          if (options.all) {
            printLine('   All sessions invalidated');
          }
        }

        finish({ checkpoint: 'logout', ok: true, status: 'completed', context_summary: 'Logged out', data: {} });
      } catch (error) {
        printResult('Error', false, `Logout failed: ${error}`);
        finish({ checkpoint: 'logout', ok: false, status: 'failed', context_summary: 'Logout failed', data: {} });
      }
    });

  return cmd;
}
