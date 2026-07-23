#!/usr/bin/env node
/**
 * fix-as-never.js — Corrige `as never` casts em código de produção
 *
 * Substitui `as never` por casts seguros ou tipos adequados.
 * Uso: node scripts/fix-as-never.js
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const fixes = {
  // agent.ts: role parameter type coercion
  'packages/cli/src/commands/agent.ts': [
    { from: /role:\s*role\s+as\s+never/g, to: 'role: role as AgentRole' },
  ],
  // federation.ts: type and authorityLevel
  'packages/cli/src/commands/federation.ts': [
    { from: /type:\s*type\s+as\s+never,/g, to: 'type: type as string,' },
    { from: /authorityLevel:\s*opts\.authority\s+as\s+never,/g, to: 'authorityLevel: opts.authority,' },
  ],
  // evolve.ts: state casts
  'packages/cli/src/commands/evolve.ts': [
    { from: /fromState\s+as\s+never,/g, to: 'fromState as DevkitState,' },
    { from: /toState\s+as\s+never/g, to: 'toState as DevkitState' },
    { from: /type:\s*action\s+as\s+never,/g, to: 'type: action as string,' },
  ],
  // recover.ts: type, severity
  'packages/cli/src/commands/recover.ts': [
    { from: /type:\s*type\s+as\s+never,/g, to: 'type: type as string,' },
    { from: /severity:\s*opts\.severity\s+as\s+never,/g, to: 'severity: opts.severity,' },
  ],
  // reconfigure.ts: type
  'packages/cli/src/commands/reconfigure.ts': [
    { from: /type:\s*action\s+as\s+never,/g, to: 'type: action as string,' },
  ],
  // vector-index.ts
  'packages/cli/src/local-ai/vector-index.ts': [
    { from: /assignments\[idx\]!\.push\(docs\.indexOf\(doc\)\s+as\s+never\);/g, to: 'assignments[idx]!.push(docs.indexOf(doc));' },
  ],
};

let fixed = 0;

for (const [filePath, replacements] of Object.entries(fixes)) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP: ${filePath} not found`);
    continue;
  }
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changed = false;
  for (const { from, to } of replacements) {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      changed = true;
      console.log(`  Fixed: ${filePath}`);
    }
  }
  if (changed) {
    fs.writeFileSync(fullPath, content);
    fixed++;
  }
}

console.log(`\nFixed ${fixed} files. Removed ${Object.values(fixes).flat().length} as never casts.`);
