import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';

/** Interface que define a estrutura de generator options. */
export interface GeneratorOptions {
  dryRun: boolean;
  force: boolean;
  cwd?: string;
  stack?: string;
}

/** Interface que define a estrutura de generator result. */
export interface GeneratorResult {
  created: string[];
  skipped: string[];
  overwritten: string[];
  errors: string[];
}

/** Interface que define a estrutura de file entry. */
export interface FileEntry {
  path: string;
  content: string;
}

function interpolate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Constrói vars.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function buildVars(name: string): Record<string, string> {
  const pascal = name.replace(/[-_]\w/g, m => (m[1] ?? '').toUpperCase()).replace(/^\w/, c => c.toUpperCase());
  const screaming = name.replace(/[-]/g, '_').toUpperCase();
  const kebab = name.replace(/_/g, '-').toLowerCase();
  const pluralName = name.endsWith('y') ? name.slice(0, -1) + 'ies' : name + 's';
  const pluralPascal = pluralName.replace(/[-_]\w/g, m => (m[1] ?? '').toUpperCase()).replace(/^\w/, c => c.toUpperCase());
  return { name, Name: pascal, NAME: screaming, name_kebab: kebab, name_plural: pluralName, NamePlural: pluralPascal };
}

/**
 * Gera files.
 * @param files - Valor files.
 * @param vars - Valor vars.
 * @param options - Valor options.
 * @returns O resultado da operação.
 */
export function generateFiles(files: FileEntry[], vars: Record<string, string>, options: GeneratorOptions): GeneratorResult {
  const result: GeneratorResult = { created: [], skipped: [], overwritten: [], errors: [] };
  const root = options.cwd || process.cwd();

  for (const entry of files) {
    try {
      const filePath = path.resolve(root, interpolate(entry.path, vars));
      const content = interpolate(entry.content, vars);
      const dir = path.dirname(filePath);

      if (fs.existsSync(filePath)) {
        if (options.force) {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, content, 'utf-8');
          result.overwritten.push(path.relative(root, filePath));
        } else {
          result.skipped.push(path.relative(root, filePath));
        }
      } else {
        if (!options.dryRun) {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, content, 'utf-8');
        }
        result.created.push(path.relative(root, filePath));
      }
    } catch (err: unknown) {
      result.errors.push(`${entry.path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

/**
 * Imprime generator result.
 * @param label - Valor label.
 * @param result - Valor result.
 * @param dryRun - Valor run.
 * @param logger - Logger injectável para testes (default: console).
 */
export function printGeneratorResult(label: string, result: GeneratorResult, dryRun: boolean, logger?: { log: (msg: string) => void; error?: (msg: string) => void }): void {
  const { log, error } = logger ?? console;
  const prefix = dryRun ? '[DRY-RUN] ' : '';
  log(`\n${prefix}${label}:`);
  if (result.created.length > 0) log(`  Criados: ${result.created.length}`);
  if (result.skipped.length > 0) log(`  Pulados (--force para sobrescrever): ${result.skipped.length}`);
  if (result.overwritten.length > 0) log(`  Sobrescritos: ${result.overwritten.length}`);
  if (result.errors.length > 0) (error ?? log)(`  Erros: ${result.errors.join(', ')}`);
  if (dryRun && result.created.length > 0) {
    result.created.forEach(f => log(`    - ${f}`));
  }
}
