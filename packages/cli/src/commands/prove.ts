import { Command } from "commander";
import { spawnSync as spawn, type SpawnSyncOptions } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/** Interface que define a estrutura de prove deps. */
export interface ProveDeps {
  cwd: string;
  cliBin: string;
  cliDir: string;
  existsSync: (p: string) => boolean;
  mkdirSync: (p: string, opts?: { recursive?: boolean }) => void;
  statSync: (p: string) => { size: number };
  writeFileSync: (p: string, content: string) => void;
  spawnSync: (cmd: string, args: string[], opts?: SpawnSyncOptions) => { status: number | null; stdout: string; stderr: string };
  platform: string;
  log: (msg: string) => void;
  ledgerAppend?: (cmd: string, status: number, output: string) => void;
  getLogFile: () => string;
}

/**
 * Runs the end-to-end prove workflow (build, init, status, verify, doctor, feature, generators, critical files, stub scan).
 * @param deps - Injected prove dependencies.
 * @returns Process exit code (0 = success).
 */
export function runProve(deps: ProveDeps): number {
  let logContent = "=== AI-DEVKIT PROVE ===\n\n";
  const log = (msg: string) => { deps.log(msg); logContent += msg + "\n"; };

  const run = (step: string, cmdStr: string, args: string[], cwd?: string) => {
    log(`\n[🏃] ${step}`);
    const isWin = deps.platform === 'win32';
    const res = isWin
      ? deps.spawnSync(`${cmdStr} ${args.join(' ')}`, [], { cwd: cwd || deps.cwd, encoding: "utf8", shell: true })
      : deps.spawnSync(cmdStr, args, { cwd: cwd || deps.cwd, encoding: "utf8", shell: false });
    logContent += (res.stdout || "") + "\n" + (res.stderr || "") + "\n";
    if (res.status !== 0) {
      log(`❌ Falha: ${step}`);
      deps.writeFileSync(deps.getLogFile(), logContent);
      if (deps.ledgerAppend) deps.ledgerAppend('prove', 1, logContent);
      return 1;
    }
    log(`✅ Sucesso: ${step}`);
    return 0;
  };

  const tmpDir = path.join(os.tmpdir(), `ai-devkit-prove-${Date.now()}`);

  if (run("1. Compilar CLI", "npm", ["run", "build"], deps.cliDir) !== 0) return 1;
  if (run("2. CLI --help", "node", [deps.cliBin, "--help"]) !== 0) return 1;

  deps.mkdirSync(tmpDir, { recursive: true });
  if (run("3. Init Structure", "node", [deps.cliBin, "init", tmpDir, "--flavor", "nestjs", "--yes"]) !== 0) return 1;

  log("\n[🏃] 4. Status");
  const resStatus = deps.spawnSync("node", [deps.cliBin, "status"], { cwd: tmpDir, encoding: "utf8" });
  logContent += (resStatus.stdout || "") + "\n" + (resStatus.stderr || "") + "\n";
  if (!(resStatus.stdout || "").includes("Project Health")) {
    log("❌ Falha crítica: Status não gerou saída de saúde.");
    deps.writeFileSync(deps.getLogFile(), logContent);
    if (deps.ledgerAppend) deps.ledgerAppend("prove", 1, logContent);
    return 1;
  }
  log("✅ Sucesso: 4. Status executou corretamente.");

  log("\n[🏃] 5. Verify");
  const resVerify = deps.spawnSync("node", [deps.cliBin, "verify"], { cwd: tmpDir, encoding: "utf8" });
  logContent += (resVerify.stdout || "") + "\n" + (resVerify.stderr || "") + "\n";
  if (!(resVerify.stdout || "").includes("Todos os quality gates passaram")) {
    log("❌ Falha crítica: Verify não iniciou.");
    deps.writeFileSync(deps.getLogFile(), logContent);
    if (deps.ledgerAppend) deps.ledgerAppend('prove', 1, logContent);
    return 1;
  }
  log("✅ Sucesso: 5. Verify executou corretamente.");

  if (run("6. Doctor", "node", [deps.cliBin, "doctor"], tmpDir) !== 0) return 1;
  if (run("7. Feature Scaffold", "node", [deps.cliBin, "feature", "analyze", "login-module"], tmpDir) !== 0) return 1;

  const featureFile = path.join(tmpDir, ".ai/features/login-module/feature-brief.md");
  if (!deps.existsSync(featureFile)) {
    log(`❌ Falha: Arquivo de feature não foi criado.`);
    return 1;
  }

  if (run("8. Context Pack", "node", [deps.cliBin, "context", "pack", "login-context"], tmpDir) !== 0) return 1;
  if (!deps.existsSync(path.join(tmpDir, ".ai/context-packs/login-context.md"))) {
    log(`❌ Falha: Context pack não gerado.`);
    return 1;
  }

  if (run("9. Generators Execute", "node", [path.join(tmpDir, ".ai/bin/skeleton.js")], tmpDir) !== 0) return 1;

  log("\n[🏃] 10. Arquivos críticos não estão vazios");
  const criticalFiles = [".ai/laws.yaml", ".ai/project-manifest.yaml", ".ai/context/ai-handoff.md"];
  for (const f of criticalFiles) {
    const fp = path.join(tmpDir, f);
    if (deps.existsSync(fp)) {
      if (deps.statSync(fp).size < 5) {
        log(`❌ Arquivo vazio: ${f}`);
        return 1;
      }
    }
  }
  log("✅ Sucesso: 10. Arquivos críticos validados.");

  log("\n[🏃] 11. Varredura por stubs abandonados");
  const stubResult = deps.spawnSync("node", [path.join(tmpDir, ".ai/bin/check-placeholder-policy.js")], { cwd: tmpDir, encoding: "utf8" });
  logContent += (stubResult.stdout || "") + "\n" + (stubResult.stderr || "") + "\n";
  if (stubResult.status !== 0) {
    log("❌ Falha crítica: Stub encontrado na varredura.");
    deps.writeFileSync(deps.getLogFile(), logContent);
    if (deps.ledgerAppend) deps.ledgerAppend('prove', 1, logContent);
    return 1;
  }
  log("✅ Sucesso: 11. Nenhum stub real encontrado.");

  deps.writeFileSync(deps.getLogFile(), logContent);
  log(`\n🎉 PROVE EXECUTADO COM SUCESSO!`);
  log(`📄 Logs salvos em: ${deps.getLogFile()}`);
  return 0;
}

