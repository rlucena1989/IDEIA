// Fix TS2551: Property does not exist with suggestion
// Pattern: "Property 'X' does not exist on type 'Y'. Did you mean 'Z'?"
import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('.tsc-raw.log', 'utf8');

// Match: packages/X/src/Y.ts(line,col): error TS2551: Property 'A' does not exist on type 'B'. Did you mean 'C'?
const re = /packages\/([^/\\]+)\/src\/([^:]+)\((\d+),(\d+)\):\s+error\s+TS2551:\s+Property\s+'([^']+)'\s+does not exist on type\s+'[^']+'\.\s+Did you mean\s+'([^']+)'\?/g;

const fixes = new Map();
let m;
while ((m = re.exec(raw)) !== null) {
  const [, pkg, file, lineStr, colStr, fromName, toName] = m;
  const key = pkg + '|' + file;
  if (!fixes.has(key)) fixes.set(key, []);
  fixes.get(key).push({ line: +lineStr, col: +colStr, fromName, toName });
}

console.log('Files to fix:', fixes.size);
console.log('Total TS2551 lines:', [...fixes.values()].reduce((s, v) => s + v.length, 0));

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
    // Replace whole-word property name
    const fromRe = new RegExp('\\b' + err.fromName + '\\b', 'g');
    const fixed = original.replace(fromRe, err.toName);
    if (fixed !== original) {
      fileLines[lineIdx] = fixed;
      fileFixed++;
    }
  }

  if (fileFixed > 0) {
    writeFileSync(absPath, fileLines.join('\n'), 'utf8');
    summary.push(absPath + ': ' + fileFixed + ' lines fixed');
    totalFixed += fileFixed;
  }
}

console.log('\nTotal files modified: ' + summary.length);
console.log('Total lines fixed: ' + totalFixed);
summary.forEach(s => console.log('  ' + s));
