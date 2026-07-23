#!/usr/bin/env node
/**
 * red-team.js — Automated Red Teaming Suite
 *
 * Scans inputs for prompt injection patterns and generates JSON report.
 * Integrates with existing Garak red-teaming infrastructure.
 *
 * Usage:
 *   node .ai/security/red-team.js                          # full scan of project files
 *   node .ai/security/red-team.js --ci                     # exit 1 on failures
 *   node .ai/security/red-team.js --dir ./prompts          # scan specific directory
 *   node .ai/security/red-team.js --input "some text"      # scan single input
 *   node .ai/security/red-team.js --report ./report.json   # custom output path
 */

const fs = require('fs');
const path = require('path');

const CI = process.argv.includes('--ci');
const DIR_ARG = process.argv.indexOf('--dir');
const INPUT_ARG = process.argv.indexOf('--input');
const REPORT_ARG = process.argv.indexOf('--report');

const ROOT = path.resolve(__dirname, '../..');
const REPORT_DIR = path.resolve(__dirname, 'reports');
const CUSTOM_DIR = DIR_ARG !== -1 ? path.resolve(process.cwd(), process.argv[DIR_ARG + 1]) : null;
const CUSTOM_INPUT = INPUT_ARG !== -1 ? process.argv[INPUT_ARG + 1] : null;
const REPORT_PATH = REPORT_ARG !== -1
  ? path.resolve(process.cwd(), process.argv[REPORT_ARG + 1])
  : path.join(REPORT_DIR, `red-team-report-${Date.now()}.json`);

