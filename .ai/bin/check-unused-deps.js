#!/usr/bin/env node
/**
 * check-unused-deps.js — Detecta dependências não utilizadas
 *
 * Uso: node .ai/bin/check-unused-deps.js [--ci]
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');

let totalUnused = 0;
let totalPackages = 0;

function getUsedImports(dir) {
  const used = new Set();
  const walk = (d) => {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(d, e.name);
        if (e.isDirectory() && !['node_modules', 'dist', '.git'].includes(e.name)) walk(full);
        else if (e.name.match(/\.(ts|js|tsx|jsx)$/)) {
          const content = fs.readFileSync(full, 'utf-8');
          const imports = content.match(/(?:from\s+['"][^'"]+['"])|(?:require\s*\(\s*['"][^'"]+['"]\))/g) || [];
          imports.forEach(i => {
            const m = i.match(/['"]([^'"]+)['"]/);
            if (m && !m[1].startsWith('.') && !m[1].startsWith('node:')) used.add(m[1]);
          });
        }
      }
    } catch {}
  };
  walk(dir);
  return used;
}

const packages = fs.readdirSync(path.join(ROOT, 'packages')).filter(d => {
  return fs.existsSync(path.join(ROOT, 'packages', d, 'package.json'));
});

console.log(`\n\x1b[1mUnused Dependencies Check\x1b[0m\n`);
for (const pkg of packages) {
  const pkgPath = path.join(ROOT, 'packages', pkg, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const json = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const allDeps = { ...json.dependencies, ...json.devDependencies };
  const depNames = Object.keys(allDeps);
  if (depNames.length === 0) continue;

  totalPackages++;
  const srcDir = path.join(ROOT, 'packages', pkg, 'src');
  const used = fs.existsSync(srcDir) ? getUsedImports(srcDir) : new Set();

  const unused = depNames.filter(d => !used.has(d) && !d.startsWith('@ai-devkit/'));
  if (unused.length > 0) {
    totalUnused += unused.length;
    console.log(`\x1b[33m${pkg}\x1b[0m: ${unused.length} unused`);
    unused.forEach(d => console.log(`  - ${d}`));
  }
}

console.log(`\n\x1b[1mTotal: ${totalUnused} unused deps across ${totalPackages} packages\x1b[0m`);
if (CI && totalUnused > 0) process.exit(1);
