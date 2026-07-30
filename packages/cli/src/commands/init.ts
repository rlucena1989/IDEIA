import { Command } from "commander";
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.init');
import fs from "node:fs";
import path from "node:path";
import { findTemplateAiDir } from "../utils/template";
import { copyTemplateDirectory, CopyMode, CopyResult } from "../utils/copy";
import { upsertPackageScripts } from "../utils/package-json";
import { generateSetupReport } from "../utils/report";
import { checkPrerequisites } from "../utils/prerequisites";
import { detectStack } from "./detect";
import { runWizard } from "./wizard";

/** Processa l l o w e d_ f l a v o r s. */
export const ALLOWED_FLAVORS = ["nestjs", "express", "fastify", "fastapi", "go"] as const;
/** Tipo que define flavor. */
export type Flavor = typeof ALLOWED_FLAVORS[number];
const ALLOWED_FLAVORS_SET: Set<string> = new Set(ALLOWED_FLAVORS);

/** Processa e m p l a t e s. */
export const TEMPLATES = ["nodejs-api", "nextjs-app", "python-api"] as const;
const TEMPLATES_SET: Set<string> = new Set(TEMPLATES);

/** Processa n s t a l l_ m o d e s. */
export const INSTALL_MODES = ["minimal", "standard", "full"] as const;
/** Tipo que define install mode. */
export type InstallMode = typeof INSTALL_MODES[number];

/** Processa o d e_ f i l t e r s. */
export const MODE_FILTERS: Record<InstallMode, { include: string[]; exclude: string[] }> = {
  minimal: {
    include: [
      "laws.yaml", "project-manifest.yaml", "context/ai-handoff.md",
      "policies/command-policy.md", "policies/ai-generated-code-policy.md",
      "bin/verify.js", "bin/quality-agent.js"
    ],
    exclude: []
  },
  standard: {
    include: [],
    exclude: ["generators", "prompts", "frameworks", "features", "deployment"]
  },
  full: { include: [], exclude: [] }
};

/** Interface que define a estrutura de init deps. */
export interface InitDeps {
  existsSync: (p: string) => boolean;
  statSync: (p: string) => { isDirectory: () => boolean };
  mkdirSync: (p: string, opts?: { recursive?: boolean }) => void;
  readdirSync: (p: string) => string[];
  readFileSync: (p: string, enc: string) => string;
  readFileBuffer: (p: string) => Buffer;
  writeFileSync: (p: string, content: string) => void;
  pathResolve: (...segments: string[]) => string;
  pathJoin: (...segments: string[]) => string;
  pathBasename: (p: string) => string;
  pathDirname: (p: string) => string;
  pathRelative: (from: string, to: string) => string;
  cwd: string;
  __dirname: string;
  log: (msg: string) => void;
  error: (msg: string) => void;
  detectStack: (dir: string) => { languages: string[]; frameworks: string[] };
}

function realDeps(): InitDeps {
  return {
    existsSync: (p) => fs.existsSync(p),
    statSync: (p) => fs.statSync(p),
    mkdirSync: (p, o) => fs.mkdirSync(p, o),
    readdirSync: (p) => fs.readdirSync(p),
    readFileSync: (p, e) => fs.readFileSync(p, e as 'utf8') as string,
    readFileBuffer: (p) => fs.readFileSync(p),
    writeFileSync: (p, c) => fs.writeFileSync(p, c),
    pathResolve: (...s) => path.resolve(...s),
    pathJoin: (...s) => path.join(...s),
    pathBasename: (p) => path.basename(p),
    pathDirname: (p) => path.dirname(p),
    pathRelative: (f, t) => path.relative(f, t),
    cwd: process.cwd(),
    __dirname: __dirname,
    log: (msg) => logger.info(msg),
    error: (msg) => console.error(msg),
    detectStack,
  };
}

/**
 * Busca project template dir.
 * @param templateName - Valor name.
 * @param deps - Valor deps.
 * @returns O resultado da operação.
 */
