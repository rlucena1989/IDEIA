// Fix TS2459: Add 'export' to local declarations in the file referenced by the module path
import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('.tsc-raw.log', 'utf8');
const lines = raw.split(/\r?\n/);

// Pattern: packages/X/src/Y.ts(line,col): error TS2459: Module '"Z"' declares 'W' locally, but it is not exported.
const fixes = [];
for (const line of lines) {
  const m = line.match(/^packages\/([^/\\]+)\/src\/([^:]+)\((\d+),(\d+)\):\s+error\s+TS2459:\s+Module\s+'([^']+)'\s+declares\s+'([^']+)'\s+locally, but it is not exported\./);
  if (!m) continue;
  const [, pkg, importerFile, , , modulePath, declName] = m;
  const modRel = modulePath.replace(/['"]/g, '');
  // Resolve: importer's dir + modRel
  // importerFile is relative to packages/PKG/src/, e.g. "context-pack-system/src/index.ts" or just "index.ts"
  // We need to know the importer's directory relative to packages/PKG/src/
  const importerDir = importerFile.split('/').slice(0, -1).join('/');
  let targetRel;
  if (modRel.startsWith('./')) {
    targetRel = importerDir ? importerDir + '/' + modRel.slice(2) : modRel.slice(2);
  } else if (modRel.startsWith('../')) {
    const parts = importerDir ? importerDir.split('/') : [];
    const modParts = modRel.split('/');
    let upCount = 0;
    for (const p of modParts) {
      if (p === '..') upCount++;
      else break;
    }
    const remaining = modParts.slice(upCount);
    const newDir = parts.slice(0, parts.length - upCount).join('/');
    targetRel = newDir ? newDir + '/' + remaining.join('/') : remaining.join('/');
  } else {
    targetRel = importerDir ? importerDir + '/' + modRel : modRel;
  }
  if (!targetRel.endsWith('.ts')) targetRel += '.ts';

  fixes.push({ pkg, importerFile, modulePath, declName, targetRel, fullPath: `packages/${pkg}/src/${targetRel}` });
}

console.log('Total TS2459 fixes:', fixes.length);
for (const f of fixes) {
  console.log(`  ${f.pkg}: ${f.targetRel} <- ${f.declName}`);
}

// Group by fullPath
const byTarget = new Map();
for (const f of fixes) {
  if (!byTarget.has(f.fullPath)) byTarget.set(f.fullPath, []);
  byTarget.get(f.fullPath).push(f);
}

let totalFixed = 0;
const summary = [];

for (const [targetFile, list] of byTarget) {
  const absPath = 'F:/PROJETOS/ai-devkit-workspace/IDEIA/' + targetFile;
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch (e) {
    console.error('Cannot read:', absPath);
    continue;
  }

  const fileLines = content.split(/\r?\n/);
  let fileFixed = 0;
  const fixedDecls = new Set();

  for (const fix of list) {
    if (fixedDecls.has(fix.declName)) continue;
    const declRe = new RegExp('^(\\s*)(class|interface|type|enum|function|const|let|var)\\s+(' + fix.declName + ')\\b');
    for (let i = 0; i < fileLines.length; i++) {
      const line = fileLines[i];
      const declMatch = line.match(declRe);
      if (declMatch) {
        if (!line.trimStart().startsWith('export ')) {
          const indent = declMatch[1];
          const rest = line.substring(indent.length);
          fileLines[i] = indent + 'export ' + rest;
          fileFixed++;
          fixedDecls.add(fix.declName);
        }
        break;
      }
    }
  }

  if (fileFixed > 0) {
    writeFileSync(absPath, fileLines.join('\n'), 'utf8');
    summary.push(absPath + ': ' + fileFixed + ' export(s) added for ' + [...fixedDecls].join(', '));
    totalFixed += fileFixed;
  }
}

console.log('\nTotal files modified:', summary.length);
console.log('Total exports added:', totalFixed);
summary.forEach(s => console.log('  ' + s));
