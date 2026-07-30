import { Command } from "commander";
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.verify');
import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REQUIRED_FILE_GROUPS } from "../core/health/required-files";
import { getMode } from "./mode";

/** Interface que define a estrutura de verify deps. */
export interface VerifyDeps {
  cwd: string;
  existsSync: (p: string) => boolean;
  spawnSync: (cmd: string, args: string[], opts: SpawnSyncOptions) => { status: number | null; stdout: string; stderr: string };
  getMode: (root: string) => { mode: string };
  ledgerAppend?: (cmd: string, status: number, output: string) => void;
  isLLMMode: boolean;
  noRecursion: boolean;
}

/**
 * Runs all quality gates (required files, status consistency, prevention suite, quality agent).
 * @param deps - Injected verify dependencies.
 * @returns Exit code (0 = all gates passed).
 */
export function runVerify(deps: VerifyDeps): number {
  const { mode } = deps.getMode(deps.cwd);
  let exitCode = 0;
  const output: string[] = [];
  const log = (msg: string) => { output.push(msg); if (!deps.isLLMMode) logger.info(msg); };
  const fullOutput = () => output.join("\n");

  log(`Modo de sessao: ${mode}`);

  REQUIRED_FILE_GROUPS.flatMap(g => g.required).forEach(file => {
    if (!deps.existsSync(path.join(deps.cwd, file))) {
      log(`❌ Arquivo obrigatorio ausente: ${file}`);
      exitCode = 1;
    } else {
      log(`✅ Encontrado: ${file}`);
    }
  });

  if (exitCode !== 0) log("\n❌ Falha na verificacao de arquivos estruturais.");

  if (exitCode === 0) {
    const cliEntry = path.resolve(__dirname, '../../dist/index.js');
    const statusRes = deps.spawnSync("node", [cliEntry, "status"], { cwd: deps.cwd, encoding: 'utf8' });
    if (statusRes.status !== 0) {
      log("\n❌ Health Consistency Failed: verify cannot pass if status reports critical/high missing files.");
      exitCode = 1;
    }
  }

  const skipPrevention = mode === 'debugging' || mode === 'documentation';
  if (exitCode === 0 && !deps.noRecursion && !skipPrevention) {
    const preventionSuite = path.join(deps.cwd, ".ai/bin/run-prevention-suite.js");
    if (deps.existsSync(preventionSuite)) {
      log("\nExecutando prevention suite...");
      const result = deps.spawnSync("node", [preventionSuite], { stdio: "pipe", cwd: deps.cwd, encoding: 'utf8' });
      if (!deps.isLLMMode && result.stdout) logger.info(result.stdout);
      if (!deps.isLLMMode && result.stderr) console.error(result.stderr);
      if (result.status !== 0) {
        log("\n❌ Prevention suite falhou.");
        exitCode = 1;
      }
    }
  } else if (skipPrevention) {
    log(`\nModo ${mode}: prevention suite ignorada.`);
  }

  const skipQualityAgent = mode === 'debugging' || mode === 'documentation' || mode === 'performance';
  if (exitCode === 0 && !skipQualityAgent) {
    const qgPath = path.join(deps.cwd, ".ai/bin/quality-agent.js");
    if (deps.existsSync(qgPath)) {
      log("\nExecutando quality-agent...");
      const result = deps.spawnSync("node", [qgPath], { stdio: "pipe", cwd: deps.cwd, encoding: 'utf8' });
      if (!deps.isLLMMode && result.stdout) logger.info(result.stdout);
      if (!deps.isLLMMode && result.stderr) console.error(result.stderr);
      if (result.status !== 0) {
        log("\n❌ Quality gates falharam.");
        exitCode = 1;
      }
    }
  } else if (skipQualityAgent) {
    log(`Modo ${mode}: quality-agent ignorado.`);
  }

  if (exitCode === 0) log("\n✅ Todos os quality gates passaram.");

  if (deps.ledgerAppend) deps.ledgerAppend('verify', exitCode, fullOutput());

  if (deps.isLLMMode) {
    console.log(JSON.stringify({
      ok: exitCode === 0, checkpoint: "verify",
      status: exitCode === 0 ? "passed" : "failed",
      context_summary: exitCode === 0 ? "Todos os quality gates passaram." : "Quality gates falharam.",
      next_actions: exitCode === 0 ? [] : ["Corrigir falhas e executar ai-devkit verify novamente"],
      cost_usd: 0.00, mode,
    }, null, 2));
  }
  return exitCode;
}

/**
 * Builds the `verify` CLI command.
 * @returns The configured Commander command.
 */
export function verifyCommand(): Command {
  return new Command("verify")
    .description("Executa todos os quality gates disponiveis")
    .action(() => {
      const root = process.cwd();
      let ledgerAppend: ((cmd: string, status: number, output: string) => void) | undefined;
      try { ledgerAppend = require(path.join(root, '.ai/bin/ledger.js')).appendEntry; } catch (e) { console.error(`[verify] ledger append unavailable: ${e instanceof Error ? e.message : String(e)}`); }
      const exitCode = runVerify({
        cwd: root,
        existsSync: (p) => fs.existsSync(p),
        spawnSync: (cmd, args, opts) => spawnSync(cmd, args, opts) as { status: number | null; stdout: string; stderr: string },
        getMode,
        ledgerAppend,
        isLLMMode: process.env.AI_LLM_MODE === '1',
        noRecursion: !!process.env.AI_DEVKIT_NO_RECURSION,
      });
      process.exit(exitCode);
    });
}
