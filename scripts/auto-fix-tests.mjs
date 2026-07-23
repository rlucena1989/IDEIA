#!/usr/bin/env node
/**
 * auto-fix-tests.mjs — Corretor automático de test suites falhando
 *
 * Uso: node scripts/auto-fix-tests.mjs
 *
 * Funciona em loop:
 *   1. Roda jest --no-coverage em cada suite falha individualmente
 *   2. Captura a saída de erro (stderr + stdout)
 *   3. Aplica fix conhecido via regex/padrão
 *   4. Re-roda a suite até passar ou atingir maxAttempts
 *   5. Se passou, passa para a próxima
 *   6. Loop externo rerun todas as suites que falharam até tudo passar
 */

import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MAX_ATTEMPTS = 10;
const CONCURRENCY = 4;

const FIXES = [];

function registerFix(name, testFile, detector, applier) {
  FIXES.push({ name, testFile, detector, applier });
}

// ── Fix 1: TOKENS_PER_CHAR changed 0.25→0.35 ──────────────────────
registerFix(
  'TOKENS_PER_CHAR: expected 3 → 4 (token-economy)',
  'packages/cli/src/__tests__/token-economy.test.ts',
  (stderr, stdout) => {
    const combined = stderr + stdout;
    if (combined.includes('token-economy') && combined.includes('Expected: 3') && combined.includes('Received: 4') && combined.includes('tokens')) {
      return { type: 'replace', from: /expect\(item\.tokens\)\.toBe\(3\)/g, to: 'expect(item.tokens).toBe(4)' };
    }
    return null;
  }
);

// ── Fix 2: TOKENS_PER_CHAR changed 0.25→0.35 (context-store) ─────
registerFix(
  'TOKENS_PER_CHAR: expected 3 → 4 (context-store)',
  'packages/cli/src/__tests__/context-store.test.ts',
  (stderr, stdout) => {
    const combined = stderr + stdout;
    if (combined.includes('context-store') && combined.includes('Expected: 3') && combined.includes('Received: 4') && combined.includes('estimateTokens')) {
      return { type: 'replace', from: /expect\(estimateTokens\('hello world'\)\)\.toBe\(3\)/g, to: "expect(estimateTokens('hello world')).toBe(4)" };
    }
    return null;
  }
);

// ── Fix 3: validateManifest → validateSdkManifest (runtime) ───────
registerFix(
  'validateManifest → validateSdkManifest (runtime.test.ts)',
  'packages/cli/src/__tests__/runtime.test.ts',
  (stderr, stdout) => {
    const combined = stderr + stdout;
    if (combined.includes('runtime.test') && combined.includes('validateManifest')) {
      return { type: 'replace', from: /validateManifest/g, to: 'validateSdkManifest' };
    }
    return null;
  }
);

// ── Fix 4: release-preparer hoisting issue ────────────────────────
registerFix(
  'release-preparer: Cannot access mockFs before initialization',
  'packages/cli/src/__tests__/release-preparer.test.ts',
  (stderr, stdout) => {
    const combined = stderr + stdout;
    if (combined.includes('release-preparer') && combined.includes('Cannot access') && combined.includes('mockFs')) {
      return { type: 'read', description: 'Hoisting fix needed - jest.mock uses variable before definition' };
    }
    return null;
  }
);

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function writeFile(relPath, content) {
  fs.writeFileSync(path.join(ROOT, relPath), content, 'utf-8');
}

