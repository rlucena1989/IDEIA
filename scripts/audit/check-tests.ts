import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && (full.endsWith('.test.ts') || full.endsWith('.spec.ts') || full.endsWith('.test.js'))) {
      files.push(full);
    }
  }
  return files;
}

const testFiles = walk('packages');
const testCount = testFiles.length;

if (testCount === 0) {
  console.error('[check-tests] No test files found');
  process.exit(1);
}

console.log(`[check-tests] Found ${testCount} test files`);