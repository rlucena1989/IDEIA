import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import type { ScorecardItem, ScorecardCategory, ScorecardResult, ScorecardTrend, ScorecardAlert, CorrelationAlert } from './scorecard';

// ─── Helpers ────────────────────────────────────────────────
/** Processa root. */
export const root = (): string => process.cwd();
/** Processa ex. */
export const ex = (f: string): boolean => fs.existsSync(path.join(root(), f));
/** Lê read. */
export const read = (f: string): string | null => {
  try { return fs.readFileSync(path.join(root(), f), 'utf8'); } catch { return null; }
};
/** Verifica se possui content. */
export const hasContent = (f: string): boolean => {
  const c = read(f); return c !== null && c.trim().length > 100;
};
/** Processa size. */
export const dirSize = (d: string): number => {
  try { return fs.readdirSync(path.join(root(), d)).length; } catch { return 0; }
};
/** Processa parse. */
export const jsonParse = (f: string): Record<string, unknown> | null => {
  try { return JSON.parse(read(f) || 'null'); } catch { return null; }
};
/** Executa node. */
export const runNode = (script: string, args: string[] = []): boolean => {
  try {
    if (args.length === 0) {
      const exampleRequest = path.join(root(), '.ai/optimizer/examples/request.example.json');
      if (fs.existsSync(exampleRequest)) args = [exampleRequest];
    }
    return spawnSync('node', [path.join(root(), script), ...args], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 15000 }).status === 0;
  } catch { return false; }
};
/** Processa git. */
export const git = (args: string[]): string | null => {
  try { return execFileSync('git', args, { cwd: root(), encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim(); } catch { return null; }
};
/** Processa exists. */
export const gitExists = (): boolean => { try { return execFileSync('git', ['rev-parse', '--git-dir'], { cwd: root(), encoding: 'utf-8', timeout: 3000 }).toString().trim().length > 0; } catch { return false; } };

// ─── Audit helpers ──────────────────────────────────────────
/** Processa audit. */
export const npmAudit = (): { critical: number; high: number; moderate: number; low: number } => {
  try {
    const r = execFileSync('npm', ['audit', '--json'], { cwd: root(), encoding: 'utf-8', timeout: 30000 });
    const j = JSON.parse(r);
    const m = j.metadata?.vulnerabilities || {};
    return { critical: m.critical || 0, high: m.high || 0, moderate: m.moderate || 0, low: m.low || 0 };
  } catch { return { critical: 0, high: 0, moderate: 0, low: 0 }; }
};
/** Processa pct. */
export const coveragePct = (): number | null => {
  const c = jsonParse('coverage/coverage-summary.json');
  if (!c) return null;
  const t = c.total as Record<string, { pct: number }> | undefined;
  if (!t) return null;
  const lines = t.lines?.pct;
  return typeof lines === 'number' ? Math.round(lines) : null;
};
/** Processa ok. */
export const pylintOk = (): boolean => {
  try {
    return spawnSync('flake8', ['packages/adapter-fastapi/'], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 15000 }).status === 0;
  } catch { return false; }
};
/** Processa ok. */
export const golintOk = (): boolean => {
  try {
    const goCheck = spawnSync('go', ['version'], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 5000 });
    if (goCheck.status !== 0) return true;
    return spawnSync('golangci-lint', ['run', './packages/adapter-go/...'], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 30000 }).status === 0;
  } catch { return true; }
};
/** Processa dep. */
export const oldestDep = (): string | null => {
  const p = jsonParse('package.json');
  if (!p) return null;
  const deps = { ...(p.dependencies as Record<string, string> || {}), ...(p.devDependencies as Record<string, string> || {}) };
  const versions = Object.values(deps).filter(Boolean) as string[];
  const majors = versions.map(v => parseInt(v.replace(/[^0-9]/g, '').slice(0, 2), 10)).filter(n => !isNaN(n));
  if (majors.length === 0) return null;
  const min = Math.min(...majors);
  return min <= 1 ? `⚠ ${versions.filter(v => parseInt(v.replace(/[^0-9]/g, ''), 10) <= 1).length} deps na major 1-` : null;
};

