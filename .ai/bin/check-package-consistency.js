#!/usr/bin/env node
/**
 * check-package-consistency.js — Verifica consistência de todos os package.json
 *
 * Uso: node .ai/bin/check-package-consistency.js [--ci] [--fix]
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const FIX = process.argv.includes('--fix');

const REQUIRED_FIELDS = ['name', 'version', 'main'];
const ISSUES = [];

function checkPackage(pkgDir) {
  const pkgPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const json = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const name = json.name || path.basename(pkgDir);
  const issues = [];

  if (json.private && !json.name.startsWith('@ai-devkit/')) {
    issues.push('Private package name does not start with @ai-devkit/');
  }
  if (!json.license && !json.private) {
    issues.push('Missing license field');
  }
  if (json.version !== '1.0.0-alpha.0') {
    issues.push(`Version is ${json.version}, expected 1.0.0-alpha.0`);
  }
  if (json.main && !fs.existsSync(path.join(pkgDir, json.main))) {
    issues.push(`main points to non-existent file: ${json.main}`);
  }
  if (json.types && !fs.existsSync(path.join(pkgDir, json.types))) {
    issues.push(`types points to non-existent file: ${json.types}`);
  }
  if (json.scripts?.build && !json.scripts.build.startsWith('tsc')) {
    issues.push(`Build script does not start with tsc: ${json.scripts.build}`);
  }
  if (!json.scripts?.build && !json.private) {
    issues.push('Missing build script');
  }

  if (issues.length > 0) {
    ISSUES.push({ package: path.basename(pkgDir), issues });
    if (FIX) {
      if (!json.license && !json.private) {
        json.license = 'MIT';
        fs.writeFileSync(pkgPath, JSON.stringify(json, null, 2) + '\n');
      }
      if (!json.version) {
        json.version = '1.0.0-alpha.0';
        fs.writeFileSync(pkgPath, JSON.stringify(json, null, 2) + '\n');
      }
    }
  }
}

const baseDir = path.join(ROOT, 'packages');
const dirs = fs.readdirSync(baseDir);
for (const dir of dirs) {
  checkPackage(path.join(baseDir, dir));
}

console.log(`\n\x1b[1mPackage Consistency Check\x1b[0m\n`);
if (ISSUES.length === 0) {
  console.log(`\x1b[32mAll packages consistent.\x1b[0m`);
} else {
  for (const { package: pkg, issues } of ISSUES) {
    console.log(`\x1b[33m${pkg}\x1b[0m:`);
    issues.forEach(i => console.log(`  - ${i}`));
  }
  console.log(`\n\x1b[33m${ISSUES.length} packages with issues.\x1b[0m`);
}
if (CI && ISSUES.length > 0) process.exit(1);
