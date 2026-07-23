import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";

interface AdapterInfo {
  name: string;
  path: string;
  hasPackageJson: boolean;
  hasReadme: boolean;
  hasSrcOrIndex: boolean;
}

const KNOWN_ADAPTER_DIR_PREFIX = "adapter-";

/**
 * Busca monorepo root.
 * @param startDir - Inicia dir.
 * @returns O resultado da operação.
 */
export function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "packages"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Processa adapters.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function listAdapters(root: string): AdapterInfo[] {
  const packagesDir = path.join(root, "packages");
  if (!fs.existsSync(packagesDir)) return [];

  return fs
    .readdirSync(packagesDir)
    .filter((name) => name.startsWith(KNOWN_ADAPTER_DIR_PREFIX))
    .map((name) => {
      const adapterPath = path.join(packagesDir, name);
      return {
        name,
        path: adapterPath,
        hasPackageJson: fs.existsSync(path.join(adapterPath, "package.json")),
        hasReadme:
          fs.existsSync(path.join(adapterPath, "README.md")) ||
          fs.existsSync(path.join(adapterPath, "readme.md")),
        hasSrcOrIndex:
          fs.existsSync(path.join(adapterPath, "src")) ||
          fs.existsSync(path.join(adapterPath, "index.js")) ||
          fs.existsSync(path.join(adapterPath, "index.ts")),
      };
    });
}

/**
 * Detecta project stack.
 * @param projectRoot - Valor root.
 * @returns O resultado da operação.
 */
export function detectProjectStack(projectRoot: string): string[] {
  const detected: string[] = [];

  const pkgJsonPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps["@nestjs/core"]) detected.push("nestjs");
      if (deps["fastify"]) detected.push("fastify");
      if (deps["express"]) detected.push("express");
      if (deps["next"]) detected.push("nextjs");
    } catch {
      // package.json malformado — reportar mas não travar
      detected.push("unknown (package.json inválido)");
    }
  }

  if (fs.existsSync(path.join(projectRoot, "requirements.txt"))) {
    const content = fs.readFileSync(path.join(projectRoot, "requirements.txt"), "utf8");
    if (/fastapi/i.test(content)) detected.push("fastapi");
  }

  if (fs.existsSync(path.join(projectRoot, "go.mod"))) {
    detected.push("go");
  }

  return detected;
}

export function validateAdapter(adapter: AdapterInfo): string[] {
  const problems: string[] = [];
  if (!adapter.hasPackageJson) problems.push("missing package.json");
  if (!adapter.hasReadme) problems.push("missing README.md");
  if (!adapter.hasSrcOrIndex) problems.push("missing src/ or index entrypoint");
  return problems;
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function adapterListAction(): void {
  const root = findMonorepoRoot(process.cwd());
  if (!root) {
    console.error("❌ Não foi possível localizar o diretório packages/ (monorepo).");
    process.exitCode = 1;
    return;
  }
  const adapters = listAdapters(root);
  if (adapters.length === 0) {
    console.log("Nenhum adapter encontrado em packages/.");
    return;
  }
  console.log(`Adapters encontrados (${adapters.length}):\n`);
  for (const a of adapters) {
    console.log(`- ${a.name}`);
  }
}

export function adapterDetectAction(): void {
  const detected = detectProjectStack(process.cwd());
  if (detected.length === 0) {
    console.log("Nenhuma stack conhecida detectada no projeto atual.");
    process.exitCode = 1;
    return;
  }
  console.log("Stack(s) detectada(s):\n");
  detected.forEach((s) => console.log(`- ${s}`));
}

export function adapterValidateAction(): void {
  const root = findMonorepoRoot(process.cwd());
  if (!root) {
    console.error("❌ Não foi possível localizar o diretório packages/ (monorepo).");
    process.exitCode = 1;
    return;
  }
  const adapters = listAdapters(root);
  if (adapters.length === 0) {
    console.log("Nenhum adapter encontrado para validar.");
    return;
  }
  let hasProblems = false;
  for (const adapter of adapters) {
    const problems = validateAdapter(adapter);
    if (problems.length === 0) {
      console.log(`✅ ${adapter.name}: OK`);
    } else {
      hasProblems = true;
      console.log(`❌ ${adapter.name}:`);
      problems.forEach((p) => console.log(`   - ${p}`));
    }
  }
  if (hasProblems) process.exitCode = 1;
}

export function adapterCommand(): Command {
  const adapterCmd = new Command("adapter")
    .description("Lista, detecta e valida adapters");

  adapterCmd
    .command("list")
    .description("Lista todos os adapters disponíveis no monorepo")
    .action(adapterListAction);

  adapterCmd
    .command("detect")
    .description("Detecta a stack do projeto atual")
    .action(adapterDetectAction);

  adapterCmd
    .command("validate")
    .description("Valida a integridade dos adapters do monorepo")
    .action(adapterValidateAction);

  return adapterCmd;
}
