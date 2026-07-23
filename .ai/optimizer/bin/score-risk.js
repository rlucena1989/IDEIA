#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const requestPath = process.argv[2];
  if (!requestPath) {
    console.error('Usage: score-risk.js <request.json>');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const root = process.cwd();
  const input = JSON.parse(fs.readFileSync(path.resolve(root, requestPath), 'utf8'));
  const files = Array.isArray(input.files) ? input.files : [];

  let score = 10;
  const reasons = [];

  if (files.length > 1) {
    score += 10;
    reasons.push('Mais de um arquivo afetado.');
  } else {
    reasons.push('Escopo muito pequeno.');
  }

  if (files.some((f) => f.includes('.ai/') || f.includes('package.json') || f.includes('lock') || f.includes('tsconfig') || f.includes('.env'))) {
    score += 25;
    reasons.push('Alteração em arquivo sensível ou estrutural.');
  }

  if ((input.details || '').toLowerCase().includes('auth')) {
    score += 30;
    reasons.push('Toca em autenticação.');
  }

  if ((input.details || '').toLowerCase().includes('payment') || (input.details || '').toLowerCase().includes('pagamento')) {
    score += 30;
    reasons.push('Toca em pagamento.');
  }

  const level = score >= 85 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';

  const result = {
    score: Math.min(100, score),
    level,
    generated_at: new Date().toISOString(),
    reasons
  };

  const outDir = path.join(root, '.ai/reports/latest');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'risk-score.json'), JSON.stringify(result, null, 2), 'utf8');

  const runtimeDir = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, 'latest-risk.json'), JSON.stringify(result, null, 2), 'utf8');

  console.log(JSON.stringify(result, null, 2));
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
