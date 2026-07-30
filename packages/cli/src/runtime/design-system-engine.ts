import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import {
  BUILT_IN_TOKENS,
  BUILT_IN_LAYOUTS,
  formatTokensCSS,
  formatTokensJSON,
  formatTokensSCSS,
  type DesignToken,
  type LayoutTemplate,
} from './design-tokens';

/** Interface que define a estrutura de design system config. */
export interface DesignSystemConfig {
  outputDir: string;
  formats: Array<'css' | 'json' | 'scss'>;
  mergeProjectTokens: boolean;
}

/** Processa e f a u l t_ d e s i g n_ c o n f i g. */
export const DEFAULT_DESIGN_CONFIG: DesignSystemConfig = {
  outputDir: '.ai/design',
  formats: ['css', 'json', 'scss'],
  mergeProjectTokens: true,
};

function loadProjectTokens(projectDir: string): DesignToken[] {
  const tokensPath = path.join(projectDir, '.ai/design/tokens.json');
  try {
    if (fs.existsSync(tokensPath)) {
      const raw = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
      if (Array.isArray(raw)) return raw as DesignToken[];
    }
  } catch { /* ignore */ }
  return [];
}

/**
 * Processa design tokens.
 * @param projectDir - Valor dir.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function exportDesignTokens(
  projectDir: string,
  config: DesignSystemConfig = DEFAULT_DESIGN_CONFIG,
): { css: string; json: string; scss: string; outputDir: string } {
  const projectTokens = config.mergeProjectTokens ? loadProjectTokens(projectDir) : [];
  const merged: DesignToken[] = [...BUILT_IN_TOKENS];

  for (const pt of projectTokens) {
    const idx = merged.findIndex(t => t.name === pt.name);
    if (idx >= 0) {
      merged[idx] = pt;
    } else {
      merged.push(pt);
    }
  }

  const css = formatTokensCSS(merged);
  const json = formatTokensJSON(merged);
  const scss = formatTokensSCSS(merged);

  const outDir = path.resolve(projectDir, config.outputDir);
  fs.mkdirSync(outDir, { recursive: true });

  if (config.formats.includes('css')) {
    fs.writeFileSync(path.join(outDir, 'design-system.css'), css, 'utf8');
  }
  if (config.formats.includes('json')) {
    fs.writeFileSync(path.join(outDir, 'design-system.json'), json, 'utf8');
  }
  if (config.formats.includes('scss')) {
    fs.writeFileSync(path.join(outDir, '_design-system.scss'), scss, 'utf8');
  }

  return { css, json, scss, outputDir: outDir };
}

/**
 * Obtém layout templates.
 * @returns O resultado da operação.
 */
export function getLayoutTemplates(): LayoutTemplate[] {
  return [...BUILT_IN_LAYOUTS];
}