// ─── Policy gates ───────────────────────────────────────────
/** Interface que define a estrutura de policy gate. */
export interface PolicyGate { category: string; minScore: number; action: 'warn' | 'block' | 'auto-create-task'; }
/**
 * Carrega policy gates.
 * @returns O resultado da operação.
 */
export function loadPolicyGates(): PolicyGate[] {
  const raw = read('.ai/scorecard/policy.yaml'); if (!raw) return [];
  const gates: PolicyGate[] = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s+-\s+category:\s*"(.+)"\s*$/);
    if (m) {
      const cat = m[1];
      const minM = raw.match(new RegExp(`category:\\s*"${cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}".*?minScore:\\s*(\\d+).*?action:\\s*"(\\w+)"`, 's'));
      if (minM) gates.push({ category: cat, minScore: parseInt(minM[1]), action: minM[2] as PolicyGate['action'] });
    }
  }
  return gates;
}
/**
 * Processa policy gates.
 * @param result - Valor result.
 * @param gates - Valor gates.
 * @returns O resultado da operação.
 */
export function applyPolicyGates(result: ScorecardResult, gates: PolicyGate[]): { blocked: boolean; tasksCreated: number } {
  let blocked = false, tasksCreated = 0;
  for (const gate of gates) {
    const cat = result.categories.find(c => c.name.toLowerCase().includes(gate.category.toLowerCase()));
    if (cat && Math.round(cat.score) < gate.minScore) {
      if (gate.action === 'block') blocked = true;
      if (gate.action === 'auto-create-task') {
        const taskId = `POLICY-${gate.category}-${Date.now().toString(36)}`;
        const b = read('.ai/tasks/backlog.md') || '# Backlog\n';
        if (!b.includes(taskId)) { fs.writeFileSync(path.join(root(), '.ai/tasks/backlog.md'), b + `\n- [ ] **${taskId}**: [Policy] ${gate.category} abaixo de ${gate.minScore} (${Math.round(cat.score)})\n`, 'utf8'); tasksCreated++; }
      }
    }
  }
  return { blocked, tasksCreated };
}

// ─── Benchmarks ─────────────────────────────────────────────
/** Interface que define a estrutura de benchmarks. */
export interface Benchmarks { buildTimeMs: number | null; testTimeMs: number | null; lintTimeMs: number | null; totalFiles: number; }
/**
 * Executa benchmarks.
 * @returns O resultado da operação.
 */
export function runBenchmarks(): Benchmarks {
  const b: Benchmarks = { buildTimeMs: null, testTimeMs: null, lintTimeMs: null, totalFiles: 0 };
  try { const s = Date.now(); const r = spawnSync('npx.cmd', ['tsc', '--noEmit'], { cwd: root(), stdio: 'pipe', timeout: 120000 }); if (r.status !== null) b.buildTimeMs = Date.now() - s; } catch { /* */ }
  try { const s = Date.now(); const r = spawnSync('npx.cmd', ['jest', '--passWithNoTests'], { cwd: root(), stdio: 'pipe', timeout: 120000 }); if (r.status !== null) b.testTimeMs = Date.now() - s; } catch { /* */ }
  try { const s = Date.now(); const r = spawnSync('npx.cmd', ['eslint', 'packages/'], { cwd: root(), stdio: 'pipe', timeout: 60000 }); if (r.status !== null) b.lintTimeMs = Date.now() - s; } catch { /* */ }
  try { let t = 0; const w = (d: string) => { try { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory() && !f.startsWith('.') && f !== 'node_modules') w(p); else if (f.endsWith('.ts') || f.endsWith('.tsx')) t++; } } catch { /* */ } }; w(path.join(root(), 'packages')); b.totalFiles = t; } catch { /* */ }
  return b;
}

// ─── AI analysis prompt builder ─────────────────────────────
/**
 * Constrói a i analysis prompt.
 * @param result - Valor result.
 * @param benchmarks - Valor benchmarks.
 * @returns O resultado da operação.
 */
