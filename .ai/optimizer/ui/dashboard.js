const vscodeApi = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
const isStandalone = !vscodeApi;

let riskChart = null;
let qualityChart = null;
let historyChart = null;

async function loadJSON(path, fallback = null) {
  try {
    const res = await fetch(path);
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

async function loadText(path, fallback = '') {
  try {
    const res = await fetch(path);
    if (!res.ok) return fallback;
    return await res.text();
  } catch {
    return fallback;
  }
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function setStatus(text, level = 'info') {
  const el = document.getElementById('status');
  el.textContent = text;
  el.dataset.level = level;
}

function getSeverityClass(score, isRisk) {
  if (isRisk) {
    if (score >= 70) return 'bad';
    if (score >= 30) return 'warn';
    return 'good';
  }
  if (score >= 80) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

function renderCharts(data) {
  const riskScore = (data.risk && data.risk.score) || 0;
  const qualityScore = (data.quality && data.quality.score) || 0;

  if (riskChart) riskChart.destroy();
  if (qualityChart) qualityChart.destroy();

  riskChart = new Chart(document.getElementById('riskChart'), {
    type: 'doughnut',
    data: {
      labels: ['Risk', 'Remaining'],
      datasets: [{
        data: [riskScore, 100 - riskScore],
        backgroundColor: [
          riskScore >= 70 ? '#ef4444' : riskScore >= 30 ? '#f59e0b' : '#22c55e',
          '#1e293b'
        ],
        borderWidth: 0
      }]
    },
    options: {
      cutout: '70%',
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { width, height, ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = riskScore >= 70 ? '#ef4444' : riskScore >= 30 ? '#f59e0b' : '#22c55e';
        ctx.fillText(riskScore, width / 2, height / 2 - 8);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('/ 100', width / 2, height / 2 + 16);
        ctx.restore();
      }
    }]
  });

  qualityChart = new Chart(document.getElementById('qualityChart'), {
    type: 'doughnut',
    data: {
      labels: ['Quality', 'Remaining'],
      datasets: [{
        data: [qualityScore, 100 - qualityScore],
        backgroundColor: [
          qualityScore >= 80 ? '#22c55e' : qualityScore >= 50 ? '#f59e0b' : '#ef4444',
          '#1e293b'
        ],
        borderWidth: 0
      }]
    },
    options: {
      cutout: '70%',
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { width, height, ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = qualityScore >= 80 ? '#22c55e' : qualityScore >= 50 ? '#f59e0b' : '#ef4444';
        ctx.fillText(qualityScore, width / 2, height / 2 - 8);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('/ 100', width / 2, height / 2 + 16);
        ctx.restore();
      }
    }]
  });

  renderHistoryChart(data.history);
}

function renderHistoryChart(history) {
  if (historyChart) historyChart.destroy();

  const events = (history && history.events) || [];
  if (events.length === 0) return;

  const labels = events.map(e => {
    const d = new Date(e.timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });

  const riskScores = events.map(e => {
    const d = e.data && e.data.risk;
    return d && d.score != null ? d.score : null;
  });

  const qualityScores = events.map(e => {
    const d = e.data && e.data.quality;
    return d && d.score != null ? d.score : null;
  });

  historyChart = new Chart(document.getElementById('historyChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Risk',
          data: riskScores,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          spanGaps: true
        },
        {
          label: 'Quality',
          data: qualityScores,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          spanGaps: true
        }
      ]
    },
    options: {
      responsive: false,
      plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: '#64748b', maxTicksLimit: 8 }, grid: { color: '#1e293b' } },
        y: { min: 0, max: 100, ticks: { color: '#64748b' }, grid: { color: '#334155' } }
      }
    }
  });
}

