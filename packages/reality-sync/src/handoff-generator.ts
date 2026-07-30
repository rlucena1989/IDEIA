import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';
import type { SyncConfig } from './types';
import { TaskLifecycleManager, snapshot } from './task-lifecycle';
import { createDefaultTasksDir, loadTasks } from './task-lifecycle';

const log = createLogger('reality-sync:handoff');

export interface HandoffData {
  generatedAt: string;
  lastSessionDate: string;
  packagesChanged: string[];
  filesChanged: number;
  commitsSinceLast: number;
  testResults: { total: number; passed: number; failed: number };
  taskSummary: ReturnType<typeof snapshot>;
  gapsSummary: { total: number; open: number; closed: number };
  nextPriorities: string[];
}

function gitLog(since: string, root: string): string {
  try {
    return execSync(`git log --oneline --since="${since}" --format="%h %s"`, { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function gitChangedFiles(since: string, root: string): string[] {
  try {
    const out = execSync(`git diff --name-only $(git rev-list --max-parents=0 HEAD)..HEAD`, { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (!out) return [];
    const sinceTs = new Date(since).getTime();
    return out.split('\n').filter(f => {
      try {
        const stat = fs.statSync(path.join(root, f));
        return stat.mtimeMs > sinceTs;
      } catch { return false; }
    });
  } catch {
    return [];
  }
}

function countTestResults(root: string): { total: number; passed: number; failed: number } {
  try {
    const out = execSync(`npx jest --passWithNoTests --no-coverage 2>&1`, { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const totalM = out.match(/Tests:\s+(\d+)/);
    const passedM = out.match(/(\d+)\s+passed/);
    const failedM = out.match(/(\d+)\s+failed/);
    return {
      total: totalM ? parseInt(totalM[1]) : 0,
      passed: passedM ? parseInt(passedM[1]) : 0,
      failed: failedM ? parseInt(failedM[1]) : 0,
    };
  } catch {
    return { total: 0, passed: 0, failed: 0 };
  }
}

function analyzeGaps(gapsPath: string): { total: number; open: number; closed: number } {
  if (!fs.existsSync(gapsPath)) return { total: 0, open: 0, closed: 0 };
  const content = fs.readFileSync(gapsPath, 'utf-8');
  const lines = content.split('\n');
  let total = 0, open = 0, closed = 0;
  for (const line of lines) {
    if (/\| (GS?\d+) \|/.test(line)) {
      total++;
      if (line.includes('✅') || line.includes('Resolvido') || line.includes('RESOLVIDO')) closed++;
      else open++;
    }
  }
  return { total, open, closed };
}

function getNextPriorities(): string[] {
  const tasksDir = process.env.IDEIA_ROOT ? createDefaultTasksDir(process.env.IDEIA_ROOT) : '';
  if (!tasksDir) return ['Review task lifecycle for next steps'];
  const tasks = loadTasks(tasksDir);
  const pending = tasks.filter(t => t.status === 'pending').sort((a, b) => {
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
  });
  return pending.slice(0, 5).map(t => `[${t.priority}] ${t.title}`);
}

export function generateHandoff(config: SyncConfig): string {
  const now = new Date().toISOString();
  const lastSessionFile = path.join(config.workspaceRoot, '.ai', 'context', 'last-session.txt');
  let lastSessionDate = '1970-01-01';
  if (fs.existsSync(lastSessionFile)) {
    lastSessionDate = fs.readFileSync(lastSessionFile, 'utf-8').trim();
  }

  const changedFiles = gitChangedFiles(lastSessionDate, config.workspaceRoot);
  const packagesChanged = [...new Set(changedFiles.map(f => {
    const m = f.match(/^packages\/([^/]+)/);
    return m ? m[1] : null;
  }).filter(Boolean) as string[])];
  const commits = gitLog(lastSessionDate, config.workspaceRoot).split('\n').filter(Boolean);
  const testResults = countTestResults(config.workspaceRoot);
  const taskMgr = new TaskLifecycleManager(config);
  const taskSnap = taskMgr.getSnapshot();
  const gapsSummary = analyzeGaps(config.gapsPath);
  const priorities = getNextPriorities();

  let md = `# HANDOFF — Próxima Sessão\n\n`;
  md += `> Gerado automaticamente em ${now}\n`;
  md += `> Baseado em alterações desde ${lastSessionDate}\n\n`;

  md += `## 📊 Status Atual\n\n`;
  md += `| Métrica | Valor |\n|---------|-------|\n`;
  md += `| Commits desde último handoff | ${commits.length} |\n`;
  md += `| Arquivos alterados | ${changedFiles.length} |\n`;
  md += `| Packages alterados | ${packagesChanged.length} |\n`;
  md += `| Testes passando | ${testResults.passed}/${testResults.total} |\n`;
  md += `| Gaps abertos | ${gapsSummary.open} |\n`;
  md += `| Tasks pendentes | ${taskSnap.byStatus.pending} |\n`;
  md += `| Tasks em progresso | ${taskSnap.byStatus.in_progress} |\n`;
  md += `| Tasks completadas | ${taskSnap.byStatus.completed} |\n\n`;

  if (packagesChanged.length > 0) {
    md += `## 📦 Packages Alterados\n\n`;
    for (const pkg of packagesChanged) md += `- \`${pkg}\`\n`;
    md += '\n';
  }

  if (commits.length > 0) {
    md += `## 📋 Commits Recentes\n\n`;
    md += '```\n';
    for (const c of commits.slice(0, 20)) md += `${c}\n`;
    if (commits.length > 20) md += `... e mais ${commits.length - 20} commits\n`;
    md += '```\n\n';
  }

  md += `## 🧪 Testes\n\n`;
  md += `- Total: ${testResults.total}\n`;
  md += `- Passados: ${testResults.passed}\n`;
  md += `- Falhos: ${testResults.failed}\n\n`;

  md += `## 🎯 Próximas Prioridades\n\n`;
  if (priorities.length > 0) {
    for (const p of priorities) md += `- ${p}\n`;
  } else {
    md += `- Nenhuma task pendente. Execute \`reality-sync sync\` para escanear novos gaps.\n`;
  }
  md += '\n';

  md += `## ✅ Instruções para a IA\n\n`;
  md += `1. Execute \`npx tsx packages/reality-sync/src/cli.ts sync\` para sincronizar docs\n`;
  md += `2. Leia \`.ai/tasks/TASKS-ATIVAS.md\` para ver a lista completa de tasks\n`;
  md += `3. Para cada task pendente, execute e marque como completa via \`reality-sync task done <id>\`\n`;
  md += `4. Ao final, execute \`npx tsx packages/reality-sync/src/cli.ts handoff\` para gerar o próximo handoff\n\n`;

  md += `---\n*Handoff gerado automaticamente pelo RealitySync Handoff Generator*\n`;

  const handoffPath = path.join(config.workspaceRoot, 'docs', 'governance', 'HANDOFF-NEXT-SESSION.md');
  fs.writeFileSync(handoffPath, md, 'utf-8');
  log.info(`Handoff generated at ${handoffPath}`);

  fs.writeFileSync(lastSessionFile, now, 'utf-8');

  return md;
}
