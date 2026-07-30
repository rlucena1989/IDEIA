import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { printHeader, printLine, finish } from "../utils/output";
import { getIO } from '../io';

// ============================================================
// TASK-GAP-15: Snapshot de Estado Instantâneo
// ============================================================

interface SnapshotData {
  generated_at: string;
  project: {
    name: string;
    version: string;
    stack: string[];
    frameworks: string[];
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    score: number;
    checks: number;
    passed: number;
    failed: number;
  };
  governance: {
    laws_exists: boolean;
    policies_count: number;
    agents_count: number;
    rules_count: number;
    compiled_targets: string[];
  };
  artifacts: {
    has_claude: boolean;
    has_cursor: boolean;
    has_copilot: boolean;
    has_windsurf: boolean;
    has_cline: boolean;
    has_gemini: boolean;
    has_continue: boolean;
    has_zed: boolean;
    has_amazon_q: boolean;
    has_codex: boolean;
  };
  drift: {
    status: 'synced' | 'drifted' | 'unknown';
    last_check: string | null;
  };
  last_session: {
    timestamp: string | null;
    mode: string | null;
    summary: string | null;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
  };
  memory: {
    decisions_count: number;
    knowledge_entries: number;
    traces_count: number;
  };
}

/**
 * Processa exists.
 * @param root - Valor root.
 * @param paths - Valor paths.
 * @returns O resultado da operação.
 */
export function fileExists(root: string, ...paths: string[]): boolean {
  return getIO().fs.exists(path.join(root, ...paths));
}

/**
 * Lê json safe.
 * @param root - Valor root.
 * @param paths - Valor paths.
 * @returns O resultado da operação.
 */
export function readJsonSafe(root: string, ...paths: string[]): Record<string, unknown> {
  const fullPath = path.join(root, ...paths);
  if (!getIO().fs.exists(fullPath)) return {};
  try { return JSON.parse(getIO().fs.read(fullPath, 'utf8')); }
  catch { return {}; }
}

/**
 * Processa files.
 * @param dir - Valor dir.
 * @param pattern - Valor pattern.
 * @returns O resultado da operação.
 */
export function countFiles(dir: string, pattern?: RegExp): number {
  if (!getIO().fs.exists(dir)) return 0;
  try {
    const files = getIO().fs.readDir(dir);
    if (pattern) return files.filter(f => pattern.test(String(f))).length;
    return files.length;
  } catch {
    return 0;
  }
}

/**
 * Processa lines.
 * @param file - Valor file.
 * @returns O resultado da operação.
 */
export function countLines(file: string): number {
  if (!getIO().fs.exists(file)) return 0;
  try {
    return getIO().fs.read(file, 'utf8').split('\n').filter(l => l.trim()).length;
  } catch {
    return 0;
  }
}

import { detectStack } from './detect';
export { detectStack };

