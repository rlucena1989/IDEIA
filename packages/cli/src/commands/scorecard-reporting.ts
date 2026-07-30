import path from 'node:path';
import { createLogger } from '@ideia/logger';
import { getIO } from '../io';
import http from 'node:http';
import https from 'node:https';
import { root, read, shieldColor } from './scorecard-helpers';
import type { ScorecardResult, Notification } from './scorecard';
const logger = createLogger('scorecard-reporting');

export function generateBadge(score: number): string {
  const color = shieldColor(score);
  const label = 'maturidade';
  const value = `${score}/100`;
  const w = 170;
  const lw = 80;
  const rw = w - lw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20">
    <linearGradient id="b" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
    <clipPath id="c"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
    <g clip-path="url(#c)">
      <rect width="${lw}" height="20" fill="#555"/>
      <rect x="${lw}" width="${rw}" height="20" fill="${color === 'brightgreen' ? '#4c1' : color === 'yellow' ? '#dfb317' : color === 'orange' ? '#fe7d37' : '#e05d44'}"/>
      <rect width="${w}" height="20" fill="url(#b)"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="${lw / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text><text x="${lw / 2}" y="14">${label}</text>
      <text x="${lw + rw / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text><text x="${lw + rw / 2}" y="14">${value}</text>
    </g></svg>`;
}

export function generateHTML(result: ScorecardResult): string {
  const scoreColor = result.overallScore >= 90 ? '#22c55e' : result.overallScore >= 70 ? '#f59e0b' : result.overallScore >= 50 ? '#f97316' : '#ef4444';
  const catsHtml = result.categories.filter(c => c.weight > 0).map(c => {
    const pct = Math.round(c.score);
    const barW = Math.round(pct / 100 * 300);
    const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
    return `<div class="cat"><div class="cat-h"><span>${c.name}</span><span>${pct}/100</span></div>
      <div class="bar-bg"><div class="bar" style="width:${barW}px;background:${color}"></div></div>
      <div class="items">${c.items.map(i => `<div class="item ${i.passed ? 'ok' : 'fail'}">${i.passed ? '✅' : '❌'} ${i.description}${i.value !== undefined ? ` <span class="val">(${i.value})</span>` : ''}</div>`).join('')}</div></div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Scorecard Report — ${result.overallScore}/100</title>
    <style>
      body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px;max-width:900px;margin:0 auto}
      h1{font-size:1.5rem;margin:0}
      .score{font-size:3rem;font-weight:bold;color:${scoreColor}}
      .meta{color:#64748b;font-size:.9rem;margin:8px 0 24px}
      .cat{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;margin-bottom:12px}
      .cat-h{display:flex;justify-content:space-between;font-weight:600;margin-bottom:8px}
      .bar-bg{background:#0b1120;border-radius:6px;height:12px;margin-bottom:12px}
      .bar{height:12px;border-radius:6px;transition:width .3s}
      .items{font-size:.85rem;display:flex;flex-direction:column;gap:4px}
      .item{padding:4px 8px;border-radius:4px}
      .item.fail{background:#1a0a0a}
      .val{color:#64748b;font-size:.8rem}
      .badge{margin:12px 0}
      .footer{color:#475569;font-size:.8rem;text-align:center;margin-top:32px}
    </style></head><body>
    <h1>Scorecard de Maturidade</h1>
    <div class="score">${result.overallScore}<span style="font-size:1rem;color:#64748b">/100</span></div>
    <div class="meta">Nível ${result.maturityLevel} · ${result.evolution.version} · ${result.evolution.categories} categorias · ${result.evolution.items} itens<br>
    ${result.git.branch}@${result.git.commit} · ${result.timestamp.slice(0, 19)} · ${result.meta.durationMs}ms</div>
    <div class="badge"><img src="badge.svg" alt="score"/></div>
    ${catsHtml}
    ${result.alerts.length > 0 ? `<h2 style="color:#ef4444">🔴 Alertas (${result.alerts.length})</h2>
      ${result.alerts.map(a => `<div style="color:#ef4444;padding:4px 0">${a.message}</div>`).join('')}</div>` : ''}
    <div class="footer">Gerado pelo AI-Devkit Scorecard v5</div></body></html>`;
}

export function sendNotifications(notifications: Notification[], webhookUrl?: string): void {
  for (const n of notifications) {
    const logFile = path.join(root(), '.ai/reports/scorecard/notifications.log');
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
    logger.info(`  ${n.level === 'error' ? '🔴' : n.level === 'warn' ? '🟡' : '🔵'} [${n.level.toUpperCase()}] ${n.message}`);
  }
}

export function publishResult(result: ScorecardResult, webhookUrl?: string): void {
  if (webhookUrl) {
    try {
      const u = new URL(webhookUrl);
      const body = JSON.stringify({ score: result.overallScore, level: result.maturityLevel, version: result.evolution.version, git: result.git, timestamp: result.timestamp, alerts: result.alerts.slice(0, 5) });
      const req = http.request({ hostname: u.hostname, port: u.port || 80, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } });
      req.write(body); req.end();
    } catch { /* */ }
  }
}

export function createTasksFromFailures(result: ScorecardResult): number {
  const backlog = path.join(root(), '.ai/tasks/backlog.md');
  let md = read(backlog) || '# Backlog\n\n## Tarefas Pendentes\n';

  let count = 0;
  for (const cat of result.categories) {
    if (cat.weight === 0) continue;
    for (const item of cat.items) {
      if (!item.passed && item.weight >= 2) {
        const taskId = `SCORE-${item.id}-${Date.now().toString(36)}`;
        const taskLine = `- [ ] **${taskId}**: [${cat.name}] ${item.description}${item.hint ? ` (${item.hint})` : ''}`;
        if (!md.includes(item.id)) { md += `\n${taskLine}`; count++; }
      }
    }
  }
  getIO().fs.write(backlog, md);
  return count;
}
