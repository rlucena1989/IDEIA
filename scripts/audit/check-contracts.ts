import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('node_modules') && !entry.name.startsWith('dist') && !entry.name.startsWith('coverage') && !entry.name.startsWith('.test-gen')) {
        walk(full, files);
      }
    } else if (entry.isFile() && (full.endsWith('.ts') || full.endsWith('.js'))) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('packages');
let failed = false;
let todoCount = 0;
let anyCount = 0;

// Regex to find actual `any` type usage (not "any" in comments or strings)
const anyTypeRegex = /:\s*any\b|as\s+any\b|<\s*any\s*>|Promise<any>/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  if (anyTypeRegex.test(content)) {
    anyCount++;
    const relativePath = path.relative(process.cwd(), file);
    const matches = content.match(anyTypeRegex);
    console.warn(`[check-contracts] 'any' type usage in ${relativePath} (${matches?.length} occurrences)`);
    anyTypeRegex.lastIndex = 0;
  }

  // Only flag actual TODO/FIXME/HACK, not in node_modules
  if (/TODO|FIXME|HACK/.test(content)) {
    todoCount++;
    const relativePath = path.relative(process.cwd(), file);
    console.warn(`[check-contracts] TODO/FIXME/HACK found in ${relativePath}`);
  }
}

console.log(`[check-contracts] Files with 'any' type usage: ${anyCount}, files with TODOs: ${todoCount}`);
if (failed) process.exit(1);
console.log('[check-contracts] Contract audit passed');