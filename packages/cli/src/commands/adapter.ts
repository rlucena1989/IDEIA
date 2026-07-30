import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.adapter');
import fs from 'node:fs';
import path from 'node:path';
import { adapterRegistry } from '@ideia/adapter-base';

interface AdapterInfo {
  name: string;
  path: string;
  hasPackageJson: boolean;
  hasReadme: boolean;
  hasSrcOrIndex: boolean;
}

const KNOWN_ADAPTER_DIR_PREFIX = 'adapter-';

const ADAPTER_LANGUAGES: Record<string, string> = {
  'adapter-go': 'go',
  'adapter-java': 'java',
  'adapter-kotlin': 'kotlin',
  'adapter-nestjs': 'nestjs',
  'adapter-fastapi': 'fastapi',
  'adapter-dart': 'dart',
  'adapter-elixir': 'elixir',
  'adapter-php': 'php',
  'adapter-ruby': 'ruby',
  'adapter-swift': 'swift',
  'adapter-haskell': 'haskell',
  'adapter-scala': 'scala',
  'adapter-zig': 'zig',
};

export function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'packages'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function listAdapters(root: string): AdapterInfo[] {
  const packagesDir = path.join(root, 'packages');
  if (!fs.existsSync(packagesDir)) return [];

  return fs
    .readdirSync(packagesDir)
    .filter((name) => name.startsWith(KNOWN_ADAPTER_DIR_PREFIX))
    .map((name) => {
      const adapterPath = path.join(packagesDir, name);
      return {
        name,
        path: adapterPath,
        hasPackageJson: fs.existsSync(path.join(adapterPath, 'package.json')),
        hasReadme: fs.existsSync(path.join(adapterPath, 'README.md')) || fs.existsSync(path.join(adapterPath, 'readme.md')),
        hasSrcOrIndex:
          fs.existsSync(path.join(adapterPath, 'src')) ||
          fs.existsSync(path.join(adapterPath, 'index.js')) ||
          fs.existsSync(path.join(adapterPath, 'index.ts')),
      };
    });
}

function tryRegisterAdapters(): void {
  if (adapterRegistry.getAll().length > 0) return;
  for (const [pkgName, lang] of Object.entries(ADAPTER_LANGUAGES)) {
    try {
      const mod = require(path.join(findMonorepoRoot(process.cwd()) || process.cwd(), 'packages', pkgName, 'dist', 'src', 'index'));
      if (mod[`create${lang.charAt(0).toUpperCase() + lang.slice(1)}Adapter`]) {
        const adapter = mod[`create${lang.charAt(0).toUpperCase() + lang.slice(1)}Adapter`]();
        adapterRegistry.register(adapter);
      }
    } catch {
      // adapter not compiled yet — skip
    }
  }
}

export function detectProjectStack(projectRoot: string): string[] {
  const detected: string[] = [];

  tryRegisterAdapters();
  const registryDetected = adapterRegistry.detect(projectRoot);
  if (registryDetected.length > 0) {
    return registryDetected.map((a: any) => `${a.name} (${a.language})`);
  }

  const pkgJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['@nestjs/core']) detected.push('nestjs (from package.json)');
      if (deps['fastify']) detected.push('fastify (from package.json)');
      if (deps['express']) detected.push('express (from package.json)');
      if (deps['next']) detected.push('nextjs (from package.json)');
    } catch {
      detected.push('unknown (package.json inválido)');
    }
  }

  if (fs.existsSync(path.join(projectRoot, 'requirements.txt'))) {
    const content = fs.readFileSync(path.join(projectRoot, 'requirements.txt'), 'utf8');
    if (/fastapi/i.test(content)) detected.push('fastapi (from requirements.txt)');
  }

  if (fs.existsSync(path.join(projectRoot, 'go.mod'))) {
    detected.push('go (from go.mod)');
  }

  return detected;
}

export function validateAdapter(adapter: AdapterInfo): string[] {
  const problems: string[] = [];
  if (!adapter.hasPackageJson) problems.push('missing package.json');
  if (!adapter.hasReadme) problems.push('missing README.md');
  if (!adapter.hasSrcOrIndex) problems.push('missing src/ or index entrypoint');
  return problems;
}

export function adapterListAction(): void {
  const root = findMonorepoRoot(process.cwd());
  if (!root) {
    console.error('❌ Could not find packages/ (monorepo root).');
    process.exitCode = 1;
    return;
  }
  tryRegisterAdapters();
  const registered = adapterRegistry.getAll();
  const filesystem = listAdapters(root);

  logger.info('Registry adapters (${registered.length}):\n');
  for (const r of registered) {
    logger.info('  ✅ ${r.name} (${r.language})');
  }

  if (filesystem.length > 0) {
    const unregistered = filesystem.filter((f) => !registered.some((r: any) => r.name === f.name));
    if (unregistered.length > 0) {
      logger.info(`\nFilesystem-only (not registered, ${unregistered.length}):\n`);
      for (const f of unregistered) {
        logger.info('  📁 ${f.name}');
      }
    }
  }
}

export function adapterDetectAction(): void {
  const detected = detectProjectStack(process.cwd());
  if (detected.length === 0) {
    logger.info('No known stack detected in current project.');
    process.exitCode = 1;
    return;
  }
  logger.info('Stack(s) detected:\n');
  detected.forEach((s) => logger.info('- ${s}'));
}

export function adapterValidateAction(): void {
  const root = findMonorepoRoot(process.cwd());
  if (!root) {
    console.error('❌ Could not find packages/ (monorepo root).');
    process.exitCode = 1;
    return;
  }
  const adapters = listAdapters(root);
  if (adapters.length === 0) {
    logger.info('No adapters found to validate.');
    return;
  }
  let hasProblems = false;
  for (const adapter of adapters) {
    const problems = validateAdapter(adapter);
    if (problems.length === 0) {
      logger.info('✅ ${adapter.name}: OK');
    } else {
      hasProblems = true;
      logger.info('❌ ${adapter.name}:');
      problems.forEach((p) => logger.info('   - ${p}'));
    }
  }
  if (hasProblems) process.exitCode = 1;
}

export function adapterCommand(): Command {
  const adapterCmd = new Command('adapter').description('List, detect, and validate language adapters');

  adapterCmd.command('list').description('List all available adapters in the monorepo').action(adapterListAction);

  adapterCmd.command('detect').description("Detect the current project's language stack").action(adapterDetectAction);

  adapterCmd.command('validate').description('Validate adapter integrity in the monorepo').action(adapterValidateAction);

  return adapterCmd;
}
