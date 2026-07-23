
import fs from "node:fs";
import path from "node:path";

/** Interface que define a estrutura de script result. */
export interface ScriptResult {
  added: string[];
  skipped: string[];
  overwritten: string[];
  preserved: string[];
}

/**
 * Processa package scripts.
 * @param packageJsonPath - Valor json path.
 * @param force - Valor force.
 * @param dryRun - Valor run.
 * @returns O resultado da operação.
 */
export function upsertPackageScripts(packageJsonPath: string, force: boolean, dryRun: boolean): ScriptResult {
  const result: ScriptResult = { added: [], skipped: [], overwritten: [], preserved: [] };
  
  const AI_SCRIPTS: Record<string, string> = {
    "ai:verify": "ai-devkit verify",
    "ai:status": "ai-devkit status",
    "ai:doctor": "ai-devkit doctor",
    "ai:sync": "ai-devkit sync",
    "ai:audit": "ai-devkit audit",
    "ai:context": "ai-devkit context",
    "ai:feature": "ai-devkit feature",
    "ai:prevention": "node .ai/bin/run-prevention-suite.js",
    "ai:check:portability": "node .ai/bin/check-portability.js",
    "ai:check:health": "node .ai/bin/check-health-consistency.js",
    "ai:check:generated-risk": "node .ai/bin/check-generated-code-risk.js",
    "ai:check:installer": "node .ai/bin/check-installer.js",
    "ai:check:empty-files": "node .ai/bin/check-empty-or-decorative-files.js",
    "ai:check:package-scripts": "node .ai/bin/check-package-scripts.js",
    "ai:check:artifact-manifest": "node .ai/bin/check-artifact-manifest.js",
    "ai:quality:gate": "npm run ai:prevention && ai-devkit verify",
    "ai:system:blueprint": "ai-devkit status"
  };

  // Se estivermos no repositório oficial do DevKit (verificado pela presença da pasta packages/cli), incluímos o check-installer
  const isDevkitRepo = fs.existsSync(path.join(path.dirname(packageJsonPath), 'packages/cli'));
  if (isDevkitRepo) {
    AI_SCRIPTS["ai:check:installer"] = "node .ai/bin/check-installer.js";
  }

  if (dryRun) {
    result.added = Object.keys(AI_SCRIPTS);
    return result;
  }

  let pkg: { scripts?: Record<string, string>; [key: string]: unknown } = { scripts: {} };
  if (fs.existsSync(packageJsonPath)) {
    try { 
      pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")); 
    } catch {}
  }
  if (!pkg.scripts) pkg.scripts = {};

  // Preserved are those not in AI_SCRIPTS
  for (const key of Object.keys(pkg.scripts)) {
    if (!AI_SCRIPTS[key]) {
      result.preserved.push(key);
    }
  }

  for (const [key, val] of Object.entries(AI_SCRIPTS)) {
    if (pkg.scripts[key]) {
      if (force) {
        pkg.scripts[key] = val;
        result.overwritten.push(key);
      } else {
        result.skipped.push(key);
      }
    } else {
      pkg.scripts[key] = val;
      result.added.push(key);
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
  return result;
}
