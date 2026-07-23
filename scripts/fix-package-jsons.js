#!/usr/bin/env node
/**
 * fix-package-jsons.js — Corrige package.json em massa
 *
 * Adiciona: license, bugs, files, publishConfig
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUGS_URL = 'https://github.com/anomalyco/ideia/issues';

function fixPackage(pkgPath) {
  if (!fs.existsSync(pkgPath)) return;
  let json = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  let changed = false;

  if (!json.license && !json.private) {
    json.license = 'MIT';
    changed = true;
  }

  if (!json.bugs) {
    json.bugs = { url: BUGS_URL };
    changed = true;
  }

  if (!json.files) {
    json.files = ['dist/**', '!dist/**/*.test.*'];
    changed = true;
  }

  if (!json.publishConfig && !json.private) {
    json.publishConfig = { access: 'public' };
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(json, null, 2) + '\n');
  }
  return changed;
}

let fixed = 0;
let total = 0;

// Root
if (fixPackage(path.join(ROOT, 'package.json'))) fixed++;
total++;

// packages
const packagesDir = path.join(ROOT, 'packages');
const dirs = fs.readdirSync(packagesDir);
for (const dir of dirs) {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  if (fixPackage(pkgPath)) fixed++;
  total++;
}

console.log(`Fixed ${fixed}/${total} packages (license, bugs, files, publishConfig)`);
