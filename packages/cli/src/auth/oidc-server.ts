import http from 'node:http';
import https from 'node:https';
import { createLogger } from '@ideia/logger';
import { loadTlsOptions } from '../utils/crypto-utils';

const log = createLogger('oidc-server');

export interface OIDCCallbackResult {
  code: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

export function startOIDCServer(port: number = 3000, timeoutMs: number = 120000, enableTls?: boolean): Promise<OIDCCallbackResult> {
  return new Promise((resolve, reject) => {
    const tlsOpts = enableTls !== false ? loadTlsOptions() : null;
    const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
      const proto = tlsOpts ? 'https' : 'http';
      const url = new URL(req.url ?? '/', `${proto}://localhost:${port}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html><body>
            <h1>Authentication Failed</h1>
            <p>${error}: ${errorDescription || 'Unknown error'}</p>
            <p>You can close this window and try again.</p>
          </body></html>
        `);
        server.close();
        resolve({ code: '', state: state || '', error, errorDescription: errorDescription || '' });
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<html><body><h1>No authorization code received</h1></body></html>`);
        server.close();
        reject(new Error('No authorization code received'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body>
          <h1>Authentication Successful</h1>
          <p>You are now logged in. You can close this window.</p>
          <script>window.close();</script>
        </body></html>
      `);

      server.close();
      resolve({ code, state: state || '' });
    };

    const server = tlsOpts
      ? https.createServer(tlsOpts, handler)
      : http.createServer(handler);

    server.listen(port, () => {
      const proto = tlsOpts ? 'https' : 'http';
      log.info(`OIDC callback server listening on ${proto}://localhost:${port}/callback`);
      if (tlsOpts) log.info('TLS 1.3 enabled');
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        log.warn(`Port ${port} is in use, cannot start OIDC server`);
        reject(new Error(`Port ${port} is already in use. Close the application using it or specify a different port.`));
      } else {
        reject(err);
      }
    });

    setTimeout(() => {
      server.close();
      reject(new Error(`Authentication timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);
  });
}
