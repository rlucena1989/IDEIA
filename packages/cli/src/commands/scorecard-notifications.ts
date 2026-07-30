import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { getIO } from '../io';

import { createLogger } from '@ideia/logger';

export interface Notification { type: 'desktop' | 'file' | 'webhook'; message: string; level: 'info' | 'warn' | 'error'; }

export function sendNotifications(notifications: Notification[], webhookUrl?: string): void {
  for (const n of notifications) {
    const logFile = path.join(cwd(), '.ai/reports/scorecard/notifications.log');
    getIO().fs.mkDir(path.dirname(logFile), true);
    getIO().fs.append(logFile, `[${n.level.toUpperCase()}] ${new Date().toISOString()} — ${n.message}\n`);
    if (n.type === 'webhook' && webhookUrl) {
      try {
        const body = JSON.stringify({ level: n.level, message: n.message, timestamp: new Date().toISOString() });
        const u = new URL(webhookUrl);
        const mod = u.protocol === 'https:' ? https : http;
        const req = mod.request({ hostname: u.hostname, port: u.port ? parseInt(u.port) : mod === https ? 443 : 80, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } });
        req.write(body); req.end();
      } catch { /* */ }
    }
  }
  for (const n of notifications) {
    const icon = n.level === 'error' ? '[ERROR]' : n.level === 'warn' ? '[WARN]' : '[INFO]';

const log = createLogger('cli:commands:scorecard-notifications');
    log.info(`  ${icon} ${n.message}`);
  }
}

function cwd(): string { return getIO().fs.cwd(); }

export function publishResult(result: { overallScore: number; maturityLevel: string; evolution: { version: string }; git: Record<string, unknown>; timestamp: string; alerts: Notification[] }, webhookUrl?: string): void {
  if (webhookUrl) {
    try {
      const u = new URL(webhookUrl);
      const body = JSON.stringify({ score: result.overallScore, level: result.maturityLevel, version: result.evolution.version, git: result.git, timestamp: result.timestamp, alerts: result.alerts.slice(0, 5) });
      const req = http.request({ hostname: u.hostname, port: u.port || 80, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } });
      req.write(body); req.end();
    } catch { /* */ }
  }
}
