#!/usr/bin/env node
/**
 * owasp-red-team-llm05.js — OWASP LLM05: Training Data Poisoning
 *
 * Checks for crafted inputs targeting model behavior manipulation,
 * bias injection, and training data contamination attempts.
 */

const fs = require('fs');
const path = require('path');

const CI = process.argv.includes('--ci');
const ROOT = path.resolve(__dirname, '../..');

const CHECKS = [
  {
    name: 'behavior-manipulation',
    description: 'Attempts to permanently alter model behavior via few-shot',
    severity: 'high',
    patterns: [
      /always\s+(respond|answer|say|reply|output)\s+(with|in|as)\s+/i,
      /never\s+(respond|answer|say|mention|output|use)\s+/i,
      /(this|that)\s+is\s+(now\s+)?(always\s+)?(true|correct|right)\s+and/i,
      /(good|great|correct|perfect)\s+answer[,.]?\s+(from\s+)?now\s+on/i,
    ],
  },
  {
    name: 'reinforcement-manipulation',
    description: 'Reinforcement signal manipulation to bias training',
    severity: 'high',
    patterns: [
      /train\s+(me|the\s+model|the\s+AI|the\s+system)\s+(to|on|with|using)/i,
      /learn\s+(this\s+)?(pattern|behavior|rule|preference|bias)/i,
      /remember\s+(this\s+)?(rule|pattern|fact|preference|behavior)/i,
      /reinforce\s+(this|the)\s+(behavior|pattern|response|output)/i,
    ],
  },
  {
    name: 'bias-injection',
    description: 'Bias injection attempts in training context',
    severity: 'high',
    patterns: [
      /always\s+(favor|prefer|choose|select)\s+/i,
      /never\s+(consider|include|allow|mention)\s+/i,
      /(all|every)\s+(users?|people|humans)\s+(are|should|must)\s+/i,
      /(always|never)\s+(trust|believe|doubt|question)\s+/i,
    ],
  },
  {
    name: 'data-contamination',
    description: 'Training data contamination attempts',
    severity: 'critical',
    patterns: [
      /(inject|insert|add)\s+(poisoned|malicious|biased|corrupted)\s+(data|examples|samples|content)/i,
      /(contaminate|poison|corrupt)\s+(the\s+)?(training|fine.?tuning|dataset|corpus)/i,
      /(manipulate|skew|bias)\s+(training|fine.?tuning|dataset|distribution|labels)/i,
    ],
  },
  {
    name: 'adversarial-examples',
    description: 'Adversarial example injection attempts',
    severity: 'medium',
    patterns: [
      /(add|insert|include)\s+(adversarial|subtle|imperceptible)\s+(noise|perturbation|variation)/i,
      /(craft|generate|create)\s+(adversarial|poisoned)\s+(examples|inputs|samples)/i,
      /(trigger|backdoor)\s+(pattern|phrase|word)\s+(that|when|triggers)/i,
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

  console.log('\n\x1b[1m=== OWASP LLM05 — Training Data Poisoning Red Team Report ===\x1b[0m');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Checks: ${CHECKS.length}`);
  console.log(`Findings: ${allFindings.length}\n`);

  for (const check of CHECKS) {
    const findings = byCheck[check.name] || [];
    const passed = findings.length === 0;
    const icon = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    const color = check.severity === 'critical' ? '\x1b[31m' : check.severity === 'high' ? '\x1b[33m' : '\x1b[90m';
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
