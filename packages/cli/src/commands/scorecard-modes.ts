import path from 'node:path';
import { createLogger } from '@ideia/logger';
import { getIO } from '../io';
import http from 'node:http';
import https from 'node:https';
import { root, read } from './scorecard-helpers';
import { generateHTML, generateBadge, sendNotifications } from './scorecard-reporting';
import type { ScorecardResult, PolicyGate, Notification } from './scorecard';
import { loadTlsOptions } from '../utils/crypto-utils';
const logger = createLogger('scorecard-modes');

export function loadPolicyGates(): PolicyGate[] {
  const raw = read('.ai/scorecard/policy.yaml');
  if (!raw) return [];
  const gates: PolicyGate[] = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s+-\s+category:\s*"(.+)"\s*$/);
    if (m) {
      const cat = m[1];
      const minM = raw.match(
        new RegExp(`category:\\s*"${cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}".*?minScore:\\s*(\\d+).*?action:\\s*"(\\w+)"`, 's'),
      );
      if (minM) gates.push({ category: cat, minScore: parseInt(minM[1]), action: minM[2] as PolicyGate['action'] });
    }
  }
  return gates;
}

export function applyPolicyGates(result: ScorecardResult, gates: PolicyGate[]): { blocked: boolean; tasksCreated: number } {
  let blocked = false,
    tasksCreated = 0;
  for (const gate of gates) {
    const cat = result.categories.find((c) => c.name.toLowerCase().includes(gate.category.toLowerCase()));
    if (cat && Math.round(cat.score) < gate.minScore) {
      if (gate.action === 'block') blocked = true;
      if (gate.action === 'auto-create-task') {
        const taskId = `POLICY-${gate.category}-${Date.now().toString(36)}`;
        const b = read('.ai/tasks/backlogger.md') || '# Backlog\n';
        if (!b.includes(taskId)) {
          getIO().fs.write(
            path.join(root(), '.ai/tasks/backlogger.md'),
            b + `\n- [ ] **${taskId}**: [Policy] ${gate.category} abaixo de ${gate.minScore} (${Math.round(cat.score)})\n`,
          );
          tasksCreated++;
        }
      }
    }
  }
  return { blocked, tasksCreated };
}

export function cadenceMode(intervalMinutes: number, regressionThreshold: number, webhookUrl?: string): void {
  const { computeScorecard, saveAll } = require('./scorecard');
  logger.info(`\n  🔄 Scorecard cadence (a cada ${intervalMinutes}min). Ctrl+C para sair.\n`);
  const tick = () => {
    computeScorecard()
      .then((r: any) => {
        saveAll(r);
        const { detectRegression } = require('./scorecard');
        const reg = detectRegression(r, regressionThreshold);
        const nots: Notification[] = [];
        if (reg.regressed) {
          nots.push({
            type: 'file',
            message: `Score dropped! ${reg.drops.map((d: { category: string; from: number; to: number }) => `${d.category}: ${d.from}→${d.to}`).join(', ')}`,
            level: 'error',
          });
          if (webhookUrl) nots.push({ type: 'webhook', message: `Scorecard regression: ${r.overallScore}/100`, level: 'error' });
        }
        if (r.overallScore >= 90)
          nots.push({ type: 'file', message: `Score maintained at ${r.overallScore}/100 (${r.maturityLevel})`, level: 'info' });
        if (nots.length > 0) sendNotifications(nots, webhookUrl);
        process.stdout.write('\x1b[1A\x1b[2K');
        const g = r.overallScore >= 90 ? '🟢' : r.overallScore >= 70 ? '🟡' : r.overallScore >= 50 ? '🟠' : '🔴';
        logger.info(
          `  ${g} ${r.timestamp.slice(11, 19)} — ${r.overallScore}/100 (${r.maturityLevel}) — ${reg.regressed ? '⚠ regression' : 'stable'}`,
        );
      })
      .catch((err: any) => logger.error('Scorecard cadence error', err));
  };
  tick();
  const intervalHandle = setInterval(tick, intervalMinutes * 60 * 1000);
  process.on('SIGINT', () => {
    clearInterval(intervalHandle);
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    clearInterval(intervalHandle);
    process.exit(0);
  });
}

export function watchMode(interval: number): void {
  const { computeScorecard, saveAll } = require('./scorecard');
  logger.info(`\n  🔄 Scorecard watch mode (a cada ${interval}s). Ctrl+C para sair.\n`);
  const tick = () => {
    computeScorecard()
      .then((r: any) => {
        saveAll(r);
        process.stdout.write('\x1b[1A\x1b[2K');
        const g = r.overallScore >= 90 ? '🟢' : r.overallScore >= 70 ? '🟡' : r.overallScore >= 50 ? '🟠' : '🔴';
        logger.info(
          `  ${g} ${r.timestamp.slice(11, 19)} — ${r.overallScore}/100 (${r.maturityLevel}) — ${r.evolution.items} itens — ${r.meta.durationMs}ms`,
        );
      })
      .catch((err: any) => logger.error('Scorecard watch error', err));
  };
  tick();
  const intervalHandle = setInterval(tick, interval * 1000);
  process.on('SIGINT', () => {
    clearInterval(intervalHandle);
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    clearInterval(intervalHandle);
    process.exit(0);
  });
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
      computeScorecard()
        .then((r: any) => {
          saveAll(r);
          if (url === '/' || url === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(generateHTML(r));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(r, null, 2));
          }
        })
        .catch(() => {
          res.writeHead(500);
          res.end('Internal error');
        });
    };
    if (url === '/' || url === '/index.html') {
      respondWithScorecard();
    } else if (url === '/api/scorecard') {
      respondWithScorecard();
    } else if (url === '/api/history') {
      const h = read('.ai/reports/scorecard/history.json') || '[]';

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(h);
    } else if (url === '/badge.svg') {
      const b = read('.ai/reports/scorecard/badge.svg') || generateBadge(0);
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(b);
    } else {
      res.writeHead(404);
      res.end('404');
    }
  }
  server.listen(port, () => {
    const proto = tlsOpts ? 'https' : 'http';
    process.stdout.write(`\n  \u{1F310} Scorecard server: ${proto}://localhost:${port}\n  Ctrl+C para sair\n\n`);
    if (tlsOpts) logger.info('  [SERVER] TLS 1.3 enabled');
  });
}
