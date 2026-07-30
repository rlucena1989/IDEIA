// Fix TS2352: Add 'unknown' bridge for unsafe casts
// Pattern: "Conversion of type 'X' to type 'Y' may be a mistake ... convert the expression to 'unknown' first."
import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('.tsc-raw.log', 'utf8');

// Match: packages/X/src/Y.ts(line,col): error TS2352: Conversion of type 'A' to type 'B' may be a mistake ... convert the expression to 'unknown' first.
const re = /packages\/([^/\\]+)\/src\/([^:]+)\((\d+),(\d+)\):\s+error\s+TS2352:\s+Conversion of type\s+'([^']+)'\s+to type\s+'([^']+)'\s+may be a mistake[^]*?convert the expression to 'unknown' first\./g;

const fixes = new Map();
let m;
while ((m = re.exec(raw)) !== null) {
  const [, pkg, file, lineStr, , fromType, toType] = m;
  const key = pkg + '|' + file;
  if (!fixes.has(key)) fixes.set(key, []);
  fixes.get(key).push({ line: +lineStr, fromType, toType });
}

console.log('Files to fix:', fixes.size);
console.log('Total TS2352 lines:', [...fixes.values()].reduce((s, v) => s + v.length, 0));

let totalFixed = 0;
const summary = [];

for (const [key, errs] of fixes) {
  const [pkg, filePath] = key.split('|');
  const absPath = 'F:/PROJETOS/ai-devkit-workspace/IDEIA/packages/' + pkg + '/src/' + filePath;
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch (e) {
    console.error('Cannot read:', absPath);
    continue;
  }

  const fileLines = content.split(/\r?\n/);
  let fileFixed = 0;

  for (const err of errs) {
    const lineIdx = err.line - 1;
    if (lineIdx < 0 || lineIdx >= fileLines.length) continue;
    const original = fileLines[lineIdx];
    // Find the `as X` pattern and replace with `as unknown as X`
    // Try to find `as <toType>` on the line
    // Be conservative: only replace if line has `as <toType>` and not already `as unknown as`
    const asPattern = new RegExp('\\bas\\s+' + err.toType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    if (asPattern.test(original) && !/as\s+unknown\s+as/.test(original)) {
      const fixed = original.replace(asPattern, 'as unknown as ' + err.toType);
      if (fixed !== original) {
        fileLines[lineIdx] = fixed;
        fileFixed++;
      }
    }
  }

  if (fileFixed > 0) {
    writeFileSync(absPath, fileLines.join('\n'), 'utf8');
    summary.push(absPath + ': ' + fileFixed + ' lines fixed');
    totalFixed += fileFixed;
  }
}

console.log('\nTotal files modified: ' + totalFixed);
summary.forEach(s => console.log('  ' + s));
