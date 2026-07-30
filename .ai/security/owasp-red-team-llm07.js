#!/usr/bin/env node
/**
 * owasp-red-team-llm07.js — OWASP LLM07: Overreliance
 *
 * Checks for blind trust in model output, insufficient verification,
 * and patterns that skip validation of AI-generated content.
 */

const fs = require('fs');
const path = require('path');

const CI = process.argv.includes('--ci');
const ROOT = path.resolve(__dirname, '../..');

const CHECKS = [
  {
    name: 'blind-trust',
    description: 'Blind trust in model output without verification',
    severity: 'high',
    patterns: [
      /(just|simply|blindly|always)\s+(trust|believe|accept|follow)\s+(the\s+)?(model|AI|LLM|output|response)\s+(without|no)\s+(verify|check|review)/i,
      /do\s+not\s+(verify|validate|check|review|audit)\s+(the\s+)?(model|AI|LLM|output|response|result)/i,
      /skip\s+(testing|validation|verification|review|audit)\s+(of|for)\s+(model|AI|LLM|output)/i,
      /auto(-| )?(approve|accept|deploy|execute)\s+(all|every|any)\s+(output|result|change|response)\s+(from|by)\s+(model|AI|LLM)/i,
    ],
  },
  {
    name: 'no-human-review',
    description: 'No human review or approval of AI outputs',
    severity: 'high',
    patterns: [
      /no\s+(need|reason|requirement)\s+(to\s+)?(review|check|verify|approve)\s+(AI|model|LLM|generated|output)/i,
      /(without|no)\s+(human|manual|expert)\s+(review|oversight|approval|supervision|validation)/i,
      /fully\s+(automated|autonomous)\s+(decision|action|response|output)\s+(without|no)\s+(human|review|oversight)/i,
    ],
  },
  {
    name: 'over-automation',
    description: 'Over-automation of AI-generated content',
    severity: 'medium',
    patterns: [
      /always\s+(run|execute|apply|deploy)\s+(without|no)\s+(confirmation|approval|review|verification)/i,
      /never\s+(ask|prompt|notify|require)\s+(for|human|user|approval|review|confirmation)/i,
      /automatically\s+(approve|accept|deploy|execute)\s+(all|every)\s+(AI|model|LLM|generated)\s+(content|output|change)/i,
    ],
  },
  {
    name: 'insufficient-validation',
    description: 'Insufficient validation of model outputs',
    severity: 'medium',
    patterns: [
      /(just|simply|quickly)\s+(use|apply|run|execute)\s+(the\s+)?(output|result|response)\s+(as\s+is|directly|immediately)/i,
      /no\s+(need|time)\s+(to\s+)?(validate|verify|check|review|test)\s+(the\s+)?(output|result|response|code)/i,
      /(trust|assume)\s+(the\s+)?(model|AI|LLM|output)\s+(is\s+)?(correct|accurate|safe|secure)/i,
    ],
  },
  {
    name: 'output-shaping',
    description: 'Output shaping without safety checks',
    severity: 'low',
    patterns: [
      /format\s+(output|response)\s+(as|to|so)\s+(it|that)\s+(passes|bypasses|avoids)\s+(detection|filter|guard|safety)/i,
      /make\s+(output|response|content)\s+(look|seem|appear)\s+(safe|harmless|benign|legitimate)\s+(but|while|yet)/i,
      /disguise\s+(the|this)\s+(output|response|content)\s+(as|to|so)\s+(safe|legitimate|normal|benign)/i,
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

  console.log('\n\x1b[1m=== OWASP LLM07 — Overreliance Red Team Report ===\x1b[0m');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Checks: ${CHECKS.length}`);
  console.log(`Findings: ${allFindings.length}\n`);

  for (const check of CHECKS) {
    const findings = byCheck[check.name] || [];
    const passed = findings.length === 0;
    const icon = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    const color = check.severity === 'high' ? '\x1b[31m' : check.severity === 'medium' ? '\x1b[33m' : '\x1b[90m';
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

  const high = allFindings.filter(f => f.severity === 'high').length;
  console.log(`High: ${high}`);

  if (CI && high > 0) {
    process.exit(1);
  }
}

main();