export function buildAIAnalysisPrompt(result: ScorecardResult, benchmarks?: Benchmarks): string {
  const cats = result.categories.filter(c => c.weight > 0).map(c => `- ${c.name} (${c.weight}%): ${Math.round(c.score)}/100 — ${c.items.filter(i => !i.passed).length} falhas`).join('\n');
  const recs = result.recommendations.slice(0, 5).map(r => `- ${r.text}`).join('\n');
  const ben = benchmarks ? `\nBenchmarks:\n- Build: ${benchmarks.buildTimeMs ? (benchmarks.buildTimeMs / 1000).toFixed(1) + 's' : 'N/A'}\n- Test: ${benchmarks.testTimeMs ? (benchmarks.testTimeMs / 1000).toFixed(1) + 's' : 'N/A'}\n- Files: ${benchmarks.totalFiles}` : '';
  return `You are analyzing an AI-Devkit project scorecard. Score: ${result.overallScore}/100 (${result.maturityLevel}). ${result.evolution.items} items across ${result.evolution.categories} categories.

Categories:
${cats}
${recs ? '\nTop recommendations:\n' + recs : ''}${ben}

Provide a concise analysis in Portuguese:
1. Summary of current state
2. Top 3 priorities to improve
3. Specific action items with estimated impact
4. If score > 90, congratulate and suggest next-level improvements`;
}

// ─── Lazy import for Ollama ─────────────────────────────────
/**
 * Consulta local a i.
 * @param prompt - Valor prompt.
 * @param model - Valor model.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function queryLocalAI(prompt: string, model?: string): Promise<string | null> {
  try {
    const { queryOllama } = await import('../local-ai/ollama');
    return await queryOllama(prompt.slice(0, 8000), model || 'llama3.1:8b', root(), 'scorecard-analysis', 60000);
  } catch { return null; }
}

// ─── Core score utilities ───────────────────────────────────
/**
 * Processa color.
 * @param s - Valor s.
 * @returns O resultado da operação.
 */
export function shieldColor(s: number): string { return s >= 90 ? 'brightgreen' : s >= 70 ? 'yellow' : s >= 50 ? 'orange' : 'red'; }

/**
 * Processa score.
 * @param items - Valor items.
 * @returns O resultado da operação.
 */
export function calcScore(items: ScorecardItem[]): number {
  const total = items.reduce((s, i) => s + i.weight, 0);
  const earned = items.filter(i => i.passed).reduce((s, i) => s + i.weight, 0);
  return total > 0 ? (earned / total) * 100 : 0;
}

/**
 * Processa level.
 * @param score - Valor score.
 * @returns O resultado da operação.
 */
export function level(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A'; if (score >= 70) return 'B'; if (score >= 50) return 'C'; return 'D';
}

/**
 * Processa score.
 * @param categories - Valor categories.
 * @returns O resultado da operação.
 */
export function overallScore(categories: ScorecardCategory[]): number {
  const totW = categories.reduce((s, c) => s + c.weight, 0);
  return totW > 0 ? categories.reduce((s, c) => s + (c.score * c.weight) / 100, 0) / totW * 100 : 0;
}

/**
 * Constrói recommendations.
 * @param categories - Valor categories.
 * @returns O resultado da operação.
 */
export function buildRecommendations(categories: ScorecardCategory[]): { text: string; fixCommand?: string }[] {
  const recs: { text: string; fixCommand?: string }[] = [];
  for (const cat of categories) for (const item of cat.items) if (!item.passed) recs.push({ text: `[${cat.name}] ${item.description}${item.hint ? ` — ${item.hint}` : ''}${item.value !== undefined ? ` (atual: ${item.value})` : ''}`, fixCommand: item.fixCommand });
  return recs.slice(0, 20);
}

/**
 * Constrói alerts.
 * @param categories - Valor categories.
 * @returns O resultado da operação.
 */
export function buildAlerts(categories: ScorecardCategory[]): ScorecardAlert[] {
  const alerts: ScorecardAlert[] = [];
  for (const cat of categories) for (const item of cat.items) if (!item.passed && item.weight >= 3) alerts.push({ category: cat.name, item: item.id, severity: 'error', message: item.description });
  return alerts;
}

/**
 * Gera badge.
 * @param score - Valor score.
 * @returns O resultado da operação.
 */
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

/**
 * Constrói trends.
 * @param history - Valor history.
 * @returns O resultado da operação.
 */
