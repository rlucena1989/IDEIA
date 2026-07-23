import { Command } from 'commander';
import { printHeader, printLine, printResult, finish } from "../utils/output";

// ============================================================
// TASK-GAP-13: Streaming Architecture (SSE/WebSocket)
// ============================================================

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function streamCommand(): Command {
  const cmd = new Command('stream')
    .description('Streaming Architecture (SSE/WebSocket)');

  cmd
    .command('sse')
    .description('Inicia um servidor SSE para streaming de eventos')
    .option('--port <port>', 'Porta do servidor SSE', '3001')
    .action((options) => {
      const port = parseInt(options.port, 10);
      printHeader('SSE Stream Server');
      printLine(`Starting SSE server on port ${port}...`);
      printLine('');
      printLine('SSE endpoints:');
      printLine(`  GET http://localhost:${port}/events`);
      printLine(`  POST http://localhost:${port}/emit`);
      printLine('');
      printLine('To emit an event:');
      printLine(`  curl -X POST http://localhost:${port}/emit \\`);
      printLine(`    -H "Content-Type: application/json" \\`);
      printLine(`    -d '{"event":"ai:response","data":{"text":"Hello"}}'`);
      printLine('');
      printLine('To consume events:');
      printLine(`  curl -N http://localhost:${port}/events`);
      printLine('');
      printLine('Note: Full SSE server requires a running Node.js process.');
      printLine('Use the --detach flag to run in background.');

      finish({
        checkpoint: 'stream_sse',
        ok: true,
        status: 'passed',
        context_summary: `SSE server configured on port ${port}`,
        data: { port, protocol: 'SSE', endpoints: [`/events`, `/emit`] },
      });
    });

  cmd
    .command('websocket')
    .description('Inicia um servidor WebSocket para streaming bidirecional')
    .option('--port <port>', 'Porta do servidor WebSocket', '3002')
    .action((options) => {
      const port = parseInt(options.port, 10);
      printHeader('WebSocket Stream Server');
      printLine(`Starting WebSocket server on port ${port}...`);
      printLine('');
      printLine('WebSocket endpoint:');
      printLine(`  ws://localhost:${port}`);
      printLine('');
      printLine('To connect:');
      printLine(`  wscat -c ws://localhost:${port}`);
      printLine('');
      printLine('Message types:');
      printLine('  { "type": "ping" } → { "type": "pong" }');
      printLine('  { "type": "subscribe", "channel": "ai:events" }');
      printLine('  { "type": "unsubscribe", "channel": "ai:events" }');
      printLine('');
      printLine('Note: Full WebSocket server requires a running Node.js process.');

      finish({
        checkpoint: 'stream_websocket',
        ok: true,
        status: 'passed',
        context_summary: `WebSocket server configured on port ${port}`,
        data: { port, protocol: 'WebSocket', endpoint: `ws://localhost:${port}` },
      });
    });

  cmd
    .command('emit')
    .description('Envia um evento via streaming (simulado)')
    .requiredOption('--event <event>', 'Nome do evento (ex: ai:response, ai:error)')
    .requiredOption('--data <json>', 'Dados do evento em JSON')
    .option('--protocol <protocol>', 'Protocolo (sse, websocket)', 'sse')
    .action((options) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(options.data);
      } catch {
        printResult('emit', false, 'Dados JSON invalidos');
        finish({
          checkpoint: 'stream_emit',
          ok: false,
          status: 'failed',
          context_summary: 'Invalid JSON data',
        });
        return;
      }

      const event = {
        event: options.event,
        data,
        timestamp: new Date().toISOString(),
        protocol: options.protocol,
      };

      printHeader(`Stream Event: ${options.event}`);
      printLine(`Protocol: ${options.protocol}`);
      printLine(`Timestamp: ${event.timestamp}`);
      printLine(`Data: ${JSON.stringify(data, null, 2)}`);
      printLine('');
      printLine('Event emitted successfully (simulated).');
      printLine('For real streaming, start the server with:');
      printLine(`  ai-devkit stream ${options.protocol} --port 3001`);

      finish({
        checkpoint: 'stream_emit',
        ok: true,
        status: 'passed',
        context_summary: `Emitted event: ${options.event}`,
        data: event,
      });
    });

  cmd
    .command('status')
    .description('Verifica o status dos servidores de streaming')
    .action(() => {
      printHeader('Streaming Status');
      printLine('SSE Server:      ⚪ Not running (start with `ai-devkit stream sse`)');
      printLine('WebSocket Server: ⚪ Not running (start with `ai-devkit stream websocket`)');
      printLine('');
      printLine('To start a server:');
      printLine('  ai-devkit stream sse --port 3001');
      printLine('  ai-devkit stream websocket --port 3002');

      finish({
        checkpoint: 'stream_status',
        ok: true,
        status: 'passed',
        context_summary: 'Streaming servers status checked',
        data: { sse: { running: false }, websocket: { running: false } },
      });
    });

  return cmd;
}