import path from 'node:path';
import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import { getIO } from '../io';
import { root, read } from './scorecard-helpers';
import type { ScorecardResult, ScorecardCategory, ScorecardTrend, ScorecardAlert, CorrelationAlert, Benchmarks } from './scorecard';
const logger = createLogger('scorecard-analysis');

export function crossCategoryAnalysis(result: ScorecardResult): CorrelationAlert[] {
  const alerts: CorrelationAlert[] = [];
  const cats = result.categories.filter(c => c.weight > 0);
  const sec = cats.find(c => c.name === 'Segurança');
  const qual = cats.find(c => c.name === 'Qualidade');
  const eco = cats.find(c => c.name === 'Saúde do Ecossistema');
  if (sec && qual && Math.round(sec.score) < 50 && Math.round(qual.score) < 50)
    alerts.push({ severity: 'critical', message: 'Segurança e Qualidade ambos baixos — risco alto de regressão', categories: ['Segurança', 'Qualidade'] });
  if (eco && Math.round(eco.score) < 40)
    alerts.push({ severity: 'warn', message: 'Saúde do Ecossistema crítica — dependências podem comprometer o projeto', categories: ['Saúde do Ecossistema'] });
  if (sec && qual && Math.round(sec.score) >= 90 && Math.round(qual.score) >= 90)
    alerts.push({ severity: 'info', message: 'Segurança e Qualidade em nível alto — projeto maduro', categories: ['Segurança', 'Qualidade'] });
  const integridade = cats.find(c => c.name === 'Integridade do Projeto');
  const pipeline = cats.find(c => c.name === 'Pipeline Health');
  if (integridade && pipeline && Math.round(integridade.score) === 100 && Math.round(pipeline.score) === 100)
    alerts.push({ severity: 'info', message: 'Integridade e Pipeline saudáveis — projeto bem estruturado', categories: ['Integridade do Projeto', 'Pipeline Health'] });
  return alerts;
}

export function buildTrends(history: ScorecardResult[]): ScorecardTrend[] {
  return history.slice(-20).map(h => ({ timestamp: h.timestamp, overallScore: h.overallScore, categories: h.categories.map(c => ({ name: c.name, score: Math.round(c.score) })) }));
}

export function forecastScore(days: number = 30): { forecast: number; confidence: 'low' | 'medium' | 'high'; trend: 'up' | 'stable' | 'down'; history: number[] } {
  const snapDir = path.join(root(), '.ai/reports/scorecard/snapshots');
  try {
    const files = getIO().fs.readDir(snapDir).filter((f: string) => f.endsWith('.json')).sort();
    if (files.length < 3) return { forecast: 0, confidence: 'low', trend: 'stable', history: [] };
    const scores: number[] = files.slice(-Math.min(files.length, 30)).map((f: string) => { try { return JSON.parse(getIO().fs.read(path.join(snapDir, f), 'utf8')).score; } catch { return null; } }).filter((s: number | null): s is number => s !== null);
    if (scores.length < 3) return { forecast: 0, confidence: 'low', trend: 'stable', history: scores };
    const n = scores.length;
    const sumX = (n - 1) * n / 2, sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = scores.reduce((a, s, i) => a + i * s, 0), sumX2 = (n - 1) * n * (2 * n - 1) / 6;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const lastX = n - 1 + days;
    const avgY = sumY / n;
    const forecast = Math.round(Math.max(0, Math.min(100, slope * lastX + (avgY - slope * (n - 1) / 2))));
    const recent = scores.slice(-5);
    const variance = recent.length > 1 ? recent.reduce((a, s, _, arr) => a + (s - arr.reduce((x, y) => x + y, 0) / arr.length) ** 2, 0) / recent.length : 100;
    const volatility = Math.sqrt(variance);
    const confidence = volatility < 5 ? 'high' : volatility < 12 ? 'medium' : 'low';
    const trend = forecast > scores[scores.length - 1] + 3 ? 'up' : forecast < scores[scores.length - 1] - 3 ? 'down' : 'stable';
    return { forecast, confidence, trend, history: scores };
  } catch { return { forecast: 0, confidence: 'low', trend: 'stable', history: [] }; }
}

