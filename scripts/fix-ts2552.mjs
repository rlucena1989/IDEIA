// Fix TS2552: In lines flagged by tsc -b, replace `err` with `_err` or `error` with `_error`
// Uses line numbers from .tsc-parsed.csv to make targeted fixes
import { readFileSync, writeFileSync } from 'node:fs';

const csv = readFileSync('.tsc-parsed.csv', 'utf8');
const lines = csv.split(/\r?\n/).slice(1).filter(Boolean);

const rows = [];
for (const line of lines) {
  const m = line.match(/^"([^"]+)","([^"]+)\((\d+),(\d+)\)","([^"]+)","(.*)"$/);
  if (!m) continue;
  rows.push({ pkg: m[1], file: m[2], line: +m[3], col: +m[4], code: m[5], msg: m[6].replace(/""/g, '"') });
}

const fixes = new Map();
for (const row of rows) {
  if (row.code !== '2552') continue;
  // Match "Cannot find name 'X'. Did you mean '_X'?"
  const nameMatch = row.msg.match(/^Cannot find name '(\w+)'\. Did you mean '_(\w+)'\?/);
  if (!nameMatch) continue;
  const fromName = nameMatch[1];
  const toName = '_' + nameMatch[2];
  // Only fix err/error patterns (skip MetaMetrics etc.)
  if (fromName !== 'err' && fromName !== 'error') continue;
  row.fromName = fromName;
  row.toName = toName;
  const key = row.pkg + '|' + row.file;
  if (!fixes.has(key)) fixes.set(key, []);
  fixes.get(key).push(row);
}

let totalFixed = 0;
const summary = [];

for (const [key, errs] of fixes) {
  const [pkg, filePath] = key.split('|');
  // Use forward slashes for cross-platform path - Node.js handles both
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
    // Replace bare name (err or error) with the underscore version
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
console.log('\nFiles:');
summary.forEach(s => console.log('  ' + s));
