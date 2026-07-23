import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['packages', '.ai/bin'];

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

let failed = false;

for (const root of ROOTS) {
  const files = walk(root);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if ((trimmed.startsWith('import ') || trimmed.startsWith('require(')) && 
          (trimmed.includes("from ''") || trimmed.includes('from ""') || trimmed.includes("require('')") || trimmed.includes('require("")'))) {
        console.error(`[check-imports] Empty import/require in ${file}: ${trimmed}`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log('[check-imports] All imports OK');