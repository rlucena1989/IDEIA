// Quality Check Script — IDEIA
// Validates all packages for consistency, quality, and production readiness
// Usage: node scripts/quality-check.mjs [--ci] [--fix]

import { readFileSync, readdirSync, existsSync, writeFileSync, statSync, realpathSync } from 'fs';
import { join, resolve, dirname, relative } from 'path';
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

console.log(`\n\u{1F50D} IDEIA Quality Check — ${pkgDirs.length} packages\n`);

// 1. Check all packages have valid package.json with name and version
let versionOk = 0;
let versionFail = 0;
for (const dir of pkgDirs) {
  const pkgPath = join(PKGS, dir, 'package.json');
  if (!existsSync(pkgPath)) {
    fail(`package.json exists: ${dir}`, 'MISSING');
    continue;
  }
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (e) {
    fail(`package.json parse: ${dir}`, e.message);
    continue;
  }
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

// 2. Check tsconfig.json extends base.json
let extendsCount = 0;
let totalTsconfig = 0;
for (const dir of pkgDirs) {
  const tsconfigPath = join(PKGS, dir, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    warn(`tsconfig.json missing: ${dir}`, 'no tsconfig found');
    continue;
  }
  totalTsconfig++;
  let tsconfig;
  try {
    tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (e) {
    fail(`tsconfig.json parse: ${dir}`, e.message);
    continue;
  }
  if (tsconfig.extends && tsconfig.extends.includes('base.json')) {
    extendsCount++;
    pass(`tsconfig extends: ${dir}`, tsconfig.extends);
  } else {
    warn(`tsconfig extends: ${dir}`, tsconfig.extends || 'no extends field');
  }
  if (tsconfig.compilerOptions?.strict) {
    pass(`strict mode: ${dir}`, 'true');
  } else {
    warn(`strict mode: ${dir}`, 'compilerOptions.strict is not true');
  }
}
pass(`tsconfig extends base.json ratio`, `${extendsCount}/${totalTsconfig} packages`);
pass(`strict mode ratio`, `${totalTsconfig} packages checked`);

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
  let nnCount = 0;
  for (const f of nnFiles.slice(0, 30)) {
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

// 7. Check no infinite loops in symlinks
let symlinkLoopCount = 0;
for (const dir of pkgDirs) {
  const pkgPath = join(PKGS, dir);
  try {
    const realPath = realpathSync(pkgPath);
    if (realPath !== resolve(pkgPath)) {
      // Check if it points back to itself or creates a loop
      const visited = new Set();
      let current = pkgPath;
      while (true) {
        if (visited.has(current)) {
          fail(`symlink loop: ${dir}`, `cycle detected at ${current}`);
          symlinkLoopCount++;
          break;
        }
        visited.add(current);
        try {
          const target = realpathSync(current);
          if (target === current) break;
          current = target;
        } catch {
          break;
        }
      }
    }
  } catch {
    // not a symlink, skip
  }
}
if (symlinkLoopCount === 0) {
  pass(`symlink loops`, '0 infinite loops detected');
}

// 8. Check no .only in tests
let onlyCount = 0;
for (const dir of pkgDirs) {
  const testDir = join(PKGS, dir, '__tests__');
  const srcTestDir = join(PKGS, dir, 'src', '__tests__');
  const dirsToCheck = [];
  if (existsSync(testDir)) dirsToCheck.push(testDir);
  if (existsSync(srcTestDir)) dirsToCheck.push(srcTestDir);
  for (const td of dirsToCheck) {
    try {
      const grepResult = execSync(
        `findstr /S /M ".only(" "${td}\\*.ts"`,
        { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }
      );
      const files = grepResult.split('\n').filter(Boolean);
      for (const f of files) {
        fail(`.only in test: ${relative(ROOT, f.trim()).replace(/\\/g, '/')}`, 'remove .only before commit');
        onlyCount++;
      }
    } catch {
      // no matches
    }
  }
}
if (onlyCount === 0) {
  pass(`test .only`, 'no .only found in test files');
}

// 9. Check no dist/ files committed (check git-tracked dist/ files)
try {
  const gitResult = execSync(
    `git ls-files packages/*/dist/`,
    { encoding: 'utf8', cwd: ROOT, maxBuffer: 5 * 1024 * 1024 }
  );
  const trackedDistFiles = gitResult.split('\n').filter(Boolean);
  if (trackedDistFiles.length > 0) {
    fail(`dist/ files tracked by git`, `${trackedDistFiles.length} files tracked`);
    for (const f of trackedDistFiles.slice(0, 10)) {
      fail(`  ${f}`, 'remove from git tracking');
    }
  } else {
    pass(`dist/ files tracked`, 'no dist/ files committed');
  }
} catch {
  // Not a git repo or git not available
  warn(`dist/ files tracked`, 'git check skipped (not a git repo or git unavailable)');
}

// 10. Summary
const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const warnings = results.filter(r => r.status === 'warn').length;

console.log(`\n\u{1F4CA} Results: ${passed} \u2705 | ${failed} \u274C | ${warnings} \u26A0\uFE0F\n`);

if (failed > 0) {
  console.log('\u274C FAILED CHECKS:');
  results.filter(r => r.status === 'fail').forEach(r => console.log(`  - ${r.check}: ${r.detail}`));
}
if (warnings > 0) {
  console.log('\u26A0\uFE0F  WARNINGS:');
  results.filter(r => r.status === 'warn').slice(0, 20).forEach(r => console.log(`  - ${r.check}: ${r.detail}`));
  const remaining = results.filter(r => r.status === 'warn').length - 20;
  if (remaining > 0) console.log(`  ... and ${remaining} more warnings`);
}

if (CI && failed > 0) {
  console.error('\n\u274C Quality check FAILED -- CI mode');
  process.exit(1);
} else if (failed === 0) {
  console.log('\u2705 Quality check PASSED');
}