const INJECTION_CHECKS = [
  {
    name: 'ignore-instructions',
    description: 'Ignore previous/above/prior instructions',
    severity: 'high',
    patterns: [
      /ignore\s+(all\s+)?(previous|above|prior|system)\s+(instructions|prompts|directions|commands)/i,
      /forget\s+(everything|all\s+context|your\s+instructions)/i,
      /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts)/i,
      /override\s+(your\s+)?(system\s+)?(instructions|prompt|guidelines)/i,
    ],
  },
  {
    name: 'dan-jailbreak',
    description: 'DAN (Do Anything Now) and unrestricted mode jailbreak',
    severity: 'high',
    patterns: [
      /\bdan\b.*(do\s+anything|unleashed|unrestricted|no\s+rules|no\s+limits)/i,
      /(act\s+as|pretend|you\s+are\s+now)\s+(dan|jailbroken|unrestricted|no\s+rules|no\s+limits)/i,
      /you\s+(are\s+)?(now\s+)?(free|unleashed|unrestricted)\s+(from\s+)?(rules|restrictions)/i,
      /(bypass|break\s+free|escape)\s+(your\s+)?(restrictions|limitations|guidelines)/i,
    ],
  },
  {
    name: 'system-prompt-override',
    description: 'System prompt override or extraction attempts',
    severity: 'high',
    patterns: [
      /print\s+(your\s+)?(system\s+)?(prompt|instructions|message|directive)/i,
      /reveal\s+(your\s+)?(instructions|system\s+message|guidelines|rules)/i,
      /show\s+(me\s+)?(your\s+)?(prompt|instructions|system\s+message)/i,
      /output\s+(your\s+)?(system\s+)?(prompt|instructions|initial\s+instructions)/i,
      /what\s+(are|is)\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/i,
    ],
  },
  {
    name: 'token-smuggling',
    description: 'Token smuggling via markdown/code blocks masquerading as system messages',
    severity: 'medium',
    patterns: [
      /```(system|user|assistant|tool)(\s|\n)/i,
      /\[\s*(SYSTEM|USER|ASSISTANT|TOOL)\s*[:=]/i,
      /<\|(system|user|assistant|tool)\|>/i,
      /<<(SYSTEM|USER|ASSISTANT)>>/i,
    ],
  },
  {
    name: 'role-play',
    description: 'Role-play attacks and persona hijacking',
    severity: 'medium',
    patterns: [
      /(now\s+)?(you\s+are|you'?re)\s+(the\s+)?(user|attacker|hacker|admin|root)/i,
      /(act|behave|respond)\s+(as|like)\s+(a\s+)?(hacker|cracker|malicious|evil|unethical)/i,
      /(you\s+have\s+)?(no\s+)?(ethics|morals|restrictions|boundaries|guidelines)/i,
      /(pretend|imagine)\s+(you'?re|you\s+are)\s+(a\s+)?(different\s+)?(AI|persona|character)/i,
    ],
  },
  {
    name: 'context-boundary-break',
    description: 'Context boundary breaking attempts',
    severity: 'medium',
    patterns: [
      /(forget|ignore|discard|reset)\s+(everything|all|context|history|memory)/i,
      /(new\s+)?(session|conversation|chat)\s+(start|reset|begin)/i,
      /clear\s+(your\s+)?(memory|context|history)/i,
      /(you\s+)?(don'?t|do\s+not)\s+(remember|know|have)\s+(anything|context|history)/i,
    ],
  },
  {
    name: 'payload-smuggling',
    description: 'Payload smuggling in various encodings',
    severity: 'medium',
    patterns: [
      /(base64|decode|encode)\s*(\(|of|the\s+following)/i,
      /(rot13|rot47|hex\s+decode|binary\s+decode|octal\s+decode)/i,
      /(zero-?width|invisible)\s+(char|character|space|unicode)/i,
      /unicode\s+(escape|bypass|trick|spoof)/i,
    ],
  },
  {
    name: 'many-shot-prefilling',
    description: 'Many-shot jailbreak and prefilling attempts',
    severity: 'medium',
    patterns: [
      /repeat\s+(the\s+)?(word|phrase|sentence)\s+(after|following)/i,
      /always\s+(start|begin)\s+(your\s+)?(response|answer)\s+(with|by)/i,
      /answer\s+(only|exclusively)\s+(in|with|using)/i,
      /do\s+not\s+(include|add|mention|say|use)\s+(anything|any|other)/i,
    ],
  },
];

const DEFAULT_SCAN_DIRS = [
  'packages/agent-runtime',
  'packages/prompt-security',
  'packages/onboarding-engine',
  'packages/trusted-context',
  'packages/cli/src/auth',
  'prompts',
  '.ai/prompts',
  '.ai/templates',
];

function scanText(text, source) {
  const findings = [];

  for (const check of INJECTION_CHECKS) {
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
    if (entry.isFile() && /\.(md|txt|ts|js|json|yaml|yml)$/.test(entry.name)) {
      results.push(...scanFile(fullPath));
    }
  }

  return results;
}

function runRedTeam(options = {}) {
  const {
    text,
    filePath,
    dirPath,
    ci = CI,
  } = options;

  let allFindings = [];

  if (text) {
    allFindings = scanText(text, 'stdin');
  } else if (filePath) {
    allFindings = scanFile(filePath);
  } else if (dirPath) {
    const absPath = path.resolve(ROOT, dirPath);
    const files = fs.readdirSync(absPath, { withFileTypes: true, recursive: true });
    for (const entry of files) {
      const fullPath = path.join(entry.parentPath, entry.name);
      if (entry.isFile() && /\.(md|txt|ts|js|json|yaml|yml)$/.test(entry.name)) {
        allFindings.push(...scanFile(fullPath));
      }
    }
  } else {
    const dirs = CUSTOM_DIR ? [path.relative(ROOT, CUSTOM_DIR)] : DEFAULT_SCAN_DIRS;
    for (const dir of dirs) {
      allFindings = allFindings.concat(scanDirectory(dir));
    }
  }

  const byCheck = {};
  for (const finding of allFindings) {
    if (!byCheck[finding.check]) {
      byCheck[finding.check] = [];
    }
    byCheck[finding.check].push(finding);
  }

  const report = {
    metadata: {
      tool: 'AI-Devkit Red Team Scanner',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      scanType: CUSTOM_INPUT ? 'single-input' : CUSTOM_DIR ? 'custom-directory' : 'full-project',
      totalPatterns: INJECTION_CHECKS.length,
    },
    summary: {
      total: allFindings.length,
      passed: INJECTION_CHECKS.length - Object.keys(byCheck).length,
      failed: Object.keys(byCheck).length,
      bySeverity: {
        high: allFindings.filter(f => f.severity === 'high').length,
        medium: allFindings.filter(f => f.severity === 'medium').length,
        low: allFindings.filter(f => f.severity === 'low').length,
      },
    },
    checks: INJECTION_CHECKS.map(check => ({
      name: check.name,
      description: check.description,
      severity: check.severity,
      passed: !byCheck[check.name] || byCheck[check.name].length === 0,
      findingsCount: (byCheck[check.name] || []).length,
      findings: byCheck[check.name] || [],
    })),
    findings: allFindings,
  };

  return report;
}

function printReport(report) {
  console.log('\n\x1b[1m=== Red Team Security Report ===\x1b[0m');
  console.log(`Tool: ${report.metadata.tool}`);
  console.log(`Version: ${report.metadata.version}`);
  console.log(`Timestamp: ${report.metadata.timestamp}`);
  console.log(`Scan: ${report.metadata.scanType}`);
  console.log('');

  console.log(`\x1b[1mSummary:\x1b[0m`);
  console.log(`  Total patterns: ${report.metadata.totalPatterns}`);
  console.log(`  Findings: ${report.summary.total}`);
  console.log(`  Checks passed: ${report.summary.passed}/${report.metadata.totalPatterns}`);
  console.log(`  Checks failed: ${report.summary.failed}/${report.metadata.totalPatterns}`);
  console.log(`  High severity: ${report.summary.bySeverity.high}`);
  console.log(`  Medium severity: ${report.summary.bySeverity.medium}`);
  console.log(`  Low severity: ${report.summary.bySeverity.low}`);
  console.log('');

  for (const check of report.checks) {
    const icon = check.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    const color = check.severity === 'high' ? '\x1b[31m' : check.severity === 'medium' ? '\x1b[33m' : '\x1b[90m';
    console.log(`${icon} ${color}[${check.severity.toUpperCase()}]\x1b[0m ${check.name}`);
    console.log(`  ${check.description}`);
    if (!check.passed) {
      console.log(`  \x1b[31m${check.findingsCount} finding(s)\x1b[0m`);
      for (const f of check.findings.slice(0, 3)) {
        console.log(`    ${f.source}:${f.line} — "${f.match}"`);
      }
      if (check.findings.length > 3) {
        console.log(`    ... and ${check.findings.length - 3} more`);
      }
    }
    console.log('');
  }

  const passed = report.summary.passed;
  const total = report.metadata.totalPatterns;
  console.log(`\x1b[1mResult: ${passed}/${total} checks passed\x1b[0m`);

  if (report.summary.total === 0) {
    console.log('\x1b[32mNo red team findings detected.\x1b[0m');
  }

  console.log(`\nReport saved to: ${REPORT_PATH}`);
}

async function main() {
  const startTime = Date.now();

  if (CUSTOM_INPUT) {
    const report = runRedTeam({ text: CUSTOM_INPUT });
    report.metadata.scanType = 'single-input';
    printReport(report);
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

    if (CI && !report.checks.every(c => c.passed)) {
      process.exit(1);
    }
    return;
  }

  const report = runRedTeam({ ci: CI });
  report.metadata.scanType = CUSTOM_DIR ? 'custom-directory' : 'full-project';
  printReport(report);

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  const elapsed = Date.now() - startTime;
  console.log(`\nScan completed in ${elapsed}ms`);

  if (CI && !report.checks.every(c => c.passed)) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Red team scan failed:', err);
    process.exit(1);
  });
}

module.exports = { runRedTeam, scanText, scanFile, scanDirectory };
