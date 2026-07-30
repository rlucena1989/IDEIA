import { WebSocketServer } from 'ws';
import { createLogger } from '@ideia/logger';

const log = createLogger('dap-setup');

interface _DAPEvent {
  type?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export function setupDAP(wss: WebSocketServer): void {
  wss.on('connection', (ws, req) => {
    if (!req.url?.startsWith('/dap')) return;
    log.info('Client connected');

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        log.info(`Command: ${msg.command}`);
      } catch (_err) {
        log.error(`Invalid message: ${_err}`);
      }
    });

    ws.on('close', () => log.info('Client disconnected'));
  });
}
