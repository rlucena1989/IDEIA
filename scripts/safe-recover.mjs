import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Strategy: only remove EXACT patterns from auto-jsdoc without touching code
// Safe removal: only JSDoc blocks that START at column 0 (before an export) 
// and contain @param or @returns, AND are MAX 20 lines long

function safeStrip(content) {
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Detect auto-generated JSDoc: /** at start of line (possibly indented)
    // followed by @param or @returns within a small block
    if (trimmed.startsWith('/**') && trimmed.length <= 5) {
      const startIdx = i;
      const blockLines = [lines[i]];
      let hasParamOrReturns = false;
      let j = i + 1;

      while (j < lines.length && j - i < 20) {
        const l = lines[j].trim();
        blockLines.push(lines[j]);
        if (l.includes('@param') || l.includes('@returns')) hasParamOrReturns = true;
        if (l === '*/') {
          if (hasParamOrReturns) {
            // This is auto-generated JSDoc - skip it
            i = j + 1;
            // Skip blank lines after the block
            while (i < lines.length && lines[i].trim() === '') i++;
            break;
          } else {
            // Original JSDoc - keep it
            result.push(...blockLines);
            i = j + 1;
            break;
          }
        }
        j++;
      }

      if (j >= lines.length || j - i >= 20) {
        // JSDoc too long or unclosed - keep it (might not be auto-generated)
        result.push(...blockLines.slice(0, j - i));
        i = j;
      }

      continue;
    }

    // Skip orphan */ lines (leftover from partial removal)
    if (trimmed === '*/') {
      i++;
      continue;
    }

    result.push(lines[i]);
    i++;
  }

  return result.join('\n');
}

function main() {
  const srcDir = path.join(ROOT, 'packages', 'cli', 'src');
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== '__mocks__' && entry.name !== 'dist') walk(full);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) files.push(full);
    }
  }

  walk(srcDir);
  console.log('Scanning ' + files.length + ' files...');

  let cleaned = 0;
  let errors = 0;
  for (const file of files) {
    try {
      const original = fs.readFileSync(file, 'utf-8');
      const cleaned2 = safeStrip(original);
      if (cleaned2 !== original) {
        // Check if the file still compiles by checking basic structure
        const exportCountBefore = (original.match(/^export /gm) || []).length;
        const exportCountAfter = (cleaned2.match(/^export /gm) || []).length;
        
        if (exportCountAfter < exportCountBefore) {
          console.log('SKIP (lost exports): ' + path.relative(ROOT, file));
          errors++;
          continue;
        }
        
        fs.writeFileSync(file, cleaned2, 'utf-8');
        console.log('OK: ' + path.relative(ROOT, file));
        cleaned++;
      }
    } catch (e) {
      console.log('ERR: ' + path.relative(ROOT, file) + ' - ' + e.message);
      errors++;
    }
  }

  console.log('\n' + cleaned + ' files cleaned, ' + errors + ' errors/skips');
}

main();
