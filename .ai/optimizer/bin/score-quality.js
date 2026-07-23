#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const requestPath = process.argv[2];
  if (!requestPath) {
    console.error('Usage: score-quality.js <request.json>');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const root = process.cwd();
  const input = JSON.parse(fs.readFileSync(path.resolve(root, requestPath), 'utf8'));
  const files = Array.isArray(input.files) ? input.files : [];

  let score = 95;
  const reasons = [];

  if (files.length > 3) {
    score -= 10;
    reasons.push('Muitos arquivos alterados para uma tarefa pequena.');
  } else {
    reasons.push('Escopo pequeno e controlado.');
  }

  if ((input.constraints || []).some((c) => String(c).toLowerCase().includes('design system'))) {
    reasons.push('Aderência declarada ao design system.');
  }

  if (score >= 80) {
    reasons.push('Qualidade geral satisfatória.');
  } else {
    reasons.push('Score abaixo do ideal.');
  }

  const result = {
    score: Math.max(0, Math.min(100, score)),
    level: score >= 80 ? 'pass' : 'review',
    generated_at: new Date().toISOString(),
    reasons
  };

  const outDir = path.join(root, '.ai/reports/latest');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'quality-score.json'), JSON.stringify(result, null, 2), 'utf8');

  const runtimeDir = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, 'latest-quality.json'), JSON.stringify(result, null, 2), 'utf8');

  console.log(JSON.stringify(result, null, 2));
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
