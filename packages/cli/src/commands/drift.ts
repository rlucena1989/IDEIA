import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";

/** Interface que define a estrutura de drift finding. */
export interface DriftFinding {
  type: "stale" | "orphan" | "reality" | "completeness";
  source?: string;
  target?: string;
  message: string;
  severity: "low" | "medium" | "high";
}

/** Interface que define a estrutura de drift report. */
export interface DriftReport {
  timestamp: string;
  total_findings: number;
  findings: DriftFinding[];
  status: "clean" | "drift_detected";
}

const SOURCE_DIRS = [
  ".ai/policies",
  ".ai/laws.yaml",
  ".ai/governance.md",
  ".ai/security",
  ".ai/quality"
];

const TARGET_FILES = [
  "CLAUDE.md",
  ".cursorrules",
  ".cursor/rules/*.mdc",
  ".github/copilot-instructions.md",
  ".windsurf/rules/governance.md",
  ".clinerules",
  ".continuerules",
  "GEMINI.md",
  "AGENTS.md",
  ".amazonq/rules/governance.md",
  ".rules"
];

function getFileStats(filePath: string): { exists: boolean; mtime?: Date } {
  try {
    const stats = fs.statSync(filePath);
    return { exists: true, mtime: stats.mtime };
  } catch {
    return { exists: false };
  }
}

function findFilesByPattern(pattern: string): string[] {
  if (pattern.includes("*")) {
    const dir = path.dirname(pattern);
    const fullDir = path.join(process.cwd(), dir);
    
    if (!fs.existsSync(fullDir)) {
      return [];
    }

    const files = fs.readdirSync(fullDir);
    const ext = path.extname(pattern);
    return files
      .filter(f => f.endsWith(ext))
      .map(f => path.join(dir, f));
  }
  
  return [pattern];
}

export function checkStaleFiles(): DriftFinding[] {
  const findings: DriftFinding[] = [];

  SOURCE_DIRS.forEach(sourcePattern => {
    const sourceFiles = findFilesByPattern(sourcePattern);
    
    sourceFiles.forEach(sourceFile => {
      const sourceStats = getFileStats(sourceFile);
      if (!sourceStats.exists || !sourceStats.mtime) return;
      const sourceMtime = sourceStats.mtime;

      TARGET_FILES.forEach(targetPattern => {
        const targetFiles = findFilesByPattern(targetPattern);
        
        targetFiles.forEach(targetFile => {
          const targetStats = getFileStats(targetFile);
          if (!targetStats.exists || !targetStats.mtime) return;

          if (sourceMtime > targetStats.mtime) {
            findings.push({
              type: "stale",
              source: sourceFile,
              target: targetFile,
              message: `Target '${targetFile}' is older than source '${sourceFile}'`,
              severity: "medium"
            });
          }
        });
      });
    });
  });

  return findings;
}

export function checkOrphanFiles(): DriftFinding[] {
  const findings: DriftFinding[] = [];

  TARGET_FILES.forEach(targetPattern => {
    const targetFiles = findFilesByPattern(targetPattern);
    
    targetFiles.forEach(targetFile => {
      const targetStats = getFileStats(targetFile);
      if (!targetStats.exists) return;

      const hasSource = SOURCE_DIRS.some(sourcePattern => {
        const sourceFiles = findFilesByPattern(sourcePattern);
        return sourceFiles.some(sf => getFileStats(sf).exists);
      });

      if (!hasSource) {
        findings.push({
          type: "orphan",
          target: targetFile,
          message: `Target '${targetFile}' exists but no source files found`,
          severity: "low"
        });
      }
    });
  });

  return findings;
}

export function checkRealityFiles(): DriftFinding[] {
  const findings: DriftFinding[] = [];

  const tools = {
    "CLAUDE.md": "Claude Code",
    ".cursorrules": "Cursor",
    ".github/copilot-instructions.md": "GitHub Copilot",
    ".windsurf/rules/governance.md": "Windsurf",
    ".clinerules": "Cline",
    ".continuerules": "Continue",
    "GEMINI.md": "Gemini",
    "AGENTS.md": "Codex/Aider",
    ".amazonq/rules/governance.md": "Amazon Q",
    ".rules": "Zed"
  };

  Object.entries(tools).forEach(([file, tool]) => {
    const stats = getFileStats(file);
    if (stats.exists) {
      const toolConfigDir = path.dirname(file);
      if (toolConfigDir && !fs.existsSync(path.join(process.cwd(), toolConfigDir))) {
        findings.push({
          type: "reality",
          target: file,
          message: `Target '${file}' references '${tool}' but config directory doesn't exist`,
          severity: "low"
        });
      }
    }
  });

  return findings;
}

