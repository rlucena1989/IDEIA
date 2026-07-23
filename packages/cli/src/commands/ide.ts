/**
 * ide.ts — Comando CLI: ideia ide
 *
 * Inicia o servidor da IDE local, expondo a API REST + WebSocket.
 *
 * Uso:
 *   ideia ide                        # porta 3001, diretório atual
 *   ideia ide --port 4173            # porta customizada
 *   ideia ide --root /meu/projeto    # workspace específico
 *   ideia ide --host 0.0.0.0         # escuta em todas interfaces
 *   ideia ide --daemon               # rodar em background
 */

import { Command } from 'commander';

export function ideCommand(): Command {
  const cmd = new Command('ide');

  cmd
    .description('Start the local IDE server (HTTP API + WebSocket)')
    .option('-p, --port <number>', 'HTTP server port', '3001')
    .option('-r, --root <path>', 'Workspace root directory', process.cwd())
    .option('-H, --host <address>', 'Server host address', '127.0.0.1')
    .option('-d, --daemon', 'Run in background (detach process)')
    .action(async (options) => {
      const { startIdeServer } = await import('../ide/ide-server');

      const port = parseInt(options.port, 10);
      const root = options.root;
      const host = options.host;

      console.log('╔══════════════════════════════════════════╗');
      console.log('║          IDEIA IDE Server v0.1.0          ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log('');
      console.log(`  Port:     ${port}`);
      console.log(`  Host:     ${host}`);
      console.log(`  Root:     ${root}`);
      console.log('');

      if (options.daemon && !process.env.AI_DAEMON_CHILD) {
        const { fork } = await import('node:child_process');
        const child = fork(__filename, ['ide', '--port', String(port), '--root', root], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        console.log(`  PID:      ${child.pid}`);
        console.log('  IDE server started in background.');
        process.exit(0);
      }

      try {
        const server = await startIdeServer({
          port,
          root,
          host,
        });

        console.log('  API:      http://localhost:' + port + '/api/ide/status');
        console.log('  WS:       ws://localhost:' + port + '/ws');
        console.log('');
        console.log('  Press Ctrl+C to stop the server.');

        process.on('SIGINT', async () => {
          console.log('\n  Shutting down...');
          await server.stop();
          process.exit(0);
        });

        process.on('SIGTERM', async () => {
          await server.stop();
          process.exit(0);
        });
      } catch (_err) {
        console.error('  Failed to start IDE server:', (err as Error).message);
        process.exit(1);
      }
    });

  return cmd;
}
