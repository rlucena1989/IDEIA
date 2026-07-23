import { Command } from 'commander';

export function workflowCommand(): Command {
  const cmd = new Command('workflow')
    .description('Start the IDEIA IDE (alias for `ide` command)');

  cmd
    .command('serve')
    .description('Start the IDE server')
    .option('--port <port>', 'Server port', '3001')
    .action(async (options) => {
      const { startIdeServer } = await import('../ide/ide-server');
      const root = process.cwd();
      const port = parseInt(options.port, 10);
      const server = await startIdeServer({ port, root, host: '127.0.0.1' });
      console.log('[workflow] IDE server at ' + server.address);
    });

  return cmd;
}
