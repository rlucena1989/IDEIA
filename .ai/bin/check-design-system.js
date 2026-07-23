#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

let violations = [];

function checkTokens() {
  const tokensPath = path.join(ROOT, '.ai/design-system/tokens.json');
  if (!fs.existsSync(tokensPath)) {
    violations.push({ file: '.ai/design-system/tokens.json', severity: 'error', message: 'Design tokens file not found' });
    return;
  }
  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  const required = ['color', 'spacing', 'radius', 'typography', 'breakpoints'];
  for (const key of required) {
    if (!tokens[key]) violations.push({ file: '.ai/design-system/tokens.json', severity: 'error', message: `Missing required token category: ${key}` });
  }
}

function checkComponents() {
  const componentsPath = path.join(ROOT, '.ai/design-system/components.yaml');
  if (!fs.existsSync(componentsPath)) {
    violations.push({ file: '.ai/design-system/components.yaml', severity: 'error', message: 'Components catalog not found' });
    return;
  }
  const content = fs.readFileSync(componentsPath, 'utf8');
  const componentCount = (content.match(/^\s{2}\w+:/gm) || []).length;
  if (componentCount < 5) {
    violations.push({ file: '.ai/design-system/components.yaml', severity: 'warning', message: `Only ${componentCount} components registered (minimum recommended: 5)` });
  }
}

function checkPatterns() {
  const patternsPath = path.join(ROOT, '.ai/design-system/patterns.yaml');
  if (!fs.existsSync(patternsPath)) {
    violations.push({ file: '.ai/design-system/patterns.yaml', severity: 'warning', message: 'Layout patterns file not found' });
  }
}

function checkContract() {
  const contractPath = path.join(ROOT, '.ai/design-system/contract.yaml');
  if (!fs.existsSync(contractPath)) {
    violations.push({ file: '.ai/design-system/contract.yaml', severity: 'error', message: 'Design contract not found' });
    return;
  }
  const content = fs.readFileSync(contractPath, 'utf8');
  if (!content.includes('forbidden:')) {
    violations.push({ file: '.ai/design-system/contract.yaml', severity: 'warning', message: 'Contract missing forbidden rules' });
  }
}

function scanSourceFiles() {
  const srcDirs = [];
  if (fs.existsSync(path.join(ROOT, 'src'))) srcDirs.push(path.join(ROOT, 'src'));
  if (fs.existsSync(path.join(ROOT, 'packages'))) srcDirs.push(path.join(ROOT, 'packages'));

  for (const dir of srcDirs) {
    walkAndScan(dir);
  }
}

function walkAndScan(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walkAndScan(full); continue; }
      if (!/\.(tsx|jsx|vue|html)$/i.test(entry.name)) continue;

      const content = fs.readFileSync(full, 'utf8');
      const rel = path.relative(ROOT, full);

      if (/color=["']#[0-9a-fA-F]{6}["']|color:\s*#[0-9a-fA-F]{6}/.test(content) && !content.includes('design-tokens')) {
        violations.push({ file: rel, severity: 'warning', message: 'Possível cor hexadecimal não-registrada' });
      }
      if (/style=\{|style=["']/.test(content)) {
        violations.push({ file: rel, severity: 'warning', message: 'Estilo inline detectado' });
      }
      if (/<(input|select|textarea)(?![\s>]*[^>]*aria-label)/i.test(content) && /<(input|select|textarea)(?![\s>]*[^>]*label)/i.test(content)) {
        violations.push({ file: rel, severity: 'warning', message: 'Input sem label ou aria-label' });
      }
      if (/<button[^>]*>[\s]*<\/button>/i.test(content)) {
        violations.push({ file: rel, severity: 'warning', message: 'Botão vazio sem aria-label' });
      }
    }
  } catch {}
}

function main() {
  checkTokens();
  checkComponents();
  checkPatterns();
  checkContract();
  scanSourceFiles();

  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');

  console.log(`Design System Check: ${violations.length} issues (${errors.length} errors, ${warnings.length} warnings)`);
  for (const v of violations) {
    console.log(`  [${v.severity.toUpperCase()}] ${v.file}: ${v.message}`);
  }

  if (errors.length > 0) {
    console.log('EXIT_CODE=1');
    process.exit(1);
  }
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
