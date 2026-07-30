import { Command } from "commander";
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.runtime-hooks');
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
  logger.info('\n📝 File ${event}: ${filePath}');

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

      logger.info('  ❌ Violation detected by ${scanner}');
      logger.info('     ${violation.violation.split("\n")[0]}');
    } else {
      logger.info('  ✅ ${scanner} passed');
    }
  });

  if (violations.length > 0 && config.action === "block") {
    logger.info('\n🚫 File change BLOCKED due to ${violations.length} violation(s)');
  } else if (violations.length > 0) {
    logger.info('\n⚠️  ${violations.length} violation(s) logged (dry-run mode)');
  } else {
    logger.info('  ✅ All scanners passed');
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
      logger.info('✅ Runtime hooks config initialized at .ai/hooks/runtime.yaml');
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

      logger.info('\n👁️  Starting runtime file watcher...\n');
      logger.info('Watch paths: ${config.watch_paths.join(", ")}');
      logger.info('Ignore paths: ${config.ignore_paths.join(", ")}');
      logger.info('Scanners: ${config.scanners.join(", ")}');
      logger.info('Action: ${config.action}\n');

      const watcher = chokidar.watch(config.watch_paths, {
        ignored: config.ignore_paths,
        persistent: true,
        ignoreInitial: true
      });

      watcher
        .on("add", (path) => handleFileChange(path, "add", config))
        .on("change", (path) => handleFileChange(path, "change", config))
        .on("unlink", (path) => handleFileChange(path, "unlink", config));

      logger.info('✅ Watcher started. Press Ctrl+C to stop.\n');

      process.on("SIGINT", () => {
        logger.info('\n\n🛑 Stopping watcher...');
        watcher.close();
        process.exit(0);
      });
    });

  hooks
    .command("status")
    .description("Exibe status do runtime hooks")
    .action(() => {
      const config = loadConfig();
      
      logger.info('\n📊 Runtime Hooks Status:\n');
      logger.info('Enabled: ${config.enabled ? "Yes" : "No"}');
      logger.info('Action: ${config.action}');
      logger.info('Watch paths: ${config.watch_paths.length}');
      logger.info('Ignore paths: ${config.ignore_paths.length}');
      logger.info('Scanners: ${config.scanners.length}');
      logger.info('Report dir: ${config.report_dir}');

      const logFile = path.join(process.cwd(), REPORTS_DIR, "violations.jsonl");
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, "utf8").trim();
        const lines = content.split("\n").filter(l => l);
        logger.info('\nTotal violations logged: ${lines.length}');
      } else {
        logger.info('\nNo violations logged yet.');
      }
    });

  hooks
    .command("logs")
    .description("Exibe logs de violações recentes")
    .option("-n, --limit <number>", "Número de entradas", "10")
    .action((options) => {
      const logFile = path.join(process.cwd(), REPORTS_DIR, "violations.jsonl");
      
      if (!fs.existsSync(logFile)) {
        logger.info('No violations logged yet.');
        return;
      }

      const content = fs.readFileSync(logFile, "utf8").trim();
      const lines = content.split("\n").filter(l => l);
      const limit = parseInt(options.limit);
      const recent = lines.slice(-limit);

      logger.info('\n📋 Recent violations (${recent.length}):\n');
      
      recent.forEach((line, index) => {
        const event: ViolationEvent = JSON.parse(line);
        logger.info('${index + 1}. [${event.timestamp}] ${event.file}');
        logger.info('   Event: ${event.event}');
        logger.info('   Scanner: ${event.scanner}');
        logger.info('   Blocked: ${event.blocked ? "Yes" : "No"}');
        logger.info('   Violation: ${event.violation.split("\n")[0]}');
        console.log();
      });
    });

  return hooks;
}
