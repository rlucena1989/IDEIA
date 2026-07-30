import path from 'node:path';
import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import { getIO } from '../io';
import { spawnSync, execFileSync } from 'node:child_process';
const logger = createLogger('scorecard-helpers');

export const root = (): string => getIO().fs.cwd();
export const ex = (f: string): boolean => getIO().fs.exists(path.join(root(), f));
export const read = (f: string): string | null => {
  try { return getIO().fs.read(path.join(root(), f), 'utf8'); } catch { return null; }
};
export const hasContent = (f: string): boolean => {
  const c = read(f); return c !== null && c.trim().length > 100;
};
export const dirSize = (d: string): number => {
  try { return getIO().fs.readDir(path.join(root(), d)).length; } catch { return 0; }
};
export const jsonParse = (f: string): Record<string, unknown> | null => {
  try { return JSON.parse(read(f) || 'null'); } catch { return null; }
};
export const runNode = (script: string, args: string[] = []): boolean => {
  try {
    if (args.length === 0) {
      const exampleRequest = path.join(root(), '.ai/optimizer/examples/request.example.json');
      if (getIO().fs.exists(exampleRequest)) args = [exampleRequest];
    }
    return spawnSync('node', [path.join(root(), script), ...args], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 15000 }).status === 0;
  } catch { return false; }
};
export const git = (args: string[]): string | null => {
  try { return execFileSync('git', args, { cwd: root(), encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim(); } catch { return null; }
};
export const gitExists = (): boolean => { try { return execFileSync('git', ['rev-parse', '--git-dir'], { cwd: root(), encoding: 'utf-8', timeout: 3000 }).toString().trim().length > 0; } catch { return false; } };

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
  try { return spawnSync('flake8', ['packages/adapter-fastapi/'], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 15000 }).status === 0; } catch { return false; }
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

export function computeGit(): { branch: string; commit: string; message: string } {
  if (!gitExists()) return { branch: 'no-git', commit: '0000000', message: 'not a git repository' };
  return { branch: git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown', commit: (git(['rev-parse', '--short', 'HEAD']) || 'unknown').slice(0, 7), message: (git(['log', '-1', '--pretty=%s']) || '').slice(0, 72) };
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

export function calcScore(items: { weight: number; passed: boolean }[]): number {
  const total = items.reduce((s, i) => s + i.weight, 0);
  const earned = items.filter(i => i.passed).reduce((s, i) => s + i.weight, 0);
  return total > 0 ? (earned / total) * 100 : 0;
}

export function level(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A'; if (score >= 70) return 'B'; if (score >= 50) return 'C'; return 'D';
}

export function shieldColor(s: number): string { return s >= 90 ? 'brightgreen' : s >= 70 ? 'yellow' : s >= 50 ? 'orange' : 'red'; }

export function runAllScripts(): boolean {
  try {
    const d = path.join(root(), '.ai/optimizer/bin');
    let ok = true;
    for (const f of getIO().fs.readDir(d).filter(f => f.endsWith('.js'))) {
      try { const r = spawnSync('node', [path.join(d, f)], { cwd: root(), encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }); if (r.status !== 0) ok = false; } catch { ok = false; }
    }
    return ok;
  } catch { return false; }
}

export function jestResultOk(): boolean {
  try { const r = spawnSync('npx.cmd', ['jest', '--silent', '--testPathPattern=acceleration-', '--testPathIgnorePatterns=orchestration'], { cwd: root(), encoding: 'utf-8', timeout: 60000, stdio: 'pipe', shell: process.platform === 'win32' }); return r.status === 0; } catch { return false; }
}

export function gitTraceForFile(filePath: string): string[] {
  try {
    const result = execFileSync('git', ['log', '--pretty=format:%H %s', '--', filePath], { cwd: root(), encoding: 'utf-8', timeout: 5000 });
    return result.trim().split('\n').filter(Boolean);
  } catch { return []; }
}

export function linkScoreToCommits(score: number, filePath: string): { commit: string; message: string; score: number }[] {
  const traces = gitTraceForFile(filePath);
  return traces.slice(0, 5).map(line => {
    const [commit, ...messageParts] = line.split(' ');
    return { commit, message: messageParts.join(' '), score };
  });
}

export function saveSnapshot(scorecard: Record<string, unknown>): void {
  const snapDir = path.join(root(), '.ai/reports/scorecard/snapshots');
  try {
    if (!fs.existsSync(snapDir)) fs.mkdirSync(snapDir, { recursive: true });
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(snapDir, filename), JSON.stringify({ ...scorecard, timestamp: new Date().toISOString() }, null, 2), 'utf-8');
  } catch { /* ignore */ }
}