/**
 * Builds the `prove` CLI command (end-to-end verification).
 * @returns The configured Commander command.
 */
export function proveCommand(): Command {
  return new Command("prove").description("Prova funcionamento ponta a ponta do ai-devkit (E2E Test)")
    .action(async () => {
      const root = process.cwd();
      const logDir = path.join(root, ".ai/audit/test-runs");
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const logFile = path.join(logDir, `prove-${Date.now()}.log`);
      let ledgerAppend: ((cmd: string, status: number, output: string) => void) | undefined;
      try { ledgerAppend = (await import(path.join(root, '.ai/bin/ledger.js'))).appendEntry; } catch {}
      const exitCode = runProve({
        cwd: root,
        cliBin: path.join(__dirname, "../index.js"),
        cliDir: path.join(__dirname, "../../"),
        existsSync: (p) => fs.existsSync(p),
        mkdirSync: (p, o) => fs.mkdirSync(p, o),
        statSync: (p) => fs.statSync(p),
        writeFileSync: (p, c) => fs.writeFileSync(p, c),
        spawnSync: (cmd, args, opts) => { const r = spawn(cmd, args, opts); return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr) }; },
        platform: os.platform(),
        log: (msg) => console.log(msg),
        ledgerAppend,
        getLogFile: () => logFile,
      });
      process.exit(exitCode);
    });
}
