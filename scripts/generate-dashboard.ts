import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const METRICS_DIR = join(ROOT, '.ai', 'metrics');
const DASHBOARD_PATH = join(ROOT, '.ai', 'dashboard.html');

interface SloSnapshot {
  timestamp: string;
  testCount: number;
  testSuites: number;
  tscErrors: number;
  packageCount: number;
  bundleSizeKb: number;
  execSyncCount: number;
  durationMs: number;
}

function getLatestReport(): string {
  const reportsDir = join(ROOT, '.ai', 'reports');
  if (!existsSync(reportsDir)) return '';
  const files = readdirSync(reportsDir).filter(f => f.endsWith('.md')).sort().reverse();
  if (files.length === 0) return '';
  return readFileSync(join(reportsDir, files[0]), 'utf8').slice(0, 1000);
}

function generateHtml(): string {
  const history: SloSnapshot[] = existsSync(join(METRICS_DIR, 'slo-history.json'))
    ? JSON.parse(readFileSync(join(METRICS_DIR, 'slo-history.json'), 'utf8'))
    : [];

  const latest = history[history.length - 1];
  const reportSnippet = getLatestReport().replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const dataScript = history.length > 0
    ? `const data = ${JSON.stringify(history)};`
    : 'const data = [];';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IDEIA Audit Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 2rem; }
  h1 { color: #58a6ff; margin-bottom: 0.5rem; }
  h2 { color: #8b949e; font-size: 1rem; font-weight: 400; margin-bottom: 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.25rem; }
  .card h3 { color: #8b949e; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  .card .value { font-size: 2rem; font-weight: 600; color: #f0f6fc; }
  .card .status { font-size: 0.8rem; margin-top: 0.25rem; }
  .green { color: #3fb950; } .red { color: #f85149; } .yellow { color: #d29922; }
  .report { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.25rem; font-family: 'Courier New', monospace; font-size: 0.85rem; white-space: pre-wrap; line-height: 1.5; }
  canvas { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem; margin-bottom: 2rem; width: 100%; height: 300px; }
</style>
</head>
<body>
<h1>🔍 IDEIA Audit Dashboard</h1>
<h2>Last updated: ${latest?.timestamp ?? 'N/A'}</h2>

<div class="grid">
  <div class="card"><h3>Tests</h3><div class="value">${latest?.testCount ?? '—'}</div><div class="status green">${latest?.testSuites ?? '—'} suites</div></div>
  <div class="card"><h3>TSC Errors</h3><div class="value ${latest?.tscErrors ? 'red' : 'green'}">${latest?.tscErrors ?? '—'}</div><div class="status">0 = clean</div></div>
  <div class="card"><h3>Bundle Size</h3><div class="value">${latest?.bundleSizeKb ?? '—'}</div><div class="status">KB</div></div>
  <div class="card"><h3>execSync</h3><div class="value ${latest?.execSyncCount ? 'red' : 'green'}">${latest?.execSyncCount ?? '—'}</div><div class="status">0 = clean</div></div>
  <div class="card"><h3>Packages</h3><div class="value">${latest?.packageCount ?? '—'}</div><div class="status">total</div></div>
</div>

<canvas id="chart"></canvas>

<div class="report">${reportSnippet}</div>

<script>
${dataScript}
if (data.length > 1) {
  const ctx = document.getElementById('chart').getContext('2d');
  const labels = data.map(d => d.timestamp.slice(0, 10));
  const tests = data.map(d => d.testCount);
  const errors = data.map(d => d.tscErrors);
  const bundles = data.map(d => d.bundleSizeKb || 0);

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  function drawLine(data, color) {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < data.length; i++) {
      const x = pad.left + (i / (data.length - 1)) * plotW;
      const y = pad.top + plotH - ((data[i] - min) / range) * plotH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * plotH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
  }
  drawLine(tests, '#3fb950');
  drawLine(errors, '#f85149');
  drawLine(bundles, '#d29922');

  ctx.fillStyle = '#8b949e'; ctx.font = '11px sans-serif';
  ctx.fillText('Tests (green)', w - 120, 20);
  ctx.fillText('Errors (red)', w - 120, 35);
  ctx.fillText('Bundle (yellow)', w - 120, 50);
}
</script>
</body>
</html>`;
}

function main(): void {
  if (!existsSync(METRICS_DIR)) mkdirSync(METRICS_DIR, { recursive: true });
  writeFileSync(DASHBOARD_PATH, generateHtml(), 'utf8');
  console.log(`Dashboard: ${DASHBOARD_PATH}`);
}

main();
