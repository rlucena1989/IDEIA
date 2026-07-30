import type { ScorecardResult } from './scorecard';
import { createLogger } from '@ideia/logger';
const logger = createLogger('scorecard-report');

export function generateHTML(result: ScorecardResult): string {
  const scoreColor = result.overallScore >= 90 ? '#22c55e' : result.overallScore >= 70 ? '#f59e0b' : result.overallScore >= 50 ? '#f97316' : '#ef4444';
  const catsHtml = result.categories.filter(c => c.weight > 0).map(c => {
    const pct = Math.round(c.score);
    const barW = Math.round(pct / 100 * 300);
    const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
    return `<div class="cat"><div class="cat-h"><span>${c.name}</span><span>${pct}/100</span></div>
      <div class="bar-bg"><div class="bar" style="width:${barW}px;background:${color}"></div></div>
      <div class="items">${c.items.map(i => `<div class="item ${i.passed ? 'ok' : 'fail'}">${i.passed ? 'PASS' : 'FAIL'} ${i.description}${i.value !== undefined ? ` <span class="val">(${i.value})</span>` : ''}</div>`).join('')}</div></div>`;
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
    <div class="meta">Nivel ${result.maturityLevel} · ${result.evolution.version} · ${result.evolution.categories} categorias · ${result.evolution.items} itens<br>
    ${result.git.branch}@${result.git.commit} · ${result.timestamp.slice(0, 19)} · ${result.meta.durationMs}ms</div>
    <div class="badge">score</div>
    ${catsHtml}
    ${result.alerts.length > 0 ? `<h2 style="color:#ef4444">Alertas (${result.alerts.length})</h2>
      ${result.alerts.map(a => `<div style="color:#ef4444;padding:4px 0">${a.message}</div>`).join('')}</div>` : ''}
    <div class="footer">Gerado pelo AI-Devkit Scorecard v5</div></body></html>`;
}
