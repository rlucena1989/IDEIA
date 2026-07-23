#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

function main() {
  const policyPath = path.join(ROOT, '.ai/policies/ph-value-policy.yaml');
  const altPath = path.join(ROOT, '.ai/security/ph-value-policy.yaml');

  const policyFile = fs.existsSync(policyPath) ? policyPath :
                     fs.existsSync(altPath) ? altPath : null;

  if (!policyFile) {
    console.error('[FAIL] ph-value-policy.yaml not found in .ai/policies/ or .ai/security/');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const content = fs.readFileSync(policyFile, 'utf8');

  const requiredKeys = ['version', 'patterns', 'enforcement'];
  const missing = requiredKeys.filter(k => !content.includes(k + ':'));
  if (missing.length > 0) {
    console.error(`[FAIL] Missing required keys: ${missing.join(', ')}`);
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const patternCount = (content.match(/pattern:/g) || []).length;
  if (patternCount === 0) {
    console.error('[FAIL] No patterns defined in ph-value-policy.yaml');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  console.log(`[PASS] ph-value-policy.yaml found (${path.relative(ROOT, policyFile)})`);
  console.log(`[PASS] ${patternCount} patterns defined`);
  console.log(`[PASS] Required keys present: ${requiredKeys.join(', ')}`);
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
