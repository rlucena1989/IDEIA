#!/usr/bin/env node

/**
 * fix-ts7006.mjs — Corrige TS7006 (parâmetros implícitos 'any')
 * 
 * Estratégia: Adiciona tipos explícitos 'any' em parâmetros de arrow functions
 * que causam TS7006. É uma solução minimalista que elimina o erro sem
 * quebrar a funcionalidade existente.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd());

// Padrões para corrigir TS7006
const PATTERNS = [
  // Arrow function callbacks com parâmetro único
  { regex: /\.then\((\w+)\s*=>\s*{/g, replacement: '.then(($1: any) => {' },
  { regex: /\.catch\((\w+)\s*=>\s*{/g, replacement: '.catch(($1: any) => {' },
  { regex: /\.map\((\w+)\s*=>\s*{/g, replacement: '.map(($1: any) => {' },
  { regex: /\.filter\((\w+)\s*=>\s*{/g, replacement: '.filter(($1: any) => {' },
  { regex: /\.forEach\((\w+)\s*=>\s*{/g, replacement: '.forEach(($1: any) => {' },
  { regex: /\.reduce\((\w+)\s*=>\s*{/g, replacement: '.reduce(($1: any) => {' },
  { regex: /\.find\((\w+)\s*=>\s*{/g, replacement: '.find(($1: any) => {' },
  { regex: /\.some\((\w+)\s*=>\s*{/g, replacement: '.some(($1: any) => {' },
  { regex: /\.every\((\w+)\s*=>\s*{/g, replacement: '.every(($1: any) => {' },
  // Parâmetros em callbacks aninhados
  { regex: /\.map\((\w+),\s*(\w+)\)\s*=>\s*{/g, replacement: '.map(($1: any, $2: any) => {' },
  { regex: /\.forEach\((\w+),\s*(\w+)\)\s*=>\s*{/g, replacement: '.forEach(($1: any, $2: any) => {' },
];

function fixFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modified = content;
    let changes = 0;

    for (const pattern of PATTERNS) {
      const matches = modified.match(pattern.regex);
      if (matches) {
        modified = modified.replace(pattern.regex, pattern.replacement);
        changes += matches.length;
      }
    }

    if (changes > 0 && modified !== content) {
      writeFileSync(filePath, modified, 'utf-8');
      return { fixed: true, changes };
    }

    return { fixed: false, changes: 0 };
  } catch (error) {
    return { fixed: false, changes: 0, error: error.message };
  }
}

// Arquivos CLI com TS7006 baseado na análise
const FILES_TO_FIX = [
  'packages/cli/src/cognitive-coprocessor/pattern-integration.ts',
  'packages/cli/src/commands/adapter.ts',
  'packages/cli/src/commands/ideia/self-optimize-command.ts',
  'packages/cli/src/commands/notifications.ts',
  'packages/cli/src/commands/privacy.ts',
  'packages/cli/src/commands/scorecard.ts',
];

let totalFixed = 0;
let totalChanges = 0;

console.log('🔧 Fixing TS7006 (implicit any parameters)...\n');

for (const file of FILES_TO_FIX) {
  const fullPath = join(ROOT, file);
  const result = fixFile(fullPath);
  
  if (result.fixed) {
    console.log(`✅ ${file}: ${result.changes} changes`);
    totalFixed++;
    totalChanges += result.changes;
  } else if (result.error) {
    console.log(`❌ ${file}: ${result.error}`);
  } else {
    console.log(`⏭️  ${file}: no changes needed`);
  }
}

console.log(`\n📊 Summary: ${totalFixed} files fixed, ${totalChanges} total changes`);
