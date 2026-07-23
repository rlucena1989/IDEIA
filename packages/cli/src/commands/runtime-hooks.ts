import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import chokidar from "chokidar";
import yaml from "js-yaml";

/** Interface que define a estrutura de runtime hook config. */
export interface RuntimeHookConfig {
  enabled: boolean;
  watch_paths: string[];
  ignore_paths: string[];
  scanners: string[];
  action: "log" | "block";
  report_dir: string;
}

const HOOKS_DIR = ".ai/hooks";
const CONFIG_FILE = "runtime.yaml";
const REPORTS_DIR = ".ai/reports/runtime-hooks";

function getConfigPath(): string {
  return path.join(process.cwd(), HOOKS_DIR, CONFIG_FILE);
}

function ensureHooksDir(): void {
  const dir = path.join(process.cwd(), HOOKS_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureReportsDir(): void {
  const dir = path.join(process.cwd(), REPORTS_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDefaultConfig(): RuntimeHookConfig {
  return {
    enabled: true,
    watch_paths: ["src/**/*", "packages/**/*"],
    ignore_paths: ["node_modules/**", "dist/**", "build/**", ".git/**"],
    scanners: ["check-placeholder-policy.js", "check-package-scripts.js"],
    action: "log",
    report_dir: REPORTS_DIR
  };
}

function loadConfig(): RuntimeHookConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return getDefaultConfig();
  }

  try {
    const content = fs.readFileSync(configPath, "utf8");
    return yaml.load(content) as RuntimeHookConfig;
  } catch {
    return getDefaultConfig();
  }
}

function saveConfig(config: RuntimeHookConfig): void {
  ensureHooksDir();
  fs.writeFileSync(getConfigPath(), yaml.dump(config, { indent: 2 }));
}

interface ViolationEvent {
  timestamp: string;
  file: string;
  event: string;
  scanner: string;
  violation: string;
  blocked: boolean;
}

function logViolation(event: ViolationEvent): void {
  ensureReportsDir();
  const logFile = path.join(process.cwd(), REPORTS_DIR, "violations.jsonl");
  fs.appendFileSync(logFile, JSON.stringify(event) + "\n");
}

function runScanner(scanner: string, _filePath: string): { passed: boolean; output: string } {
  const scannerPath = path.join(process.cwd(), ".ai/bin", scanner);
  
  if (!fs.existsSync(scannerPath)) {
    return { passed: true, output: `Scanner ${scanner} not found` };
  }

  const result = spawnSync("node", [scannerPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, AI_DEVKIT_STRICT_AUDIT: "1" }
  });

  return {
    passed: result.status === 0,
    output: result.stdout + result.stderr
  };
}

function handleFileChange(filePath: string, event: string, config: RuntimeHookConfig): void {
  console.log(`\n📝 File ${event}: ${filePath}`);

  const violations: ViolationEvent[] = [];

  config.scanners.forEach(scanner => {
    const result = runScanner(scanner, filePath);
    
    if (!result.passed) {
      const violation: ViolationEvent = {
        timestamp: new Date().toISOString(),
        file: filePath,
        event,
        scanner,
        violation: result.output.substring(0, 200),
        blocked: config.action === "block"
      };

      violations.push(violation);
      logViolation(violation);

      console.log(`  ❌ Violation detected by ${scanner}`);
      console.log(`     ${violation.violation.split("\n")[0]}`);
    } else {
      console.log(`  ✅ ${scanner} passed`);
    }
  });

  if (violations.length > 0 && config.action === "block") {
    console.log(`\n🚫 File change BLOCKED due to ${violations.length} violation(s)`);
  } else if (violations.length > 0) {
    console.log(`\n⚠️  ${violations.length} violation(s) logged (dry-run mode)`);
  } else {
    console.log(`  ✅ All scanners passed`);
  }
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function hooksCommand(): Command {
  const hooks = new Command("hooks")
    .description("Gerencia runtime hooks para interceptação de filesystem");

  hooks
    .command("init")
    .description("Inicializa configuração de runtime hooks")
    .action(() => {
      const config = getDefaultConfig();
      saveConfig(config);
      console.log("✅ Runtime hooks config initialized at .ai/hooks/runtime.yaml");
    });

  hooks
    .command("watch")
    .description("Inicia watcher de filesystem")
    .option("--dry-run", "Apenas loga violações sem bloquear")
    .action((options) => {
      const config = loadConfig();
      
      if (options.dryRun) {
        config.action = "log";
      }

      console.log("\n👁️  Starting runtime file watcher...\n");
      console.log(`Watch paths: ${config.watch_paths.join(", ")}`);
      console.log(`Ignore paths: ${config.ignore_paths.join(", ")}`);
      console.log(`Scanners: ${config.scanners.join(", ")}`);
      console.log(`Action: ${config.action}\n`);

      const watcher = chokidar.watch(config.watch_paths, {
        ignored: config.ignore_paths,
        persistent: true,
        ignoreInitial: true
      });

      watcher
        .on("add", (path) => handleFileChange(path, "add", config))
        .on("change", (path) => handleFileChange(path, "change", config))
        .on("unlink", (path) => handleFileChange(path, "unlink", config));

      console.log("✅ Watcher started. Press Ctrl+C to stop.\n");

      process.on("SIGINT", () => {
        console.log("\n\n🛑 Stopping watcher...");
        watcher.close();
        process.exit(0);
      });
    });

  hooks
    .command("status")
    .description("Exibe status do runtime hooks")
    .action(() => {
      const config = loadConfig();
      
      console.log("\n📊 Runtime Hooks Status:\n");
      console.log(`Enabled: ${config.enabled ? "Yes" : "No"}`);
      console.log(`Action: ${config.action}`);
      console.log(`Watch paths: ${config.watch_paths.length}`);
      console.log(`Ignore paths: ${config.ignore_paths.length}`);
      console.log(`Scanners: ${config.scanners.length}`);
      console.log(`Report dir: ${config.report_dir}`);

      const logFile = path.join(process.cwd(), REPORTS_DIR, "violations.jsonl");
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, "utf8").trim();
        const lines = content.split("\n").filter(l => l);
        console.log(`\nTotal violations logged: ${lines.length}`);
      } else {
        console.log(`\nNo violations logged yet.`);
      }
    });

  hooks
    .command("logs")
    .description("Exibe logs de violações recentes")
    .option("-n, --limit <number>", "Número de entradas", "10")
    .action((options) => {
      const logFile = path.join(process.cwd(), REPORTS_DIR, "violations.jsonl");
      
      if (!fs.existsSync(logFile)) {
        console.log("No violations logged yet.");
        return;
      }

      const content = fs.readFileSync(logFile, "utf8").trim();
      const lines = content.split("\n").filter(l => l);
      const limit = parseInt(options.limit);
      const recent = lines.slice(-limit);

      console.log(`\n📋 Recent violations (${recent.length}):\n`);
      
      recent.forEach((line, index) => {
        const event: ViolationEvent = JSON.parse(line);
        console.log(`${index + 1}. [${event.timestamp}] ${event.file}`);
        console.log(`   Event: ${event.event}`);
        console.log(`   Scanner: ${event.scanner}`);
        console.log(`   Blocked: ${event.blocked ? "Yes" : "No"}`);
        console.log(`   Violation: ${event.violation.split("\n")[0]}`);
        console.log();
      });
    });

  return hooks;
}
