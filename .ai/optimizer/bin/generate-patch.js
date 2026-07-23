#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function nowISO() { return new Date().toISOString(); }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const requestPath = process.argv[2];
  if (!requestPath) {
    console.error('Usage: generate-patch.js <request.json>');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const root = process.cwd();
  const input = JSON.parse(fs.readFileSync(path.resolve(root, requestPath), 'utf8'));
  const files = Array.isArray(input.files) ? input.files : [];

  const patch = {
    strategy: 'minimal',
    generated_at: nowISO(),
    files_changed: files.slice(0, 3),
    diff_format: 'unified',
    patch_preview: files.slice(0, 3).map((file) => ({
      file,
      operation: 'update',
      mode: 'manual_review_required'
    })),
    hash: `sha256:${hash(JSON.stringify(input))}`
  };

  const outDir = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'latest-patch.json'), JSON.stringify(patch, null, 2), 'utf8');

  console.log(JSON.stringify(patch, null, 2));
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
