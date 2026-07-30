// Fix TS2304: Add missing imports for path, fs, log, logger
// Strategy: detect file's package, find existing imports, and prepend missing ones
import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('.tsc-raw.log', 'utf8');

// Match: packages/X/src/Y.ts(line,col): error TS2304: Cannot find name 'Z'.
const re = /packages\/([^/\\]+)\/src\/([^:]+)\((\d+),(\d+)\):\s+error\s+TS2304:\s+Cannot find name\s+'([^']+)'/g;

const needs = new Map();
let m;
while ((m = re.exec(raw)) !== null) {
  const [, pkg, file, , , name] = m;
  const key = pkg + '|' + file;
  if (!needs.has(key)) needs.set(key, new Set());
  needs.get(key).add(name);
}

console.log('Files with TS2304 needs:', needs.size);

// Map common names to import paths
const knownImports = {
  'path': "import * as path from 'node:path';",
  'fs': "import * as fs from 'node:fs';",
  'log': "import createLogger from '@ideia/logger'; const log = createLogger('unknown');",  // generic
  'logger': "import createLogger from '@ideia/logger'; const logger = createLogger('unknown');",
  'HealthEntry': null,  // not a stdlib
  'FAQ_ITEMS': null,  // not a stdlib
  'SpecGenerationConfig': null,  // not a stdlib
  'EntryCategory': null,  // not a stdlib
  'InitiativeCycleResult': null,
  'FeedbackEntry': null,
  'AggregatedMetric': null,
  'ComplianceFramework': null,
};

let totalFixed = 0;
const summary = [];

for (const [key, names] of needs) {
  const [pkg, filePath] = key.split('|');
  const absPath = 'F:/PROJETOS/ai-devkit-workspace/IDEIA/packages/' + pkg + '/src/' + filePath;
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch (e) {
    continue;
  }

  const fileLines = content.split(/\r?\n/);
  const missingImports = [];
  for (const name of names) {
    if (knownImports[name] === undefined) continue;  // skip unknown names
    if (knownImports[name] === null) continue;  // skip - not stdlib
    // Check if the name is already imported
    if (content.includes('import') && (content.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length > 1) {
      continue;  // already imported
    }
    missingImports.push(knownImports[name]);
  }

  if (missingImports.length === 0) continue;

  // Find the first import line and insert before it (or at top)
  let insertIdx = 0;
  for (let i = 0; i < fileLines.length; i++) {
    if (fileLines[i].startsWith('import ') || fileLines[i].startsWith('import{')) {
      insertIdx = i;
      break;
    }
  }

  // Check if the same import is already there
  const importsToAdd = missingImports.filter(imp => !content.includes(imp.split(' from ')[0]));
  if (importsToAdd.length === 0) continue;

  // Insert the new imports
  for (let i = 0; i < importsToAdd.length; i++) {
    fileLines.splice(insertIdx + i, 0, importsToAdd[i]);
  }

  writeFileSync(absPath, fileLines.join('\n'), 'utf8');
  summary.push(absPath + ': added ' + importsToAdd.length + ' import(s) for ' + [...names].filter(n => knownImports[n] && knownImports[n] !== null).join(', '));
  totalFixed++;
}

console.log('\nTotal files modified: ' + totalFixed);
summary.forEach(s => console.log('  ' + s));