function renderMaturityGauge(score) {
  const el = document.getElementById('maturityGauge');
  if (!el) return;
  const level = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D';
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : score >= 50 ? '#f97316' : '#ef4444';
  const bar = '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10));
  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:28px;font-weight:bold;color:${color}">${level}</span>
    <div style="flex:1">
      <div style="font-size:14px;color:#e2e8f0">${score}/100</div>
      <div style="font-family:monospace;color:${color}">${bar}</div>
    </div>
  </div>`;
}

function renderScorecardCategories(categories) {
  const el = document.getElementById('scorecardCats');
  if (!el || !categories) { return; }
  el.innerHTML = categories
    .filter(c => c.weight > 0)
    .map(c => {
      const pct = Math.round(c.score);
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      return `<div class="sc-row">
        <span class="sc-name">${c.name}</span>
        <span class="sc-bar" style="color:${pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'}">${bar}</span>
        <span class="sc-score">${pct}</span>
      </div>`;
    }).join('');
}

async function loadScorecard() {
  try {
    const sc = await loadJSON('../../reports/scorecard/latest.json');
    if (!sc) return;
    renderMaturityGauge(sc.overallScore);
    renderScorecardCategories(sc.categories);
    document.getElementById('scorecardPanel').style.display = 'block';
  } catch { /* scorecard not available */ }
}

function updateSummaryCards(data) {
  const riskScore = (data.risk && data.risk.score) || 0;
  const qualityScore = (data.quality && data.quality.score) || 0;
  const decision = data.decision || {};

  const riskEl = document.getElementById('s-risk');
  riskEl.textContent = riskScore;
  riskEl.className = 'value ' + getSeverityClass(riskScore, true);

  const qualityEl = document.getElementById('s-quality');
  qualityEl.textContent = qualityScore;
  qualityEl.className = 'value ' + getSeverityClass(qualityScore, false);

  document.getElementById('s-mode').textContent = decision.execution_mode || '-';
  document.getElementById('s-mode').className = 'value';

  const taskEl = document.getElementById('s-task');
  taskEl.textContent = decision.task_type || '-';
  taskEl.className = 'value';
}

function renderTimeline(history) {
  const container = document.getElementById('timeline');
  const events = (history && history.events) || [];

  if (events.length === 0) {
    container.innerHTML = '<p style="color:#64748b">No execution history found.</p>';
    return;
  }

  const reversed = [...events].reverse().slice(0, 10);
  container.innerHTML = reversed.map(ev => {
    const ts = new Date(ev.timestamp).toLocaleString();
    const typeClass = ev.type === 'approved' ? 'approved' : ev.type === 'rejected' ? 'rejected' : 'review';
    return `<div class="tl-event ${typeClass}">
      <span class="tl-time">${ts}</span>
      <span class="tl-type">${ev.type.toUpperCase()}</span>
      <span class="tl-desc">${ev.description || ''}</span>
    </div>`;
  }).join('');
}

async function refresh() {
  const base = '../runtime';

  const [decision, risk, quality, patch, memory, history, diff] = await Promise.all([
    loadJSON(`${base}/latest-decision.json`),
    loadJSON(`${base}/latest-risk.json`),
    loadJSON(`${base}/latest-quality.json`),
    loadJSON(`${base}/latest-patch.json`),
    loadJSON(`${base}/latest-memory.json`),
    loadJSON(`${base}/latest-history.json`, { events: [] }),
    loadText(`${base}/latest-diff.txt`)
  ]);

  const data = { decision, risk, quality, patch, memory, history };

  const decisionEl = document.getElementById('decision');
  if (decision) {
    decisionEl.textContent = pretty(decision);
    decisionEl.className = '';
  } else {
    decisionEl.textContent = 'No data — run "ai-devkit optimize run <request.json>"';
    decisionEl.className = 'empty';
  }

  const patchEl = document.getElementById('patch');
  patchEl.textContent = patch ? pretty(patch) : 'No data';
  patchEl.className = patch ? '' : 'empty';

  const diffEl = document.getElementById('diff');
  diffEl.textContent = diff || '(empty)';
  diffEl.className = diff ? '' : 'empty';

  const memoryEl = document.getElementById('memory');
  if (memory) {
    const hits = memory.hits || [];
    memoryEl.textContent = hits.length > 0
      ? hits.map(h => `- ${h.pattern || h.id || h.name} (${h.score || '?'})`).join('\n')
      : '0 memory hits';
  } else {
    memoryEl.textContent = 'No data';
  }
  memoryEl.className = memory ? '' : 'empty';

  updateSummaryCards(data);
  renderCharts(data);
  renderTimeline(history);
  loadScorecard();
  setStatus(`Refreshed at ${new Date().toLocaleTimeString()}.`, 'success');
}

function bindButtons() {
  document.getElementById('approveBtn').addEventListener('click', () => {
    if (vscodeApi) vscodeApi.postMessage({ type: 'approve', reason: 'Approved from dashboard' });
    setStatus('Approval sent.', 'info');
  });
  document.getElementById('rejectBtn').addEventListener('click', () => {
    if (vscodeApi) vscodeApi.postMessage({ type: 'reject', reason: 'Rejected from dashboard' });
    setStatus('Rejection sent.', 'warn');
  });
  document.getElementById('rollbackBtn').addEventListener('click', () => {
    if (vscodeApi) vscodeApi.postMessage({ type: 'rollback' });
    setStatus('Rollback requested.', 'warn');
  });
  document.getElementById('timelineBtn').addEventListener('click', () => {
    if (vscodeApi) vscodeApi.postMessage({ type: 'openTimeline' });
    else window.location.href = './timeline.html';
  });
  document.getElementById('compareBtn').addEventListener('click', () => {
    if (vscodeApi) vscodeApi.postMessage({ type: 'openCompare' });
    else window.location.href = './compare.html';
  });
  document.getElementById('scorecardBtn').addEventListener('click', () => {
    loadScorecard();
    setStatus('Scorecard loaded.', 'info');
  });
  document.getElementById('refreshBtn').addEventListener('click', () => {
    refresh();
    loadScorecard();
    setStatus('Refreshed.', 'info');
  });
}

function listenMessages() {
  if (!vscodeApi) return;
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || !message.type) return;
    if (message.type === 'status') setStatus(message.text || 'Status updated.', message.level || 'info');
    if (message.type === 'refresh') refresh();
  });
}

const autoRefreshInterval = setInterval(refresh, 30000);
bindButtons();
listenMessages();
refresh();

if (isStandalone && window.EventSource) {
  const es = new EventSource('/api/events');
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'refresh') refresh();
    } catch { /* ignore */ }
  };
  es.onerror = () => {}; // SSE not available, fall back to polling
}
