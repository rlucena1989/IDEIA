#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  const root = process.cwd();
  const runtimeDir = path.join(root, '.ai/optimizer/runtime');
  const reportsDir = path.join(root, '.ai/reports/latest');
  const optimizerReports = path.join(root, '.ai/optimizer/reports/latest');

  fs.mkdirSync(runtimeDir, { recursive: true });

  const syncPairs = [
    { src: path.join(reportsDir, 'quality-score.json'), dst: path.join(runtimeDir, 'latest-quality.json') },
    { src: path.join(reportsDir, 'risk-score.json'), dst: path.join(runtimeDir, 'latest-risk.json') },
    { src: path.join(optimizerReports, 'pipeline-summary.json'), dst: path.join(runtimeDir, 'latest-pipeline-summary.json') },
  ];

  for (const pair of syncPairs) {
    try {
      if (fs.existsSync(pair.src)) {
        fs.copyFileSync(pair.src, pair.dst);
      }
    } catch { /* ignore */ }
  }

  const historyPath = path.join(runtimeDir, 'latest-history.json');
  let history = { events: [] };
  try {
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch { /* ignore */ }

  let decision = {};
  try {
    const decisionPath = path.join(runtimeDir, 'latest-decision.json');
    if (fs.existsSync(decisionPath)) {
      decision = JSON.parse(fs.readFileSync(decisionPath, 'utf8'));
    }
  } catch { /* ignore */ }

  let quality = {};
  try {
    const qualityPath = path.join(runtimeDir, 'latest-quality.json');
    if (fs.existsSync(qualityPath)) {
      quality = JSON.parse(fs.readFileSync(qualityPath, 'utf8'));
    }
  } catch { /* ignore */ }

  let risk = {};
  try {
    const riskPath = path.join(runtimeDir, 'latest-risk.json');
    if (fs.existsSync(riskPath)) {
      risk = JSON.parse(fs.readFileSync(riskPath, 'utf8'));
    }
  } catch { /* ignore */ }

  history.events.push({
    timestamp: new Date().toISOString(),
    type: decision.execution_mode === 'autonomous' ? 'approved' : 'review',
    description: `Task: ${decision.task_type || 'unknown'} | Risk: ${risk.score || '?'}/100 | Quality: ${quality.score || '?'}/100`,
    data: { decision, quality, risk }
  });

  if (history.events.length > 50) {
    history.events = history.events.slice(-50);
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
  console.log('[post-pipeline] Runtime synced, history updated');
  process.exit(0);
}

main();