export function overallScore(categories: ScorecardCategory[]): number {
  const totW = categories.reduce((s, c) => s + c.weight, 0);
  return totW > 0 ? categories.reduce((s, c) => s + (c.score * c.weight) / 100, 0) / totW * 100 : 0;
}

export function buildRecommendations(categories: ScorecardCategory[]): { text: string; fixCommand?: string }[] {
  const recs: { text: string; fixCommand?: string }[] = [];
  for (const cat of categories) for (const item of cat.items) if (!item.passed) recs.push({ text: `[${cat.name}] ${item.description}${item.hint ? ` — ${item.hint}` : ''}${item.value !== undefined ? ` (atual: ${item.value})` : ''}`, fixCommand: item.fixCommand });
  return recs.slice(0, 20);
}

export function buildAlerts(categories: ScorecardCategory[]): ScorecardAlert[] {
  const alerts: ScorecardAlert[] = [];
  for (const cat of categories) for (const item of cat.items) if (!item.passed && item.weight >= 3) alerts.push({ category: cat.name, item: item.id, severity: 'error', message: item.description });
  return alerts;
}

export function buildAIAnalysisPrompt(result: ScorecardResult, benchmarks?: Benchmarks): string {
  const cats = result.categories.filter(c => c.weight > 0).map(c => `- ${c.name} (${c.weight}%): ${Math.round(c.score)}/100 — ${c.items.filter(i => !i.passed).length} falhas`).join('\n');
  const recs = result.recommendations.slice(0, 5).map(r => `- ${r.text}`).join('\n');
  const ben = benchmarks ? `\nBenchmarks:\n- Build: ${benchmarks.buildTimeMs ? (benchmarks.buildTimeMs / 1000).toFixed(1) + 's' : 'N/A'}\n- Test: ${benchmarks.testTimeMs ? (benchmarks.testTimeMs / 1000).toFixed(1) + 's' : 'N/A'}\n- Files: ${benchmarks.totalFiles}` : '';
  return `You are analyzing an AI-Devkit project scorecard. Score: ${result.overallScore}/100 (${result.maturityLevel}). ${result.evolution.items} items across ${result.evolution.categories} categories.\n\nCategories:\n${cats}\n${recs ? '\nTop recommendations:\n' + recs : ''}${ben}\n\nProvide a concise analysis in Portuguese:\n1. Summary of current state\n2. Top 3 priorities to improve\n3. Specific action items with estimated impact\n4. If score > 90, congratulate and suggest next-level improvements`;
}

export function runBenchmarks(): Benchmarks {
  const { spawnSync } = require('node:child_process');
  const b: Benchmarks = { buildTimeMs: null, testTimeMs: null, lintTimeMs: null, totalFiles: 0 };
  try { const s = Date.now(); const r = spawnSync('npx.cmd', ['tsc', '--noEmit'], { cwd: root(), stdio: 'pipe', timeout: 120000 }); if (r.status !== null) b.buildTimeMs = Date.now() - s; } catch { /* */ }
  try { const s = Date.now(); const r = spawnSync('npx.cmd', ['jest', '--passWithNoTests'], { cwd: root(), stdio: 'pipe', timeout: 120000 }); if (r.status !== null) b.testTimeMs = Date.now() - s; } catch { /* */ }
  try { const s = Date.now(); const r = spawnSync('npx.cmd', ['eslint', 'packages/'], { cwd: root(), stdio: 'pipe', timeout: 60000 }); if (r.status !== null) b.lintTimeMs = Date.now() - s; } catch { /* */ }
  try { let t = 0; const w = (d: string) => { try { for (const f of getIO().fs.readDir(d)) { const p = path.join(d, f); if (getIO().fs.stat(p).isDirectory() && !f.startsWith('.') && f !== 'node_modules') w(p); else if (f.endsWith('.ts') || f.endsWith('.tsx')) t++; } } catch { /* */ } }; w(path.join(root(), 'packages')); b.totalFiles = t; } catch { /* */ }
  return b;
}

