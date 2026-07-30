#!/usr/bin/env node
/**
 * owasp-red-team-llm10.js — OWASP LLM10: Misinformation
 *
 * Checks for requests to generate misleading content,
 * impersonation attempts, and misinformation vectors.
 */

const fs = require('fs');
const path = require('path');

const CI = process.argv.includes('--ci');
const ROOT = path.resolve(__dirname, '../..');

const CHECKS = [
  {
    name: 'misleading-content-generation',
    description: 'Generation of misleading or false content',
    severity: 'high',
    patterns: [
      /(generate|create|write|produce|compose)\s+(misleading|false|fake|fabricated|deceptive|dishonest)\s+(info|news|content|data|evidence|article|story)/i,
      /(make\s+up|invent|fabricate)\s+(citations|references|sources|evidence|data|studies|research|statistics)/i,
      /(create|write|generate)\s+(a\s+)?(fake|false|fraudulent|forged)\s+(review|testimonial|endorsement|recommendation)/i,
      /(generate|produce)\s+(false|misleading|inaccurate|untrue)\s+(scientific|medical|legal|financial)\s+(data|content|information|claim)/i,
    ],
  },
  {
    name: 'impersonation',
    description: 'Impersonation of persons or entities',
    severity: 'high',
    patterns: [
      /impersonate\s+(a\s+)?(person|expert|authority|official|doctor|lawyer|professional|representative)/i,
      /(pretend|act)\s+(to\s+be|as)\s+(a\s+)?(specific|real|actual|known)\s+(person|expert|authority|official)/i,
      /pose\s+(as|to\s+be)\s+(a\s+)?(government|official|authority|expert|professional|institution)/i,
      /(speak|respond|reply)\s+(on\s+behalf\s+of|as)\s+(a\s+)?(real|specific|named)\s+(person|organization|company|entity)/i,
    ],
  },
  {
    name: 'disinformation-campaign',
    description: 'Disinformation campaign generation',
    severity: 'critical',
    patterns: [
      /spread\s+(misinformation|disinformation|falsehoods|conspiracy|propaganda)\s+(about|regarding|concerning)/i,
      /(create|organize|coordinate)\s+(a\s+)?(disinformation|misinformation|campaign|operation|effort)/i,
      /(amplify|magnify|boost)\s+(false|misleading|unverified)\s+(narrative|claim|story|information)\s+(to|across|through)/i,
      /(astroturf|sockpuppet|botnet)\s+(campaign|operation|network|army)/i,
    ],
  },
  {
    name: 'deepfake-content',
    description: 'Deepfake and synthetic media generation',
    severity: 'critical',
    patterns: [
      /(generate|create|produce)\s+(deepfake|synthetic|artificial)\s+(video|audio|image|media|content)\s+(of|with|impersonating)/i,
      /(fake|fabricate|forge)\s+(video|audio|image|recording|media)\s+(of|showing|depicting)\s+(a\s+)?(person|event|scene|speech)/i,
      /(manipulate|alter|modify)\s+(video|audio|image)\s+(to\s+)?(make|show|appear|say)\s+(someone|something|a\s+person)/i,
    ],
  },
  {
    name: 'harmful-stereotype',
    description: 'Harmful stereotype or prejudice propagation',
    severity: 'high',
    patterns: [
      /(reinforce|perpetuate|promote)\s+(harmful|negative|damaging)\s+(stereotype|prejudice|bias|generalization)\s+(about|regarding|against)/i,
      /(write|generate|create)\s+(content|text|material)\s+that\s+(promotes|justifies|encourages)\s+(discrimination|prejudice|bias)/i,
      /(portray|depict|represent)\s+(a\s+)?(group|community|people)\s+(as|in\s+a)\s+(negative|inferior|dangerous|threatening)\s+(way|light|manner)/i,
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

  console.log('\n\x1b[1m=== OWASP LLM10 — Misinformation Red Team Report ===\x1b[0m');
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
