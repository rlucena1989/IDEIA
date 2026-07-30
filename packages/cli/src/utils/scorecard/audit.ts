import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { root, read, jsonParse, ex, hasContent, runNode } from './helpers';
import { createLogger } from '@ideia/logger';
import type { ScorecardItem, ScorecardCategory, ScorecardResult } from '../../commands/scorecard';

const logger = createLogger('scorecard:audit');

export interface PolicyGate { category: string; minScore: number; action: 'warn' | 'block' | 'auto-create-task'; }

export const npmAudit = (): { critical: number; high: number; moderate: number; low: number } => {
  try {
    const r = execFileSync('npm', ['audit', '--json'], { cwd: root(), encoding: 'utf-8', timeout: 30000 });
    const j = JSON.parse(r);
    const m = j.metadata?.vulnerabilities || {};
    return { critical: m.critical || 0, high: m.high || 0, moderate: m.moderate || 0, low: m.low || 0 };
  } catch { return { critical: 0, high: 0, moderate: 0, low: 0 }; }
};

export const coveragePct = (): number | null => {
  const c = jsonParse('coverage/coverage-summary.json');
  if (!c) return null;
  const t = c.total as Record<string, { pct: number }> | undefined;
  if (!t) return null;
  const lines = t.lines?.pct;
  return typeof lines === 'number' ? Math.round(lines) : null;
};

export const pylintOk = (): boolean => {
  try {
    return spawnSync('flake8', ['packages/adapter-fastapi/'], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 15000 }).status === 0;
  } catch { return false; }
};

export const golintOk = (): boolean => {
  try {
    const goCheck = spawnSync('go', ['version'], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 5000 });
    if (goCheck.status !== 0) return true;
    return spawnSync('golangci-lint', ['run', './packages/adapter-go/...'], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 30000 }).status === 0;
  } catch { return true; }
};

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

export interface Benchmarks { buildTimeMs: number | null; testTimeMs: number | null; lintTimeMs: number | null; totalFiles: number; }

export function runBenchmarks(): Benchmarks {
  const b: Benchmarks = { buildTimeMs: null, testTimeMs: null, lintTimeMs: null, totalFiles: 0 };
  try { const s = Date.now(); const r = spawnSync('npx.cmd', ['tsc', '--noEmit'], { cwd: root(), stdio: 'pipe', timeout: 120000 }); if (r.status !== null) b.buildTimeMs = Date.now() - s; } catch { /* */ }
  try { const s = Date.now(); const r = spawnSync('npx.cmd', ['jest', '--passWithNoTests'], { cwd: root(), stdio: 'pipe', timeout: 120000 }); if (r.status !== null) b.testTimeMs = Date.now() - s; } catch { /* */ }
  try { const s = Date.now(); const r = spawnSync('npx.cmd', ['eslint', 'packages/'], { cwd: root(), stdio: 'pipe', timeout: 60000 }); if (r.status !== null) b.lintTimeMs = Date.now() - s; } catch { /* */ }
  try { let t = 0; const w = (d: string) => { try { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory() && !f.startsWith('.') && f !== 'node_modules') w(p); else if (f.endsWith('.ts') || f.endsWith('.tsx')) t++; } } catch { /* */ } }; w(path.join(root(), 'packages')); b.totalFiles = t; } catch { /* */ }
  return b;
}

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

export async function queryLocalAI(prompt: string, model?: string): Promise<string | null> {
  try {
    const { queryOllama } = await import('../../local-ai/ollama');
    return await queryOllama(prompt.slice(0, 8000), model || 'llama3.1:8b', root(), 'scorecard-analysis', 60000);
  } catch { return null; }
}

function gitCmd(args: string[]): string {
  try {
    const result = execFileSync('git', args, { encoding: 'utf-8', timeout: 5000 });
    return result.trim();
  } catch { return ''; }
}

function gitExistsCheck(): boolean {
  try { execFileSync('git', ['rev-parse', '--git-dir'], { encoding: 'utf-8', timeout: 3000 }); return true; }
  catch { return false; }
}

export function computeGit(): { branch: string; commit: string; message: string } {
  if (!gitExistsCheck()) return { branch: 'no-git', commit: '0000000', message: 'not a git repository' };
  return { branch: gitCmd(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown', commit: (gitCmd(['rev-parse', '--short', 'HEAD']) || 'unknown').slice(0, 7), message: (gitCmd(['log', '-1', '--pretty=%s']) || '').slice(0, 72) };
}

export function validateYamlContent(file: string, requiredKeys: string[]): { valid: boolean; missing: string[] } {
  const c = read(file); if (!c) return { valid: false, missing: requiredKeys };
  return { valid: requiredKeys.every(k => c.includes(k)), missing: requiredKeys.filter(k => !c.includes(k)) };
}

export function generateFromTemplate(templateName: string, vars: Record<string, string>): string {
  let t = 'Template não encontrado.';
  if (templateName === 'security-policy') t = '# Política de Segurança\n## Versão: {version}\n### Agentes\n- {agents}\n### Rede\n- {network}\n### Secrets\n- {secrets}\n';
  if (templateName === 'quality-dod') t = '# Definition of Done\n## {project}\n- [ ] Código revisado\n- [ ] Testes passando\n- [ ] Documentação atualizada\n- [ ] Design system respeitado\n';
  if (templateName === 'architecture-adr') t = '# ADR: {title}\n## Status: {status}\n## Contexto\n{context}\n## Decisão\n{decision}\n';
  for (const [k, v] of Object.entries(vars)) t = t.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  return t;
}

export function scoreDiffExport(r1: ScorecardResult, r2: ScorecardResult): string {
  const diff: Record<string, { from: number; to: number; diff: number }> = {};
  for (const c of r1.categories.filter(c => c.weight > 0)) {
    const c2 = r2.categories.find(x => x.name === c.name);
    if (c2) diff[c.name] = { from: Math.round(c.score), to: Math.round(c2.score), diff: Math.round(c2.score - c.score) };
  }
  return JSON.stringify({ from: { timestamp: r1.timestamp, score: r1.overallScore }, to: { timestamp: r2.timestamp, score: r2.overallScore }, categories: diff }, null, 2);
}

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
      const customCats = cats.get('Custom')
      if (customCats) customCats.push({ id, description: desc, passed, weight: 1 });
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
        const customCats = cats.get('Custom')
        if (customCats) customCats.push({ id, description: desc, passed, weight: 1 });
      }
    }
  } catch { /* */ }

  return Array.from(cats.entries()).map(([name, items]) => ({
    name: `Custom: ${name}`, weight: 0, score: 0, maxScore: 100, items,
  }));
}

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
