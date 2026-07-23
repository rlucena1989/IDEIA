#!/usr/bin/env node
/**
 * check-tsc-all.js — Compila TODOS os 65+ packages com tsc --noEmit
 *
 * Uso: node .ai/bin/check-tsc-all.js [--ci] [--verbose]
 *   --ci      exit 1 se qualquer package falhar
 *   --verbose loga erros detalhados
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');

const IGNORE_PACKAGES = ['e2e-tests'];

const results = { pass: 0, fail: 0, skip: 0, details: [] };

function getPackages() {
  const dirs = fs.readdirSync(path.join(ROOT, 'packages'));
  return dirs.filter(d => {
    const tsconfig = path.join(ROOT, 'packages', d, 'tsconfig.json');
    return fs.existsSync(tsconfig) && !IGNORE_PACKAGES.includes(d);
  });
}

function hasSourceFiles(pkg) {
  const srcDir = path.join(ROOT, 'packages', pkg, 'src');
  if (!fs.existsSync(srcDir)) return false;
  const files = fs.readdirSync(srcDir, { recursive: true });
  return files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
}

console.log(`\n\x1b[1mTypeScript Compilation Check — All Packages\x1b[0m\n`);
console.log(`${'Package'.padEnd(30)} Status`);
console.log(`${'-'.repeat(30)} ${'-'.repeat(20)}`);

const packages = getPackages();

for (const pkg of packages) {
  if (!hasSourceFiles(pkg)) {
    console.log(`${pkg.padEnd(30)} \x1b[90mSKIP (no src/)\x1b[0m`);
    results.skip++;
    continue;
  }

  try {
    execSync('npx tsc --noEmit --pretty false 2>&1', {
      cwd: path.join(ROOT, 'packages', pkg),
      encoding: 'utf8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`${pkg.padEnd(30)} \x1b[32m✅ PASS\x1b[0m`);
    results.pass++;
    results.details.push({ package: pkg, status: 'pass' });
  } catch (e) {
    const stderr = e.stdout || e.stderr || e.message || '';
    const lineCount = stderr.split('\n').filter(l => l.includes('error TS')).length;
    console.log(`${pkg.padEnd(30)} \x1b[31m❌ FAIL (${lineCount} errors)\x1b[0m`);
    results.fail++;
    results.details.push({ package: pkg, status: 'fail', errors: lineCount, output: VERBOSE ? stderr.slice(0, 1000) : undefined });
    if (VERBOSE) console.log(stderr.slice(0, 800));
  }
}

console.log(`\n\x1b[1mResults: ${results.pass} pass, ${results.fail} fail, ${results.skip} skip\x1b[0m`);

if (CI && results.fail > 0) {
  process.exit(1);
}
