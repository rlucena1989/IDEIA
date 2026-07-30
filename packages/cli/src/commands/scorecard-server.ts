import http from 'node:http';
import { createLogger } from '@ideia/logger';
import https from 'node:https';
import path from 'node:path';
import { getIO } from '../io';
import { generateHTML } from './scorecard-report';
import { sendNotifications, type Notification } from './scorecard-notifications';
import { detectRegression } from './scorecard-utils';
import { loadTlsOptions } from '../utils/crypto-utils';
const logger = createLogger('scorecard-server');

export function cadenceMode(intervalMinutes: number, regressionThreshold: number, webhookUrl?: string): void {
  const { computeScorecard, saveAll } = require('./scorecard');
  logger.info(`\n  [CADENCE] Scorecard cadence (a cada ${intervalMinutes}min). Ctrl+C para sair.\n`);
  const tick = () => {
    computeScorecard().then((r: any) => {
      saveAll(r);
      const reg = detectRegression(r, regressionThreshold);
      const nots: Notification[] = [];
      if (reg.regressed) {
        nots.push({ type: 'file', message: `Score dropped! ${reg.drops.map((d: any) => `${d.category}: ${d.from}→${d.to}`).join(', ')}`, level: 'error' });
        if (webhookUrl) nots.push({ type: 'webhook', message: `Scorecard regression: ${r.overallScore}/100`, level: 'error' });
      }
      if (r.overallScore >= 90) nots.push({ type: 'file', message: `Score maintained at ${r.overallScore}/100 (${r.maturityLevel})`, level: 'info' });
      if (nots.length > 0) sendNotifications(nots, webhookUrl);
      process.stdout.write('\x1b[1A\x1b[2K');
      const g = r.overallScore >= 90 ? 'GREEN' : r.overallScore >= 70 ? 'YELLOW' : r.overallScore >= 50 ? 'ORANGE' : 'RED';
      logger.info(`  ${g} ${r.timestamp.slice(11, 19)} — ${r.overallScore}/100 (${r.maturityLevel}) — ${reg.regressed ? 'W regression' : 'stable'}`);
    }).catch((err: any) => logger.error('Scorecard cadence error', err));
  };
  tick();
  const intervalHandle = setInterval(tick, intervalMinutes * 60 * 1000);
  process.on('SIGINT', () => { clearInterval(intervalHandle); process.exit(0); });
  process.on('SIGTERM', () => { clearInterval(intervalHandle); process.exit(0); });
}

export function watchMode(interval: number): void {
  const { computeScorecard, saveAll } = require('./scorecard');
  logger.info(`\n  [WATCH] Scorecard watch mode (a cada ${interval}s). Ctrl+C para sair.\n`);
  const tick = () => {
    computeScorecard().then((r: any) => {
      saveAll(r);
      process.stdout.write('\x1b[1A\x1b[2K');
      const g = r.overallScore >= 90 ? 'GREEN' : r.overallScore >= 70 ? 'YELLOW' : r.overallScore >= 50 ? 'ORANGE' : 'RED';
      logger.info(`  ${g} ${r.timestamp.slice(11, 19)} — ${r.overallScore}/100 (${r.maturityLevel}) — ${r.evolution.items} itens — ${r.meta.durationMs}ms`);
    }).catch((err: any) => logger.error('Scorecard watch error', err));
  };
  tick();
  const intervalHandle = setInterval(tick, interval * 1000);
  process.on('SIGINT', () => { clearInterval(intervalHandle); process.exit(0); });
  process.on('SIGTERM', () => { clearInterval(intervalHandle); process.exit(0); });
}

export function serveMode(port: number, enableTls?: boolean): void {
  const { computeScorecard, saveAll } = require('./scorecard');
  const tlsOpts = enableTls !== false ? loadTlsOptions() : null;
  const server = tlsOpts
    ? https.createServer(tlsOpts, (req: http.IncomingMessage, res: http.ServerResponse) => {
        handleScorecardRequest(req, res);
      })
    : http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
        handleScorecardRequest(req, res);
      });

  function handleScorecardRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url || '/';
    const respondWithScorecard = () => {
      computeScorecard().then((r: any) => {
        saveAll(r);
        if (url === '/' || url === '/index.html') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(generateHTML(r));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(r, null, 2));
        }
      }).catch(() => { res.writeHead(500); res.end('Internal error'); });
    };
    if (url === '/' || url === '/index.html') {
      respondWithScorecard();
    } else if (url === '/api/scorecard') {
      respondWithScorecard();
    } else if (url === '/api/history') {
      const h = readFile('.ai/reports/scorecard/history.json') || '[]';
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(h);
    } else if (url === '/badge.svg') {
      const b = readFile('.ai/reports/scorecard/badge.svg') || '';

      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(b);
    } else {
      res.writeHead(404); res.end('404');
    }
  }
  server.listen(port, () => {
    const proto = tlsOpts ? 'https' : 'http';
    process.stdout.write(`\n  [SERVER] Scorecard server: ${proto}://localhost:${port}\n  Ctrl+C para sair\n\n`);
    if (tlsOpts) logger.info('  [SERVER] TLS 1.3 enabled');
  });
  process.on('SIGINT', () => { server.close(); process.exit(0); });
  process.on('SIGTERM', () => { server.close(); process.exit(0); });
}

function readFile(f: string): string | null {
  try { return getIO().fs.read(path.join(getIO().fs.cwd(), f), 'utf8'); } catch { return null; }
}