/**
 * Obtém health score.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function getHealthScore(root: string): { score: number; checks: number; passed: number; failed: number } {
  let checks = 0;
  let passed = 0;

  // Check 1: package.json exists
  checks++; if (fileExists(root, 'package.json')) passed++;
  // Check 2: tsconfig.json exists
  checks++; if (fileExists(root, 'tsconfig.json')) passed++;
  // Check 3: .ai directory exists
  checks++; if (fileExists(root, '.ai')) passed++;
  // Check 4: laws.yaml exists
  checks++; if (fileExists(root, '.ai', 'laws.yaml')) passed++;
  // Check 5: README.md exists
  checks++; if (fileExists(root, 'README.md')) passed++;
  // Check 6: .gitignore exists
  checks++; if (fileExists(root, '.gitignore')) passed++;
  // Check 7: src or packages directory exists (monorepo support)
  checks++; if (fileExists(root, 'src') || fileExists(root, 'packages')) passed++;
  // Check 8: node_modules exists (deps installed)
  checks++; if (fileExists(root, 'node_modules')) passed++;

  const score = checks > 0 ? Math.round((passed / checks) * 100) : 0;
  return { score, checks, passed, failed: checks - passed };
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function generateSnapshot(root: string): SnapshotData {
  const stack = detectStack(root);
  const health = getHealthScore(root);

  return {
    generated_at: new Date().toISOString(),
    project: {
      name: path.basename(root),
      version: (() => { try { const pkg = JSON.parse(getIO().fs.read(path.join(root, 'package.json'), 'utf8')); return pkg.version || '0.0.0'; } catch { return '0.0.0'; } })(),
      stack: stack.languages, frameworks: stack.frameworks,
    },
    health: { status: health.score >= 80 ? 'healthy' : health.score >= 50 ? 'degraded' : 'unhealthy', score: health.score, checks: health.checks, passed: health.passed, failed: health.failed },
    governance: {
      laws_exists: fileExists(root, '.ai', 'laws.yaml'),
      policies_count: countFiles(path.join(root, '.ai', 'policies'), /\.(yaml|yml)$/),
      agents_count: (() => { const d = path.join(root, '.ai', 'agents'); if (!getIO().fs.exists(d)) return 0; return getIO().fs.readDir(d).filter(f => f.endsWith('.yaml') || f.endsWith('.yml')).length; })(),
      rules_count: countLines(path.join(root, '.ai', 'laws.yaml')),
      compiled_targets: [
        fileExists(root, 'CLAUDE.md') && 'claude', fileExists(root, '.cursor', 'rules', 'ai-devkit.mdc') && 'cursor',
        fileExists(root, '.github', 'copilot-instructions.md') && 'copilot', fileExists(root, '.windsurf', 'rules', 'governance.md') && 'windsurf',
        fileExists(root, '.clinerules') && 'cline', fileExists(root, 'GEMINI.md') && 'gemini', fileExists(root, '.continuerules') && 'continue',
        fileExists(root, '.rules') && 'zed', fileExists(root, '.amazonq', 'rules', 'governance.md') && 'amazon-q', fileExists(root, 'AGENTS.md') && 'codex',
      ].filter(Boolean) as string[],
    },
    artifacts: {
      has_claude: fileExists(root, 'CLAUDE.md'), has_cursor: fileExists(root, '.cursor', 'rules', 'ai-devkit.mdc'),
      has_copilot: fileExists(root, '.github', 'copilot-instructions.md'), has_windsurf: fileExists(root, '.windsurf', 'rules', 'governance.md'),
      has_cline: fileExists(root, '.clinerules'), has_gemini: fileExists(root, 'GEMINI.md'),
      has_continue: fileExists(root, '.continuerules'), has_zed: fileExists(root, '.rules'),
      has_amazon_q: fileExists(root, '.amazonq', 'rules', 'governance.md'), has_codex: fileExists(root, 'AGENTS.md'),
    },
    drift: {
      status: (() => { const d = path.join(root, '.ai', 'reports', 'drift'); if (!getIO().fs.exists(d)) return 'unknown'; const f = getIO().fs.readDir(d).filter((x: string) => x.endsWith('.json')); if (f.length === 0) return 'unknown'; const lastFile = f[f.length - 1] as string; const r = readJsonSafe(root, '.ai', 'reports', 'drift', lastFile); return (r as { drifted?: unknown })?.drifted ? 'drifted' : 'synced'; })(),
      last_check: (() => { const d = path.join(root, '.ai', 'reports', 'drift'); if (!getIO().fs.exists(d)) return null; const f = getIO().fs.readDir(d).filter((x: string) => x.endsWith('.json')); return f.length === 0 ? null : (f[f.length - 1] as string).replace('.json', ''); })(),
    },
    last_session: (() => { const sf = path.join(root, '.ai', 'session-mode.json'); if (!getIO().fs.exists(sf)) return { timestamp: null, mode: null, summary: null }; try { const s = JSON.parse(getIO().fs.read(sf, 'utf8')); return { timestamp: s.timestamp || null, mode: s.mode || null, summary: s.summary || null }; } catch { return { timestamp: null, mode: null, summary: null }; } })(),
    tasks: (() => { const td = path.join(root, '.ai', 'tasks'); if (!getIO().fs.exists(td)) return { total: 0, completed: 0, pending: 0, in_progress: 0 }; const files = getIO().fs.readDir(td).filter((x: string) => x.endsWith('.md')); let t = 0, c = 0, p = 0, ip = 0; for (const f of files) { try { const content = getIO().fs.read(path.join(td, f), 'utf8'); const tasks = content.match(/- \[([ x~])\]/g) || []; for (const tk of tasks) { t++; if (tk === '- [x]') c++; else if (tk === '- [~]') ip++; else p++; } } catch {} } return { total: t, completed: c, pending: p, in_progress: ip }; })(),
    memory: {
      decisions_count: countLines(path.join(root, '.ai', 'memory', 'decisions-log.md')),
      knowledge_entries: (() => { const kf = path.join(root, '.ai', 'memory', 'knowledge-base.json'); const ed = path.join(root, '.ai', 'knowledge', 'entries'); if (getIO().fs.exists(ed)) { try { return getIO().fs.readDir(ed).length; } catch { return 0; } } if (!getIO().fs.exists(kf)) return 0; try { const kb = JSON.parse(getIO().fs.read(kf, 'utf8')); return Array.isArray(kb) ? kb.length : 0; } catch { return 0; } })(),
      traces_count: (() => { const tf = path.join(root, '.ai', 'reports', 'observability', 'traces.jsonl'); if (!getIO().fs.exists(tf)) return 0; return getIO().fs.read(tf, 'utf8').split('\n').filter((l: string) => l.trim()).length; })(),
    },
  };
}

export function snapshotCommand(): Command {
  const cmd = new Command('snapshot').description('Gera snapshot instantaneo do estado do projeto (TASK-GAP-15)');

  cmd.command('generate')
    .description('Gera snapshot JSON completo do projeto em <1s')
    .option('--save', 'Salva snapshot em .ai/reports/snapshot.json', false)
    .option('--pretty', 'Exibe saida formatada', true)
    .action((options) => {
      const root = process.cwd();
      const startTime = Date.now();
      const snapshot = generateSnapshot(root);
      const elapsed = Date.now() - startTime;

      if (options.save) {
        const snapshotDir = path.join(root, '.ai', 'reports');
        getIO().fs.mkDir(snapshotDir, true);
        getIO().fs.write(path.join(snapshotDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
        printLine(`Snapshot saved`);
      }
      if (options.pretty) {
        printHeader(`📸 Snapshot — ${snapshot.project.name} v${snapshot.project.version}`);
        printLine(`Generated in ${elapsed}ms`); printLine('');
        printLine(`🏥 Health: ${snapshot.health.score}/100 (${snapshot.health.status})`);
        printLine(`📦 Stack: ${snapshot.project.stack.join(', ') || 'unknown'}`);
        printLine(`🔧 Frameworks: ${snapshot.project.frameworks.join(', ') || 'none'}`);
        printLine(`📝 Tasks: ${snapshot.tasks.completed}/${snapshot.tasks.total} completed`);
      }
      finish({ checkpoint: 'snapshot', ok: true, status: 'passed', context_summary: `Snapshot generated in ${elapsed}ms`, data: snapshot as unknown as Record<string, unknown> });
    });

  cmd
    .command('status')
    .description('Exibe resumo rapido do snapshot (sem gerar arquivo)')
    .action(() => {
      const root = process.cwd();
      const health = getHealthScore(root);
      const stack = detectStack(root);

      printHeader('📸 Quick Status');
      printLine(`Project: ${path.basename(root)}`);
      printLine(`Health: ${health.score}/100 (${health.passed}/${health.checks} checks passed)`);
      printLine(`Stack: ${stack.languages.join(', ') || 'unknown'}`);
      printLine(`Frameworks: ${stack.frameworks.join(', ') || 'none'}`);
      printLine('');
      printLine('Run `ai-devkit snapshot generate --save` for full snapshot');

      finish({
        checkpoint: 'snapshot_status',
        ok: true,
        status: 'passed',
        context_summary: `Quick status: ${health.score}/100`,
        data: { health, stack },
      });
    });

  return cmd;
}