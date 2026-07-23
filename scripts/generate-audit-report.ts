import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const REPORTS_DIR = join(ROOT, '.ai', 'reports');

interface AuditSection {
  name: string;
  status: '✅' | '⚠️' | '❌';
  detail: string;
  output?: string;
}

function runScript(prog: string, args: string[]): { ok: boolean; output: string } {
  try {
    const output = execFileSync(prog, args, {
      cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: 'pipe', windowsHide: true,
    });
    return { ok: true, output: output.toString().trim() };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, output: (e.stdout?.toString() || e.stderr?.toString() || e.message || '').trim() };
  }
}

function resolveScript(relativePath: string): string {
  const fullPath = join(ROOT, relativePath);
  if (existsSync(fullPath)) return fullPath;
  return relativePath;
}

function runScriptStep(name: string, scriptPath: string): AuditSection {
  const resolved = resolveScript(scriptPath);
  if (!existsSync(resolved)) {
    return { name, status: '⚠️', detail: `Script not found: ${scriptPath}`, output: '' };
  }
  const result = runScript('npx.cmd', ['tsx', resolved]);
  let detail: string;
  let status: '✅' | '⚠️' | '❌';
  if (result.ok) {
    status = '✅';
    const lines = result.output.split('\n');
    const detailLine = lines.find(l => l.includes('**'));
    detail = detailLine || 'OK';
  } else {
    status = '❌';
    detail = 'Failed';
  }
  return { name, status, detail, output: result.output };
}

function main(): void {
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

  const sections: AuditSection[] = [];

  const tsc = runScript('npx.cmd', ['tsc', '--noEmit', '--project', 'tsconfig.json']);
  sections.push({
    name: 'TypeScript Compilation',
    status: tsc.ok ? '✅' : '❌',
    detail: tsc.ok ? 'All packages compile' : 'Compilation errors found',
    output: tsc.output,
  });

  sections.push(runScriptStep('Package.json Consistency', 'scripts/check-package-consistency.ts'));
  sections.push(runScriptStep('Unused Dependencies', 'scripts/check-unused-deps.ts'));
  sections.push(runScriptStep('Circular Dependencies', 'scripts/check-circular-deps.ts'));

  const now = new Date().toISOString();
  let report = `# Audit Report — ${now}\n\n`;
  report += `| Section | Status | Detail |\n`;
  report += `|---------|:------:|--------|\n`;
  for (const s of sections) {
    report += `| **${s.name}** | ${s.status} | ${s.detail} |\n`;
  }
  report += `\n---\n\n`;
  for (const s of sections) {
    if (s.output) {
      report += `<details>\n<summary>${s.name} Output</summary>\n\n`;
      report += '```\n' + s.output.slice(0, 2000) + '\n```\n';
      report += `</details>\n\n`;
    }
  }

  const reportPath = join(REPORTS_DIR, `audit-${now.slice(0, 10)}.md`);
  writeFileSync(reportPath, report, 'utf8');
  console.log(`Report saved: ${reportPath}`);

  const allPassed = sections.every(s => s.status === '✅');
  process.exit(allPassed ? 0 : 1);
}

main();
