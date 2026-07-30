import { Command } from "commander";
import { createLogger } from '@ideia/logger';
import { REQUIRED_FILE_GROUPS } from "../core/health/required-files";
import { printHeader, printLine, printSummary, finish } from "../utils/output";
import { detectStack } from "./detect";
import { getIO } from "../io";

type StatusArea = {
  id: string;
  label: string;
  score: number;
  findings: string[];
};

/** Tipo que define status report. */
export type StatusReport = {
  areas: StatusArea[];
  finalHealth: number;
  belowRecommended: boolean;
};

function exists(filePath: string): boolean {
  return getIO().fs.exists(filePath);
}

function daysSinceModified(filePath: string): number | null {
  const io = getIO();
  if (!io.fs.exists(filePath)) return null;
  try {
    const stat = io.fs.stat(filePath);
    const diff = Date.now() - stat.mtimeMs;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Processa status.
 * @returns O resultado da operação.
 */
export function computeStatus(): StatusReport {
  const areas: StatusArea[] = [];
  let totalScore = 0;

  for (const group of REQUIRED_FILE_GROUPS) {
    let categoryScore = 100;
    const findings: string[] = [];

    for (const file of group.required) {
      if (!exists(file)) {
        categoryScore -= (100 / group.required.length);
        findings.push(`Ausente: ${file}`);
      } else {
        findings.push(`OK: ${file}`);
      }
    }

    if (group.id === "context") {
      const age = daysSinceModified(".ai/context/ai-handoff.md");
      if (age !== null) {
        if (age > 14) categoryScore -= 30;
        findings.push(`Idade do Handoff: ${age} dia(s)`);
      }
    }

    const finalScore = Math.max(0, Math.round(categoryScore));
    areas.push({ id: group.id, label: group.label, score: finalScore, findings });
    totalScore += finalScore;
  }

  const finalHealth = Math.round(totalScore / REQUIRED_FILE_GROUPS.length);
  return { areas, finalHealth, belowRecommended: finalHealth < 85 };
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function statusCommand(): Command {
  return new Command("status")
    .description("Audita a saúde do projeto atual")
    .action(() => {
      const { areas, finalHealth, belowRecommended } = computeStatus();
      const stack = detectStack();

      printHeader("AI DevKit Project Status");
      printLine(`Stack: ${stack.languages.join(', ') || 'nao detectada'}`);
      if (stack.frameworks.length) printLine(`Frameworks: ${stack.frameworks.join(', ')}`);
      printLine('');

      for (const area of areas) {
        printSummary(area.score, 100, area.label);
        area.findings.forEach(f => printLine(`   - ${f}`));
      }

      printLine(`\nProject Health: ${finalHealth}/100\n`);
      const ok = !belowRecommended;
      finish({
        checkpoint: "status",
        ok,
        status: ok ? "passed" : "failed",
        context_summary: ok
          ? "Projeto em bom estado."
          : "Projeto abaixo do nível recomendado de saúde.",
        data: {
          areas: areas.map(a => ({ id: a.id, label: a.label, score: a.score, findings: a.findings })),
          finalHealth,
          stack,
        },
      });
    });
}
