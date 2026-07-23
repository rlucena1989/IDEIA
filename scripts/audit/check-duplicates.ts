import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('node_modules') && !entry.name.startsWith('.git') && !entry.name.startsWith('dist') && !entry.name.startsWith('coverage')) {
        walk(full, files);
      }
    } else if (entry.isFile() && (full.endsWith('.ts') || full.endsWith('.js'))) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('packages');
const fingerprints = new Map<string, string>();
let failed = false;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8').replace(/\s+/g, ' ').trim();
  const key = content.slice(0, 500);
  if (fingerprints.has(key)) {
    console.error(`[check-duplicates] Possible duplicate: ${file} and ${fingerprints.get(key)}`);
    failed = true;
  } else {
    fingerprints.set(key, file);
  }
}

if (failed) process.exit(1);
console.log('[check-duplicates] No obvious duplicates found');