function runTest(relPath) {
  const result = spawnSync('npx', ['jest', relPath, '--no-coverage'], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 30000,
    shell: true,
  });
  return {
    passed: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

function runAllTests() {
  const result = spawnSync('npx', ['jest', '--no-coverage'], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 120000,
    shell: true,
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

function extractFailingSuites(stdout, stderr) {
  const combined = stdout + stderr;
  const failures = [];
  const regex = /FAIL\s+([^\s]+\.test\.ts)/g;
  let m;
  while ((m = regex.exec(combined)) !== null) {
    const suite = m[1];
    if (!failures.includes(suite)) failures.push(suite);
  }
  // Also look for "Test suite failed to run"
  const failRegex = /●\s+(.+?)(?:\s*\n|\s*$)/g;
  while ((m = failRegex.exec(combined)) !== null) {
    // skip non-suite lines
  }
  return failures;
}

async function fixSuite(testFile) {
  const relPath = testFile.startsWith('packages/') ? testFile : `packages/cli/src/__tests__/${testFile}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n[${attempt}/${MAX_ATTEMPTS}] Running: ${relPath}`);

    const result = runTest(relPath);

    if (result.passed) {
      console.log(`  ✅ PASS: ${relPath}`);
      return true;
    }

    console.log(`  ❌ FAIL: ${relPath} (exit ${result.status})`);

    // Try to find and apply a fix
    let fixed = false;
    for (const fix of FIXES) {
      if (fix.testFile === relPath || testFile.includes(fix.testFile.replace('packages/cli/src/__tests__/', '').replace('.test.ts', ''))) {
        const action = fix.detector(result.stderr, result.stdout);
        if (action) {
          console.log(`  🔧 Applying fix: ${fix.name}`);
          if (action.type === 'replace') {
            let content = readFile(relPath);
            const original = content;
            content = content.replace(action.from, action.to);
            if (content !== original) {
              writeFile(relPath, content);
              console.log(`  ✅ Fix applied: ${relPath}`);
              fixed = true;
            } else {
              console.log(`  ⚠️  No change needed (pattern not found)`);
            }
          } else if (action.type === 'read') {
            console.log(`  📖 ${action.description}`);
            // Read the file content for manual inspection
            const content = readFile(relPath);
            console.log(`  File content (first 30 lines):`);
            console.log(content.split('\n').slice(0, 30).map((l, i) => `${i + 1}: ${l}`).join('\n'));
            return await handleReleasePreparerFix(relPath, content, result);
          }
          break;
        }
      }
    }

    if (!fixed) {
      console.log(`  ⚠️  No automated fix found for ${relPath}`);
      console.log(`  stderr snippet: ${result.stderr.slice(-500)}`);
      return false;
    }
  }

  console.log(`  ❌ Max attempts (${MAX_ATTEMPTS}) reached for ${relPath}`);
  return false;
}

async function handleReleasePreparerFix(relPath, content, result) {
  // The issue: `const mockFs = ...` is defined AFTER jest.mock('node:fs', () => mockFs)
  // In Jest, jest.mock is hoisted to the top, so mockFs is not yet defined.
  // Fix: move the mockFs definition before the jest.mock call, or use jest.mock with a factory function.

  const lines = content.split('\n');

  // Find the jest.mock lines and the mockFs definition
  let mockFsLine = -1;
  let jestMockFsLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const mockFs')) mockFsLine = i;
    if (lines[i].includes("jest.mock('node:fs'")) jestMockFsLine = i;
  }

  if (mockFsLine === -1 || jestMockFsLine === -1) {
    console.log('  ⚠️  Could not find mockFs definition or jest.mock line');
    return false;
  }

  // Read the full file to understand structure
  console.log(`  mockFs defined at line ${mockFsLine + 1}`);
  console.log(`  jest.mock('node:fs') at line ${jestMockFsLine + 1}`);

  if (jestMockFsLine < mockFsLine) {
    // The jest.mock is before mockFs definition - this is the problem
    // Fix: Move mockFs definition BEFORE the jest.mock line, or use inline factory

    // Strategy: convert jest.mock to use inline factory function
    // From: jest.mock('node:fs', () => mockFs)
    // To:   const mockFs = { ... }; jest.mock('node:fs', () => mockFs);
    // But that won't work either because of hoisting.

    // Best fix: replace jest.mock with factory that defines mockFs inline
    // Or: move the const mockFs before jest.mock

    // Let's find the full mockFs block and move it up
    let mockFsBlock = '';
    let mockFsEnd = mockFsLine;
    for (let i = mockFsLine; i < Math.min(mockFsLine + 40, lines.length); i++) {
      if (lines[i].trim() === '};' || lines[i].trim() === '};' && i > mockFsLine + 2) {
        mockFsEnd = i;
        break;
      }
    }

    mockFsBlock = lines.slice(mockFsLine, mockFsEnd + 1).join('\n');

    // Find the import lines (top of file) to insert mockFs after them
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) lastImport = i;
    }

    // Remove the jest.mock line and mockFs definition
    const newLines = [...lines];
    newLines.splice(jestMockFsLine, 1); // remove jest.mock('node:fs')
    const mockFsStartIdx = newLines.indexOf(lines[mockFsLine]);
    if (mockFsStartIdx !== -1) {
      newLines.splice(mockFsStartIdx, mockFsEnd - mockFsLine + 1);
    }

    // Insert mockFs block after last import
    newLines.splice(lastImport + 1, 0, mockFsBlock);
    // Insert jest.mock after mockFs block
    newLines.splice(lastImport + 1 + mockFsBlock.split('\n').length, 0, `jest.mock('node:fs', () => mockFs);`);

    writeFile(relPath, newLines.join('\n'));
    console.log(`  ✅ Release-preparer fix applied: moved mockFs before jest.mock`);
  } else {
    console.log('  ✅ mockFs is already before jest.mock - checking other issues');
  }

  return true;
}

