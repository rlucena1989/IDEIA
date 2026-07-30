#!/usr/bin/env node
/**
 * owasp-red-team-llm03.js — OWASP LLM03: Supply Chain
 *
 * Checks for untrusted model references, dependency risks,
 * and supply chain vulnerabilities in prompts and configurations.
 *
 * Usage:
 *   node .ai/security/owasp-red-team-llm03.js              # full scan
 *   node .ai/security/owasp-red-team-llm03.js --ci         # exit 1 on fail
 *   node .ai/security/owasp-red-team-llm03.js --verbose    # detailed output
 */

const fs = require('fs');
const path = require('path');

const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');

const ROOT = path.resolve(__dirname, '../..');

const CHECKS = [
  {
    name: 'untrusted-model-loading',
    description: 'Load untrusted or remote models',
    severity: 'high',
    patterns: [
      /load\s+(untrusted|external|remote|unknown)\s+(model|plugin|module)/i,
      /(import|use|load)\s+(unverified|unsigned|untrusted)\s+(code|script|binary|package)/i,
      /plugin\s+(load|download|fetch)\s+(from|http|https|ftp)/i,
      /(pip|npm|gem|apt|brew)\s+install\s+(--no-verify|--ignore-|--insecure)/i,
    ],
  },
  {
    name: 'remote-code-execution-pipeline',
    description: 'Remote code execution via curl/wget pipe to shell',
    severity: 'critical',
    patterns: [
      /curl\s+.*\|\s*(bash|sh|powershell|pwsh|cmd)/i,
      /wget\s+.*\|\s*(bash|sh|powershell|pwsh|cmd)/i,
      /Invoke-WebRequest\s+.*\|.*Invoke-Expression/i,
      /iwr\s+.*\|.*iex/i,
    ],
  },
  {
    name: 'dependency-confusion',
    description: 'Dependency confusion vectors',
    severity: 'high',
    patterns: [
      /install\s+(package|dependency|library)\s+(from|using)\s+(untrusted|public|unknown)\s+(source|feed|repo)/i,
      /add\s+(private|internal)\s+(package|dep)\s+(to|from)\s+(public|npm|pypi|nuget)/i,
      /(typo|typosquatting|lookalike)\s+(package|dependency|library)/i,
    ],
  },
  {
    name: 'model-manipulation',
    description: 'Model manipulation or replacement attempts',
    severity: 'high',
    patterns: [
      /replace\s+(the\s+)?(model|AI|LLM)\s+(with|by)\s+(a\s+)?(different|malicious|custom|untrusted)/i,
      /swap\s+(model|provider|endpoint)\s+(to|with)\s+(untrusted|unknown|external)/i,
      /(modify|alter|change)\s+(model\s+)?(weights|parameters|config)\s+(from|via|using)\s+(external|untrusted)/i,
    ],
  },
  {
    name: 'supply-chain-injection',
    description: 'Supply chain injection via dependency config',
    severity: 'high',
    patterns: [
      /(inject|insert|add)\s+(malicious|backdoor|trojan)\s+(code|script|dependency|package)/i,
      /(poison|contaminate)\s+(the\s+)?(supply|dependency|package|build)\s+(chain|pipeline|process)/i,
      /(compromise|hijack)\s+(a\s+)?(dependency|package|library|module)\s+(update|version|build)/i,
    ],
  },
];

const SCAN_DIRS = [
  'packages/agent-runtime',
  'packages/prompt-security',
  'packages/onboarding-engine',
  'packages/cli/src',
  'prompts',
  '.ai/prompts',
  '.ai/templates',
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
    if (entry.isFile() && /\.(md|txt|ts|js|json|yaml|yml)$/.test(fullPath)) {
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

  console.log('\n\x1b[1m=== OWASP LLM03 — Supply Chain Red Team Report ===\x1b[0m');
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
