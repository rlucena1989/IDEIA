import { Command } from 'commander';

import path from 'node:path';
import { printHeader, printLine, finish } from "../utils/output";
import { getIO } from '../io';

export function runScanner(root: string): { passed: boolean; output: string } {
  const scannerPath = path.join(root, '.ai/bin/check-design-system.js');
  if (!getIO().fs.exists(scannerPath)) {
    return { passed: false, output: 'check-design-system.js not found' };
  }
  const result = getIO().shell.exec('node', [scannerPath], root);
  return { passed: result.status === 0, output: result.stdout || '' };
}

export function loadTokens(root: string): Record<string, unknown> | null {
  const p = path.join(root, '.ai/design-system/tokens.json');
  if (!getIO().fs.exists(p)) return null;
  try { return JSON.parse(getIO().fs.read(p, 'utf8')); } catch { return null; }
}

export function loadComponents(root: string): string[] {
  const p = path.join(root, '.ai/design-system/components.yaml');
  if (!getIO().fs.exists(p)) return [];
  const content = getIO().fs.read(p, 'utf8');
  const matches = content.match(/^\s{2}\w+:/gm) || [];
  return matches.map(m => m.trim().replace(':', ''));
}

export function loadPatterns(root: string): string[] {
  const p = path.join(root, '.ai/design-system/patterns.yaml');
  if (!getIO().fs.exists(p)) return [];
  const content = getIO().fs.read(p, 'utf8');
  const matches = content.match(/^\s{2}\w+_page:/gm) || [];
  return matches.map(m => m.trim().replace(':', ''));
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function designValidateAction(): void {
  const root = process.cwd();
  printHeader('Design System Validation');
  const result = runScanner(root);
  if (result.output) printLine(result.output);
  if (result.passed) {
    finish({ checkpoint: 'design_validate', ok: true, status: 'passed', context_summary: 'Design system validation passed', data: {} });
  } else {
    finish({ checkpoint: 'design_validate', ok: false, status: 'failed', context_summary: 'Design system violations found', data: {} });
  }
}

export function designTokensAction(options: { format: string }): void {
  const root = process.cwd();
  const tokens = loadTokens(root);
  if (!tokens) {
    printLine('Tokens file not found at .ai/design-system/tokens.json. Run "ai-devkit generate design-tokens" first.');
    return;
  }
  if (options.format === 'json') {
    printLine(JSON.stringify(tokens, null, 2));
    return;
  }
  if (options.format === 'css' || options.format === 'scss') {
    const prefix = options.format === 'css' ? '--' : '$';
    const lines: string[] = [`:root {`];
    const flatten = (obj: Record<string, unknown>, parentKey = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const varName = `${prefix}${parentKey ? parentKey + '-' : ''}${key}`;
        if (typeof value === 'object' && value !== null) {
          flatten(value as Record<string, unknown>, `${parentKey ? parentKey + '-' : ''}${key}`);
        } else {
          lines.push(`  ${varName}: ${value};`);
        }
      }
    };
    flatten(tokens);
    lines.push('}');
    printLine(lines.join('\n'));
  }
}

export function designComponentsAction(options: { search?: string }): void {
  const root = process.cwd();
  const components = loadComponents(root);
  if (components.length === 0) {
    printLine('Components catalog not found.');
    return;
  }
  const filtered = options.search
    ? components.filter(c => c.toLowerCase().includes(options.search.toLowerCase()))
    : components;
  printLine(`Components (${filtered.length}/${components.length}):`);
  for (const c of filtered) printLine(`  - ${c}`);
}

export function designPatternsAction(): void {
  const root = process.cwd();
  const patterns = loadPatterns(root);
  if (patterns.length === 0) {
    printLine('No layout patterns found.');
    return;
  }
  printLine('Layout patterns:');
  for (const p of patterns) printLine(`  - ${p}`);
}

export function designCheckAction(file: string): void {
  const root = process.cwd();
  const fullPath = path.resolve(root, file);
  if (!getIO().fs.exists(fullPath)) {
    printLine(`File not found: ${file}`);
    return;
  }
  const content = getIO().fs.read(fullPath, 'utf8');
  const warnings: string[] = [];
  if (/style=\{|style="/.test(content)) warnings.push('Estilo inline detectado');
  if (/color=["']#[0-9a-fA-F]{6}["']/.test(content) && !content.includes('var(--')) warnings.push('Cor hexadecimal não-registrada');
  if (/<(input|select|textarea)(?![\s>]*[^>]*aria-label)/i.test(content)) warnings.push('Input sem aria-label');
  if (/<button[^>]*>\s*<\/button>/i.test(content)) warnings.push('Botão vazio sem conteúdo');
  if (warnings.length === 0) {
    printLine(`✅ ${file}: No design system violations found.`);
  } else {
    printLine(`⚠ ${file}: ${warnings.length} warning(s):`);
    for (const w of warnings) printLine(`  - ${w}`);
  }
}

export function designCommand(): Command {
  const cmd = new Command('design')
    .description('Design System — gerencia tokens, componentes, padrões e validação');

  cmd.command('validate').description('Valida o projeto contra o design system').action(designValidateAction);
  cmd.command('tokens').description('Exibe tokens do design system').option('--format <format>', 'Formato: json, css, scss', 'json').action((opts) => designTokensAction(opts));
  cmd.command('components').description('Lista componentes do design system').option('--search <query>', 'Filtrar por nome').action((opts) => designComponentsAction(opts));
  cmd.command('patterns').description('Lista padrões de layout disponíveis').action(designPatternsAction);
  cmd.command('check <file>').description('Verifica se um arquivo respeita o design system').action((file: string) => designCheckAction(file));

  return cmd;
}