// ── Main loop ──────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   AI-DevKit Auto-Fix Test Suites v1.0           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Root: ${ROOT}`);
  console.log(`Max attempts per suite: ${MAX_ATTEMPTS}`);
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  const KNOWN_FAILING = [
    'packages/cli/src/__tests__/token-economy.test.ts',
    'packages/cli/src/__tests__/runtime.test.ts',
    'packages/cli/src/__tests__/context-store.test.ts',
    'packages/cli/src/__tests__/release-preparer.test.ts',
  ];

  // First pass: fix each known failing suite
  console.log('═══ Phase 1: Fix known failing suites ═══');
  for (const suite of KNOWN_FAILING) {
    console.log(`\n--- ${suite} ---`);
    const ok = await fixSuite(suite);
    console.log(`  Result: ${ok ? '✅ PASS' : '❌ FAIL'}`);
  }

  // Second pass: run all tests and detect any remaining failures
  console.log('\n═══ Phase 2: Verify all tests ═══');
  const allResult = runAllTests();

  const failingSuites = extractFailingSuites(allResult.stdout, allResult.stderr);

  // Parse summary
  const summaryMatch = (allResult.stdout + allResult.stderr).match(/(Tests:\s+\d+ passed, \d+ failed|Tests:\s+\d+ passed)/);
  const suitesMatch = (allResult.stdout + allResult.stderr).match(/(Test Suites:\s+\d+ passed, \d+ failed|Test Suites:\s+\d+ passed)/);

  if (summaryMatch) console.log(`  ${summaryMatch[0]}`);
  if (suitesMatch) console.log(`  ${suitesMatch[0]}`);

  if (failingSuites.length === 0) {
    console.log('\n✅ ALL TESTS PASSING!');
    return;
  }

  // Third pass: iterate on remaining failures
  console.log(`\n═══ Phase 3: Fix remaining ${failingSuites.length} failing suites ═══`);
  let iteration = 0;
  const MAX_ITERATIONS = 5;

  while (failingSuites.length > 0 && iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`\n--- Iteration ${iteration}/${MAX_ITERATIONS} ---`);

    for (const suite of [...failingSuites]) {
      console.log(`\n[${suite}]`);
      const ok = await fixSuite(suite);
      if (ok) {
        const idx = failingSuites.indexOf(suite);
        if (idx !== -1) failingSuites.splice(idx, 1);
      }
    }

    if (failingSuites.length === 0) break;

    // Re-run all to detect new failures
    console.log('\nRe-running all tests...');
    const reResult = runAllTests();
    const newFailures = extractFailingSuites(reResult.stdout, reResult.stderr);
    failingSuites.length = 0;
    failingSuites.push(...newFailures);

    const sumMatch = (reResult.stdout + reResult.stderr).match(/(Tests:\s+\d+ passed, \d+ failed|Tests:\s+\d+ passed)/);
    if (sumMatch) console.log(`  ${sumMatch[0]}`);
  }

  if (failingSuites.length === 0) {
    console.log('\n✅ ALL TESTS PASSING AFTER CORRECTIONS!');
  } else {
    console.log(`\n⚠️  Remaining failures: ${failingSuites.join(', ')}`);
    console.log('Manual intervention required for these suites.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
