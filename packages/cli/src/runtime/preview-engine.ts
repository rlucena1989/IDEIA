/**
 * @deprecated Use `packages/diff-engine` — consolidated import.
 * Text diff and template generation.
 */

export interface PreviewDiff {
  added: number;
  removed: number;
  hunks: Array<{ oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] }>;
}

function simpleDiff(oldText: string, newText: string): PreviewDiff {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  let added = 0;
  let removed = 0;
  const hunks: PreviewDiff['hunks'] = [];
  let hunk: PreviewDiff['hunks'][0] | null = null;

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      if (!hunk) {
        hunk = { oldStart: i + 1, oldLines: 0, newStart: i + 1, newLines: 0, lines: [] };
        hunks.push(hunk);
      }
      if (oldLines[i] !== undefined) { removed++; hunk.oldLines++; hunk.lines.push(`- ${oldLines[i]}`); }
      if (newLines[i] !== undefined) { added++; hunk.newLines++; hunk.lines.push(`+ ${newLines[i]}`); }
    } else if (hunk) {
      hunk = null;
    }
  }

  return { added, removed, hunks };
}

export const generatePreview = simpleDiff;

/**
 * Gera frontend template.
 * @param stack - Valor stack.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function generateFrontendTemplate(stack: string, name: string): string {
  switch (stack.toLowerCase()) {
    case 'react':
    case 'react + ts':
      return `import React from 'react';\n\ninterface ${name}Props {\n}\n\nexport function ${name}({}: ${name}Props): React.ReactElement {\n  return (\n    <div className="${name.toLowerCase()}">\n      <h1>${name}</h1>\n    </div>\n  );\n}`;
    case 'vue':
      return `<template>\n  <div class="${name.toLowerCase()}">\n    <h1>${name}</h1>\n  </div>\n</template>\n\n<script setup lang="ts">\ninterface Props {}\n\nconst props = defineProps<Props>();\n</script>\n\n<style scoped>\n.${name.toLowerCase()} { }\n</style>`;
    case 'angular':
      return `import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-${name.toLowerCase()}',\n  template: \`\n    <div class="${name.toLowerCase()}">\n      <h1>${name}</h1>\n    </div>\n  \`\n})\nexport class ${name}Component { }`;
    case 'svelte':
      return `<script lang="ts">\n  export let name = '${name}';\n</script>\n\n<div class="${name.toLowerCase()}">\n  <h1>{name}</h1>\n</div>\n\n<style>\n.${name.toLowerCase()} { }\n</style>`;
    default:
      return `// ${name} component for ${stack}\n\nfunction ${name}() {\n  return null;\n}`;
  }
}

/**
 * Gera low level template.
 * @param type - Valor type.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function generateLowLevelTemplate(type: string, name: string): string {
  switch (type) {
    case 'service':
      return `export class ${name}Service {\n  constructor() { }\n\n  async execute(): Promise<void> {\n    // TODO: implement\n  }\n}`;
    case 'repository':
      return `export interface ${name}Repository {\n  findById(id: string): Promise<unknown>;\n  save(data: unknown): Promise<void>;\n}\n\nexport class ${name}RepositoryImpl implements ${name}Repository {\n  async findById(id: string): Promise<unknown> {\n    throw new Error('Not implemented');\n  }\n\n  async save(data: unknown): Promise<void> {\n    throw new Error('Not implemented');\n  }\n}`;
    case 'middleware':
      return `import { Request, Response, NextFunction } from 'express';\n\nexport function ${name}Middleware(req: Request, res: Response, next: NextFunction): void {\n  next();\n}`;
    case 'config':
      return `export interface ${name}Config {\n  enabled: boolean;\n  timeout: number;\n  retries: number;\n}\n\nexport const DEFAULT_${name.toUpperCase()}_CONFIG: ${name}Config = {\n  enabled: true,\n  timeout: 5000,\n  retries: 3,\n};`;
    default:
      return `// ${name} ${type}\n\nexport function ${name}() {\n  // TODO: implement\n}`;
  }
}