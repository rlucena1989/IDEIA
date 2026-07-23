#!/usr/bin/env node
/**
 * check-dead-code.js — Detecta código morto (exports não utilizados)
 *
 * Uso: node .ai/bin/check-dead-code.js [--ci] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');

let totalDeadExports = 0;

function findExports(dir) {
  const exports = [];
  const walk = (d) => {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(d, e.name);
        if (e.isDirectory() && !['node_modules', 'dist', '__tests__'].includes(e.name)) walk(full);
        else if (e.name.match(/\.(ts|tsx)$/)) {
          const content = fs.readFileSync(full, 'utf-8');
          const exps = content.match(/export\s+(?:function|class|const|interface|type|enum)\s+(\w+)/g) || [];
          exps.forEach(exp => {
            const name = exp.match(/(\w+)/g).pop();
            exports.push({ name, file: full });
          });
        }
      }
    } catch {}
  };
  walk(dir);
  return exports;
}

function countImports(name, dir) {
  let count = 0;
  const walk = (d) => {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(d, e.name);
        if (e.isDirectory() && !['node_modules', 'dist', '__tests__'].includes(e.name)) walk(full);
        else if (e.name.match(/\.(ts|tsx)$/)) {
          const content = fs.readFileSync(full, 'utf-8');
          const regex = new RegExp(`\\b${name}\\b`, 'g');
          const matches = content.match(regex);
          if (matches) count += matches.length;
        }
      }
    } catch {}
  };
  walk(dir);
  return count;
}

const packages = fs.readdirSync(path.join(ROOT, 'packages')).filter(d => {
  return fs.existsSync(path.join(ROOT, 'packages', d, 'src'));
});

console.log(`\n\x1b[1mDead Code Detection\x1b[0m\n`);
console.log(`${'Package'.padEnd(25)} ${'Export'.padEnd(35)} ${'Defined in'}`);
console.log(`${'-'.repeat(25)} ${'-'.repeat(35)} ${'-'.repeat(20)}`);

for (const pkg of packages) {
  const srcDir = path.join(ROOT, 'packages', pkg, 'src');
  const exports = findExports(srcDir);
  for (const exp of exports) {
    const ownImports = countImports(exp.name, srcDir);
    const otherImports = countImports(exp.name, path.join(ROOT, 'packages'));
    const totalImports = ownImports + otherImports;
    if (totalImports <= 1) {
      totalDeadExports++;
      const fileName = path.relative(path.join(ROOT, 'packages'), exp.file);
      console.log(`${pkg.padEnd(25)} \x1b[33m${exp.name.padEnd(35)}\x1b[0m ${fileName}`);
    }
  }
}

if (totalDeadExports === 0) {
  console.log(`\x1b[32mNo dead exports detected.\x1b[0m`);
} else {
  console.log(`\n\x1b[33m${totalDeadExports} potentially dead exports found.\x1b[0m`);
  console.log(`(Note: some may be used in test files or dynamically.)`);
}
if (CI) process.exit(totalDeadExports > 10 ? 1 : 0);
