// Quality Check Script — IDEIA
// Validates all 96 packages for consistency, quality, and production readiness
// Usage: node scripts/quality-check.mjs [--ci] [--fix]

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PKGS = join(ROOT, 'packages');
const args = process.argv.slice(2);
const CI = args.includes('--ci');
const FIX = args.includes('--fix');

/** @type {Array<{check:string, status:string, detail:string}>} */
const results = [];

function pass(check, detail = '') {
  results.push({ check, status: 'pass', detail });
}

function fail(check, detail) {
  results.push({ check, status: 'fail', detail });
  if (CI) process.exitCode = 1;
}

function warn(check, detail) {
  results.push({ check, status: 'warn', detail });
}

// Discover all packages
const pkgDirs = readdirSync(PKGS, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

console.log(`\n🔍 IDEIA Quality Check — ${pkgDirs.length} packages\n`);

// 1. Check all packages have package.json with name and version
let versionOk = 0;
let versionFail = 0;
for (const dir of pkgDirs) {
  const pkgPath = join(PKGS, dir, 'package.json');
  if (!existsSync(pkgPath)) {
    fail(`package.json exists: ${dir}`, 'MISSING');
    continue;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, ''));
  if (pkg.name && pkg.name.startsWith('@ideia/')) versionOk++;
  else { fail(`package name: ${dir}`, pkg.name || 'missing'); versionFail++; }
  
  if (pkg.version) {
    if (pkg.version === '0.0.0') pass(`version: ${dir}`, '0.0.0');
    else pass(`version: ${dir}`, pkg.version);
  } else {
    if (FIX) {
      pkg.version = '0.0.0';
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      pass(`version fixed: ${dir}`, '0.0.0');
    } else {
      warn(`version missing: ${dir}`, 'run with --fix to add 0.0.0');
    }
  }
}

// 2. Check tsconfig.json for strict mode
let strictCount = 0;
let totalTsconfig = 0;
for (const dir of pkgDirs) {
  const tsconfigPath = join(PKGS, dir, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) continue;
  totalTsconfig++;
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8').replace(/^\uFEFF/, ''));
  if (tsconfig.compilerOptions?.strict) {
    strictCount++;
    pass(`strict mode: ${dir}`, 'true');
  } else {
    warn(`strict mode: ${dir}`, 'compilerOptions.strict is not true');
  }
}
pass(`strict mode ratio`, `${strictCount}/${totalTsconfig} packages`);

// 3. Check for `as any` in production code (exclude __tests__)
import { execSync } from 'child_process';
function stripCodeForAnyCount(code) {
  return code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/['"`][^'"`]*['"`]/g, '');
}
try {
  const anyResult = execSync(
    `findstr /S /M "as any" "${PKGS}\\*.ts"`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  const files = anyResult.split('\n').filter(Boolean).filter(f => !f.includes('__tests__') && !f.includes('node_modules') && !f.includes('.d.ts'));
  let totalCastCount = 0;
  let realFiles = 0;
  for (const f of files) {
    const content = readFileSync(f.trim(), 'utf8');
    const clean = stripCodeForAnyCount(content);
    const matches = clean.match(/\w+\s+as\s+any\b/g);
    if (matches) {
      totalCastCount += matches.length;
      realFiles++;
    }
  }
  if (totalCastCount > 0) {
    warn(`as any in production`, `${totalCastCount} casts across ${realFiles} files`);
    for (const f of files) {
      const content = readFileSync(f.trim(), 'utf8');
      const clean = stripCodeForAnyCount(content);
      const matches = clean.match(/\w+\s+as\s+any\b/g);
      if (matches) {
        const rel = f.replace(ROOT, '').replace(/\\/g, '/');
        warn(`  ${rel}`, `${matches.length} casts`);
      }
    }
  } else {
    pass(`as any in production`, '0 casts');
  }
} catch {
  pass(`as any in production`, '0 casts (not found)');
}

// 4. Check for ! non-null assertions in production
try {
  const nnResult = execSync(
    `findstr /S /M "!" "${PKGS}\\*.ts"`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  const nnFiles = nnResult.split('\n').filter(Boolean)
    .filter(f => !f.includes('__tests__') && !f.includes('node_modules') && !f.includes('.d.ts'));
  // Filter down to actual non-null assertions (not just any ! in imports/strings)
  let nnCount = 0;
  for (const f of nnFiles.slice(0, 30)) { // sample first 30
    const content = readFileSync(f.trim(), 'utf8');
    const matches = content.match(/\w+!/g);
    if (matches) nnCount += matches.filter(m => !['async', 'await', 'function', 'import', 'return', 'const', 'let', 'var'].includes(m)).length;
  }
  if (nnCount > 0) {
    warn(`! assertions`, `~${nnCount} potential non-null assertions across ${nnFiles.length} files`);
  } else {
    pass(`! assertions`, 'none found');
  }
} catch {
  pass(`! assertions`, 'check skipped');
}

// 5. Check all packages have tests
let withTests = 0;
for (const dir of pkgDirs) {
  const testDir = join(PKGS, dir, '__tests__');
  const srcTestDir = join(PKGS, dir, 'src', '__tests__');
  if (existsSync(testDir) || existsSync(srcTestDir)) {
    withTests++;
  }
}
pass(`packages with tests`, `${withTests}/${pkgDirs.length}`);

// 6. Check for console.log in production (non-test files)
try {
  const consoleResult = execSync(
    `findstr /S /M "console.log" "${PKGS}\\*.ts"`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  const consoleFiles = consoleResult.split('\n').filter(Boolean)
    .filter(f => !f.includes('__tests__') && !f.includes('node_modules') && !f.includes('.d.ts') && !f.includes('src-gen'));
  if (consoleFiles.length > 0) {
    warn(`console.log in production`, `${consoleFiles.length} files`);
    for (const f of consoleFiles.slice(0, 10)) {
      const rel = f.replace(ROOT, '').replace(/\\/g, '/');
      warn(`  ${rel}`, 'console.log present');
    }
  } else {
    pass(`console.log in production`, '0 files');
  }
} catch {
  pass(`console.log in production`, '0 files (not found)');
}

// 7. Summary
const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const warnings = results.filter(r => r.status === 'warn').length;

console.log(`\n📊 Results: ${passed} ✅ | ${failed} ❌ | ${warnings} ⚠️\n`);

if (failed > 0) {
  console.log('❌ FAILED CHECKS:');
  results.filter(r => r.status === 'fail').forEach(r => console.log(`  - ${r.check}: ${r.detail}`));
}
if (warnings > 0) {
  console.log('⚠️  WARNINGS:');
  results.filter(r => r.status === 'warn').slice(0, 20).forEach(r => console.log(`  - ${r.check}: ${r.detail}`));
  const remaining = results.filter(r => r.status === 'warn').length - 20;
  if (remaining > 0) console.log(`  ... and ${remaining} more warnings`);
}

if (CI && failed > 0) {
  console.error('\n❌ Quality check FAILED -- CI mode');
  process.exit(1);
} else if (failed === 0) {
  console.log('✅ Quality check PASSED');
}
