import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { printHeader, printLine, finish } from '../utils/output';
import { getIO } from '../io';
import {
  ScannerOptions,
  DEFAULT_SCANNER_OPTIONS,
  runDuplicationScan,
  formatDuplicationReport,
  contentSimilarity,
} from '../runtime/duplication';

function collectFiles(dir: string, result: string[] = []): string[] {
  try {
    const entries = getIO().fs.readDir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = getIO().fs.stat(fullPath);
        if (stat.isDirectory()) {
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            collectFiles(fullPath, result);
          }
        } else {
          result.push(fullPath);
        }
      } catch {
        result.push(fullPath);
      }
    }
  } catch {
    /* skip unreadable dirs */
  }
  return result;
}

function readFileContent(filePath: string): string | null {
  try {
    return getIO().fs.read(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function scannerCommand(): Command {
  const cmd = new Command('scanner')
    .description('Scanners de qualidade e manutencao do codigo');

  cmd.command('duplicates')
    .description('Detecta arquivos e funcoes duplicadas no projeto')
    .option('-d, --dir <path>', 'Diretorio para escanear', '.')
    .option('--min-filename-sim <number>', 'Similaridade minima de nome (0-1)', '0.8')
    .option('--min-content-sim <number>', 'Similaridade minima de conteudo (0-1)', '0.6')
    .option('--min-function-sim <number>', 'Similaridade minima de funcao (0-1)', '0.7')
    .option('--json', 'Saida em formato JSON')
    .action((options: { dir: string; minFilenameSim: string; minContentSim: string; minFunctionSim: string; json?: boolean }) => {
      const cwd = process.cwd();
      const scanDir = path.resolve(cwd, options.dir);

      if (!getIO().fs.exists(scanDir)) {
        printLine(`[ERROR] Diretorio nao encontrado: ${scanDir}`);
        finish({ checkpoint: 'scanner_duplicates', ok: false, status: 'failed', context_summary: 'Diretorio nao encontrado' });
        return;
      }

      const scannerOpts: ScannerOptions = {
        ...DEFAULT_SCANNER_OPTIONS,
        minFilenameSimilarity: parseFloat(options.minFilenameSim) || 0.8,
        minContentSimilarity: parseFloat(options.minContentSim) || 0.6,
        minFunctionSimilarity: parseFloat(options.minFunctionSim) || 0.7,
      };

      printHeader('Duplication Scanner');
      printLine(`Diretorio: ${scanDir}`);
      printLine(`Min filename sim: ${scannerOpts.minFilenameSimilarity}`);
      printLine(`Min content sim: ${scannerOpts.minContentSimilarity}`);
      printLine(`Min function sim: ${scannerOpts.minFunctionSimilarity}`);
      printLine('');

      const report = runDuplicationScan(scanDir, readFileContent, (dir: string) => collectFiles(dir), scannerOpts);

      if (options.json) {
        printLine(JSON.stringify(report, null, 2));
      } else {
        printLine(formatDuplicationReport(report));
      }

      const hasIssues = report.totalRedundant > 0;
      finish({
        checkpoint: 'scanner_duplicates',
        ok: !hasIssues,
        status: hasIssues ? 'warning' : 'passed',
        context_summary: hasIssues
          ? `${report.totalRedundant} redundancia(s) encontrada(s) em ${report.scannedFiles} arquivos`
          : `Nenhuma duplicacao em ${report.scannedFiles} arquivos`,
        data: { scannedFiles: report.scannedFiles, totalRedundant: report.totalRedundant },
      });
    });

  cmd.command('check-redundancy <file>')
    .description('Verifica redundancia de um arquivo especifico contra o projeto')
    .action((file: string) => {
      const cwd = process.cwd();
      const filePath = path.resolve(cwd, file);

      if (!getIO().fs.exists(filePath)) {
        printLine(`[ERROR] Arquivo nao encontrado: ${filePath}`);
        finish({ checkpoint: 'scanner_check_redundancy', ok: false, status: 'failed', context_summary: 'Arquivo nao encontrado' });
        return;
      }

      const content = readFileContent(filePath);
      if (!content) {
        printLine(`[ERROR] Nao foi possivel ler: ${filePath}`);
        finish({ checkpoint: 'scanner_check_redundancy', ok: false, status: 'failed', context_summary: 'Falha na leitura' });
        return;
      }

      const allFiles = collectFiles(cwd);

      let mostSimilarFile: string | null = null;
      let highestSimilarity = 0;

      for (const f of allFiles) {
        if (f === filePath) continue;
        if (f.includes('node_modules') || f.includes('.git')) continue;
        const fc = readFileContent(f);
        if (!fc) continue;

        const sim = contentSimilarity(content, fc);
        if (sim > highestSimilarity) {
          highestSimilarity = sim;
          mostSimilarFile = f;
        }
      }

      printHeader('Redundancy Check');
      printLine(`Arquivo: ${filePath}`);
      if (mostSimilarFile && highestSimilarity >= (DEFAULT_SCANNER_OPTIONS.minContentSimilarity ?? 0.6)) {
        printLine(`REDUNDANTE — ${(highestSimilarity * 100).toFixed(0)}% similar a:`);
        printLine(`  ${mostSimilarFile}`);
        finish({
          checkpoint: 'scanner_check_redundancy',
          ok: false,
          status: 'warning',
          context_summary: `Arquivo redundante (${(highestSimilarity * 100).toFixed(0)}% similar)`,
          data: { redundant: true, similarFile: mostSimilarFile, similarity: highestSimilarity },
        });
      } else {
        printLine('Nenhuma redundancia significativa encontrada.');
        finish({
          checkpoint: 'scanner_check_redundancy',
          ok: true,
          status: 'passed',
          context_summary: 'Arquivo unico',
          data: { redundant: false },
        });
      }
    });

  return cmd;
}
