#!/usr/bin/env node
/**
 * owasp-red-team-llm09.js — OWASP LLM09: Vector & Embedding Weaknesses
 *
 * Checks for adversarial embedding manipulation, vector store poisoning,
 * and similarity search exploitation attempts.
 */

const fs = require('fs');
const path = require('path');

const CI = process.argv.includes('--ci');
const ROOT = path.resolve(__dirname, '../..');

const CHECKS = [
  {
    name: 'embedding-injection',
    description: 'Adversarial embedding injection into vector stores',
    severity: 'high',
    patterns: [
      /embed\s+(this|the\s+following)\s+(in|into|as)\s+(the\s+)?(vector|embedding)\s+(store|database|index)/i,
      /(inject|insert|add)\s+(malicious|adversarial|poisoned)\s+(content|data|text|document)\s+(into|to)\s+(vector|embedding)/i,
      /poison\s+(the\s+)?(vector|embedding|index|database|store)\s+(with|using)/i,
      /(corrupt|contaminate|manipulate)\s+(the\s+)?(vector|embedding|similarity|search|index)/i,
    ],
  },
  {
    name: 'similarity-manipulation',
    description: 'Similarity/distance manipulation in vector search',
    severity: 'high',
    patterns: [
      /manipulate\s+(similarity|distance|ranking|score|relevance)\s+(in|of|for)\s+(the\s+)?(vector|embedding|search|retrieval)/i,
      /(skew|bias|alter|change)\s+(similarity|distance|cosine|euclidean)\s+(scores|results|ranking)/i,
      /(make|ensure)\s+(irrelevant|unrelated)\s+(content|data|documents)\s+(appear|seem)\s+(relevant|similar|related)/i,
    ],
  },
  {
    name: 'unicode-homoglyph',
    description: 'Unicode homoglyph and zero-width character attacks',
    severity: 'medium',
    patterns: [
      /zero(-| )?width\s+(char|character|space|unicode|byte)/i,
      /invisible\s+(char|character|unicode|space)/i,
      /homoglyph|homograph\s+(attack|char|character|domain|text)/i,
      /unicode\s+(trick|spoof|bypass|normalize|normalization)\s+(attack|exploit|vector)/i,
    ],
  },
  {
    name: 'rag-pipeline-manipulation',
    description: 'RAG pipeline context manipulation',
    severity: 'high',
    patterns: [
      /(inject|insert)\s+(misleading|false|contradictory)\s+(context|information|data|document)\s+(into|in)\s+(the\s+)?(RAG|retrieval|context)/i,
      /(override|replace|substitute)\s+(retrieved|context|document)\s+(with|by)\s+(malicious|adversarial|crafted)/i,
      /(context|RAG)\s+(contamination|poisoning|injection|manipulation)/i,
    ],
  },
  {
    name: 'embedding-weakness',
    description: 'General embedding security weaknesses',
    severity: 'medium',
    patterns: [
      /(leak|extract|exfiltrate)\s+(embedding|vector)\s+(representation|data|features)/i,
      /(reverse|invert|reconstruct)\s+(embedding|vector)\s+(to|back)\s+(original|text|input)/i,
      /(adversarial|perturbation)\s+(on|against|targeting)\s+(embedding|vector)\s+(layer|model|space)/i,
    ],
  },
];

const SCAN_DIRS = [
  'packages/agent-runtime',
  'packages/prompt-security',
  'packages/onboarding-engine',
  'packages/cli/src',
  'packages/memory-stores/src',
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

  console.log('\n\x1b[1m=== OWASP LLM09 — Vector & Embedding Weaknesses Red Team Report ===\x1b[0m');
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
