#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const SCANNERS = [
  { name: 'placeholder-policy', script: '.ai/bin/check-placeholder-policy.js' },
  { name: 'ph-value-policy', script: '.ai/bin/check-ph-value-policy.js' },
  { name: 'design-system', script: '.ai/bin/check-design-system.js' },
  { name: 'portability', script: '.ai/bin/check-portability.js' },
  { name: 'contracts', script: '.ai/bin/check-contracts.js' },
  { name: 'package-scripts', script: '.ai/bin/check-package-scripts.js' },
  { name: 'template-consistency', script: '.ai/bin/check-template-consistency.js' },
  { name: 'installer', script: '.ai/bin/check-installer.js' },
  { name: 'empty-or-decorative', script: '.ai/bin/check-empty-or-decorative-files.js' },
  { name: 'boundaries', script: '.ai/bin/check-boundaries.js' },
  { name: 'generated-code-risk', script: '.ai/bin/check-generated-code-risk.js' },
  { name: 'artifact-manifest', script: '.ai/bin/check-artifact-manifest.js' },
];

function runScanner(name, scriptPath) {
  const fullPath = path.join(ROOT, scriptPath);
  if (!fs.existsSync(fullPath)) {
    return { name, passed: false, skipped: true, output: 'Script not found' };
  }

  const isInstaller = name === 'installer';
  const result = spawnSync('node', [fullPath], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: isInstaller ? 180000 : 30000,
    shell: process.platform === 'win32',
  });

  const passed = result.status === 0;
  return {
    name,
    passed,
    exitCode: result.status ?? 1,
    output: (result.stdout || '').trim().split('\n').slice(0, 5).join('\n'),
    error: (result.stderr || '').trim().slice(0, 200),
  };
}

function main() {
  const results = [];
  let allPassed = true;

  console.log('╔══════════════════════════════════════╗');
  console.log('║     AI-Devkit — Check All Scanners   ║');
  console.log('╚══════════════════════════════════════╝\n');

  for (const scanner of SCANNERS) {
    process.stdout.write(`  [${scanner.name}]... `);
    const result = runScanner(scanner.name, scanner.script);
    results.push(result);

    if (result.skipped) {
      console.log('⚠ SKIPPED');
    } else if (result.passed) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL');
      allPassed = false;
    }

    if (!result.passed && !result.skipped && result.error) {
      console.log(`     ${result.error}`);
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

  const reportDir = path.join(ROOT, '.ai/reports/latest');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'check-all.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    skipped,
    scanners: results,
  }, null, 2));

  if (allPassed) {
    console.log('✅ All scanners passed.');
    console.log('EXIT_CODE=0');
    process.exit(0);
  } else {
    console.log('❌ Some scanners failed. Check reports above.');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }
}

main();
