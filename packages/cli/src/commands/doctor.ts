import { Command } from 'commander';
import { printHeader, printLine, finish } from "../utils/output";
import { getIO, IOContainer } from '../io';

/**
 * Verifica env.
 * @param io - Valor io.
 * @returns O resultado da operação.
 */
export function checkEnv(io?: IOContainer) {
    const { shell, fs } = io || getIO();
    let score = 100;
    const report: string[] = [];
    
    const nodeVersion = process.versions.node;
    report.push(`[OK] Node.js Version: ${nodeVersion}`);
    
    const gitResult = shell.execString('git --version');
    if (gitResult.status === 0) {
       report.push(`[OK] Git is installed`);
    } else {
       report.push(`[ERR] Git is missing`);
       score -= 20;
    }

    const manifestPath = require('node:path').join(fs.cwd(), '.ai', 'project-manifest.yaml');
    if (fs.exists(manifestPath)) {
       report.push(`[OK] AI-Devkit initialized (.ai/project-manifest.yaml exists)`);
    } else {
       report.push(`[WARN] AI-Devkit not initialized. Run 'ai-devkit init'`);
       score -= 30;
    }

    return { score, report };
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function doctorCommand(): Command {
  return new Command('doctor')
    .description('Diagnose AI-Devkit installation environment')
    .action(() => {
      printHeader('AI-Devkit Doctor');
      const { score, report } = checkEnv();
      report.forEach(r => printLine(r));
      const ok = score >= 90;
      finish({
        checkpoint: "doctor",
        ok,
        status: ok ? "passed" : "failed",
        context_summary: ok
          ? `Environment Health: ${score}/100`
          : `Environment Health: ${score}/100 — abaixo do mínimo recomendado (90)`,
        data: { environmentHealth: score, checks: report },
      });
    });
}