export function findProjectTemplateDir(templateName: string, deps: InitDeps): string {
  const candidates = [
    deps.pathResolve(deps.__dirname, `../../templates/project-templates/${templateName}`),
    deps.pathResolve(deps.__dirname, `../templates/project-templates/${templateName}`),
    deps.pathResolve(deps.cwd, `packages/cli/templates/project-templates/${templateName}`),
  ];
  for (const candidate of candidates) {
    if (deps.existsSync(candidate) && deps.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  throw new Error(`Template "${templateName}" not found. Checked: ${candidates.join(", ")}`);
}

/**
 * Processa from template.
 * @param templateDir - Valor dir.
 * @param targetDir - Valor dir.
 * @param projectName - Valor name.
 * @param mode - Valor mode.
 * @param deps - Valor deps.
 * @returns O resultado da operação.
 */
export function scaffoldFromTemplate(templateDir: string, targetDir: string, projectName: string, mode: CopyMode, deps: InitDeps): CopyResult {
  const result: CopyResult = { copied: [], skipped: [], overwritten: [], backedUp: [], errors: [] };

  function copyRecursive(src: string, dest: string) {
    if (!deps.existsSync(src)) return;
    const stats = deps.statSync(src);
    if (stats.isDirectory()) {
      if (mode !== "dry-run" && !deps.existsSync(dest)) {
        deps.mkdirSync(dest, { recursive: true });
      }
      for (const file of deps.readdirSync(src)) {
        copyRecursive(deps.pathJoin(src, file), deps.pathJoin(dest, file));
      }
    } else {
      let content = deps.readFileSync(src, 'utf8');
      if (src.endsWith('package.json') || src.endsWith('pyproject.toml')) {
        content = content.replace(/placeholder/g, projectName);
      }

      if (deps.existsSync(dest)) {
        if (mode === "force") {
          deps.writeFileSync(dest, content);
          result.overwritten.push(dest);
        } else {
          result.skipped.push(dest);
        }
      } else {
        if (mode !== "dry-run") {
          deps.mkdirSync(deps.pathDirname(dest), { recursive: true });
          deps.writeFileSync(dest, content);
        }
        result.copied.push(dest);
      }
    }
  }

  try { copyRecursive(templateDir, targetDir); }
  catch (err: unknown) { result.errors.push(err instanceof Error ? err.message : String(err)); }
  return result;
}

/**
 * Valida flavor.
 * @param flavor - Valor flavor.
 */
export function validateFlavor(flavor: string): asserts flavor is Flavor {
  if (!ALLOWED_FLAVORS_SET.has(flavor)) throw new Error(`Invalid flavor "${flavor}". Allowed: ${ALLOWED_FLAVORS.join(", ")}`);
}

/**
 * Processa detect flavor.
 * @param targetDir - Valor dir.
 * @param deps - Valor deps.
 * @returns O resultado da operação.
 */
export function autoDetectFlavor(targetDir: string, deps: InitDeps): string {
  const stack = deps.detectStack(targetDir);
  if (stack.frameworks.includes('nestjs')) return 'nestjs';
  if (stack.frameworks.includes('fastify')) return 'fastify';
  if (stack.frameworks.includes('express')) return 'express';
  if (stack.frameworks.includes('fastapi')) return 'fastapi';
  if (stack.languages.includes('go')) return 'go';
  return 'nestjs';
}

/**
 * Processa copy file.
 * @param relativePath - Valor path.
 * @param mode - Valor mode.
 * @returns O resultado da operação.
 */
export function shouldCopyFile(relativePath: string, mode: InstallMode): boolean {
  const filter = MODE_FILTERS[mode];
  const normalizedPath = relativePath.replace(/\/$/, '');
  const isDirectory = relativePath.endsWith('/');
  if (filter.include.length > 0) {
    if (isDirectory) return true;
    return filter.include.some(pattern => normalizedPath === pattern);
  }
  if (filter.exclude.length > 0) {
    return !filter.exclude.some(pattern => normalizedPath === pattern || normalizedPath.startsWith(pattern + '/'));
  }
  return true;
}

/**
 * Inicializa command.
 * @returns O resultado da operação.
 */
export function initCommand(): Command {
  return new Command("init")
  .description("Initialize a new AI-Devkit project")
  .argument("[project-name]", "Name of the new project directory", ".")
  .option("--flavor <flavor>", "Set the framework flavor (nestjs, express, fastify, fastapi, go)")
  .option("--template <name>", `Project template to scaffold (${TEMPLATES.join(", ")})`)
  .option("--wizard", "Run interactive setup wizard")
  .option("--force", "Overwrite existing AI-DevKit managed files after creating backups")
  .option("--dry-run", "Show what would be changed without writing files")
  .option("--yes", "Skip prompts")
  .option("--minimal", "Install only essential governance files (laws, manifest, handoff, policies)")
  .option("--standard", "Install standard governance structure (default, excludes generators/prompts)")
  .option("--full", "Install complete governance structure including all generators and prompts")
  .action(async (projectName, options) => {
    try {
      const targetDir = path.resolve(process.cwd(), projectName);

      if (options.wizard) {
        const isPiped = !process.stdin.isTTY;
        if (isPiped) {
          logger.info('[ai-devkit] Modo wizard requer terminal interativo. Use "ai-devkit init" sem --wizard.');
          process.exit(1);
        }
        const answers = await runWizard(targetDir);
        logger.info('\n🚀 Initializing AI-Devkit in: ${targetDir}');
        logger.info('📦 Flavor: ${answers.framework} (via wizard)');
        options.flavor = answers.framework;
      }

      checkPrerequisites(targetDir);

      // Determinar modo de instalação
      let installMode: InstallMode = "standard";
      if (options.minimal) installMode = "minimal";
      else if (options.full) installMode = "full";
      // padrão é standard se nenhuma flag for especificada

      const flavor = options.flavor || autoDetectFlavor(targetDir, realDeps());
      if (options.flavor) validateFlavor(flavor);
      const mode: CopyMode = options.dryRun ? "dry-run" : options.force ? "force" : "safe";
      
      logger.info('\n🚀 Initializing AI-Devkit in: ${targetDir}');
      if (options.flavor) logger.info('📦 Flavor: ${flavor}');
      if (options.template) logger.info('📦 Template: ${options.template}');
      logger.info('⚙️  Mode: ${mode}');
      logger.info('📋 Install mode: ${installMode}\n');

      const sourceAiDir = findTemplateAiDir();
      const aiDir = path.join(targetDir, ".ai");

      if (mode !== "dry-run" && !fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const ideps = realDeps();
      if (options.template) {
        if (!TEMPLATES_SET.has(options.template)) {
          throw new Error(`Invalid template "${options.template}". Allowed templates: ${TEMPLATES.join(", ")}`);
        }
        const projectNameSafe = path.basename(targetDir);
        logger.info('📂 Scaffolding template: ${options.template}');
        const templateDir = findProjectTemplateDir(options.template, ideps);
        const scaffoldResult = scaffoldFromTemplate(templateDir, targetDir, projectNameSafe, mode, ideps);
        logger.info('   Created: ${scaffoldResult.copied.length} files');
        if (scaffoldResult.skipped.length > 0) logger.info('   Skipped: ${scaffoldResult.skipped.length} files (use --force to overwrite)');
        if (scaffoldResult.errors.length > 0) console.error(`   Errors: ${scaffoldResult.errors.join(", ")}`);
      }

      logger.info('📡 Cloning AI-Devkit governance matrix...');
      const copyResult = copyTemplateDirectory(sourceAiDir, aiDir, mode, (relativePath) => shouldCopyFile(relativePath, installMode));

      const manifestPath = path.join(aiDir, "project-manifest.yaml");
      if (mode !== "dry-run" && !fs.existsSync(manifestPath)) {
        const manifestContent = `project:\n  name: "${path.basename(targetDir)}"\n  version: "0.1.0"\n  status: "development"\nstack:\n  framework: "${options.flavor || options.template || 'unknown'}"\narchitecture:\n  pattern: "clean-architecture"\n  style: "modular-monolith"`;
        fs.writeFileSync(manifestPath, manifestContent);
      }

      const handoffPath = path.join(aiDir, "context", "ai-handoff.md");
      if (mode !== "dry-run" && !fs.existsSync(handoffPath)) {
        fs.writeFileSync(handoffPath, `# Handoff\nProject initialized with AI-Devkit.\nStack: ${options.flavor || options.template || 'unknown'}\n`);
      }

      const pkgJsonPath = path.join(targetDir, "package.json");
      const scriptResult = upsertPackageScripts(pkgJsonPath, !!options.force, !!options.dryRun);

      generateSetupReport(targetDir, options, copyResult, scriptResult, sourceAiDir || "unknown");

      if (options.dryRun) {
        logger.info('\n[DRY-RUN] Planned actions\n');
        logger.info('Files to create:');
        copyResult.copied.forEach((f: string) => logger.info('- ${path.relative(process.cwd(), f)}'));
        logger.info('\nFiles to skip:');
        copyResult.skipped.forEach((f: string) => logger.info('- ${path.relative(process.cwd(), f)}'));
        logger.info('\nFiles that would be overwritten with --force:');
        copyResult.overwritten.forEach((f: string) => logger.info('- ${path.relative(process.cwd(), f)}'));
        logger.info('\nPackage scripts to add:');
        scriptResult.added.forEach((s: string) => logger.info('- ${s}'));
        logger.info('\nPackage scripts to preserve:');
        scriptResult.preserved.forEach((s: string) => logger.info('- ${s}'));
        logger.info('\nBackups that would be created with --force:');
        if (copyResult.overwritten.length > 0) {
            logger.info('- .ai/backups/setup/<timestamp>/');
        } else {
            logger.info('None');
        }
        return;
      }

      logger.info('\n✅ AI-Devkit successfully installed.');
      logger.info('\nNext steps:');
      if (projectName !== ".") {
        logger.info('  cd ${projectName}');
      }
      logger.info('  npm run ai:doctor\n  npm run ai:verify\n');

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Error: ${message}`);
      process.exit(1);
    }
  });
}
