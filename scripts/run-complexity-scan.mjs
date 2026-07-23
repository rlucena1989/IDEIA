import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function measureCyclomatic(code) {
  let complexity = 1;
  const patterns = [
    /\bif\s*\(/g, /\belse\s+if\b/g, /\bfor\s*\(/g, /\bwhile\s*\(/g,
    /\bcase\s+/g, /\bcatch\s*\(/g, /\b\?\s/g, /\|\|/g, /&&/g,
  ];
  for (const pat of patterns) {
    const m = code.match(pat);
    if (m) complexity += m.length;
  }
  return complexity;
}

function extractFunctions(code, filePath) {
  const funcs = [];
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*\([^)]*\)\s*{/g;
  let match;
  while ((match = funcRegex.exec(code)) !== null) {
    const name = match[1] || match[2] || match[3] || '(anonymous)';
    const startLine = code.substring(0, match.index).split('\n').length;
    let braceCount = 0, started = false, endIdx = match.index;
    for (let i = match.index; i < code.length; i++) {
      if (code[i] === '{') { braceCount++; started = true; }
      else if (code[i] === '}') { braceCount--; }
      if (started && braceCount === 0) { endIdx = i + 1; break; }
    }
    const body = code.substring(match.index, endIdx);
    const cyclomatic = measureCyclomatic(body);
    const funcLines = body.split('\n').length;
    if (cyclomatic > 1 || funcLines > 5) {
      funcs.push({ file: filePath, name, line: startLine, cyclomatic, lines: funcLines });
    }
  }
  return funcs;
}

function walk(dir, results = []) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== '__tests__') {
        walk(fp, results);
      } else if ((e.name.endsWith('.ts') || e.name.endsWith('.tsx')) && !e.name.endsWith('.test.ts') && !e.name.endsWith('.spec.ts')) {
        try {
          const code = fs.readFileSync(fp, 'utf8');
          const funcs = extractFunctions(code, fp);
          results.push(...funcs);
        } catch { }
      }
    }
  } catch { }
  return results;
}

const target = path.join(root, 'packages/cli/src');
console.error(`Escaneando: ${target}`);
const all = walk(target);
all.sort((a, b) => b.cyclomatic - a.cyclomatic);

const outPath = path.join(root, '.ai/reports/complexity-report.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ total: all.length, functions: all }, null, 2));

console.log(JSON.stringify({
  totalFunctions: all.length,
  avgComplexity: all.length > 0 ? Math.round(all.reduce((s, f) => s + f.cyclomatic, 0) / all.length * 10) / 10 : 0,
  above10: all.filter(f => f.cyclomatic >= 10).length,
  top20: all.slice(0, 20).map(f => ({
    complexity: f.cyclomatic,
    name: f.name,
    file: path.relative(root, f.file),
    line: f.line,
    lines: f.lines,
  })),
  reportSaved: path.relative(root, outPath),
}));
