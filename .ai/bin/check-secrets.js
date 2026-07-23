#!/usr/bin/env node
/**
 * check-secrets.js — Scanner de Secrets no Código
 *
 * Detecta: AWS keys, GitHub tokens, JWT, private keys, connection strings, etc.
 *
 * Uso: node .ai/bin/check-secrets.js [--ci] [--verbose]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { name: 'AWS Secret Key', pattern: /(?![A-Za-z0-9/+=]{40})[A-Za-z0-9/+=]{40}/g, severity: 'critical' },
  { name: 'GitHub Token (ghp_)', pattern: /ghp_[a-zA-Z0-9]{36,}/g, severity: 'critical' },
  { name: 'GitHub OAuth (gho_)', pattern: /gho_[a-zA-Z0-9]{36,}/g, severity: 'critical' },
  { name: 'GitHub Token (ghu_)', pattern: /ghu_[a-zA-Z0-9]{36,}/g, severity: 'critical' },
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{20,}/g, severity: 'critical' },
  { name: 'Slack Token', pattern: /xox[baprs]-[0-9a-zA-Z-]{10,}/g, severity: 'critical' },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, severity: 'high' },
  { name: 'Password in Code', pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{3,}['"]/gi, severity: 'high' },
  { name: 'Connection String', pattern: /(?:mongodb(?:\+srv)?:\/\/[^\s"'\]\)]+)/g, severity: 'high' },
  { name: 'PostgreSQL URI', pattern: /(?:postgres:\/\/[^\s"'\]\)]+)/g, severity: 'high' },
  { name: 'Redis URI', pattern: /(?:redis:\/\/[^\s"'\]\)]+)/g, severity: 'high' },
  { name: 'npm token', pattern: /npm_[a-zA-Z0-9]{36,}/g, severity: 'critical' },
];

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'coverage', 'legacy'];

let findings = [];

const EXCLUDE_FILES = [
  'packages/cli/src/__tests__/review.test.ts',
  'packages/prompt-security/__tests__/prompt-security.test.ts',
  'packages/e2e-tests/__tests__/full-flow.test.ts',
  'packages/cli/src/__tests__/guardrails.test.ts',
  'packages/correction-oracle/__tests__/correction-oracle.test.ts',
  'scripts/__tests__/acceleration-co-pilot.test.ts',
];

function scanFile(filePath) {
  const relPath = path.relative(ROOT, filePath);
  if (EXCLUDE_FILES.includes(relPath.replace(/\\/g, '/'))) return;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (const pattern of SECRET_PATTERNS) {
      const regex = new RegExp(pattern.pattern.source, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        const contextLine = lines[lineNum - 1]?.trim().slice(0, 120) || '';
        findings.push({
          file: path.relative(ROOT, filePath),
          line: lineNum,
          pattern: pattern.name,
          severity: pattern.severity,
          match: match[0].slice(0, 20) + '...',
          context: contextLine,
        });
      }
    }
  } catch {}
}

function scanDirectory(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (EXCLUDE_DIRS.some(e => entry.name.startsWith(e)) || entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.match(/\.(ts|js|tsx|jsx|py|rb|go|rs|java|config|env|yml|yaml|json)$/)) {
        scanFile(fullPath);
      }
    }
  } catch {}
}

scanDirectory(ROOT);

const bySeverity = { critical: 0, high: 0 };
findings.forEach(f => { bySeverity[f.severity]++; });

console.log(`\n\x1b[1mSecrets Scan Report\x1b[0m\n`);
if (findings.length === 0) {
  console.log(`  \x1b[32mNo secrets detected.\x1b[0m`);
} else {
  for (const f of findings) {
    const color = f.severity === 'critical' ? '\x1b[31m' : '\x1b[33m';
    console.log(`${color}[${f.severity.toUpperCase()}]\x1b[0m ${f.file}:${f.line}`);
    console.log(`  Pattern: ${f.pattern}`);
    console.log(`  Match: ${f.match}`);
    if (VERBOSE) console.log(`  Context: ${f.context}`);
    console.log();
  }
}

console.log(`Summary: ${bySeverity.critical} critical, ${bySeverity.high} high, ${findings.length - bySeverity.critical - bySeverity.high} medium`);
if (CI && bySeverity.critical > 0) process.exit(1);