export function checkCompleteness(): DriftFinding[] {
  const findings: DriftFinding[] = [];

  const hasSource = SOURCE_DIRS.some(sourcePattern => {
    const sourceFiles = findFilesByPattern(sourcePattern);
    return sourceFiles.some(sf => getFileStats(sf).exists);
  });

  if (hasSource) {
    const hasAnyTarget = TARGET_FILES.some(targetPattern => {
      const targetFiles = findFilesByPattern(targetPattern);
      return targetFiles.some(tf => getFileStats(tf).exists);
    });

    if (!hasAnyTarget) {
      findings.push({
        type: "completeness",
        message: "Source files exist but no compiled targets generated",
        severity: "high"
      });
    }
  }

  return findings;
}

/**
 * Detecta drift.
 * @returns O resultado da operação.
 */
export function detectDrift(): DriftReport {
  const findings: DriftFinding[] = [
    ...checkStaleFiles(),
    ...checkOrphanFiles(),
    ...checkRealityFiles(),
    ...checkCompleteness()
  ];

  return {
    timestamp: new Date().toISOString(),
    total_findings: findings.length,
    findings,
    status: findings.length > 0 ? "drift_detected" : "clean"
  };
}

export function saveDriftReport(report: DriftReport): void {
  const reportsDir = path.join(process.cwd(), ".ai/reports/drift");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFile = path.join(reportsDir, "latest.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
}

export function printDriftReport(report: DriftReport): void {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║              DRIFT DETECTION REPORT                      ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  console.log(`📅 Timestamp: ${report.timestamp}`);
  console.log(`📊 Status: ${report.status === "clean" ? "✅ Clean" : "❌ Drift Detected"}`);
  console.log(`🔍 Total findings: ${report.total_findings}\n`);

  if (report.findings.length === 0) {
    console.log("✅ No drift detected. All sources and targets are synchronized.\n");
    return;
  }

  const grouped = report.findings.reduce((acc, f) => {
    if (!acc[f.type]) acc[f.type] = [];
    (acc[f.type] as DriftFinding[]).push(f);
    return acc;
  }, {} as Record<string, DriftFinding[]>);

  Object.entries(grouped).forEach(([type, findings]) => {
    console.log(`\n┌─────────────────────────────────────────────────────────┐`);
    console.log(`│ ${type.toUpperCase()} (${findings.length})`);
    console.log(`└─────────────────────────────────────────────────────────┘\n`);

    findings.forEach((f, index) => {
      console.log(`${index + 1}. ${f.message}`);
      if (f.source) console.log(`   Source: ${f.source}`);
      if (f.target) console.log(`   Target: ${f.target}`);
      console.log(`   Severity: ${f.severity}`);
      console.log();
    });
  });

  console.log("═".repeat(60));
  console.log(`Status: ${report.status}`);
  console.log("═".repeat(60) + "\n");
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function driftCommand(): Command {
  const drift = new Command("drift")
    .description("Detecta divergências entre fontes de governança e alvos compilados");

  drift
    .command("check")
    .description("Verifica drift entre fontes e alvos")
    .option("--json", "Retorna resultado em JSON")
    .option("--fix", "Recompila alvos stale automaticamente (requer compilador)")
    .action((options) => {
      const report = detectDrift();
      saveDriftReport(report);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printDriftReport(report);
      }

      if (options.fix) {
        console.log("\n🔧 Auto-fix not yet implemented. Requires multi-format compiler (Fase 2).");
        console.log("   Run 'ai-devkit compile' manually to regenerate targets.\n");
      }

      if (report.status === "drift_detected") {
        process.exit(1);
      }
    });

  drift
    .command("status")
    .description("Exibe status do último drift check")
    .action(() => {
      const reportFile = path.join(process.cwd(), ".ai/reports/drift/latest.json");
      
      if (!fs.existsSync(reportFile)) {
        console.log("No drift check performed yet. Run 'ai-devkit drift check' first.");
        return;
      }

      const report: DriftReport = JSON.parse(fs.readFileSync(reportFile, "utf8"));
      console.log(`\n📊 Last drift check: ${report.timestamp}`);
      console.log(`Status: ${report.status === "clean" ? "✅ Clean" : "❌ Drift Detected"}`);
      console.log(`Findings: ${report.total_findings}\n`);
    });

  return drift;
}
