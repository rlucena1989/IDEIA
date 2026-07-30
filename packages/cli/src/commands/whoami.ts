import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { getEnvConfig } from '@ideia/config-engine';
import { createAuthProvider, AuthProviderType } from '../auth/auth-provider';
import { printLine, printResult, finish } from '../utils/output';
const logger = createLogger('whoami');

export function whoamiCommand(): Command {
  const cmd = new Command('whoami');

  cmd
    .description('Show current authenticated user')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const provider = getEnvConfig().authProvider;
        if (provider === 'none') {
          if (options.json) {
            printLine(JSON.stringify({ authenticated: false, message: 'No auth provider configured' }));
          } else {
            printLine('❌ Not authenticated');
            printLine('   Run "ideia login" to authenticate');
            printLine('   Or set AUTH_PROVIDER env var (auth0, clerk)');
          }
          finish({ checkpoint: 'whoami', ok: true, status: 'completed', context_summary: 'Not authenticated', data: { authenticated: false } });
          return;
        }

        const authProvider = createAuthProvider({ provider: provider as AuthProviderType });
        const sessionId = process.env.IDEIA_SESSION_ID || '';
        const authenticated = await authProvider.isAuthenticated(sessionId);

        if (!authenticated) {
          if (options.json) {
            printLine(JSON.stringify({ authenticated: false, message: 'Session expired or invalid' }));
          } else {
            printLine('❌ Session expired or invalid');
            printLine('   Run "ideia login" again');
          }
          finish({ checkpoint: 'whoami', ok: true, status: 'completed', context_summary: 'Not authenticated', data: { authenticated: false } });
          return;
        }

        const user = await authProvider.getUser(sessionId);
        if (options.json) {
          printLine(JSON.stringify({ authenticated: true, user }, null, 2));
        } else {
          printLine(`👤 ${user.name} (${user.email})`);
          printLine(`   ID: ${user.id}`);
          printLine(`   Roles: ${user.roles.join(', ')}`);
          if (user.avatarUrl) printLine(`   Avatar: ${user.avatarUrl}`);
        }

        finish({ checkpoint: 'whoami', ok: true, status: 'completed', context_summary: `User: ${user.email}`, data: { userId: user.id, email: user.email } });
      } catch (error) {
        printResult('Error', false, `Failed to get user info: ${error}`);
        finish({ checkpoint: 'whoami', ok: false, status: 'failed', context_summary: 'Failed to get user info', data: {} });
      }
    });

  return cmd;
}
