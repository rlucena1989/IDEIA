import { Command } from 'commander';
import { getEnvConfig } from '@ideia/config-engine';
import { createAuthProvider, AuthConfig, OAuth2AuthProvider, AuthProviderType } from '../auth/auth-provider';
import { startOIDCServer } from '../auth/oidc-server';
import { printLine, printResult, finish } from '../utils/output';
import { createLogger } from '@ideia/logger';
import { execSync } from 'node:child_process';

const log = createLogger('login-cmd');

function tryOpenBrowser(url: string): void {
  try {
    const platform = process.platform;
    if (platform === 'win32') {
      execSync(`start "" "${url}"`, { timeout: 5000, stdio: 'ignore' });
    } else if (platform === 'darwin') {
      execSync(`open "${url}"`, { timeout: 5000, stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${url}"`, { timeout: 5000, stdio: 'ignore' });
    }
  } catch {
    log.warn('Could not open browser automatically');
  }
}

export function loginCommand(): Command {
  const cmd = new Command('login');

  cmd
    .description('Authenticate with an identity provider')
    .option('--provider <provider>', 'Auth provider (auth0, clerk, oauth2)', getEnvConfig().authProvider)
    .option('--domain <domain>', 'Auth0 domain / issuer URL')
    .option('--client-id <id>', 'OAuth2 client ID')
    .option('--audience <audience>', 'API audience')
    .option('--port <port>', 'Local callback server port', '3000')
    .option('--no-browser', 'Do not auto-open browser')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const provider = options.provider || getEnvConfig().authProvider;
      const config: AuthConfig = {
        provider: provider as AuthProviderType,
        clientId: options.clientId || getEnvConfig().auth0ClientId,
        clientSecret: getEnvConfig().jwtSecret,
        issuerUrl: options.domain || getEnvConfig().auth0Domain || 'https://your-tenant.auth0.com',
        redirectUri: `http://localhost:${options.port}/callback`,
        scopes: ['openid', 'profile', 'email'],
      };

      try {
        const authProvider = createAuthProvider(config);

        if (authProvider instanceof OAuth2AuthProvider) {
          const authUrl = authProvider.getAuthorizationUrl();
          printLine(`\n🔐 Opening browser for Auth0 login...`);
          printLine(`If browser does not open, visit:\n  ${authUrl}\n`);

          if (options.browser !== false) {
            tryOpenBrowser(authUrl);
          }

          const callback = await startOIDCServer(parseInt(options.port, 10));
          if (callback.error) {
            throw new Error(`Auth error: ${callback.error}: ${callback.errorDescription}`);
          }

          const session = await authProvider.login({ code: callback.code });
          const user = await authProvider.getUser(session.id);

          if (options.json) {
            printLine(JSON.stringify({ session: { id: session.id, expiresAt: session.expiresAt }, user }, null, 2));
          } else {
            printLine(`✅ Logged in as: ${user.name} (${user.email})`);
            printLine(`   Session: ${session.id.substring(0, 12)}...`);
            printLine(`   Expires: ${new Date(session.expiresAt).toLocaleString()}`);
            printLine(`   Roles: ${user.roles.join(', ')}`);
          }

          finish({ checkpoint: 'login', ok: true, status: 'completed', context_summary: `Logged in as ${user.email}`, data: { userId: user.id } });
        } else {
          const session = await authProvider.login();
          const user = await authProvider.getUser(session.id);

          if (options.json) {
            printLine(JSON.stringify({ session: { id: session.id, expiresAt: session.expiresAt }, user }, null, 2));
          } else {
            printLine(`✅ Logged in as: ${user.name} (${user.email})`);
            printLine(`   Session: ${session.id.substring(0, 12)}...`);
            printLine(`   Expires: ${new Date(session.expiresAt).toLocaleString()}`);
            printLine(`   Roles: ${user.roles.join(', ')}`);
          }

          finish({ checkpoint: 'login', ok: true, status: 'completed', context_summary: `Logged in as ${user.email}`, data: { userId: user.id } });
        }
      } catch (error) {
        log.error('Login failed', { error });
        printResult('Error', false, `Login failed: ${error}`);
        finish({ checkpoint: 'login', ok: false, status: 'failed', context_summary: 'Login failed', data: {} });
      }
    });

  return cmd;
}
