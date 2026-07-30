#!/usr/bin/env node
/**
 * owasp-red-team-all.js — Combined OWASP LLM Top 10 Red Team Runner
 *
 * Runs all 10 OWASP LLM red team checks and produces consolidated report.
 * Covers LLM01-LLM10 with dedicated per-category scanners.
 *
 * Usage:
 *   node .ai/security/owasp-red-team-all.js                    # full suite
 *   node .ai/security/owasp-red-team-all.js --ci               # exit 1 on critical/high failures
 *   node .ai/security/owasp-red-team-all.js --verbose          # detailed per-check output
 *   node .ai/security/owasp-red-team-all.js --category LLM03   # single category
 *   node .ai/security/owasp-red-team-all.js --json             # JSON output
 */

const { execSync } = require('child_process');
const path = require('path');

const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');
const JSON_OUTPUT = process.argv.includes('--json');
const CATEGORY_INDEX = process.argv.indexOf('--category');
const CATEGORY = CATEGORY_INDEX !== -1 ? process.argv[CATEGORY_INDEX + 1] : null;

const SCRIPTS_DIR = path.resolve(__dirname);

const OWASP_CATEGORIES = [
  { id: 'LLM01', file: 'red-teaming.js', path: path.resolve(__dirname, '..', 'bin', 'red-teaming.js'), description: 'Prompt Injection' },
  { id: 'LLM02', file: 'red-team.js', path: path.resolve(SCRIPTS_DIR, 'red-team.js'), description: 'Sensitive Information Disclosure' },
  { id: 'LLM03', file: 'owasp-red-team-llm03.js', path: path.resolve(SCRIPTS_DIR, 'owasp-red-team-llm03.js'), description: 'Supply Chain' },
  { id: 'LLM04', file: 'owasp-red-team-llm04.js', path: path.resolve(SCRIPTS_DIR, 'owasp-red-team-llm04.js'), description: 'Insecure Output Handling' },
  { id: 'LLM05', file: 'owasp-red-team-llm05.js', path: path.resolve(SCRIPTS_DIR, 'owasp-red-team-llm05.js'), description: 'Training Data Poisoning' },
  { id: 'LLM06', file: null, path: null, description: 'Excessive Agency (covered by policy-engine tests)' },
  { id: 'LLM07', file: 'owasp-red-team-llm07.js', path: path.resolve(SCRIPTS_DIR, 'owasp-red-team-llm07.js'), description: 'Overreliance' },
  { id: 'LLM08', file: null, path: null, description: 'Model DoS (covered by existing red-team many-shot checks)' },
  { id: 'LLM09', file: 'owasp-red-team-llm09.js', path: path.resolve(SCRIPTS_DIR, 'owasp-red-team-llm09.js'), description: 'Vector & Embedding Weaknesses' },
  { id: 'LLM10', file: 'owasp-red-team-llm10.js', path: path.resolve(SCRIPTS_DIR, 'owasp-red-team-llm10.js'), description: 'Misinformation' },
];

function runCategory(category) {
  if (!category.path) {
    return { passed: true, output: `[SKIP] ${category.id} — ${category.description} (covered elsewhere)` };
  }
  if (!require('fs').existsSync(category.path)) {
    return { passed: false, output: `[ERROR] Script not found: ${category.path}` };
  }
  try {
    const args = ['node', category.path];
    if (CI) args.push('--ci');
    if (VERBOSE) args.push('--verbose');
    const output = execSync(args.join(' '), { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
    const hasFailures = /\[FAIL\]/.test(output);
    return { passed: !hasFailures, output: output.trim() };
  } catch (e) {
    return { passed: false, output: e.stdout || e.message };
  }
}

function main() {
  const results = [];
  const categoriesToRun = CATEGORY
    ? OWASP_CATEGORIES.filter(c => c.id === CATEGORY)
    : OWASP_CATEGORIES;

  if (categoriesToRun.length === 0) {
    console.error(`Unknown category: ${CATEGORY}. Available: ${OWASP_CATEGORIES.map(c => c.id).join(', ')}`);
    process.exit(1);
  }

  for (const cat of categoriesToRun) {
    if (!VERBOSE && cat.path) {
      console.log(`\x1b[1mRunning ${cat.id} — ${cat.description}...\x1b[0m`);
    }
    const result = runCategory(cat);
    results.push({ category: cat.id, description: cat.description, ...result });

    if (VERBOSE || !cat.path) {
      console.log('');
      console.log(result.output);
      console.log('');
    }
  }

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
    return;
  }

  console.log('\n\x1b[1m========================================\x1b[0m');
  console.log('\x1b[1m  OWASP LLM Top 10 — Consolidated Report\x1b[0m');
  console.log('\x1b[1m========================================\x1b[0m\n');

  for (const r of results) {
    const icon = r.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(`${icon} ${r.category} — ${r.description}`);
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\n\x1b[1mResult: ${passed}/${total} categories passed\x1b[0m`);

  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('\n\x1b[31mFailed categories:\x1b[0m');
    for (const f of failed) {
      console.log(`  ${f.category}: ${f.output.slice(0, 200)}`);
    }
  }

  if (CI && failed.length > 0) {
    process.exit(1);
  }
}

main();
