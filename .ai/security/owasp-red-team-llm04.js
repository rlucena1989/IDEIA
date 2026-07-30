#!/usr/bin/env node
/**
 * owasp-red-team-llm04.js — OWASP LLM04: Insecure Output Handling
 *
 * Checks for code execution and injection in model output,
 * XSS patterns, and unsafe output processing.
 */

const fs = require('fs');
const path = require('path');

const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');
const ROOT = path.resolve(__dirname, '../..');

const CHECKS = [
  {
    name: 'code-execution-in-output',
    description: 'Code execution via eval/Function in output processing',
    severity: 'critical',
    patterns: [
      /eval\s*\(\s*(response|output|result|data|content|text|message|reply)\s*\)/i,
      /new\s+Function\s*\(\s*(response|output|result|data|content)/i,
      /setTimeout\s*\(\s*(response|output|result|data|content)/i,
      /setInterval\s*\(\s*(response|output|result|data|content)/i,
    ],
  },
  {
    name: 'xss-in-output',
    description: 'XSS patterns in output handling',
    severity: 'high',
    patterns: [
      /innerHTML\s*=\s*(response|output|result|data|content|text|message)/i,
      /outerHTML\s*=\s*(response|output|result|data|content)/i,
      /insertAdjacentHTML\s*\(.*(response|output|result|data|content)/i,
      /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*(response|output|result|data|content)/i,
      /v-html\s*=\s*(response|output|result|data|content)/i,
    ],
  },
  {
    name: 'unsafe-deserialization',
    description: 'Unsafe deserialization of model output',
    severity: 'high',
    patterns: [
      /JSON\.parse\s*\(\s*(response|output|result|data|content|text|message)\s*\)/i,
      /eval\s*\(\s*(['"`])\s*\(/i,
      /Function\s*\(\s*(['"`])\s*return/i,
    ],
  },
  {
    name: 'shell-execution-from-output',
    description: 'Shell execution from model output',
    severity: 'critical',
    patterns: [
      /(exec|execSync|spawn|spawnSync|fork)\s*\(\s*(response|output|result|data|content|text|message)/i,
      /child_process\s*\.\s*(exec|spawn|fork|execFile)\s*\(\s*(response|output|result)/i,
      /shell:\s*(true|response|output|result)/i,
      /run\s*\(\s*(response|output|result|data|content)/i,
    ],
  },
  {
    name: 'sql-injection-from-output',
    description: 'SQL injection via model output',
    severity: 'high',
    patterns: [
      /\.query\s*\(\s*(response|output|result|data|content|text|message)/i,
      /\.execute\s*\(\s*(response|output|result|data|content|text|message)/i,
      /`\s*SELECT\s+.*\$\{?\s*(response|output|result|data|content)/is,
      /`\s*INSERT\s+.*\$\{?\s*(response|output|result|data|content)/is,
    ],
  },
  {
    name: 'template-injection',
    description: 'Template injection from model output',
    severity: 'high',
    patterns: [
      /\$\{(response|output|result|data|content|text|message)/i,
      /<%\s*=\s*(response|output|result|data|content)/i,
      /{{.*\s*(response|output|result|data|content)\s*.*}}/i,
    ],
  },
];

const SCAN_DIRS = [
  'packages/agent-runtime',
  'packages/prompt-security',
  'packages/onboarding-engine',
  'packages/cli/src',
  'packages/api-server/src',
  'packages/ideia-plugin/src',
];

function scanText(text, source) {
  const findings = [];
  for (const check of CHECKS) {
    for (const pattern of check.patterns) {
      const matches = text.match(pattern);
      if (matches) {
        const lineNum = text.substring(0, matches.index).split('\n').length;
        findings.push({
          check: check.name,
          description: check.description,
          severity: check.severity,
          match: matches[0].length > 80 ? matches[0].slice(0, 77) + '...' : matches[0],
          source,
          line: lineNum,
        });
        break;
      }
    }
  }
  return findings;
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return scanText(content, path.relative(ROOT, filePath));
  } catch {
    return [];
  }
}

function scanDirectory(dirPath) {
  const absPath = path.resolve(ROOT, dirPath);
  if (!fs.existsSync(absPath)) return [];
  const results = [];
  const entries = fs.readdirSync(absPath, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    const fullPath = path.join(entry.parentPath, entry.name);
    if (entry.isFile() && /\.(ts|js)$/.test(fullPath)) {
      results.push(...scanFile(fullPath));
    }
  }
  return results;
}

function main() {
  let allFindings = [];
  for (const dir of SCAN_DIRS) {
    allFindings = allFindings.concat(scanDirectory(dir));
  }

  const byCheck = {};
  for (const f of allFindings) {
    if (!byCheck[f.check]) byCheck[f.check] = [];
    byCheck[f.check].push(f);
  }

  console.log('\n\x1b[1m=== OWASP LLM04 — Insecure Output Handling Red Team Report ===\x1b[0m');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Checks: ${CHECKS.length}`);
  console.log(`Findings: ${allFindings.length}\n`);

  for (const check of CHECKS) {
    const findings = byCheck[check.name] || [];
    const passed = findings.length === 0;
    const icon = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    const color = check.severity === 'critical' ? '\x1b[31m' : '\x1b[33m';
    console.log(`${icon} ${color}[${check.severity.toUpperCase()}]\x1b[0m ${check.name}`);
    console.log(`  ${check.description}`);
    if (!passed) {
      console.log(`  \x1b[31m${findings.length} finding(s)\x1b[0m`);
      for (const f of findings.slice(0, 5)) {
        console.log(`    ${f.source}:${f.line} — "${f.match}"`);
      }
    }
    console.log('');
  }

  const passed = CHECKS.filter(c => !(byCheck[c.name] || []).length).length;
  console.log(`\x1b[1mResult: ${passed}/${CHECKS.length} checks passed\x1b[0m`);

  const critical = allFindings.filter(f => f.severity === 'critical').length;
  const high = allFindings.filter(f => f.severity === 'high').length;
  console.log(`Critical: ${critical}, High: ${high}`);

  if (CI && (critical > 0 || high > 0)) {
    process.exit(1);
  }
}

main();