export function buildTrends(history: ScorecardResult[]): ScorecardTrend[] {
  return history.slice(-20).map(h => ({ timestamp: h.timestamp, overallScore: h.overallScore, categories: h.categories.map(c => ({ name: c.name, score: Math.round(c.score) })) }));
}

/**
 * Processa git.
 * @returns O resultado da operação.
 */
export function computeGit(): { branch: string; commit: string; message: string } {
  if (!gitExists()) return { branch: 'no-git', commit: '0000000', message: 'not a git repository' };
  return { branch: git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown', commit: (git(['rev-parse', '--short', 'HEAD']) || 'unknown').slice(0, 7), message: (git(['log', '-1', '--pretty=%s']) || '').slice(0, 72) };
}

// ─── Analysis ───────────────────────────────────────────────
/**
 * Processa category analysis.
 * @param result - Valor result.
 * @returns O resultado da operação.
 */
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

/**
 * Processa score.
 * @param days - Valor days.
 * @returns O resultado da operação.
 */
export function forecastScore(days: number = 30): { forecast: number; confidence: 'low' | 'medium' | 'high'; trend: 'up' | 'stable' | 'down'; history: number[] } {
  const snapDir = path.join(root(), '.ai/reports/scorecard/snapshots');
  try {
    const files = fs.readdirSync(snapDir).filter((f: string) => f.endsWith('.json')).sort();
    if (files.length < 3) return { forecast: 0, confidence: 'low', trend: 'stable', history: [] };
    const scores: number[] = files.slice(-Math.min(files.length, 30)).map((f: string) => { try { return JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8')).score; } catch { return null; } }).filter((s: number | null): s is number => s !== null);
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

/**
 * Valida yaml content.
 * @param file - Valor file.
 * @param requiredKeys - Valor keys.
 * @returns O resultado da operação.
 */
export function validateYamlContent(file: string, requiredKeys: string[]): { valid: boolean; missing: string[] } {
  const c = read(file); if (!c) return { valid: false, missing: requiredKeys };
  return { valid: requiredKeys.every(k => c.includes(k)), missing: requiredKeys.filter(k => !c.includes(k)) };
}

/**
 * Gera from template.
 * @param templateName - Valor name.
 * @param vars - Valor vars.
 * @returns O resultado da operação.
 */
export function generateFromTemplate(templateName: string, vars: Record<string, string>): string {
  let t = 'Template não encontrado.';
  if (templateName === 'security-policy') t = '# Política de Segurança\n## Versão: {version}\n### Agentes\n- {agents}\n### Rede\n- {network}\n### Secrets\n- {secrets}\n';
  if (templateName === 'quality-dod') t = '# Definition of Done\n## {project}\n- [ ] Código revisado\n- [ ] Testes passando\n- [ ] Documentação atualizada\n- [ ] Design system respeitado\n';
  if (templateName === 'architecture-adr') t = '# ADR: {title}\n## Status: {status}\n## Contexto\n{context}\n## Decisão\n{decision}\n';
  for (const [k, v] of Object.entries(vars)) t = t.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  return t;
}

/**
 * Processa diff export.
 * @param r1 - Valor r1.
 * @param r2 - Valor r2.
 * @returns O resultado da operação.
 */
export function scoreDiffExport(r1: ScorecardResult, r2: ScorecardResult): string {
  const diff: Record<string, { from: number; to: number; diff: number }> = {};
  for (const c of r1.categories.filter(c => c.weight > 0)) {
    const c2 = r2.categories.find(x => x.name === c.name);
    if (c2) diff[c.name] = { from: Math.round(c.score), to: Math.round(c2.score), diff: Math.round(c2.score - c.score) };
  }
  return JSON.stringify({ from: { timestamp: r1.timestamp, score: r1.overallScore }, to: { timestamp: r2.timestamp, score: r2.overallScore }, categories: diff }, null, 2);
}

// ─── Custom YAML Check Loader ───────────────────────────────
/**
 * Carrega custom checks.
 * @returns O resultado da operação.
 */
export function loadCustomChecks(): ScorecardCategory[] {
  const raw = read('.ai/scorecard/checks.yaml');
  if (!raw || !raw.trim()) return [];

  const cats = new Map<string, ScorecardItem[]>();
  const lines = raw.split('\n');
  let currentCat = 'Custom';
  for (const line of lines) {
    const catMatch = line.match(/^ {2}(\w+):$/);
    if (catMatch) continue;
    const itemMatch = line.match(/^ {4}- id:\s*(\S+)/);
    if (itemMatch) currentCat = itemMatch[1];
    const descMatch = line.match(/^\s+description:\s*"(.+)"$/);
    if (descMatch) {
      const id = currentCat;
      const desc = descMatch[1];
      let passed = false;
      const typeLine = lines.find(l => l.includes(id) || l.includes(`"${desc}"`));
      if (typeLine?.includes('exists')) passed = ex(`.ai/scorecard/${id}`);
      else if (typeLine?.includes('hasContent')) passed = hasContent(`.ai/scorecard/${id}`);
      else if (typeLine?.includes('exec')) passed = runNode(`.ai/scorecard/${id}.js`);
      if (!cats.has('Custom')) cats.set('Custom', []);
      cats.get('Custom') ?? {}.push({ id, description: desc, passed, weight: 1 });
    }
  }
  try {
    const simple = raw.split('\n').filter(l => l.trim().startsWith('-'));
    for (const line of simple) {
      const parts = line.replace(/^-\s*/, '').split('|');
      if (parts.length >= 2) {
        const [id, desc, type, target] = parts.map(s => s.trim());
        let passed = false;
        if (type === 'exists') passed = ex(target);
        else if (type === 'hasContent') passed = hasContent(target);
        else if (type === 'exec') passed = runNode(target);
        if (!cats.has('Custom')) cats.set('Custom', []);
        cats.get('Custom') ?? {}.push({ id, description: desc, passed, weight: 1 });
      }
    }
  } catch { /* silently ignore parse errors */ }

  return Array.from(cats.entries()).map(([name, items]) => ({
    name: `Custom: ${name}`, weight: 0, score: calcScore(items), maxScore: 100, items,
  }));
}

// ─── Snapshot system ────────────────────────────────────────
/** Interface que define a estrutura de git trace. */
export interface GitTrace { commit: string; author: string; date: string; message: string; }
/**
 * Processa trace for file.
 * @param file - Valor file.
 * @returns O resultado da operação.
 */
export function gitTraceForFile(file: string): GitTrace | null {
  try {
    const log = execFileSync('git', ['log', '-1', '--format=%H|%an|%ai|%s', '--', path.relative(root(), file)], { cwd: root(), encoding: 'utf-8', timeout: 5000 }).trim();
    if (!log) return null;
    const [commit, author, date, ...msgParts] = log.split('|');
    return { commit: commit?.slice(0, 7) || '?', author: author || '?', date: date || '?', message: msgParts.join('|').slice(0, 72) || '?' };
  } catch { return null; }
}

/**
 * Processa score to commits.
 * @param _result - Valor _result.
 * @returns O resultado da operação.
 */
export function linkScoreToCommits(_result: ScorecardResult): { gitTrace: GitTrace[]; scoreHistory: { commit: string; score: number }[] } {
  const traces: GitTrace[] = [];
  const scoreHist: { commit: string; score: number }[] = [];
  const snapDir = path.join(root(), '.ai/reports/scorecard/snapshots');
  try {
    const files = fs.readdirSync(snapDir).filter((f: string) => f.endsWith('.json')).sort().reverse().slice(0, 10);
    for (const f of files) {
      const snap = JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8'));
      const trace = gitTraceForFile(path.join(snapDir, f));
      if (trace) { traces.push(trace); scoreHist.push({ commit: trace.commit, score: snap.score }); }
    }
  } catch { /* */ }
  return { gitTrace: traces, scoreHistory: scoreHist };
}

/**
 * Persiste snapshot.
 * @param result - Valor result.
 */
export function saveSnapshot(result: ScorecardResult): void {
  const dir = path.join(root(), '.ai/reports/scorecard/snapshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const snap = { timestamp: result.timestamp, score: result.overallScore, level: result.maturityLevel, categories: result.categories.filter(c => c.weight > 0).map(c => ({ name: c.name, score: Math.round(c.score) })), git: result.git };
  fs.writeFileSync(path.join(dir, `${result.timestamp.slice(0, 19).replace(/[T:]/g, '-')}.json`), JSON.stringify(snap, null, 2));
}

/**
 * Detecta regression.
 * @param result - Valor result.
 * @param threshold - Valor threshold.
 * @returns O resultado da operação.
 */
export function detectRegression(result: ScorecardResult, threshold: number): { regressed: boolean; drops: { category: string; from: number; to: number }[]; sinceTimestamp: string | null } {
  const dir = path.join(root(), '.ai/reports/scorecard/snapshots');
  try {
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json')).sort().reverse();
    if (files.length < 2) return { regressed: false, drops: [], sinceTimestamp: null };
    const prev = JSON.parse(fs.readFileSync(path.join(dir, files[1]), 'utf8'));
    const drops: { category: string; from: number; to: number }[] = [];
    for (const cc of result.categories) {
      if (cc.weight === 0) continue;
      const pc = prev.categories.find((c: { name: string }) => c.name === cc.name);
      if (pc && Math.round(cc.score) < pc.score - threshold) drops.push({ category: cc.name, from: pc.score, to: Math.round(cc.score) });
    }
    const totalDrop = prev.score - result.overallScore;
    return { regressed: drops.length > 0 || totalDrop > threshold * 2, drops, sinceTimestamp: prev.timestamp };
  } catch { return { regressed: false, drops: [], sinceTimestamp: null }; }
}

// ─── Notification system ────────────────────────────────────
/** Interface que define a estrutura de notification. */
export interface Notification { type: 'desktop' | 'file' | 'webhook'; message: string; level: 'info' | 'warn' | 'error'; }
/**
 * Envia notifications.
 * @param notifications - Valor notifications.
 * @param webhookUrl - Valor url.
 */
export function sendNotifications(notifications: Notification[], webhookUrl?: string): void {
  for (const n of notifications) {
    const logFile = path.join(root(), '.ai/reports/scorecard/notifications.log');
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `[${n.level.toUpperCase()}] ${new Date().toISOString()} — ${n.message}\n`, 'utf8');
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
    const icon = n.level === 'error' ? '🔴' : n.level === 'warn' ? '🟡' : '🔵';
    console.log(`  ${icon} [${n.level.toUpperCase()}] ${n.message}`);
  }
}

// ─── Cadence mode ───────────────────────────────────────────
/**
 * Processa mode.
 * @param intervalMinutes - Valor minutes.
 * @param regressionThreshold - Valor threshold.
 * @param webhookUrl - Valor url.
 */
export function cadenceMode(intervalMinutes: number, regressionThreshold: number, webhookUrl?: string): void {
  const { computeScorecard, saveAll } = require('./scorecard');
  console.log(`\n  🔄 Scorecard cadence (a cada ${intervalMinutes}min). Ctrl+C para sair.\n`);
  const tick = () => {
    const r = computeScorecard(); saveAll(r);
    const reg = detectRegression(r, regressionThreshold);
    const nots: Notification[] = [];
    if (reg.regressed) {
      nots.push({ type: 'file', message: `Score dropped! ${reg.drops.map(d => `${d.category}: ${d.from}→${d.to}`).join(', ')}`, level: 'error' });
      if (webhookUrl) nots.push({ type: 'webhook', message: `Scorecard regression: ${r.overallScore}/100`, level: 'error' });
    }
    if (r.overallScore >= 90) nots.push({ type: 'file', message: `Score maintained at ${r.overallScore}/100 (${r.maturityLevel})`, level: 'info' });
    if (nots.length > 0) sendNotifications(nots, webhookUrl);
    process.stdout.write('\x1b[1A\x1b[2K');
    const g = r.overallScore >= 90 ? '🟢' : r.overallScore >= 70 ? '🟡' : r.overallScore >= 50 ? '🟠' : '🔴';
    console.log(`  ${g} ${r.timestamp.slice(11, 19)} — ${r.overallScore}/100 (${r.maturityLevel}) — ${reg.regressed ? '⚠ regression' : 'stable'}`);
  };
  tick();
  setInterval(tick, intervalMinutes * 60 * 1000);
}

// ─── HTML Report Generator ──────────────────────────────────
/**
 * Gera h t m l.
 * @param result - Valor result.
 * @returns O resultado da operação.
 */
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

// ─── Watch mode ─────────────────────────────────────────────
/**
 * Processa mode.
 * @param interval - Valor interval.
 */
export function watchMode(interval: number): void {
  const { computeScorecard, saveAll } = require('./scorecard');
  console.log(`\n  🔄 Scorecard watch mode (a cada ${interval}s). Ctrl+C para sair.\n`);
  const tick = () => {
    const r = computeScorecard(); saveAll(r);
    process.stdout.write('\x1b[1A\x1b[2K');
    const g = r.overallScore >= 90 ? '🟢' : r.overallScore >= 70 ? '🟡' : r.overallScore >= 50 ? '🟠' : '🔴';
    console.log(`  ${g} ${r.timestamp.slice(11, 19)} — ${r.overallScore}/100 (${r.maturityLevel}) — ${r.evolution.items} itens — ${r.meta.durationMs}ms`);
  };
  tick();
  setInterval(tick, interval * 1000);
}

// ─── Server mode ────────────────────────────────────────────
/**
 * Processa mode.
 * @param port - Valor port.
 */
export function serveMode(port: number): void {
  const { computeScorecard, saveAll } = require('./scorecard');
  const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = req.url || '/';
    if (url === '/' || url === '/index.html') {
      const r = computeScorecard(); saveAll(r);
      const html = generateHTML(r);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else if (url === '/api/scorecard') {
      const r = computeScorecard(); saveAll(r);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(r, null, 2));
    } else if (url === '/api/history') {
      const h = read('.ai/reports/scorecard/history.json') || '[]';
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(h);
    } else if (url === '/badge.svg') {
      const b = read('.ai/reports/scorecard/badge.svg') || generateBadge(0);
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(b);
    } else {
      res.writeHead(404); res.end('404');
    }
  });
  server.listen(port, () => {
    process.stdout.write(`\n  🌐 Scorecard server: http://localhost:${port}\n  Ctrl+C para sair\n\n`);
  });
}

// ─── Publish result ─────────────────────────────────────────
/**
 * Publica result.
 * @param result - Valor result.
 * @param webhookUrl - Valor url.
 */
export function publishResult(result: ScorecardResult, webhookUrl?: string): void {
  if (webhookUrl) {
    try {
      const u = new URL(webhookUrl);
      const body = JSON.stringify({ score: result.overallScore, level: result.maturityLevel, version: result.evolution.version, git: result.git, timestamp: result.timestamp, alerts: result.alerts.slice(0, 5) });
      const req = http.request({ hostname: u.hostname, port: u.port || 80, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } });
      req.write(body); req.end();
    } catch { /* webhook failed silently */ }
  }
}

// ─── Auto-remediation: create tasks for failed items ────────
/**
 * Cria tasks from failures.
 * @param result - Valor result.
 * @returns O resultado da operação.
 */
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
  fs.writeFileSync(backlog, md, 'utf8');
  return count;
}

// ─── Script runner helpers ──────────────────────────────────
/**
 * Executa all scripts.
 * @returns O resultado da operação.
 */
export function runAllScripts(): boolean {
  try {
    const d = path.join(root(), '.ai/optimizer/bin');
    let ok = true;
    for (const f of fs.readdirSync(d).filter(f => f.endsWith('.js'))) {
      try {
        const r = spawnSync('node', [path.join(d, f)], { cwd: root(), encoding: 'utf-8', timeout: 10000, stdio: 'pipe' });
        if (r.status !== 0) ok = false;
      } catch { ok = false; }
    }
    return ok;
  } catch { return false; }
}

/**
 * Processa result ok.
 * @returns O resultado da operação.
 */
export function jestResultOk(): boolean {
  try {
    const r = spawnSync('npx.cmd', ['jest', '--silent', '--testPathPattern=acceleration-', '--testPathIgnorePatterns=orchestration'], { cwd: root(), encoding: 'utf-8', timeout: 60000, stdio: 'pipe', shell: process.platform === 'win32' });
    return r.status === 0;
  } catch { return false; }
}
