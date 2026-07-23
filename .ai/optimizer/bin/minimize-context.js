#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function nowISO() { return new Date().toISOString(); }
function hash(content) { return crypto.createHash('sha256').update(content).digest('hex'); }

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const requestPath = process.argv[2];
  if (!requestPath) {
    console.error('Usage: minimize-context.js <request.json>');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const root = process.cwd();
  const input = JSON.parse(fs.readFileSync(path.resolve(root, requestPath), 'utf8'));
  const decisionPath = path.join(root, '.ai/optimizer/runtime/latest-decision.json');
  const decision = fs.existsSync(decisionPath)
    ? JSON.parse(fs.readFileSync(decisionPath, 'utf8'))
    : { context_profile: input.task_hint || 'standard' };

  const included = new Set();
  const files = Array.isArray(input.files) ? input.files : [];
  for (const file of files) included.add(file);
  included.add('.ai/policies/project-policy.yaml');
  included.add('.ai/design-system/contract.yaml');
  included.add('.ai/optimizer/optimizer.yaml');

  const contextText = Array.from(included).sort().map((f) => `# ${f}\n`).join('\n');

  const manifest = {
    profile: decision.context_profile,
    generated_at: nowISO(),
    files_included: Array.from(included).sort(),
    files_excluded: ['.env', '.env.*', 'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', '*.pem', '*.key'],
    total_chars: contextText.length,
    hash: `sha256:${hash(contextText)}`,
    policy_version: '1.0.0'
  };

  const outDir = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'latest-context.json'), JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'latest-context.md'), contextText, 'utf8');

  console.log(JSON.stringify(manifest, null, 2));
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
