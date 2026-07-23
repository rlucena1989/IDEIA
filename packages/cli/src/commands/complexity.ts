import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import { printLine, printHeader, printResult } from '../utils/output';

interface FuncComplexity {
  file: string;
  name: string;
  line: number;
  cyclomatic: number;
  lines: number;
}

function measureCyclomatic(code: string): number {
  let complexity = 1;
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\b/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\b\?\s/g,
    /\|\|/g,
    /&&/g,
  ];
  for (const pat of patterns) {
    const matches = code.match(pat);
    if (matches) complexity += matches.length;
  }
  return complexity;
}

function extractFunctions(code: string, filePath: string): FuncComplexity[] {
  const funcs: FuncComplexity[] = [];
  const _lines = code.split('\n');

  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*\([^)]*\)\s*{/g;
  let match: RegExpExecArray | null;

  while ((match = funcRegex.exec(code)) !== null) {
    const name = match[1] || match[2] || match[3] || '(anonymous)';
    const startLine = code.substring(0, match.index).split('\n').length;
    const startIdx = match.index;

    let braceCount = 0;
    let endIdx = startIdx;
    let started = false;
    for (let i = startIdx; i < code.length; i++) {
      if (code[i] === '{') { braceCount++; started = true; }
      else if (code[i] === '}') { braceCount--; }
      if (started && braceCount === 0) { endIdx = i + 1; break; }
    }

    const body = code.substring(startIdx, endIdx);
    const cyclomatic = measureCyclomatic(body);
    const funcLines = body.split('\n').length;

    if (cyclomatic > 1 || funcLines > 5) {
      funcs.push({ file: filePath, name, line: startLine, cyclomatic, lines: funcLines });
    }
  }

  return funcs;
}

function walkFiles(dir: string, results: FuncComplexity[] = []): FuncComplexity[] {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist') {
        walkFiles(fp, results);
      } else if ((e.name.endsWith('.ts') || e.name.endsWith('.tsx')) && !e.name.endsWith('.test.ts') && !e.name.endsWith('.spec.ts')) {
        try {
          const code = fs.readFileSync(fp, 'utf8');
          const funcs = extractFunctions(code, fp);
          results.push(...funcs);
        } catch { /* skip unreadable */ }
      }
    }
  } catch { /* skip */ }
  return results;
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function complexityCommand(): Command {
  const cmd = new Command('complexity')
    .description('Analisa complexidade ciclomatica do codigo (QLD-04)');

  cmd
    .command('scan')
    .description('Escaneia arquivos TypeScript e reporta complexidade')
    .option('-d, --dir <path>', 'Diretorio para escanear', 'packages/cli/src')
    .option('-t, --threshold <n>', 'Threshold de complexidade', '10')
    .option('--json', 'Saida em JSON')
    .action((options: { dir: string; threshold: string; json?: boolean }) => {
      const root = process.cwd();
      const targetDir = path.resolve(root, options.dir);

      if (!fs.existsSync(targetDir)) {
        printResult('Erro', false, `Diretorio nao encontrado: ${targetDir}`);
        return;
      }

      printLine(`Escaneando: ${targetDir}`);
      const all = walkFiles(targetDir);
      const threshold = parseInt(options.threshold, 10);
      const high = all.filter(f => f.cyclomatic >= threshold);
      high.sort((a, b) => b.cyclomatic - a.cyclomatic);

      if (options.json) {
        printLine(JSON.stringify({ total: all.length, highComplexity: high.length, threshold, functions: high }, null, 2));
        return;
      }

      const avg = all.length > 0 ? Math.round(all.reduce((s, f) => s + f.cyclomatic, 0) / all.length * 10) / 10 : 0;
      printLine(`Total funcoes analisadas: ${all.length}`);
      printLine(`Media complexidade: ${avg}`);
      printLine(`Funcoes acima de threshold (>=${threshold}): ${high.length}`);
      printLine('');

      if (high.length > 0) {
        printHeader(`Top ${Math.min(high.length, 20)} funcoes mais complexas`);
        for (const f of high.slice(0, 20)) {
          const relFile = path.relative(root, f.file);
          printLine(`  ${f.cyclomatic.toString().padStart(3)}  ${f.name.padEnd(30)}  ${relFile}:${f.line}`);
        }
      } else {
        printLine('Nenhuma funcao acima do threshold encontrada.');
      }
    });

  cmd
    .command('report')
    .description('Gera relatorio CSV de complexidade')
    .option('-d, --dir <path>', 'Diretorio para escanear', 'packages/cli/src')
    .option('-o, --output <path>', 'Arquivo de saida', '.ai/reports/complexity-report.csv')
    .action((options: { dir: string; output: string }) => {
      const root = process.cwd();
      const targetDir = path.resolve(root, options.dir);
      const all = walkFiles(targetDir);
      all.sort((a, b) => b.cyclomatic - a.cyclomatic);

      const outPath = path.resolve(options.output);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const header = 'arquivo;funcao;linha;complexidade;linhas';
      const rows = all.map(f => {
        const rel = path.relative(root, f.file);
        return `${rel};${f.name};${f.line};${f.cyclomatic};${f.lines}`;
      });
      fs.writeFileSync(outPath, [header, ...rows].join('\n'), 'utf8');
      printLine(`Relatorio salvo: ${outPath} (${all.length} funcoes)`);
    });

  return cmd;
}