export function scoreDiffExport(r1: ScorecardResult, r2: ScorecardResult): string {
  const diff: Record<string, { from: number; to: number; diff: number }> = {};
  for (const c of r1.categories.filter(c => c.weight > 0)) {
    const c2 = r2.categories.find(x => x.name === c.name);
    if (c2) diff[c.name] = { from: Math.round(c.score), to: Math.round(c2.score), diff: Math.round(c2.score - c.score) };
  }
  return JSON.stringify({ from: { timestamp: r1.timestamp, score: r1.overallScore }, to: { timestamp: r2.timestamp, score: r2.overallScore }, categories: diff }, null, 2);
}

export function queryLocalAI(prompt: string, model?: string): Promise<string | null> {
  try { return import('../local-ai/ollama').then(({ queryOllama }) => queryOllama(prompt.slice(0, 8000), model || 'llama3.1:8b', root(), 'scorecard-analysis', 60000)); } catch { return Promise.resolve(null); }
}

export function detectRegression(current: ScorecardResult, threshold: number): { regressed: boolean; drops: Array<{ category: string; from: number; to: number }> } {
  const history: ScorecardResult[] = [];
  const historyContent = read(path.join(root(), '.ai/reports/scorecard/history.json'));
  if (historyContent) {
    try { history.push(JSON.parse(historyContent)); } catch { /* ignore */ }
  }
  if (history.length === 0) return { regressed: false, drops: [] };
  const prev = history[history.length - 1];
  const drops: Array<{ category: string; from: number; to: number }> = [];
  for (const cat of current.categories) {
    const prevCat = prev.categories.find(c => c.name === cat.name);
    if (prevCat && prevCat.score > cat.score + threshold) {
      drops.push({ category: cat.name, from: Math.round(prevCat.score), to: Math.round(cat.score) });
    }
  }
  return { regressed: drops.length > 0, drops };
}

export function validateYamlContent(file: string, requiredKeys: string[]): { valid: boolean; missing: string[] } {
  const content = read(file);
  if (!content) return { valid: false, missing: requiredKeys };
  return { valid: requiredKeys.every(k => content.includes(k)), missing: requiredKeys.filter(k => !content.includes(k)) };
}

export function generateFromTemplate(templateName: string, vars: Record<string, string>): string {
  const templates: Record<string, string> = {
    'security-policy': '# Política de Segurança\n## Versão: {version}\n### Agentes\n- {agents}\n### Rede\n- {network}\n### Secrets\n- {secrets}\n',
    'quality-dod': '# Definition of Done\n## {project}\n- [ ] Código revisado\n- [ ] Testes passando\n- [ ] Documentação atualizada\n- [ ] Design system respeitado\n',
    'architecture-adr': '# ADR: {title}\n## Status: {status}\n## Contexto\n{context}\n## Decisão\n{decision}\n'
  };
  let template = templates[templateName] || 'Template não encontrado.';
  for (const [k, v] of Object.entries(vars)) template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  return template;
}

export function loadCustomChecks(): ScorecardCategory[] {
  const checksFile = path.join(root(), '.ai/config/custom-checks.json');
  try {
    if (!fs.existsSync(checksFile)) return [];
    const checks = JSON.parse(fs.readFileSync(checksFile, 'utf-8'));
    return checks.map((c: any) => ({
      name: c.name,
      weight: c.weight || 1,
      score: c.score || 0,
      items: c.items || []
    }));
  } catch { return []; }
}
